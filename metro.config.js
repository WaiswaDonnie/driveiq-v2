// Metro configuration for DriveIQ.
//
// The Firebase JS SDK ships ESM whose package "exports" map Metro's newer
// resolver (enabled by default in Expo SDK 53+) can mis-resolve in a React
// Native runtime, which surfaces as a hard crash on launch ("Component auth
// has not been registered yet"). The two lines below are Expo's documented
// fix: allow `.cjs` modules and fall back to the classic main-field
// resolution that picks Firebase's React Native–compatible build.
//
// See: https://docs.expo.dev/guides/using-firebase/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
