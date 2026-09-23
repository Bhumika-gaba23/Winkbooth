# WinkBooth mobile

The Expo Router mobile app lives alongside the existing web app so the web build remains unchanged.

## Run it

Install dependencies, then use a custom development client—the Vision Camera, face detector, SQLCipher, and Skia native modules cannot run in Expo Go.

```sh
npx expo prebuild
npx expo run:android
# or: npx expo run:ios
npx expo start --dev-client
```

Use `eas build --profile preview --platform android` or `ios` for internal preview builds. The app ID is `com.bhumikagaba.winkbooth` on both platforms.

## Data model

- Gallery metadata is stored in Expo SQLite and media remains as device `file://` URIs.
- Theme and in-progress session settings use Expo SQLite KV storage.
- Vault records use the SQLCipher-configured SQLite database. The entered vault secret is not persisted.
- The web IndexedDB gallery is intentionally not copied into the mobile gallery. An explicit export/import bridge can be added later.
