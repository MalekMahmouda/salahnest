(function (root) {
  'use strict';

  const APP_CACHE_PREFIX = 'pt-cache-';

  async function clearWebCache(win = root) {
    const result = { cachesDeleted: 0, serviceWorkersUnregistered: 0 };
    const storage = win.caches;

    // The PWA cache is deliberately namespaced so other apps sharing an origin
    // (for example, other GitHub Pages projects) are left untouched.
    if (storage && typeof storage.keys === 'function' && typeof storage.delete === 'function') {
      const names = await storage.keys();
      const appCaches = names.filter((name) => typeof name === 'string' && name.startsWith(APP_CACHE_PREFIX));
      const removed = await Promise.all(appCaches.map(async (name) => (await storage.delete(name)) ? 1 : 0));
      result.cachesDeleted = removed.reduce((total, count) => total + count, 0);
    }

    const serviceWorkers = win.navigator && win.navigator.serviceWorker;
    if (serviceWorkers && typeof serviceWorkers.getRegistrations === 'function' && win.location) {
      const appScope = new URL('./', win.location.href).href;
      const registrations = await serviceWorkers.getRegistrations();
      const appRegistrations = registrations.filter((registration) =>
        registration && registration.scope === appScope && typeof registration.unregister === 'function');
      const removed = await Promise.all(appRegistrations.map(async (registration) =>
        (await registration.unregister()) ? 1 : 0));
      result.serviceWorkersUnregistered = removed.reduce((total, count) => total + count, 0);
    }

    return result;
  }

  async function clear(win = root) {
    const desktop = win.ptDesktop
      ? Promise.resolve().then(() => {
        if (typeof win.ptDesktop.clearCache !== 'function') throw new Error('Desktop cache bridge unavailable');
        return win.ptDesktop.clearCache();
      })
      : Promise.resolve(null);
    const [webResult, desktopResult] = await Promise.all([clearWebCache(win), desktop]);
    if (desktopResult && desktopResult.ok === false) throw new Error('Desktop cache clear failed');
    return { web: webResult, desktop: desktopResult };
  }

  root.SalahNestCache = Object.freeze({ clear, clearWebCache });
})(window);
