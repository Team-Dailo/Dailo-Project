const { expo } = require("./app.json");

const parsedVersionCode = Number.parseInt(
  process.env.ANDROID_VERSION_CODE ?? expo.android?.versionCode ?? "1",
  10
);
const appVersion =
  process.env.APP_VERSION?.trim() ||
  process.env.ANDROID_VERSION_NAME?.trim() ||
  expo.version;
const iosBuildNumber =
  process.env.IOS_BUILD_NUMBER?.trim() || expo.ios?.buildNumber || "1";

module.exports = {
  expo: {
    ...expo,
    version: appVersion,
    android: {
      ...expo.android,
      versionCode: Number.isNaN(parsedVersionCode) ? 1 : parsedVersionCode,
    },
    ios: {
      ...expo.ios,
      buildNumber: String(iosBuildNumber),
    },
  },
};
