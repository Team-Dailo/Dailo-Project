# Kakao Android 디버그 키 해시 생성 (openssl 없이 PowerShell만 사용)
$keystore = "$env:USERPROFILE\.android\debug.keystore"
$certFile = "$env:TEMP\debug-cert.der"

if (-not (Test-Path $keystore)) {
    Write-Host "debug.keystore not found at $keystore" -ForegroundColor Red
    exit 1
}

# 1. keytool로 인증서 추출
& keytool -exportcert -alias androiddebugkey -keystore $keystore -storepass android -keypass android -file $certFile 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "keytool failed. Check that Java is installed." -ForegroundColor Red
    exit 1
}

# 2. SHA1 해시 후 Base64 인코딩 (카카오 키 해시 형식)
$certBytes = [System.IO.File]::ReadAllBytes($certFile)
$sha1 = [System.Security.Cryptography.SHA1]::Create()
$hashBytes = $sha1.ComputeHash($certBytes)
$keyHash = [Convert]::ToBase64String($hashBytes)

Remove-Item $certFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Kakao Android Key Hash (디버그) ===" -ForegroundColor Green
Write-Host $keyHash
Write-Host ""
Write-Host "위 값을 카카오 개발자 콘솔 > 앱 > 플랫폼 키 > 네이티브 앱 키 > Android 키 해시에 등록하세요." -ForegroundColor Yellow
