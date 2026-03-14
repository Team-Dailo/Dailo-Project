const fs = require("fs");
const path = require("path");

const buildGradlePath = path.resolve(
  process.cwd(),
  "android",
  "app",
  "build.gradle"
);

// 1. build.gradle 파일을 읽어옵니다.
let source = fs.readFileSync(buildGradlePath, "utf8");

// 2. 이미 우리가 덧붙인 설정이 있는지 확인합니다 (중복 주입 방지).
if (!source.includes("FORCE_RELEASE_SIGNING_CONFIG")) {
  
  // 3. 파일 맨 밑에 추가할 강력한 오버라이딩 설정 + 환경변수 누락 검증 로직
  // 이 블록이 기존에 Expo prebuild가 만들어둔 모든 가짜 release 설정을 덮어씌웁니다.
  const forceSigningConfig = `

// --- FORCE_RELEASE_SIGNING_CONFIG ---
// Override any existing signingConfigs.release injected by Expo prebuild
android {
    signingConfigs {
        release {
            def storeFilePath = System.getenv("STORE_FILE")
            if (storeFilePath != null) {
                storeFile file(storeFilePath)
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}

// 빌드 시작 전에 환경변수가 제대로 들어왔는지 검증하는 방어 로직 (원래 코드의 기능 유지)
gradle.taskGraph.whenReady { taskGraph ->
    if (!taskGraph.allTasks.any { it.name.toLowerCase().contains("release") }) {
        return
    }

    def missing = []
    if (!System.getenv("STORE_FILE")) missing << "STORE_FILE"
    if (!System.getenv("KEYSTORE_PASSWORD")) missing << "KEYSTORE_PASSWORD"
    if (!System.getenv("KEY_ALIAS")) missing << "KEY_ALIAS"
    if (!System.getenv("KEY_PASSWORD")) missing << "KEY_PASSWORD"

    if (!missing.isEmpty()) {
        throw new GradleException("Missing Android release signing env vars: \${missing.join(', ')}")
    }
}
// ------------------------------------
`;

  // 4. 기존 내용의 맨 밑에 텍스트를 덧붙임
  source += forceSigningConfig;
  
  // 5. 파일 저장
  fs.writeFileSync(buildGradlePath, source);
  console.log("✅ Successfully appended forced release signing config to build.gradle");
} else {
  console.log("⏩ Forced release signing config already exists. Skipping.");
}