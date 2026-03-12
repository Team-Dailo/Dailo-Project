const { expo } = require("./app.json");

const parsedVersionCode = Number.parseInt(
  process.env.ANDROID_VERSION_CODE ?? expo.android?.versionCode ?? "1",
  10
);

module.exports = {
  expo: {
    ...expo,
    version: process.env.ANDROID_VERSION_NAME ?? expo.version,
    android: {
      ...expo.android,
      versionCode: Number.isNaN(parsedVersionCode) ? 1 : parsedVersionCode,
    },
  },
};
