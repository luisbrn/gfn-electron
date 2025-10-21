#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const samples = [
  'scripts/Poster game images/6/700330.png',
  'scripts/Poster game images/7/1128810.png',
  'scripts/Poster game images/9/1328670.png',
  'scripts/Poster game images/3/322330.png',
  'scripts/Poster game images/2/242760.png',
];

(async () => {
  for (const p of samples) {
    try {
      const full = path.join(__dirname, '..', p);
      const s = fs.statSync(full);
      const img = await Jimp.read(full);
      console.log(`${p} -> size=${s.size} bytes, ${img.bitmap.width}x${img.bitmap.height}`);
    } catch (e) {
      console.log(`${p} -> MISSING or ERROR: ${e.message}`);
    }
  }
})();
