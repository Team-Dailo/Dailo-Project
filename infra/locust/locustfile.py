# ──────────────────────────────────────────────────────────────
# Dailo 오토스케일링 검증 부하테스트 (Locust)
#
# [설치]
#   pip install -r infra/locust/requirements.txt
#
# [실행 - Web UI 모드] (http://localhost:8089 에서 모니터링)
#   locust -f infra/locust/locustfile.py --host=https://dailoapp.com
#
# [실행 - ALB 직접 테스트 시]
#   ALB_VERIFY_SECRET="<시크릿값>" locust -f infra/locust/locustfile.py --host=http://<ALB-DNS>
#
# [실행 - 헤드리스 모드 (CI/CD)]
#   locust -f infra/locust/locustfile.py --host=https://dailoapp.com --headless
#
# [부하 프로파일 - AutoScalingTestShape]
#   0~3분:   0 → 5000 VU    (빠른 램프업)
#   3~25분:  5000 VU 유지    (22분 — EC2 부팅+태스크 배치 대기)
#   25~28분: 5000 → 0 VU    (스케일인 확인)
# ──────────────────────────────────────────────────────────────

import random
from locust import HttpUser, task, between
from locust import LoadTestShape


class DailoUser(HttpUser):
    wait_time = between(1, 3)

    # CloudFront 경유가 아닌 ALB 직접 테스트 시 필요한 헤더
    # ALB_VERIFY_SECRET 환경변수로 주입하거나, CloudFront URL로 테스트하면 불필요
    def on_start(self):
        import os
        secret = os.environ.get("ALB_VERIFY_SECRET", "")
        self.headers = {"X-Origin-Verify": secret} if secret else {}

    # ──────────────────────────────────────────────
    # 가중치 높음: 실제 사용자가 가장 많이 호출하는 API
    # ──────────────────────────────────────────────

    @task(10)
    def health_check(self):
        self.client.get("/health", headers=self.headers, name="/health")

    @task(8)
    def get_event_list(self):
        page = random.randint(0, 2)
        self.client.get(
            f"/api/events?page={page}&size=10",
            headers=self.headers,
            name="/api/events (list)",
        )

    @task(8)
    def get_event_map(self):
        self.client.get(
            "/api/events/map?swLat=35.0&neLat=37.7&swLng=126.5&neLng=127.5",
            headers=self.headers,
            name="/api/events/map",
        )

    @task(5)
    def get_event_detail(self):
        event_id = random.randint(1, 10)
        with self.client.get(
            f"/api/events/{event_id}",
            headers=self.headers,
            name="/api/events/{id}",
            catch_response=True,
        ) as resp:
            if resp.status_code == 404:
                resp.success()

    @task(5)
    def get_event_calendar(self):
        month = random.randint(1, 12)
        self.client.get(
            f"/api/events/calendar?year=2026&month={month}",
            headers=self.headers,
            name="/api/events/calendar",
        )

    @task(3)
    def search_events(self):
        keywords = ["축제", "공연", "전시", "마켓", "음악"]
        kw = random.choice(keywords)
        self.client.get(
            f"/api/events/search?keyword={kw}&size=20",
            headers=self.headers,
            name="/api/events/search",
        )

    # ──────────────────────────────────────────────
    # 중간 가중치: 서브 기능 API
    # ──────────────────────────────────────────────

    @task(4)
    def get_notices(self):
        self.client.get("/api/notices", headers=self.headers, name="/api/notices")

    @task(3)
    def get_faq(self):
        self.client.get("/api/faq", headers=self.headers, name="/api/faq")

    @task(3)
    def get_banners(self):
        self.client.get("/api/banners", headers=self.headers, name="/api/banners")

    @task(3)
    def get_bus_stops_nearby(self):
        lat = round(random.uniform(36.95, 37.05), 4)
        lng = round(random.uniform(127.90, 128.00), 4)
        radius = random.choice([500, 1000])
        self.client.get(
            f"/api/bus/stops/nearby?lat={lat}&lng={lng}&radius={radius}",
            headers=self.headers,
            name="/api/bus/stops/nearby",
        )

    @task(3)
    def get_bus_stops_bounds(self):
        sw_lat = round(random.uniform(36.95, 37.00), 4)
        sw_lng = round(random.uniform(127.90, 127.95), 4)
        ne_lat = round(sw_lat + random.uniform(0.05, 0.15), 4)
        ne_lng = round(sw_lng + random.uniform(0.05, 0.15), 4)
        self.client.get(
            f"/api/bus/stops/bounds?swLat={sw_lat}&swLng={sw_lng}&neLat={ne_lat}&neLng={ne_lng}",
            headers=self.headers,
            name="/api/bus/stops/bounds",
        )


# ──────────────────────────────────────────────────
# 오토스케일링 검증용 단계적 부하 프로파일
#
#   0~3분:   0 → 5000 VU    (빠른 램프업)
#   3~25분:  5000 VU 유지    (22분 — EC2 부팅+태스크 배치 대기)
#   25~28분: 5000 → 0 VU    (스케일인 확인)
# ──────────────────────────────────────────────────
class AutoScalingTestShape(LoadTestShape):
    stages = [
        {"duration": 180, "users": 5000, "spawn_rate": 30},
        {"duration": 1500, "users": 5000, "spawn_rate": 30},
        {"duration": 1680, "users": 0, "spawn_rate": 30},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        return None
