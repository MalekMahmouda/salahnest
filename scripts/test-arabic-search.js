'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const normalize = require('../js/search-utils');
const root = path.join(__dirname, '..');
const quran = require(path.join(root, 'data/quran.json'));
const dataSource = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
const context = {};
vm.runInNewContext(`${dataSource}\nglobalThis.__testAsma = ASMA;`, context);
const asma = context.__testAsma;

assert.equal(normalize('بِسْمِ'), 'بسم');
assert.equal(normalize('ٱلرَّحْمَٰن'), 'الرحمن');
assert.equal(normalize('أَحَدٌ'), 'احد');
assert.equal(normalize('الـلّٰه'), 'الله');
assert.equal(normalize('  الْحَمْدُ   لِلَّهِ  '), 'الحمد لله');

const verses = quran.surahs.flatMap((surah) => surah.ayahs);
for (const term of ['الرحمن', 'الله', 'الحمد', 'بسم']) {
  assert.ok(verses.some((ayah) => normalize(ayah.ar).includes(normalize(term))), `Quran search should match ${term}`);
}
assert.ok(asma.some((name) => normalize(name.ar).includes(normalize('الرحمن'))
  || normalize(name.ar2).includes(normalize('الرحمن'))), '99 Names search should match an unvocalized الرحمن query');

const reader = fs.readFileSync(path.join(root, 'js/reader.js'), 'utf8');
const pages = fs.readFileSync(path.join(root, 'js/pages.js'), 'utf8');
assert.match(reader, /normalizeSearchText\(ay\.ar\)\.includes\(normalizedArabicQuery\)/);
assert.match(pages, /normalizeSearchText\(x\.ar\)\.includes\(normalizedQuery\)/);
console.log('Arabic search regressions passed: diacritics, tatweel, alef variants, Quran terms, and 99 Names.');
