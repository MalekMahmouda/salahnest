'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('prayer-times.html');
const app = read('js/app.js');
const pages = read('js/pages.js');
const data = read('js/data.js');
const main = read('main/main.js');
const buildWeb = read('scripts/build-web.js');
const buildWww = read('scripts/build-www.js');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS', name); }

test('cache action is present in shared Data Management UI, not desktop-only', () => {
  assert.match(html, /id="btnClearCache"[^>]*type="button"/);
  assert.match(html, /id="cacheNote"/);
  assert.doesNotMatch(html.match(/<button[^>]*id="btnClearCache"[^>]*>/)?.[0] || '', /only-desktop/);
});

test('clear-cache label and warning are translated in English and Arabic', () => {
  const context = vm.createContext({});
  vm.runInContext(`${data}\nglobalThis.__T = T;`, context);
  for (const lang of ['en', 'ar']) {
    for (const key of ['clearCache', 'cacheNote', 'cacheConfirm', 'cacheCleared', 'cacheClearFailed']) {
      assert.ok(context.__T[lang].set[key], `${lang} has set.${key}`);
    }
  }
  assert.match(context.__T.en.set.cacheNote, /general browser cache/);
  assert.match(context.__T.ar.set.cacheNote, /ذاكرة المتصفح العامة/);
  assert.match(context.__T.en.set.cacheConfirm, /settings, prayer records, and saved content will stay/);
  assert.match(context.__T.ar.set.cacheConfirm, /سجلات الصلاة/);
  assert.match(app, /\$\('slClearCache'\)\.textContent = t\('set\.clearCache'\)/);
  assert.match(app, /\$\('cacheNote'\)\.textContent = t\('set\.cacheNote'\)/);
});

test('clear action requires confirmation and reports success or failure', () => {
  assert.match(pages, /if \(!confirm\(t\('set\.cacheConfirm'\)\)\) return/);
  assert.match(pages, /window\.SalahNestCache\.clear\(\)/);
  assert.match(pages, /showToast\(t\('set\.cacheCleared'\)\)/);
  assert.match(pages, /showToast\(t\('set\.cacheClearFailed'\)\)/);
});

test('Electron IPC accepts requests only from the main app renderer', () => {
  assert.match(main, /ipcMain\.handle\('pt:clear-cache', async \(e\) =>/);
  assert.match(main, /e\.sender !== win\.webContents/);
  assert.match(main, /clearDesktopCache\(win\.webContents\.session\)/);
});

test('web and mobile build pipelines include the cleanup helper in assets and the offline shell', () => {
  assert.match(html, /<script src="js\/cache-clear\.js"><\/script>/);
  assert.match(buildWww, /'cache-clear\.js'/);
  assert.match(buildWeb, /'js\/cache-clear\.js'/);
});

console.log(`${checks} cache-clear UI checks passed.`);
