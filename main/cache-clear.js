'use strict';

const APP_ORIGIN = 'file://';

/**
 * Clear Electron's transient Chromium cache without touching user content.
 * In particular, do not add localstorage or indexdb to the storage list:
 * SalahNest settings, prayer logs, bookmarks, and other saved data live there.
 */
async function clearDesktopCache(session) {
  if (!session || typeof session.clearCache !== 'function' || typeof session.clearStorageData !== 'function') {
    throw new TypeError('A valid Electron session is required');
  }

  await Promise.all([
    session.clearCache(),
    // The main BrowserWindow loads the packaged app from file://. Scope this
    // storage cleanup to that app origin rather than every origin in the session.
    session.clearStorageData({ origin: APP_ORIGIN, storages: ['cachestorage', 'serviceworkers'] }),
  ]);
  return { ok: true };
}

module.exports = { clearDesktopCache };
