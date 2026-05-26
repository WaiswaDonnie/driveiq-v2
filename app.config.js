/**
 * Dynamic Expo config. Wraps app.json and injects the Google Maps API key
 * from the local `.env` file at build time.
 *
 * Expo CLI auto-loads `.env` into process.env (SDK 49+), so a plain
 * `process.env.GOOGLE_MAPS_API_KEY` is enough — no dotenv import required.
 *
 * `GOOGLE_MAPS_API_KEY` is a regular env var (no EXPO_PUBLIC_ prefix) so
 * it does NOT end up inlined in the JS bundle. It only flows into the
 * native iOS / Android config used to register the Google Maps SDK.
 *
 * iOS uses the `react-native-maps` config plugin (which emits the modern
 * `react-native-maps/Google` Podfile subspec). Android uses the legacy
 * `android.config.googleMaps.apiKey` route, which `withMaps` in
 * `@expo/config-plugins` still handles correctly.
 */

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { iosGoogleMapsApiKey: googleMapsApiKey }],
    ],
    android: {
      ...(config.android ?? {}),
      config: {
        ...((config.android && config.android.config) || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
