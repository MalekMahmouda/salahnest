'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const capacitor = JSON.parse(read('capacitor.config.json'));
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('PASS', name); }

test('visible desktop branding changes without renaming package or Android identity', () => {
  assert.equal(pkg.productName, 'SalahNest');
  assert.equal(pkg.build.productName, 'SalahNest');
  assert.equal(pkg.name, 'prayertimes');
  assert.equal(lock.name, 'prayertimes');
  assert.equal(pkg.version, '1.6.5');
  assert.equal(pkg.build.appId, 'com.malek.prayertimes');
  assert.equal(pkg.build.win.artifactName, 'SalahNest-Setup-${version}.${ext}');
  assert.equal(pkg.build.nsis.shortcutName, 'SalahNest');
  assert.equal(pkg.build.nsis.uninstallDisplayName, 'SalahNest ${version}');
});

test('Capacitor visible app name changes while ID and Android URL scheme stay fixed', () => {
  assert.equal(capacitor.appName, 'SalahNest');
  assert.equal(capacitor.appId, 'com.malek.prayertimes');
  assert.equal(capacitor.server.androidScheme, 'https');
});

test('English and Arabic Android launcher/activity labels use SalahNest and retain package strings', () => {
  const en = read('android/app/src/main/res/values/strings.xml');
  const ar = read('android/app/src/main/res/values-ar/strings.xml');
  for (const xml of [en, ar]) {
    assert.match(xml, /name="app_name">SalahNest</);
    assert.match(xml, /name="title_activity_main">SalahNest</);
  }
  assert.match(en, /name="package_name">com\.malek\.prayertimes</);
  assert.match(en, /name="custom_url_scheme">com\.malek\.prayertimes</);
});

test('HTML shell title, sidebar, download heading, and About labels use SalahNest', () => {
  const html = read('prayer-times.html');
  assert.match(html, /<title>SalahNest \| Prayer Times/);
  assert.match(html, /id="sbTitle">SalahNest</);
  assert.match(html, /id="dlTitle"[^>]*>Get SalahNest</);
  assert.match(html, /id="aboutLine">SalahNest</);
  assert.match(html, /id="aboutVersion">SalahNest</);
});

test('English and Arabic app dictionaries use the same approved brand', () => {
  const data = read('js/data.js');
  assert.match(data, /appName: 'SalahNest', sub: 'Islamic Companion'/);
  assert.match(data, /appName: 'SalahNest', sub: 'رفيق إسلامي'/);
  assert.match(data, /title: 'Get SalahNest'/);
  assert.match(data, /title: 'حمّل تطبيق SalahNest'/);
});

test('PWA metadata uses SalahNest at the approved new Pages hostname and path', () => {
  const build = read('scripts/build-web.js');
  assert.match(build, /const SITE_URL = 'https:\/\/malekmahmouda\.github\.io'/);
  assert.match(build, /const SITE_PATH = '\/salahnest\/'/);
  assert.match(build, /const SITE_TITLE = 'SalahNest \| Prayer Times/);
  assert.match(build, /og:site_name" content="SalahNest/);
  assert.match(build, /assets\/social-preview\.png/);
  assert.match(build, /name: 'SalahNest — Islamic Companion'/);
  assert.match(build, /short_name: 'SalahNest'/);
});

test('shared app brand surface and current GitHub links use the new mark and repository slug', () => {
  const html = read('prayer-times.html');
  assert.match(html, /assets\/salahnest-mark\.png/);
  assert.match(html, /https:\/\/github\.com\/MalekMahmouda\/salahnest/);
  assert.match(read('js/extras.js'), /https:\/\/github\.com\/MalekMahmouda\/salahnest/);
  assert.match(read('README.md'), /malekmahmouda\.github\.io\/salahnest\//);
  assert.match(read('README.ar.md'), /malekmahmouda\.github\.io\/salahnest\//);
});

test('Electron pins existing user data before opening the JSON store', () => {
  const main = read('main/main.js');
  const pin = main.indexOf("app.setPath('userData', legacyUserDataDir)");
  const store = main.indexOf('store = new JsonStore');
  assert.ok(pin >= 0 && pin < store, 'setPath must happen before any store reads userData');
  assert.match(main, /path\.join\(app\.getPath\('appData'\), 'Prayer Times'\)/);
  assert.match(main, /fs\.mkdirSync\(legacyUserDataDir, \{ recursive: true \}\)/);
});

test('desktop, widget, Android, web-test, and media-session labels use SalahNest', () => {
  for (const file of [
    'main/tray.js', 'main/main.js', 'js/widget.js', 'js/pages.js',
    'www-build/mobile-scheduler.js', 'js/extras.js', 'js/pages3.js',
  ]) assert.match(read(file), /SalahNest/, file);
});

test('published Android release has localized metadata and the verified APK link', () => {
  const extras = read('js/extras.js');
  const data = read('js/data.js');
  const html = read('prayer-times.html');
  assert.match(extras, /version: '1\.6\.6'/);
  assert.match(extras, /apk: 'SalahNest-1\.6\.6\.apk'/);
  assert.match(extras, /mb: '54\.66'/);
  assert.match(extras, /available: true/);
  assert.match(extras, /elBtn\.href = PT_REPO \+ '\/releases\/download\/v' \+ PT_RELEASE\.version \+ '\/' \+ PT_RELEASE\.apk/);
  assert.match(extras, /androidHelp\.hidden = !PT_RELEASE\.available/);
  assert.match(data, /androidBtn: 'Download APK for Android'/);
  assert.match(data, /androidBtn: 'تحميل ملف APK لأندرويد'/);
  assert.match(data, /sizePending: 'APK size unavailable'/);
  assert.match(data, /sizePending: 'حجم ملف APK غير متاح'/);
  assert.match(html, /id="dlAndroidMeta">Version 1\.6\.6 · 54\.66 MB · Android 7\.0\+</);
  assert.match(html, /id="dlAndroidBtn" href="https:\/\/github\.com\/MalekMahmouda\/salahnest\/releases\/download\/v1\.6\.6\/SalahNest-1\.6\.6\.apk"/);
  assert.match(html, /id="dlAndroidBtnT">Download APK for Android</);
  assert.doesNotMatch(html, /id="dlAndroidBtn"[^>]*(?:aria-disabled="true"|tabindex="-1")/);
  assert.doesNotMatch(html, /build pending|Final APK size pending/i);
  assert.doesNotMatch(data, /Android build pending|لم يكتمل بناء تطبيق أندرويد|Final APK size pending|سيُحدَّد حجم APK بعد اكتمال البناء/);
});

test('release helper and readmes use the new product name without moving stored data', () => {
  const release = read('scripts/make-release.js');
  assert.match(release, /productName\.replace/);
  assert.match(release, /Manual Test Checklist — \$\{productName\}/);
  assert.match(read('README.md'), /# SalahNest/);
  assert.match(read('README.md'), /dist\/SalahNest-Setup-1\.6\.5\.exe/);
  assert.match(read('README.md'), /%APPDATA%\\Prayer Times/);
  assert.match(read('README.ar.md'), /# SalahNest/);
  assert.match(read('README.ar.md'), /%APPDATA%\\Prayer Times/);
});

console.log(`${tests} product-brand regression checks passed.`);
