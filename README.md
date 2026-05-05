# DriveIQ

An Expo React Native app that shows sports events (via SportMonks) and other live events (via Ticketmaster Discovery) happening in London on a map. Tap any pin to see event details — title, date/time, venue, category, description, and distance from your location.

Pins are differentiated by sport / category — football ⚽, cricket 🏏, tennis 🎾, rugby 🏉, basketball 🏀, boxing 🥊, running 🏃, music 🎵, theatre 🎭, comedy 😄, film 🎬, family 🎈.

Two filter rows sit beneath the DriveIQ wordmark:
1. **Date** — Today, Tomorrow, Next 3 Days, This Week.
2. **Category** — All, Sports, Music, Theatre, Comedy, Film, Family, Other (multi-select; empty selection means show everything).

Brand palette: `#2D7DF6` (Primary / DriveIQ Blue), `#4CA9FF` (Gradient / Light Blue), `#FFFFFF` (Light mode background), `#121212` (reserved for Dark mode).

## Quick start

```bash
# 1. Install
npm install

# 2. Configure API keys
cp .env.example .env
# then edit .env and paste your SportMonks + Ticketmaster + Google Maps keys
```

### Run in Expo Go (fastest, iOS uses Apple Maps)

```bash
npx expo start
```

Scan the QR with Expo Go on your phone, or press `i` / `a` for the iOS simulator / Android emulator. On iOS the map automatically falls back to **Apple Maps** because Expo Go does not bundle the Google Maps native SDK; on Android you'll already see Google Maps.

### Run a development build (Google Maps everywhere)

```bash
# generate native ios/ and android/ folders from app.config.js
npx expo prebuild --clean

# install + launch the dev build (requires Xcode / Android Studio)
npx expo run:ios
# or
npx expo run:android
```

A dev build links the **AirGoogleMaps** native module on iOS and reads `GOOGLE_MAPS_API_KEY` out of `.env` via `app.config.js`, so `PROVIDER_GOOGLE` works on both platforms. After prebuild, the app is no longer launchable through Expo Go — use `expo run:ios` / `expo run:android` from then on.

## Getting API keys

- **SportMonks Football API** — https://www.sportmonks.com/ — set `EXPO_PUBLIC_SPORTMONKS_API_KEY`
- **Ticketmaster Discovery API** — https://developer.ticketmaster.com/ — set `EXPO_PUBLIC_TICKETMASTER_API_KEY`
- **Google Maps SDK** — https://console.cloud.google.com/google/maps-apis — set `GOOGLE_MAPS_API_KEY`. Enable both the **Maps SDK for iOS** and **Maps SDK for Android** on the same key. The key is read by `app.config.js` and injected into the native iOS/Android config — it is NOT bundled into the JS, so don't add an `EXPO_PUBLIC_` prefix.

Without keys the app falls back to a small set of sample events so you can still explore the UI.

## Project layout

```
app/
  _layout.tsx           Root expo-router stack
  index.tsx             Main map screen
src/
  components/
    EventDetailsSheet.tsx   Modal sheet with event detail
    EventMarker.tsx         Custom map pin (sports vs other)
    FilterBar.tsx           Today / Tomorrow / 3 days / Week chips
  services/
    events.ts               Combines + normalises both providers
    sportmonks.ts           SportMonks fixtures for London
    ticketmaster.ts         Ticketmaster events for London
    sampleEvents.ts         Fallback data when keys are missing
  theme/colors.ts           Skyblue palette
  types/event.ts            Unified Event type
  utils/
    dateFilters.ts          Date-range helpers for the filter bar
    distance.ts             Haversine distance helper
```

## How filtering works

`src/utils/dateFilters.ts` turns the active filter into a `[start, end]` date range. Both API services accept that range and pass appropriate parameters to their endpoints, so we only fetch what we need.

## Notes

- Maps use `react-native-maps` with the **Google Maps provider** on both iOS and Android. The Google Maps SDK key is injected at build time by `app.config.js` from `GOOGLE_MAPS_API_KEY` in `.env`.
- Location uses `expo-location` and falls back to London centre (51.5074, -0.1278) if permission is denied.
- The Ticketmaster Discovery API supports `marketId=202` (London) and `startDateTime` / `endDateTime` filters; SportMonks has a per-day fixtures endpoint we filter to London venues client-side.
