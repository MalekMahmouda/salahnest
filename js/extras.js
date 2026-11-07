'use strict';

/**
 * extras.js — the two surfaces that are not prayer calculation:
 *   1. Quran Radio      — two live stations on the Quran page
 *   2. Get Prayer Times — download / source / releases cards in Settings
 *
 * Everything here is null-guarded, so the file is inert on the pages that do
 * not contain these blocks (adhan.html, widget.html, overlay).
 */

/* ── The release the download cards point at ──────────────────────────────
   Verified against the published signed artifact on 2026-11-02:
     v1.6.6 · 54,660,550 bytes (54.66 MB decimal) · minSdk 24 = Android 7.0
   WHEN SHIPPING A RELEASE bump version + apk + mb here — the version text, the
   "Latest:" chip and the APK href all read from this object, so nothing else
   needs editing and no card can drift onto a file that does not exist. */
const PT_RELEASE = {
  version: '1.6.6',
  apk: 'SalahNest-1.6.6.apk',
  mb: '54.66',
  available: true,
};
const PT_REPO = 'https://github.com/MalekMahmouda/salahnest';

/* ── Stations — each source is explicit about its media type ──────────────
   Cairo's official site currently supplies HLS; the player uses the locally
   bundled Hls.js build (or native HLS where available). Older direct feeds stay
   as fallbacks and remain constrained by the existing HTTPS CSP allowlist. */
const PT_RADIO_STATIONS = [
  /* إذاعة القرآن الكريم — TuneIn s37232 (“Saudi Quran Station”, 100.0 FM)
     resolves to stream.radiojar.com/0tpy1h0kxtzuv. The relay plays the same
     feed; the canonical stays behind it for file:// builds. */
  { id: 'saudi', nameKey: 'radio.saudiName', subKey: 'radio.saudiSub',
    sources: [
      { url: 'https://edge.mixlr.com/channel/rwumx', type: 'direct' },
      { url: 'https://stream.radiojar.com/0tpy1h0kxtzuv', type: 'direct' },
    ] },
  /* إذاعة القرآن الكريم من القاهرة — surahquran.com/Radio-Quran-Cairo.html
     embeds stream.radiojar.com/8s5u5tpdtwzuv; the relay used first identifies
     itself as "Holy Quran Radio Cairo" in its ICY headers, i.e. the same
     station. */
  { id: 'egypt', nameKey: 'radio.egyptName', subKey: 'radio.egyptSub',
    sources: [
      { url: 'https://service.webvideocore.net/CL1olYogIrDWvwqiIKK7eCxOS4PStqG9DuEjAr2ZjZQtvS3d4y9r0cvRhvS17SGN/a_7a4vuubc6mo8.m3u8', type: 'hls' },
      { url: 'https://radio.xecod.com/station/quran-cairo', type: 'direct' },
      { url: 'https://stream.radiojar.com/8s5u5tpdtwzuv', type: 'direct' },
    ] },
];

const ptEl = (id) => document.getElementById(id);
const ptBtnId = (st) => 'radio' + st.id.charAt(0).toUpperCase() + st.id.slice(1);

let ptRadioAudio = null;
let ptRadioStation = null;   // station currently loaded into the audio element
let ptRadioError = false;    // last play attempt failed (network / blocked / 4xx)
let ptRadioTry = 0;          // index into the station's `sources` ladder
let ptRadioAttempt = 0;      // bumped on every src change; stale callbacks compare
let ptRadioBlocked = false;  // the browser refused autoplay — not a dead stream
let ptRadioHls = null;

/* ═══ RADIO: state → DOM ═══ */
function ptRadioSync() {
  const a = ptRadioAudio;
  const playing = !!(a && ptRadioStation && !a.paused && !ptRadioError);
  for (const st of PT_RADIO_STATIONS) {
    const btn = ptEl(ptBtnId(st));
    if (!btn) continue;
    const on = playing && ptRadioStation.id === st.id;
    btn.classList.toggle('playing', on);
    btn.classList.toggle('failed', on === false && ptRadioError && ptRadioStation.id === st.id);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  const row = ptEl('radioVolRow');
  if (row) row.hidden = !playing;
}

function ptRadioStatus() {
  const el = ptEl('radioStatus');
  if (!el) return;
  el.classList.toggle('err', ptRadioError);
  if (ptRadioError) { el.textContent = t('radio.error'); return; }
  if (!ptRadioAudio || !ptRadioStation) { el.textContent = ''; return; }
  if (!ptRadioAudio.paused) { el.textContent = t('radio.playingPrefix') + t(ptRadioStation.nameKey); return; }
  if (ptRadioBlocked) { el.textContent = t('radio.tapToPlay'); return; }
  /* Nothing is audible yet but we have not given up: the element is still
     fetching. Saying so is what separates a slow stream from a dead one —
     without it the bar looks like it ignored the tap. */
  el.textContent = ptRadioAudio.readyState < 3 ? t('radio.connecting') : '';
}

function ptRadioPaintMediaSession() {
  if (!('mediaSession' in navigator) || !window.MediaMetadata || !ptRadioStation) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t(ptRadioStation.nameKey),
      artist: t('radio.title'),
      album: 'SalahNest',
    });
  } catch (e) { /* older WebView */ }
}

function ptRadioStop() {
  const a = ptRadioAudio;
  if (!a) return;
  ptRadioAttempt += 1;   // invalidate any in-flight play() / error callback
  ptRadioDestroyHls();
  a.pause();
  ptRadioError = false;
  ptRadioBlocked = false;
  ptRadioStation = null;
  ptRadioStatus();
  ptRadioSync();
  if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = 'paused'; } catch (e) {} }
}

function ptRadioDestroyHls() {
  const hls = ptRadioHls; ptRadioHls = null;
  if (hls) { try { hls.destroy(); } catch (e) { /* ignore */ } }
}

function ptRadioStartPlayback(st, attempt) {
  const a = ptRadioAudio;
  if (!a || attempt !== ptRadioAttempt) return;
  ptRadioStatus(); ptRadioSync(); ptRadioPaintMediaSession();
  const p = a.play();
  if (p && typeof p.catch === 'function') {
    p.catch((err) => {
      if (attempt !== ptRadioAttempt) return;
      if (err && err.name === 'NotAllowedError') {
        ptRadioBlocked = true;
        ptRadioStatus(); ptRadioSync();
        return;
      }
      ptRadioFail(st, attempt);
    });
  }
}

/* Load one rung of the ladder. Everything async carries `attempt`, so a slow
   rejection from a source we have already moved past cannot mark the station
   failed or knock it back a rung. */
function ptRadioPlay(st) {
  const a = ptRadioAudio;
  if (!a) return;
  const attempt = ++ptRadioAttempt;
  ptRadioDestroyHls();
  ptRadioBlocked = false;
  const source = st.sources[ptRadioTry];
  if (!source) { ptRadioFail(st, attempt); return; }
  if (source.type === 'hls') {
    let hlsSupported = false;
    try { hlsSupported = !!(window.Hls && window.Hls.isSupported()); } catch (e) { /* unsupported */ }
    if (hlsSupported) {
      const hls = new window.Hls({ enableWorker: false });
      ptRadioHls = hls;
      hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (attempt !== ptRadioAttempt || !data || !data.fatal) return;
        ptRadioDestroyHls();
        ptRadioFail(st, attempt);
      });
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => ptRadioStartPlayback(st, attempt));
      hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
        if (attempt === ptRadioAttempt) hls.loadSource(source.url);
      });
      hls.attachMedia(a);
      ptRadioStatus(); ptRadioSync(); ptRadioPaintMediaSession();
      return;
    }
    if (!a.canPlayType || !a.canPlayType('application/vnd.apple.mpegurl')) {
      ptRadioFail(st, attempt); return;
    }
  }
  a.src = source.url;
  a.load();
  ptRadioStatus();
  ptRadioSync();
  ptRadioPaintMediaSession();
  ptRadioStartPlayback(st, attempt);
}

/* One failure handler for both failure paths (play() rejecting and the element
   firing `error`): step down the ladder, and only surface an error once the
   last rung is spent. */
function ptRadioFail(st, attempt) {
  if (attempt !== ptRadioAttempt) return;
  if (!ptRadioStation || ptRadioStation.id !== st.id) return;   // superseded
  if (ptRadioTry + 1 < st.sources.length) { ptRadioTry += 1; ptRadioPlay(st); return; }
  ptRadioError = true;
  ptRadioStatus();
  ptRadioSync();
}

function ptRadioToggle(st) {
  const a = ptRadioAudio;
  if (!a) return;
  // Same station already sounding → the button is a stop button.
  if (ptRadioStation && ptRadioStation.id === st.id && !a.paused && !ptRadioError) { ptRadioStop(); return; }

  ptRadioStation = st;
  ptRadioError = false;
  ptRadioTry = 0;
  ptRadioPlay(st);
}

function ptRadioInit() {
  const a = ptEl('radioAudio');
  if (!a || !ptEl('radioBar')) return;
  ptRadioAudio = a;

  const vol = ptEl('radioVol');
  const saved = parseFloat(localStorage.getItem('ptrv'));
  a.volume = isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 1;
  if (vol) {
    vol.value = String(a.volume);
    vol.addEventListener('input', () => {
      const v = Math.min(1, Math.max(0, parseFloat(vol.value) || 0));
      a.volume = v;
      try { localStorage.setItem('ptrv', String(v)); } catch (e) { /* private mode */ }
    });
  }

  for (const st of PT_RADIO_STATIONS) {
    const btn = ptEl(ptBtnId(st));
    if (btn) btn.addEventListener('click', () => ptRadioToggle(st));
  }

  a.addEventListener('playing', () => {
    ptRadioError = false;
    ptRadioBlocked = false;
    ptRadioStatus(); ptRadioSync(); ptRadioPaintMediaSession();
    if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = 'playing'; } catch (e) {} }
  });
  a.addEventListener('pause', () => { ptRadioStatus(); ptRadioSync(); });
  a.addEventListener('error', () => { if (ptRadioStation && !ptRadioHls) ptRadioFail(ptRadioStation, ptRadioAttempt); });

  /* Never talk over another audio source: the adhan, the pre-prayer beep or a
     surah. `play` does not bubble, but a capture listener on document still
     sees it, which covers the Quran player that this file cannot reach. */
  document.addEventListener('play', (e) => {
    const el = e.target;
    if (!el || el.tagName !== 'AUDIO' || el === a) return;
    if (!a.paused) ptRadioStop();
  }, true);

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => { if (ptRadioStation) ptRadioToggle(ptRadioStation); });
      navigator.mediaSession.setActionHandler('pause', () => ptRadioStop());
      navigator.mediaSession.setActionHandler('stop', () => ptRadioStop());
    } catch (e) { /* unsupported action names */ }
  }
}

/* ═══ DOWNLOADS: verified release → bar ═══ */
function ptApplyRelease() {
  const elMeta = ptEl('dlAndroidMeta');
  if (elMeta) {
    const size = PT_RELEASE.mb ? PT_RELEASE.mb + ' ' + t('dl.unitMB') : t('dl.sizePending');
    elMeta.textContent = t('dl.verPrefix') + PT_RELEASE.version + ' · ' + size + ' · ' + t('dl.androidReq');
  }
  const elBtn = ptEl('dlAndroidBtn');
  if (elBtn && PT_RELEASE.available) {
    elBtn.href = PT_REPO + '/releases/download/v' + PT_RELEASE.version + '/' + PT_RELEASE.apk;
    elBtn.removeAttribute('aria-disabled');
    elBtn.removeAttribute('tabindex');
  } else if (elBtn) {
    elBtn.removeAttribute('href');
    elBtn.setAttribute('aria-disabled', 'true');
    elBtn.setAttribute('tabindex', '-1');
  }
  const elTag = ptEl('dlRelTag');
  if (elTag) {
    elTag.hidden = !PT_RELEASE.available;
    if (PT_RELEASE.available) elTag.textContent = t('dl.latestPrefix') + 'v' + PT_RELEASE.version;
  }
  const androidHelp = ptEl('dlAndroidHelp');
  if (androidHelp) androidHelp.hidden = !PT_RELEASE.available;
}

/* ═══ i18n — called from applyLang() on every language switch ═══ */
function applyExtrasLang() {
  const set = (id, key) => { const el = ptEl(id); if (el) el.textContent = t(key); };

  set('dlTitle', 'dl.title');
  set('dlLead', 'dl.lead');
  set('dlAndroidT', 'dl.androidT');
  set('dlAndroidBtnT', PT_RELEASE.available ? 'dl.androidBtn' : 'dl.androidPending');
  set('dlCodeT', 'dl.codeT');
  set('dlCodeBtnT', 'dl.codeBtn');
  set('dlRelT', 'dl.relT');
  set('dlRelBtnT', 'dl.relBtn');
  set('dlFootT', 'dl.footT');
  set('dlNote', 'dl.note');
  set('dlAndT', 'dl.andT');
  set('dlAnd1', 'dl.and1');
  set('dlAnd2', 'dl.and2');
  set('dlAnd3', 'dl.and3');
  set('dlWebT', 'dl.webT');
  ptApplyRelease();

  set('radioTitle', 'radio.title');
  for (const st of PT_RADIO_STATIONS) {
    set(ptBtnId(st) + 'Name', st.nameKey);
    set(ptBtnId(st) + 'Sub', st.subKey);
  }
  const vol = ptEl('radioVol');
  if (vol) vol.setAttribute('aria-label', t('radio.vol'));

  ptRadioStatus();
  ptRadioSync();
  ptRadioPaintMediaSession();
}

window.applyExtrasLang = applyExtrasLang;

/* ═══ Hash routes ═══
   This app is a single page: "navigation" is a class swap, so a shared link
   like .../prayer-times/#/quran used to mean nothing. The router keeps the hash
   in sync with whichever page is open (replaceState — no extra history entry,
   no reload) and re-opens it on load and on hashchange.

   `#downloads` (the old anchor, with or without the slash) is still honoured
   and resolves to the Download page, so links already shared keep working. */
const PT_ROUTE_PAGES = ['prayers', 'calendar', 'qibla', 'quran', 'names', 'dhikr', 'stats', 'downloads', 'contact', 'settings', 'mhome'];
let ptRouterInstalled = false;
let ptRouterOn = false;      // hash writes stay off until the app has booted
let ptRouterQuiet = false;   // a navigation we started ourselves from the hash
let ptPendingRoute = null;   // the route the URL asked for, before boot clobbers it
let ptCurrentRoute = null;   // current in-app page, including the no-hash prayers root
let ptBootHold = 0;          // ms timestamp: boot navigations must not rewrite the hash

function ptRouteFromHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '').trim();
  if (!raw) return null;
  const page = raw.split('?')[0];
  if (page === 'downloads') return 'downloads';
  return PT_ROUTE_PAGES.indexOf(page) === -1 ? null : page;
}

function ptGoSilently(name) {
  ptRouterQuiet = true;
  try { window.gotoPage(name); } finally { ptRouterQuiet = false; }
}

function ptRestoreHash(route) {
  const want = '#/' + route;
  if (location.hash === want) return;
  ptRouterQuiet = true;
  try { history.replaceState(null, '', want); } catch (e) { /* file:// or older engine */ }
  ptRouterQuiet = false;
}

/* ═══ Download page ═══
   No scrolling needed any more — the downloads live on their own page — but the
   link still has to land somewhere sensible: focus goes to the list so keyboard
   and screen-reader users arrive where the link promised, instead of being left
   on <body> with no idea the view changed. preventScroll keeps focus from
   nudging the page. */
function ptOpenDownloads() {
  if (typeof window.gotoPage !== 'function') return;
  ptGoSilently('downloads');
  /* Focus the heading, not the panel: it is what a screen reader should read
     first, and a focus ring drawn around a 960px panel reads as a broken double
     border. */
  const el = ptEl('dlTitle');
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
}

function ptApplyRoute(target = ptRouteFromHash()) {
  if (!target) return;
  ptCurrentRoute = target;
  if (target === 'downloads') { ptOpenDownloads(); return; }
  if (typeof window.gotoPage !== 'function') return;
  ptGoSilently(target);
}

function ptHandleHistoryNavigation() {
  const route = ptRouteFromHash();
  if (!route && location.hash) return; // ignore an unknown, non-empty route
  const target = route || 'prayers';
  if (target === ptCurrentRoute) return;
  ptCurrentRoute = target;
  ptApplyRoute(target);
}

function ptSyncHash(name) {
  if (!ptRouterOn || ptRouterQuiet) return;
  /* Boot is not navigation. app.js settles the viewport mode on load by calling
     gotoPage('prayers'), and that call used to overwrite a #/downloads link the
     visitor had just opened — the page was right for one frame, then the URL
     said prayers and the next reload obeyed the URL. The hold expires on its own
     and is cut short by the visitor's first click, so a real navigation is never
     swallowed. */
  if (Date.now() < ptBootHold) return;
  const route = name === 'mhome' ? 'prayers' : name;
  const want = '#/' + route;
  if (route === ptCurrentRoute && (location.hash === want || !location.hash)) return;
  if (location.hash === want) { ptCurrentRoute = route; return; }
  ptCurrentRoute = route;
  ptRouterQuiet = true;
  /* finally, not a trailing line: this flag gates EVERY later hash write, so
     letting an exception (or an early return added later) skip the reset would
     freeze the URL on the previous page for the rest of the session. */
  try { history.pushState({ ptRoute: route }, '', want); }
  catch (e) { try { history.replaceState(null, '', want); } catch (ignored) { /* file:// */ } }
  finally { ptRouterQuiet = false; }
}

function ptInstallRouter() {
  if (ptRouterInstalled || typeof window.gotoPage !== 'function') return;
  ptRouterInstalled = true;
  const orig = window.gotoPage;
  window.gotoPage = function (name) {
    const r = orig.call(this, name);
    try { ptSyncHash(name); } catch (e) { /* never break navigation over a hash */ }
    return r;
  };
}

function ptExtrasInit() {
  ptRadioInit();
  applyExtrasLang();
  ptInstallRouter();

  /* Remember the route the URL asked for, then open it. Remembering matters:
     the app boots into 'prayers' once the viewport mode settles, which would
     otherwise wipe a #/quran deep link before it could be honoured. */
  const wanted = ptRouteFromHash();
  if (wanted) { ptPendingRoute = wanted; ptApplyRoute(); }
  else ptCurrentRoute = 'prayers';

  window.addEventListener('load', () => {
    ptRouterOn = true;
    ptBootHold = Date.now() + 900;
    if (!ptPendingRoute) { setTimeout(() => { ptBootHold = 0; }, 900); return; }
    const route = ptPendingRoute;
    const settle = () => { if (ptPendingRoute === route) { ptApplyRoute(); ptRestoreHash(route); } };
    settle();
    setTimeout(settle, 140);     // after the resize / mobile-mode debounce
    setTimeout(() => { ptBootHold = 0; }, 900);
  });

  /* The hold above exists for one reason; a click is the visitor disagreeing
     with it, so it ends there. */
  document.addEventListener('pointerdown', () => { ptBootHold = 0; }, { capture: true, passive: true });

  window.addEventListener('popstate', ptHandleHistoryNavigation);
  window.addEventListener('hashchange', ptHandleHistoryNavigation);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ptExtrasInit);
else ptExtrasInit();
