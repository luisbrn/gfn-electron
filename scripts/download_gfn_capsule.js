#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function downloadAndProcess(appId) {
  const candidates = [
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/hero_capsule.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
  ];

  let buffer = null;
  for (const url of candidates) {
    try {
      const resp = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GFN-Electron)' },
      });
      if (resp && resp.data && resp.data.byteLength > 0) {
        buffer = Buffer.from(resp.data);
        console.log('Successfully fetched image from:', url);
        break;
      }
    } catch (e) {
      console.log('Failed to fetch', url, ':', e.message ? e.message : e);
    }
  }
  if (!buffer) throw new Error('No image found for appId ' + appId);

  const image = await Jimp.read(buffer);
  // ensure RGBA
  image.rgba(true);
  const maxDim = Math.max(image.bitmap.width, image.bitmap.height);
  const padded = new Jimp(maxDim, maxDim, 0x00000000); // transparent
  const x = Math.floor((maxDim - image.bitmap.width) / 2);
  const y = Math.floor((maxDim - image.bitmap.height) / 2);
  padded.composite(image, x, y);
  padded.resize(1024, 1024, Jimp.RESIZE_BICUBIC);

  const outDir = path.join(__dirname, '..', 'GFN_Discord_Rich_Presence', 'downloaded_capsules');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${appId}.png`);
  await padded.writeAsync(outPath);
  console.log('Saved processed capsule to', outPath);
  return outPath;
}

if (require.main === module) {
  const appId = process.argv[2];
  if (!appId) {
    console.error('Usage: node scripts/download_gfn_capsule.js <appId>');
    process.exit(1);
  }
  downloadAndProcess(appId)
    .then(p => console.log('Done:', p))
    .catch(e => {
      console.error('Error:', e.message);
      process.exit(1);
    });
}

module.exports = { downloadAndProcess };
