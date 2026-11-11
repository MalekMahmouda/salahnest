'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('prayer-times.html');
const app = read('js/app.js');
const pages = read('js/pages.js');
const pages3 = read('js/pages3.js');
const reader = read('js/reader.js');
const css = read('styles/app.css');
const earlyLocale = read('js/early-locale.js');
const buildWeb = read('scripts/build-web.js');
const buildWww = read('scripts/build-www.js');
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('PASS', name); }

test('saved Arabic sets RTL metadata before styles and ships in both web builds', () => {
  assert.match(html, /js\/early-locale\.js[\s\S]*?styles\/app\.css/);
  assert.match(earlyLocale, /localStorage\.getItem\('ptlg'\) === 'ar'/);
  assert.match(earlyLocale, /document\.documentElement\.dir = 'rtl'/);
  assert.match(buildWww, /'early-locale\.js'/);
  assert.match(buildWeb, /'js\/early-locale\.js'/);
});

test('sidebar theme and Asr options are translated in both languages', () => {
  assert.match(html, /id="sbThemeLbl"/);
  assert.match(app, /sidebarTheme\.textContent = t\('set\.theme'\)/);
  assert.match(app, /madhabSelect\.options\[0\]\.textContent = t\('set\.shafi'\)/);
  assert.match(app, /madhabSelect\.options\[1\]\.textContent = t\('set\.hanafi'\)/);
});

test('icon-only navigation and reader controls receive localized accessible names', () => {
  assert.match(app, /const iconButtonLabels = \{/);
  assert.match(app, /button\.setAttribute\('aria-label', label\)/);
  assert.match(app, /navJump\.setAttribute\('aria-label', t\('nav\.settings'\)\)/);
});

test('calendar days are native buttons with a readable date and selected state', () => {
  assert.match(pages, /<button type="button" class="cal-cell[\s\S]*?aria-label="\$\{dateLabel\}" aria-pressed="\$\{isSel\}"/);
  assert.match(pages, /querySelectorAll\('\.cal-cell\[data-d\]'\)/);
});

test('dhikr counter is a named button and Space does not double-count from controls', () => {
  assert.match(html, /<button class="dhikr-ring" id="dhikrRing" type="button" aria-describedby="dhikrHint"/);
  assert.match(pages, /ring\.setAttribute\('aria-label', `\$\{t\('dhikr\.count'\)\}/);
  assert.match(pages, /target\.closest\('button,a,input,select,textarea,\[contenteditable="true"\]'\)/);
});

test('Quran verses, search results, and bookmarks support keyboard activation', () => {
  assert.match(reader, /class="ayah-inline[\s\S]*?role="button" tabindex="0"/);
  assert.match(reader, /el\.addEventListener\('keydown', \(e\) => \{[\s\S]*?openVpop/);
  assert.match(reader, /class="qs-hit"[^\n]*role="button" tabindex="0"/);
  assert.match(reader, /class="bmm"[^\n]*role="button" tabindex="0"/);
  assert.match(reader, /aria-label="\$\{S\.lang === 'ar' \? 'إزالة العلامة المرجعية' : 'Remove bookmark'\}"/);
});

test('full-screen adhan dialog has focus handling, Escape close, and a tab trap', () => {
  assert.match(html, /id="azanOverlay"[^>]*role="dialog"[^>]*tabindex="-1"/);
  assert.match(app, /let _azanOpener = null/);
  assert.match(app, /const opener = _azanOpener/);
  assert.match(app, /if \(_azanOpen\) \{[\s\S]*?e\.key === 'Escape'[\s\S]*?e\.key === 'Tab'[\s\S]*?dialog\.contains\(document\.activeElement\)/);
});

test('all closed overlays are inert/hidden and opening or closing them synchronizes state', () => {
  for (const id of ['mMoreSheet', 'locOverlay', 'nameOverlay', 'txtModal', 'azanOverlay']) {
    const tag = html.match(new RegExp(`<[^>]+id="${id}"[^>]*>`));
    assert.ok(tag, `${id} exists`);
    assert.match(tag[0], /\binert(?:\s|>)/, `${id} starts inert`);
    assert.match(tag[0], /aria-hidden="true"/, `${id} starts hidden from assistive technology`);
  }
  assert.match(css, /\.overlay\{[^}]*visibility:hidden/);
  assert.match(css, /\.azan-screen\{[^}]*visibility:hidden/);
  assert.match(app, /function setLayerOpen\(el, open\)/);
  assert.match(app, /el\.setAttribute\('aria-hidden', String\(!isOpen\)\)/);
  assert.match(pages, /window\.setLayerOpen\(overlay, true\)/);
  assert.match(pages, /function closeNameOverlay\(\)[\s\S]*?window\.setLayerOpen\(overlay, false\)/);
  assert.match(app, /opener\.focus\(\)/);
});

test('calendar cells have enough mobile height for Hijri dates', () => {
  assert.match(css, /\.cal-cell\{[^}]*aspect-ratio:auto;min-height:58px/);
});

test('remaining history, Quran, calendar, stats, and Android adhan labels use translations', () => {
  const data = read('js/data.js');
  assert.match(data, /tabsSurahs: 'Surahs'/);
  assert.match(data, /tabsSurahs: 'السور'/);
  assert.match(data, /androidAdhanNote: '[^']+'/);
  assert.match(data, /androidAdhanNote: 'على أندرويد/);
  assert.match(app, /histLbl = \$\('lblHist'\); if \(histLbl\) histLbl\.textContent = t\('hist\.title'\)/);
  assert.match(app, /\['qtList', 'quran\.tabsSurahs'\]/);
  assert.match(app, /calToday\.textContent = t\('cal\.todayBtn'\)/);
  assert.match(app, /statsToday\.textContent = t\('today'\)/);
  assert.match(app, /applyAndroidAdhanNotesLang\(\)/);
  assert.match(pages, /t\('set\.defaultMuadhdhin'\)/);
  assert.match(pages, /title="\$\{t\('set\.volume'\)\}"/);
});

test('Stats headings, legend, note, and prayer-count labels are bilingual', () => {
  const data = read('js/data.js');
  const en = data.match(/\ben:\s*\{[\s\S]*?stats:\s*\{([\s\S]*?)\n    \},\s*set:\s*\{/);
  const ar = data.match(/\bar:\s*\{[\s\S]*?stats:\s*\{([\s\S]*?)\n    \},\s*set:\s*\{/);
  assert.ok(en, 'English Stats dictionary exists');
  assert.ok(ar, 'Arabic Stats dictionary exists');
  const keys = ['streaks', 'thisWeek', 'thisMonth', 'last30Days', 'byPrayer', 'completed', 'partial', 'missed', 'doneCount', 'missedCount', 'note'];
  const requiredKeys = [...keys, 'noHistory'];
  for (const key of requiredKeys) {
    assert.match(en[1], new RegExp(`\\b${key}:`), `English Stats translation exists: ${key}`);
    assert.match(ar[1], new RegExp(`\\b${key}:`), `Arabic Stats translation exists: ${key}`);
  }
  for (const id of ['stStreakH', 'stWeekH', 'stMonthH', 'stChartH', 'stPerPrayerH', 'stChartLegend', 'stLegendCompleted', 'stLegendPartial', 'stLegendMissed', 'stNote']) {
    assert.ok(html.includes(`id="${id}"`), `${id} exists in the Stats screen`);
  }
  for (const key of ['streaks', 'thisWeek', 'thisMonth', 'last30Days', 'byPrayer', 'completed', 'partial', 'missed', 'note']) {
    assert.ok(app.includes(`'stats.${key}'`), `language switch maps stats.${key}`);
  }
  assert.match(app, /el\.textContent = t\(key\)/, 'mapped Stats labels use the selected dictionary');
  assert.match(pages3, /t\('stats\.doneCount'\)/);
  assert.match(pages3, /t\('stats\.missedCount'\)/);
  assert.match(pages3, /t\('stats\.noHistory'\)/, 'empty chart message uses the active language');
  assert.match(pages3, /class="stats-empty" role="status"/, 'empty state is announced as status content');
  assert.match(app, /if \(window\.renderStatsIfVisible\) window\.renderStatsIfVisible\(\);/, 'visible Stats chart re-renders after a language change');
});

test('Sahara primary text accent clears AA on the page background and matches its picker swatch', () => {
  const block = css.match(/\[data-theme="sahara"\]\{([^}]+)\}/);
  assert.ok(block, 'Sahara theme tokens exist');
  const bg = block[1].match(/--bg:(#[0-9a-f]{6})/i)?.[1];
  const primary = block[1].match(/--primary:(#[0-9a-f]{6})/i)?.[1];
  assert.ok(bg && primary, 'Sahara background and primary colors are defined');
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(pair => parseInt(pair, 16) / 255);
    const linear = rgb.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const a = luminance(bg), b = luminance(primary);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert.ok(ratio >= 4.5, `Sahara primary contrast ${ratio.toFixed(2)}:1 is below 4.5:1`);
  const data = read('js/data.js');
  assert.match(data, /id: 'sahara',[^}]*color: '#b25209', preview: \['#f8f1e4', '#fffaf0', '#b25209'/);
});

test('reduced-motion media query removes transitions', () => {
  const block = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, 'reduced-motion media query exists');
  assert.match(block[1], /transition-property:none\s*!important/);
  assert.match(block[1], /transition-duration:0s\s*!important/);
  assert.doesNotMatch(block[1], /transition-duration:\.15s/);
});

console.log(`${tests} UI accessibility regression checks passed.`);
