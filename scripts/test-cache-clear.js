'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { clearDesktopCache } = require('../main/cache-clear');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/cache-clear.js'), 'utf8');
let checks = 0;
function pass(name) { checks++; console.log('PASS', name); }
function makeBrowser({ cacheNames = [], registrations = [], desktopBridge = null } = {}) {
  const deleted = [];
  const caches = {
    keys: async () => cacheNames,
    delete: async (name) => { deleted.push(name); return true; },
  };
  const serviceWorker = { getRegistrations: async () => registrations };
  const window = {
    caches,
    navigator: { serviceWorker },
    location: { href: 'https://malekmahmouda.github.io/salahnest/index.html#/settings' },
  };
  if (desktopBridge) window.ptDesktop = desktopBridge;
  const context = vm.createContext({ window, URL });
  vm.runInContext(source, context, { filename: 'cache-clear.js' });
  return { api: window.SalahNestCache, deleted, window };
}

(async () => {
  {
    const unregistered = [];
    const appScope = 'https://malekmahmouda.github.io/salahnest/';
    const browser = makeBrowser({
      cacheNames: ['pt-cache-20261111120000', 'pt-cache-old', 'another-app-cache'],
      registrations: [
        { scope: appScope, unregister: async () => { unregistered.push('app'); return true; } },
        { scope: 'https://malekmahmouda.github.io/', unregister: async () => { unregistered.push('root'); return true; } },
        { scope: 'https://malekmahmouda.github.io/other-app/', unregister: async () => { unregistered.push('other'); return true; } },
      ],
    });
    const result = await browser.api.clearWebCache(browser.window);
    assert.deepEqual(browser.deleted, ['pt-cache-20261111120000', 'pt-cache-old']);
    assert.deepEqual(unregistered, ['app']);
    assert.equal(result.cachesDeleted, 2);
    assert.equal(result.serviceWorkersUnregistered, 1);
    pass('web clears only SalahNest cache names and its exact service-worker scope');
  }

  {
    const calls = [];
    const session = {
      clearCache: async () => { calls.push(['clearCache']); },
      clearStorageData: async (options) => { calls.push(['clearStorageData', options]); },
    };
    const result = await clearDesktopCache(session);
    assert.deepEqual(calls, [
      ['clearCache'],
      ['clearStorageData', { origin: 'file://', storages: ['cachestorage', 'serviceworkers'] }],
    ]);
    assert.deepEqual(result, { ok: true });
    assert.equal(calls[1][1].origin, 'file://');
    assert.ok(!calls[1][1].storages.includes('localstorage'));
    assert.ok(!calls[1][1].storages.includes('indexdb'));
    pass('Electron clears Chromium cache and only service-worker/cache storage, preserving localStorage and IndexedDB');
  }

  {
    let desktopCalls = 0;
    const browser = makeBrowser({
      desktopBridge: { clearCache: async () => { desktopCalls++; return { ok: true }; } },
    });
    const result = await browser.api.clear(browser.window);
    assert.equal(desktopCalls, 1);
    assert.deepEqual(result.desktop, { ok: true });
    pass('desktop renderer invokes the Electron cache-clear bridge as well as web-origin cleanup');
  }

  {
    await assert.rejects(() => clearDesktopCache({ clearCache: async () => {} }), /valid Electron session/);
    pass('Electron helper rejects invalid sessions instead of reporting a false success');
  }

  console.log(`${checks} cache-clear checks passed.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
