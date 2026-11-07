'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/extras.js'), 'utf8');
const start = source.indexOf('const PT_ROUTE_PAGES =');
const end = source.indexOf('\nfunction ptExtrasInit()', start);
assert.ok(start >= 0 && end > start, 'router implementation is present');
const router = source.slice(start, end);

function setup() {
  const entries = [{ hash: '' }];
  let index = 0;
  const state = { page: 'prayers', pages: [] };
  const location = {};
  Object.defineProperty(location, 'hash', { get: () => entries[index].hash });
  const history = {
    pushState(_state, _title, url) {
      entries.splice(index + 1);
      entries.push({ hash: new URL(url, 'https://app.example').hash });
      index = entries.length - 1;
    },
    replaceState(_state, _title, url) { entries[index].hash = new URL(url, 'https://app.example').hash; },
    back() { if (index > 0) index--; },
  };
  const window = { gotoPage(page) { state.page = page; state.pages.push(page); return page; }, addEventListener() {} };
  const context = vm.createContext({ window, location, history, Date, setTimeout: () => 0, ptEl: () => null });
  vm.runInContext(`${router}\nptCurrentRoute = 'prayers'; ptRouterOn = true; ptInstallRouter();`, context, { filename: 'extras-router.js' });
  return { context, state, location, history };
}

const h = setup();
h.context.window.gotoPage('quran');
assert.equal(h.location.hash, '#/quran');
assert.equal(h.state.page, 'quran');
h.context.window.gotoPage('qibla');
assert.equal(h.location.hash, '#/qibla');
assert.equal(h.state.page, 'qibla');
h.history.back();
vm.runInContext('ptHandleHistoryNavigation()', h.context);
assert.equal(h.state.page, 'quran', 'Back returns to the previous in-app page');
assert.equal(h.location.hash, '#/quran');
h.history.back();
vm.runInContext('ptHandleHistoryNavigation()', h.context);
assert.equal(h.state.page, 'prayers', 'Back from the first in-app route returns to prayers, not the previous document');
assert.equal(h.location.hash, '', 'the no-hash root stays a valid prayers route');
const routeCount = h.state.pages.length;
vm.runInContext('ptHandleHistoryNavigation()', h.context);
assert.equal(h.state.pages.length, routeCount, 'duplicate popstate/hashchange processing is idempotent');

assert.match(source, /window\.addEventListener\('popstate', ptHandleHistoryNavigation\)/);
assert.match(source, /history\.pushState\(\{ ptRoute: route \}, '', want\)/);
console.log('Router regression tests passed: pushState navigation, Back history, root fallback, and duplicate-event idempotence.');
