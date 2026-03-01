# 제공하신 탭 아이콘 이미지를 frontend/assets/images 로 복사합니다.
# 1) 이 스크립트 옆의 tab-icons 폴더에 5개 이미지를 넣고 실행하거나
# 2) 아래 $srcDir 를 이미지가 있는 폴더로 수정 후 실행하세요.
# 매핑: home1*.png -> tab-home.png, cal1*.png -> tab-calendar.png, map1*.png -> tab-map.png,
#       group1*.png -> tab-board.png, my1*.png -> tab-mypage.png

$ErrorActionPreference = "Stop"
$localDir = Join-Path $PSScriptRoot "tab-icons"
$srcDir = "C:\Users\yunaj\.cursor\projects\c-dailo-Dailo-Project\assets\c__Users_yunaj_AppData_Roaming_Cursor_User_workspaceStorage_c0ac24770621066725092735a509b683_images"
$destDir = Join-Path $PSScriptRoot "..\assets\images"

# 우선 로컬 tab-icons 폴더 사용, 없으면 $srcDir 사용
if (Test-Path $localDir) {
    $useDir = $localDir
    $byPrefix = $true
} elseif (Test-Path $srcDir) {
    $useDir = $srcDir
    $byPrefix = $false
} else {
    Write-Host "소스 폴더를 찾을 수 없습니다."
    Write-Host "  - $localDir (폴더 만들고 home1/cal1/map1/group1/my1 이미지 넣기)"
    Write-Host "  - 또는 스크립트 안의 `$srcDir 를 이미지 폴더 경로로 수정"
    exit 1
}

$mapping = @(
    @{ Prefix = "home1"; To = "tab-home.png" },
    @{ Prefix = "cal1"; To = "tab-calendar.png" },
    @{ Prefix = "map1"; To = "tab-map.png" },
    @{ Prefix = "group1"; To = "tab-board.png" },
    @{ Prefix = "my1"; To = "tab-mypage.png" }
)

foreach ($m in $mapping) {
    if ($byPrefix) {
        $f = Get-ChildItem -Path $useDir -Filter "$($m.Prefix)*.png" -ErrorAction SilentlyContinue | Select-Object -First 1
        $srcPath = $f?.FullName
    } else {
        $srcPath = Join-Path $useDir "$($m.Prefix)-*.png"
        $f = Get-ChildItem $srcPath -ErrorAction SilentlyContinue | Select-Object -First 1
        $srcPath = $f?.FullName
    }
    $destPath = Join-Path $destDir $m.To
    if ($srcPath -and (Test-Path $srcPath)) {
        Copy-Item -Path $srcPath -Destination $destPath -Force
        Write-Host "OK: $($m.To)"
    } else {
        Write-Host "SKIP (not found): $($m.Prefix)*.png"
    }
}
Write-Host "완료. 앱을 다시 실행하면 새 탭 아이콘이 적용됩니다."
