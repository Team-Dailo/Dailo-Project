from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, parse_qs
import time

app = FastAPI(
    title="Chungbuk Festival Crawler API",
    description="충북나드리 연간 축제 일정(충주시) 크롤링 API",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "https://tour.chungbuk.go.kr"
LIST_URL = "https://tour.chungbuk.go.kr/www/selectBbsNttList.do"
DETAIL_URL = "https://tour.chungbuk.go.kr/www/selectBbsNttView.do"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def crawl_festivals(year: int, region: str):
    # 목록 페이지 요청
    list_params = {
        "key": 80,
        "bbsNo": 10,
        "searchCnd": "ADITFIELD1",
        "searchCtgry": year,
        "searchKrwd": region
    }

    list_res = requests.get(LIST_URL, params=list_params, headers=HEADERS)
    list_res.raise_for_status()
    list_soup = BeautifulSoup(list_res.text, "html.parser")

    # 상세 페이지 링크 수집
    detail_links = {}

    for a in list_soup.select("a[href*='selectBbsNttView.do']"):
        href = a.get("href")
        if not href:
            continue

        full_url = urljoin(BASE_URL, href)
        qs = parse_qs(urlparse(full_url).query)

        if "nttNo" in qs:
            detail_links[qs["nttNo"][0]] = full_url

    # 상세 페이지 크롤링
    events = []

    for nttNo, url in detail_links.items():
        detail_params = {
            "key": 80,
            "bbsNo": 10,
            "nttNo": nttNo,
            "searchCtgry": year,
            "searchKrwd": region
        }

        res = requests.get(DETAIL_URL, params=detail_params, headers=HEADERS)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        # 행사명
        title_tag = soup.select_one("h3.type01")
        title = title_tag.contents[0].strip() if title_tag else None

        # 대표 이미지
        img_tag = soup.select_one(".info_top .inner img")
        image_url = None
        if img_tag and img_tag.get("src"):
            image_url = urljoin(BASE_URL, img_tag["src"])

        # 기본 정보 테이블
        info = {}
        for row in soup.select("table.table.type2 tbody tr"):
            th = row.select_one("th")
            td = row.select_one("td")
            if th and td:
                key = th.get_text(strip=True)
                value = td.get_text(" ", strip=True)
                info[key] = value

        events.append({
            "행사명": title,
            "지역": info.get("지역"),
            "일시": info.get("일시"),
            "장소": info.get("장소"),
            "주소": info.get("주소"),
            "주최/주관": info.get("주최/주관"),
            "이미지": image_url,
            "상세페이지": url
        })

        time.sleep(0.3)

    return {
        "year": year,
        "region": region,
        "total_count": len(events),
        "events": events
    }


@app.get("/get-festivals")
def get_festivals(
    year: int = Query(2026, description="연도"),
    region: str = Query("충주시", description="지역명")
):
    return crawl_festivals(year, region)
