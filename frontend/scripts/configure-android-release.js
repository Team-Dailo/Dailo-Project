const fs = require("fs");
const path = require("path");

const buildGradlePath = path.resolve(
  process.cwd(),
  "android",
  "app",
  "build.gradle"
);

let source = fs.readFileSync(buildGradlePath, "utf8");

const replaceOnce = (pattern, replacement, label) => {
  if (!pattern.test(source)) {
    throw new Error(`Could not update ${label} in ${buildGradlePath}`);
  }

  source = source.replace(pattern, replacement);
};

if (!source.includes('def releaseStoreFile = System.getenv("STORE_FILE")')) {
  replaceOnce(
    /def enableMinifyInReleaseBuilds = \(findProperty\('android\.enableMinifyInReleaseBuilds'\) \?: false\)\.toBoolean\(\)\n/,
    `$&def releaseStoreFile = System.getenv("STORE_FILE")\n` +
      `def releaseStorePassword = System.getenv("KEYSTORE_PASSWORD")\n` +
      `def releaseKeyAlias = System.getenv("KEY_ALIAS")\n` +
      `def releaseKeyPassword = System.getenv("KEY_PASSWORD")\n`,
    "release signing environment variables"
  );
}

if (!source.includes("signingConfigs.release")) {
  replaceOnce(
    /signingConfigs \{\n(\s*debug \{[\s\S]*?\n\s*\})\n\s*\}/,
    `signingConfigs {\n$1\n` +
      `        release {\n` +
      `            if (releaseStoreFile != null) {\n` +
      `                storeFile file(releaseStoreFile)\n` +
      `                storePassword releaseStorePassword\n` +
      `                keyAlias releaseKeyAlias\n` +
      `                keyPassword releaseKeyPassword\n` +
      `            }\n` +
      `        }\n` +
      `    }`,
    "release signing config"
  );
}

if (!source.includes("signingConfig signingConfigs.release")) {
  replaceOnce(
    /buildTypes \{[\s\S]*?release \{[\s\S]*?signingConfig signingConfigs\.debug/,
    (match) =>
      match.replace(
        "signingConfig signingConfigs.debug",
        "signingConfig signingConfigs.release"
      ),
    "release build type signing config"
  );
}

if (!source.includes("Missing Android release signing env vars")) {
  replaceOnce(
    /\/\/ Apply static values from `gradle\.properties` to the `android\.packagingOptions`/,
    `gradle.taskGraph.whenReady { taskGraph ->\n` +
      `    if (!taskGraph.allTasks.any { it.name.toLowerCase().contains("release") }) {\n` +
      `        return\n` +
      `    }\n\n` +
      `    def missing = []\n` +
      `    if (!releaseStoreFile) missing << "STORE_FILE"\n` +
      `    if (!releaseStorePassword) missing << "KEYSTORE_PASSWORD"\n` +
      `    if (!releaseKeyAlias) missing << "KEY_ALIAS"\n` +
      `    if (!releaseKeyPassword) missing << "KEY_PASSWORD"\n\n` +
      `    if (!missing.isEmpty()) {\n` +
      '        throw new GradleException("Missing Android release signing env vars: ${missing.join(\', \')}")\n' +
      `    }\n` +
      `}\n\n` +
      `// Apply static values from \`gradle.properties\` to the \`android.packagingOptions\``,
    "release signing validation"
  );
}

fs.writeFileSync(buildGradlePath, source);
