# Typography and font sources

SalahNest keeps its interface fonts and Arabic fallbacks locally available. The Quran reader additionally prefers the KFGQPC Hafs (Uthmanic Hafs) Unicode font from Quran Foundation while the user is reading online.

| Family | Role | Delivery | License/source |
|---|---|---|---|
| Cairo | UI Arabic + Latin | Bundled | SIL OFL 1.1; `fonts/OFL-Cairo.txt` |
| Noto Naskh Arabic | Quran Arabic fallback | Bundled | SIL OFL 1.1; `fonts/OFL-NotoNaskhArabic.txt` |
| Amiri Quran / Amiri | Quran Arabic fallback | Bundled | SIL OFL 1.1; `fonts/OFL-Amiri.txt` |
| KFGQPC Hafs / Uthmanic Hafs | Preferred Quran script when available | Fetched on demand when the reader opens; no-store request, in-memory only | Quran Foundation documented CDN; see its [font-rendering guide](https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/) and [Developer Terms](https://api-docs.quran.foundation/legal/developer-terms/) |

## Runtime and offline behavior

The reader requests only the single documented Unicode font file, `https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2`, when Read mode is opened. It is fetched with `cache: 'no-store'`, converted to a `FontFace` in memory, and is not written to the service-worker cache, local storage, or the application bundle. No Quran Foundation account credential or API dataset is used by this font request.

When the device is offline, the request fails, or a browser lacks the FontFace API, the existing locally installed Arabic fonts render the Quran. The verse text and translation remain the existing bundled data, so the reader, Arabic/English search, and translation continue offline. The KFGQPC look itself requires a successful online font fetch in that app session.

Quran Foundation's terms permit deliberate font caching or bundling only when the developer maintains an active Developer Console account and provides attribution. SalahNest does not bundle or persist the QF font. The application attributes the online font to Quran Foundation in both the reader status and Settings credits.

## Bundled font files

- Cairo — Google Fonts / Fontsource; SIL Open Font License 1.1 (`fonts/OFL-Cairo.txt`).
- Noto Naskh Arabic — Google Fonts / Fontsource; SIL Open Font License 1.1 (`fonts/OFL-NotoNaskhArabic.txt`).
- Amiri / Amiri Quran — [aliftype/amiri](https://github.com/aliftype/amiri); SIL Open Font License 1.1 (`fonts/OFL-Amiri.txt`).

The same bundled UI fonts are packaged by Electron and copied into Android/PWA builds. The web service-worker precaches only same-origin bundled files; it does not cache the Quran Foundation font.
