#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function downloadHeader(appId) {
  // Try several common Steam image endpoints in order of preference.
  const candidates = [
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_184x69.jpg`,
  ];

  let buffer = null;
  let usedUrl = null;
  for (const url of candidates) {
    try {
      console.log('Trying', url);
      const resp = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GFN-Electron)' },
      });
      if (resp && resp.data && resp.data.byteLength > 0) {
        buffer = Buffer.from(resp.data);
        usedUrl = url;
        break;
      }
    } catch (e) {
      console.log('Failed to fetch', url, e.message ? e.message : e);
    }
  }

  if (!buffer) throw new Error('No candidate image found for appId ' + appId);

  // Ensure directory exists following the repo convention (Poster game images/<len>/<id>.png)
  const bucket = String(String(appId).length);
  const outDir = path.join(__dirname, 'Poster game images', bucket);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${appId}.png`);

  // Convert to PNG, resize/crop to 512x512 to match existing posters
  console.log('Using image from', usedUrl, 'buffer len', buffer.length);
  const image = await Jimp.read(buffer);
  // Cover will resize and crop to fill 512x512 preserving aspect ratio
  image.cover(512, 512);
  await image.writeAsync(outPath);
  console.log('Saved poster (512x512) to', outPath);
}

if (require.main === module) {
  const appId = process.argv[2];
  if (!appId) {
    console.error('Usage: node scripts/download_poster.js <steam_app_id>');
    process.exit(1);
  }
  downloadHeader(appId).catch(e => {
    console.error('Download failed:', e && e.message ? e.message : e);
    process.exit(1);
  });
}

module.exports = { downloadHeader };
