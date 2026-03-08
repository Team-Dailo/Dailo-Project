탭 아이콘 이미지를 여기에 넣으세요.

필요한 파일 (이름이 아래처럼 시작하면 됨):
  - home1 로 시작하는 PNG  → 홈 탭
  - cal1  로 시작하는 PNG  → 달력 탭
  - map1  로 시작하는 PNG  → 지도 탭
  - group1 로 시작하는 PNG → 게시판 탭
  - my1   로 시작하는 PNG  → 마이페이지 탭

5개 모두 넣은 뒤, 상위 폴더에서 복사 스크립트를 실행하세요:
  cd frontend\scripts
  powershell -ExecutionPolicy Bypass -File .\copy-tab-icons.ps1

그 다음 앱을 다시 실행하면 새 탭 아이콘이 적용됩니다.
선택 시 색이 바뀌는 동작은 그대로 유지됩니다.
