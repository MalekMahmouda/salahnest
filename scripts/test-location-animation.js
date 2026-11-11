'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const pages = fs.readFileSync(path.join(__dirname, '../js/pages3.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../prayer-times.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../styles/motion.css'), 'utf8');
const helper = app.match(/^function animateLocationArrival\(\) \{[\s\S]*?^\}/m);
assert.ok(helper, 'location arrival helper exists');

function runHelper({ reduced = false, dir = 'ltr', repeat = false } = {}) {
  const classes = new Set();
  let timer;
  let timerCount = 0;
  const styles = new Map();
  const plane = { style: { setProperty: (name, value) => styles.set(name, value) } };
  const chip = {
    classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
    clientWidth: 210,
    offsetWidth: 210,
    querySelector: selector => selector === '.loc-flight-plane' ? plane : null,
  };
  const context = {
    $: id => id === 'tbLoc' ? chip : null,
    _locationArrivalTimer: null,
    clearTimeout() {},
    document: { documentElement: { dir } },
    getComputedStyle: () => ({ getPropertyValue: name => name === '--t-location-arrival' ? '480ms' : '' }),
    setTimeout: (fn, ms) => { timer = { fn, ms }; timerCount++; return 7; },
    window: { matchMedia: () => ({ matches: reduced }) },
  };
  vm.runInNewContext(`${helper[0]}\nanimateLocationArrival();${repeat ? '\nanimateLocationArrival();' : ''}`, context);
  return { classes, styles, timer, timerCount };
}

let tests = 0;
function test(name, fn) { fn(); tests++; console.log('PASS', name); }

test('flight uses the shared short duration, width-aware travel, and RTL mirroring', () => {
  const ltr = runHelper();
  assert.ok(ltr.classes.has('loc-arriving'));
  assert.equal(ltr.styles.get('--flight-x'), '-179px');
  assert.equal(ltr.styles.get('--flight-x-mid'), '-89.5px');
  assert.equal(ltr.styles.get('--flight-x-near'), '-161.1px');
  assert.equal(ltr.timer.ms, 512);
  ltr.timer.fn();
  assert.ok(!ltr.classes.has('loc-arriving'));
  const rtl = runHelper({ dir: 'rtl' });
  assert.equal(rtl.styles.get('--flight-x'), '179px');
  assert.equal(rtl.styles.get('--flight-x-mid'), '89.5px');
  assert.equal(rtl.styles.get('--flight-x-near'), '161.1px');
  const repeated = runHelper({ repeat: true });
  assert.equal(repeated.timerCount, 1, 'a second success during flight does not restart the cue');
});

test('reduced-motion preference prevents the location flight entirely', () => {
  const reduced = runHelper({ reduced: true });
  assert.equal(reduced.classes.size, 0);
  assert.equal(reduced.timer, undefined);
  assert.equal(reduced.styles.size, 0);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.tb-loc\.loc-arriving \.loc-flight\{display:none\}/);
});

test('only successful explicit city, GPS, and saved-location changes trigger the cue', () => {
  const citySearch = app.match(/^async function fetchByCity\([\s\S]*?^\}/m);
  const gpsSuccess = app.match(/^function applyGPSPosition\([\s\S]*?^\}/m);
  assert.ok(citySearch && gpsSuccess, 'city and GPS handlers exist');
  assert.match(citySearch[0], /if \(userInitiated\) animateLocationArrival\(\)/);
  assert.match(app, /fetchByCity\(c,\s*\$\('cntryInp'\)\.value\.trim\(\),\s*true\)/);
  assert.match(gpsSuccess[0], /if \(userInitiated\) \{\s*closeLocModal\(\);\s*animateLocationArrival\(\);\s*\}/);
  assert.match(pages, /updateLocNames\(\);\s*animateLocationArrival\(\);/);
  assert.match(html, /<button class="tb-loc" id="tbLoc" type="button"[\s\S]*?<span class="loc-flight" aria-hidden="true">/);
  assert.match(html, /id="btnSetLoc"[^>]*>/);
  assert.match(app, /\$\('btnSetLoc'\)\.onclick = setManualLoc/);
});

test('flight uses only transform/opacity motion, leaves labels in place, and has no input listener', () => {
  const block = css.match(/\/\* ── 11\. Location change[\s\S]*?\/\* hover only where/);
  assert.ok(block, 'location motion block exists');
  assert.match(css, /:root\{--t-location-arrival:480ms\}/);
  assert.match(block[0], /animation:pt-location-route var\(--t-location-arrival\)/);
  assert.match(block[0], /@keyframes pt-location-flight[\s\S]*?transform:translate3d\(var\(--flight-x\),3px,0\)/);
  assert.match(block[0], /@keyframes pt-location-route[\s\S]*?78%\{opacity:\.32\}100%\{opacity:0\}/);
  assert.match(block[0], /@keyframes pt-location-flight[\s\S]*?100%\{[^}]*opacity:0\}/);
  assert.match(css, /\[dir="rtl"\] \.loc-flight-route\{transform:scaleX\(-1\)\}/);
  assert.match(html, /class="loc-flight-route"[^>]*><path d="M92 11 C72 2 35 2 8 14"/);
  assert.doesNotMatch(block[0], /@keyframes pt-location-flight[\s\S]*?(?:^|[;{}])(?:left|right|top|bottom|inset-inline-start):/m);
  assert.doesNotMatch(app, /cityInp[^\n]*addEventListener[^\n]*animateLocationArrival/);
});

console.log(`${tests} location-animation tests passed.`);
