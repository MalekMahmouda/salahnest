# SalahNest version sources

The Windows desktop and Android apps have separate version numbers. Do not force them to match unless both products are deliberately released together.

| Build | Current source value | Source of truth | Notes |
| --- | --- | --- | --- |
| Windows desktop | `1.6.5` | `package.json` (`version`) | The installer is not distributed until it is signed and tested. |
| Android | `1.6.6` / version code `14` | `android/app/build.gradle` (`versionName` / `versionCode`) | The download card in `js/extras.js` points to the signed `v1.6.6` release. Increment the Android version code for every distributed update. |
| Web / PWA | No separate product version | Built from the web sources by `npm run web` | The service-worker cache key is generated at build time; it is not a product release number. |
| Desktop runtime | Electron `45.2.3` | `package.json` (`devDependencies.electron`) | Node.js `22.12.0` or newer is required for development and packaging; CI uses Node.js 24. |

The Android application ID remains `com.malek.prayertimes`; it is intentionally independent of the SalahNest display name so existing installs can update in place. Do not change the signing key or app-data paths as part of a version-number update.
