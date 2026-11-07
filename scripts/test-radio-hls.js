'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('prayer-times.html');
const radio = read('js/extras.js');
const buildWww = read('scripts/build-www.js');
const buildWeb = read('scripts/build-web.js');
const pkg = JSON.parse(read('package.json'));

assert.equal(pkg.devDependencies['hls.js'], '1.7.4', 'Hls.js is pinned to the tested stable version');
assert.ok(fs.statSync(path.join(root, 'js/vendor/hls.min.js')).size > 100_000, 'local Hls.js bundle is present');
assert.match(read('js/vendor/HLS-LICENSE.txt'), /Apache License[\s\S]*Version 2\.0/);
assert.match(html, /<video id="radioAudio"[^>]*playsinline/);
const hlsScript = html.indexOf('<script src="js/vendor/hls.min.js">');
const radioScript = html.indexOf('<script src="js/extras.js">');
assert.ok(hlsScript >= 0 && radioScript > hlsScript, 'local Hls.js loads before the radio player');
assert.match(radio, /type: 'hls'/);
assert.match(radio, /Hls\.isSupported\(\)/);
assert.match(radio, /new window\.Hls\(\{ enableWorker: false \}\)/, 'HLS worker stays disabled, so no blob worker CSP permission is needed');
assert.match(radio, /https:\/\/service\.webvideocore\.net\/[^']+\.m3u8/);
assert.match(radio, /https:\/\/radio\.xecod\.com\/station\/quran-cairo/);
assert.match(radio, /https:\/\/stream\.radiojar\.com\/8s5u5tpdtwzuv/);

const cspTag = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
assert.ok(cspTag, 'strict CSP meta tag is present');
const csp = cspTag[1];
const connect = csp.match(/connect-src ([^;]+)/)[1];
const media = csp.match(/media-src ([^;]+)/)[1];
for (const origin of ['https://service.webvideocore.net', 'https://cdnvideo.webvideocore.net']) {
  assert.ok(connect.split(/\s+/).includes(origin), `CSP connect-src allows only the explicit HLS origin ${origin}`);
  assert.ok(media.split(/\s+/).includes(origin), `CSP media-src allows only the explicit HLS origin ${origin}`);
}
assert.match(media, /(^|\s)blob:/, 'CSP permits only the MediaSource blob URL used by Hls.js');
assert.match(csp, /script-src 'self'/);
assert.match(csp, /object-src 'none'/);
assert.doesNotMatch(connect + media, /webvideocore\.net\s*\*/);
assert.match(buildWww, /js', 'vendor', f/);
assert.match(buildWeb, /'js\/vendor\/hls\.min\.js'/, 'PWA service worker caches the local Hls.js bundle');
console.log('Radio HLS integration checks passed: local Hls.js, exact source hosts, CSP, Android/PWA copy, and offline cache.');
