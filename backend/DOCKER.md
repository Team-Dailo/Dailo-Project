# 백엔드 Docker Compose로 띄우기

MySQL + Spring Boot 백엔드를 컨테이너로 한 번에 실행합니다.

## 1. 사전 요구사항

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 후 실행
- 터미널에서 `docker --version`, `docker compose version` 확인

## 2. 실행 방법

### 방법 A: backend 폴더에서 실행 (백엔드 + MySQL만)

```bash
cd backend
docker compose up -d
```

- **MySQL**: `localhost:3306` (DB: `dailo`, 사용자: root, 비밀번호: 기본값 `changeme`)
- **백엔드 API**: `http://localhost:8080`

첫 실행 시 이미지 빌드로 2~5분 정도 걸릴 수 있습니다.

### 방법 B: 프로젝트 루트에서 실행 (백엔드 + MySQL만, 프론트 제외)

```bash
cd Dailo-Project
docker compose up -d mysql backend
```

동일하게 MySQL 3306, 백엔드 8080으로 올라갑니다.

## 3. 로그 보기 / 중지

```bash
# 로그 보기 (backend 폴더에서)
docker compose logs -f backend

# 중지
docker compose down
```

## 4. 환경 변수 (선택)

비밀번호를 바꾸려면 `backend` 폴더에 `.env` 파일을 만들고:

```env
MYSQL_ROOT_PASSWORD=원하는_비밀번호
DB_PASSWORD=원하는_비밀번호
```

그 다음 `docker compose up -d` 다시 실행하면 됩니다.
