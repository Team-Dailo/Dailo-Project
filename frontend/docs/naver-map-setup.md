# 네이버 지도 연동 안내

지도 탭은 **@mj-studio/react-native-naver-map**으로 네이버 지도를 표시합니다.

## 지도가 안 뜨는 이유 (체크리스트)

| 증상 | 원인 | 해결 |
|------|------|------|
| 격자(그리드)만 보임 | Client ID·패키지명 미등록/불일치 | 아래 1단계에서 **com.app** 패키지 등록 |
| 하얀 화면 / 크래시 | 네이티브 모듈 미포함 | **Development Build**로 빌드 (`npx expo run:android`) |
| Expo Go에서 실행 | Expo Go는 네이버 지도 미지원 | 반드시 로컬 빌드 또는 EAS Development Build 사용 |

**현재 앱 패키지명:** `com.app` (`android/app/build.gradle`의 `applicationId`)  
**Client ID:** `app.json`에 `y16gvbmja5` 설정됨 → 네이버 콘솔에서 이 Application에 **Android 패키지명 `com.app`**만 등록하면 됨.

> **참고:** 네이버 지도 Android는 **SHA-1 입력란을 두지 않습니다.** 패키지명만 등록하는 방식입니다. SHA-1 입력칸이 안 보이면 정상입니다.

## 1. 네이버 클라우드 플랫폼에서 Client ID 발급

1. [네이버 클라우드 플랫폼](https://www.ncloud.com/) 로그인 후 [콘솔](https://console.ncloud.com) 접속
2. **Services** → **Application Services** → **Maps** 선택
3. **Application 등록** 선택 후:
   - **API 선택**에서 **Dynamic Map** 반드시 체크 (체크 안 하면 429 오류)
   - **Android 앱**으로 등록할 때 **패키지명**만 입력: `com.app`  
     (콘솔에 따라 "Android 앱 추가" / "패키지명" 같은 항목에 `com.app` 입력)
4. 등록한 Application의 **인증 정보**에서 **Client ID**(키 ID) 확인
5. `frontend/app.json`에 해당 Client ID가 들어가 있는지 확인 (현재 `y16gvbmja5`)

```json
["@mj-studio/react-native-naver-map", { "client_id": "발급받은_Client_ID" }]
```

**패키지명을 잘못 등록하면** 인증 실패(401)로 지도 타일이 로드되지 않고 **격자만** 보입니다. `com.app`을 **정확히** 입력했는지 확인하세요.

## 2. Development Build 필요

네이버 지도 SDK는 **네이티브 모듈**이라 **Expo Go에서는 동작하지 않습니다.**  
반드시 **Development Build**로 앱을 빌드해야 합니다.

### 로컬 빌드

```bash
cd frontend
npx expo prebuild -p android   # 또는 -p ios
npx expo run:android            # 또는 npx expo run:ios
```

### EAS Build (클라우드)

```bash
cd frontend
npx eas build:configure
npx eas build --profile development --platform android
npx eas build --profile development --platform ios
```

빌드 후 `npx expo start --dev-client`로 개발 서버를 띄우고, 빌드된 앱에서 지도 탭을 확인하면 됩니다.

## 3. 참고

- [React Native Naver Map 문서](https://rnnavermap.mjstudio.net/docs)
- [Expo 설정 가이드](https://rnnavermap.mjstudio.net/docs/installation/expo)
