# SalahNest version sources

Desktop and Android are released together for v1.6.8; later releases may choose to version them independently.

| Build | Current source value | Source of truth | Notes |
| --- | --- | --- | --- |
| Windows desktop | `1.6.8` | `package.json` (`version`) | x64 NSIS installer; not Authenticode-signed. |
| Android | `1.6.8` / version code `16` | `android/app/build.gradle` (`versionName` / `versionCode`) | Production-signed sideload APK; not submitted to Google Play. |
| Web / PWA | No separate product version | Built from the web sources by `npm run web` | Published from the separate `gh-pages` branch; the site retains the `/salahnest/` path. |
| Desktop runtime | Electron `45.2.3` | `package.json` (`devDependencies.electron`) | Node.js `22.12.0` or newer is required for development and packaging; CI uses Node.js 24. |

The Android application ID remains `com.malek.prayertimes`; it is intentionally independent of the SalahNest display name so existing installs can update in place. The existing signing key and app-data paths are unchanged. KFGQPC Hafs is requested from Quran Foundation only when the reader opens; the font is not bundled or cached, and local Arabic fonts remain available offline.
