'use strict';

/** Normalize Arabic text for matching only; never use this value for display. */
function normalizeSearchText(value) {
  return String(value == null ? '' : value)
    .normalize('NFC')
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // Arabic and Quranic marks
    .replace(/[أإآٱ]/g, 'ا')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

if (typeof window !== 'undefined') window.normalizeSearchText = normalizeSearchText;
if (typeof module !== 'undefined' && module.exports) module.exports = normalizeSearchText;
