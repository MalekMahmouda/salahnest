# SalahNest · Prayer Times · أوقات الصلاة

<p align="center"><img src="assets/salahnest-mark.png" alt="SalahNest logo" width="120"></p>

A native Windows desktop & Android Islamic companion built with Electron — prayer times, Quran, Dhikr, Qibla, and more, with a fully offline-first core.

> 🇸🇦 العربية: [README.ar.md](README.ar.md)
🌐 **Web app:** https://malekmahmouda.github.io/salahnest/ — installable PWA; its cached app shell is available offline after a successful service-worker install. Network-backed features such as city search and Quran audio still need internet.
📥 **Downloads:** the production-signed Android APK and Windows installer are published in [GitHub Releases](https://github.com/MalekMahmouda/salahnest/releases). The Windows installer is not Authenticode-signed.
**Versions:** desktop `1.6.8`; Android `1.6.8` (version code `16`); web/PWA has no separate product version. See [version sources](docs/VERSIONS.md).
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Android%20%7C%20Web-blue) ![Electron](https://img.shields.io/badge/Electron-45-47848F) ![Desktop](https://img.shields.io/badge/desktop-1.6.8-green) ![Android](https://img.shields.io/badge/Android-1.6.8-green)

## Why SalahNest?

- **Private by design.** No account, no ads, no analytics. Prayer times are computed on your device.
- **Works offline.** The prayer engine, Qibla, adhkar and the Quran text with search do not need internet.
- **Windows, Android and web.** One codebase: Electron, Capacitor and an installable PWA.
- **Arabic and English**, with full right-to-left layout.
- **Free and open source.** Read the code, report bugs, send fixes.

Feedback is welcome: [open an issue](https://github.com/MalekMahmouda/salahnest/issues) or star the repo if SalahNest is useful to you.

## Features

**Prayer engine (offline, no account, no telemetry)**
- Prayer times computed locally via the [adhan](https://github.com/batoulapps/adhan-js) library — 8 calculation methods + Madhab (Shafi/Hanafi)
- Main-process scheduler: 30s fire loop with sleep/resume grace, day rollover, per-prayer minute offsets
- Native Windows notifications, per-prayer pre-adhan reminders
- Fullscreen Adhan overlay with reciter selection, volume, and play/pause
- Timezone-aware display for saved locations

**Islamic content**
- 📖 Quran reader — existing Tanzil Uthmani text + Sahih International translation (114 surahs / 6,236 ayahs), offline search (Arabic + English), bookmarks with notes, font/spacing controls; KFGQPC Hafs loads online on demand with installed Arabic fallback offline
- 🎧 Audio player — 5 reciters; playback continues while you navigate the app (desktop keeps playing in the tray; Android pauses when the app is backgrounded — a lock-screen service is not implemented yet)
- 📿 Dhikr library — morning/evening/after-prayer/sleep/general collections, favorites, counter with targets and progress
- 🌙 99 Names of Allah with search
- 🕌 Qibla compass with bearing and distance to the Kaaba
- 🌅 Sun & night times — sunrise, sunset, solar noon, midnight, last third of the night
- 📅 Monthly calendar with Hijri dates and CSV export
- 🌙 Ramadan mode — Iftar countdown, fasting-day indicator, Imsak estimate

**Personal (all local)**
- Prayer history with explicit three-state recording → statistics with streaks
- Multiple saved locations with activation control
- 8 built-in themes + custom theme builder
- Backup/restore as validated JSON
- English / العربية with full RTL layout

**Desktop integration**
- System tray with live next-prayer countdown
- Close-to-tray, start with Windows, single-instance lock
- Always-on-top mini widget and compact Mini Mode
- Keyboard shortcuts (Ctrl+1–7 pages, Ctrl+Shift+P widget, Ctrl+Shift+M mini mode)
- No Electron menu bar, no DevTools in production builds

## Getting started

Local development and packaging require Node.js `22.12.0` or newer (Electron 45 requirement); CI uses Node.js 24.

```bash
npm install
npm start
```

### Build the Windows installer

```bash
npm run package:installer   # → dist/SalahNest-Setup-1.6.8.exe
npm run release             # → release/ folder with SHA-256 checksums
```

For upgrade compatibility, user data stays in the existing `%APPDATA%\Prayer Times` folder and survives upgrades and uninstallation.

## Architecture

```
main/               Electron main process
├── main.js         window/tray lifecycle, IPC, notifications, overlay, widget
├── scheduler.js    authoritative prayer scheduler (adhan lib): fire loop, missed-window recovery, notifications/adhan/pre-alerts
├── adhan-files.js  bundled local adhan audio resolution (assets/adhans/, offline-first)
├── tray.js         system tray menu
└── json-store.js   dependency-free settings store
preload.js          secure contextBridge IPC (contextIsolation + sandbox on)
js/                 renderer modules (app, pages, pages3, reader, data, store3, overlay, widget)
styles/app.css      design tokens, 8 themes, glass/bento UI, logical-property RTL
fonts/              Amiri Quran fonts for the mushaf reader (SIL OFL 1.1, offline)
assets/adhans/      bundled adhan audio (offline-capable, works without internet)
data/quran.json     bundled verified Quran text + translation
```

Security model: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, validated IPC channels, CSP on every window, no remote debugging endpoints.

## Project map

- `main/`, `preload.js`, `widget.html` — Electron process, secure bridge, and desktop widget.
- `js/`, `styles/`, `shared/` — app modules, styling, and shared code.
- `android/`, `android-assets/` — Capacitor Android project and Android-specific assets.
- `assets/`, `fonts/`, `data/` — bundled media, fonts, and Quran data.
- `scripts/`, `.github/workflows/` — build, test, release, and CI automation.
- `www/` — generated Capacitor web assets (`npm run www`); `dist-web/` — generated installable web/PWA build (`npm run web`).
- `docs/` — project notes and reviews. Start with [versions](docs/VERSIONS.md), [Android](docs/ANDROID.md), [testing](docs/TESTING.md), the [release checklist](docs/RELEASE-CHECKLIST.md), or the [design-review gallery](docs/design-review/README.md).

## Privacy

Everything personal — settings, prayer history, bookmarks, locations, custom themes — is stored locally on your device. There are no accounts, analytics, or trackers.

Prayer times are computed **locally on your machine** (the same engine powers the display and the scheduler). What touches the network:

- **City search** — geocoding via `api.aladhan.com` (coordinates only; times are then computed locally)
- **Quran audio** — streamed from `cdn.islamic.network`
- **Adhan audio** — bundled locally. Desktop has a CDN fallback only if a bundled file is missing; browser playback uses bundled recordings only and does not fetch a remote replacement.
- **GPS location** (browser and Android; on Windows it depends on system location services) and **reverse geocoding** via `nominatim.openstreetmap.org` to label your city

Desktop and Android keep local prayer calculations, scheduled alerts, bundled adhan and Quran text available offline. In the web/PWA build, the cached shell, local calculations, bundled adhan and text work offline only after the service worker installs successfully; city lookup and streamed Quran audio need internet. Browser notifications depend on browser support, permission, and background behavior.

## License

Released under the ISC license (see `package.json`). Bundled adhan audio: courtesy of AlAdhan; Amiri fonts under the SIL Open Font License 1.1.
