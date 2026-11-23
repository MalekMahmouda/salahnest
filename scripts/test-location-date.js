'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const pages3 = fs.readFileSync(path.join(__dirname, '../js/pages3.js'), 'utf8');
const match = source.match(/^function locationDateKey\([\s\S]*?^\}/m);
assert.ok(match, 'locationDateKey helper exists');

function deviceDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function compile(engine) {
  return vm.runInNewContext(`(${match[0]})`, {
    Date, Intl, localDateKey: deviceDateKey, resolveTz: () => '',
    window: engine ? { PT_ENGINE: engine } : {},
  });
}

const instant = new Date('2026-10-25T16:30:00.000Z');
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('PASS', name); }

test('uses the local prayer engine location-day key when available', () => {
  const calls = [];
  const key = compile({ zonedToday: (tz, date) => { calls.push([tz, date.getTime()]); return { key: '2026-10-26' }; } });
  assert.equal(key(instant, 'Asia/Tokyo'), '2026-10-26');
  assert.deepEqual(calls, [['Asia/Tokyo', instant.getTime()]]);
});

test('uses Intl timezone conversion when the local engine is unavailable', () => {
  const key = compile(null);
  assert.equal(key(instant, 'Asia/Tokyo'), '2026-10-26');
});

test('falls back to the device date for an invalid or unavailable timezone', () => {
  const key = compile(null);
  assert.equal(key(instant, 'Invalid/Timezone'), deviceDateKey(instant));
  assert.equal(key(instant, ''), deviceDateKey(instant));
});

test('Ramadan detection uses the saved location timezone, not the device date', () => {
  const match = pages3.match(/^function hijriMonthDay\([\s\S]*?^\}/m);
  assert.ok(match, 'hijriMonthDay helper exists');
  const hijri = vm.runInNewContext(`(${match[0]})`, { Date, Intl });
  const at = new Date('2027-02-07T21:30:00.000Z'); // 00:30 on Feb 8 in Riyadh
  assert.equal(hijri(at, 'Asia/Riyadh').month, 9);
  assert.equal(hijri(at, 'America/Los_Angeles').month, 8);
});

test('Imsak offset zero stays zero; missing values retain the documented ten-minute estimate', () => {
  const match = pages3.match(/^function imsakOffsetMinutes\([\s\S]*?^\}/m);
  assert.ok(match, 'imsakOffsetMinutes helper exists');
  const offset = vm.runInNewContext(`(${match[0]})`, {});
  assert.equal(offset({ imsakOffset: 0 }), 0);
  assert.equal(offset({}), 10);
  assert.equal(offset({ imsakOffset: 40 }), 30);
});

console.log(`${tests} location-date regression tests passed.`);
