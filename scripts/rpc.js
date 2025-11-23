const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

let client;
let gameCache = {};
let isInitialized = false;
// Time-to-live for cache entries in milliseconds (default: 30 days)
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
// Backoff configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;
// Request deduplication: cache in-flight requests to prevent duplicate Steam API calls
const pendingRequests = new Map();

// Debug logging flag - set DEBUG=true in environment for verbose logs
const DEBUG = process.env.DEBUG === 'true';

function log(level, ...args) {
  if (level === 'debug' && !DEBUG) return;
  console[level](...args);
}

// Cache Electron app reference to avoid repeated requires
let electronApp = null;
function getElectronApp() {
  if (electronApp === null) {
    try {
      electronApp = require('electron').app;
    } catch (e) {
      electronApp = false; // Mark as unavailable
    }
  }
  return electronApp || null;
}

function getCacheFilePath() {
  try {
    const app = getElectronApp();
    if (app) {
      const cachePath = path.join(app.getPath('userData'), 'game_cache.json');
      log('debug', `Using Electron userData cache: ${cachePath}`);
      return cachePath;
    }
  } catch (e) {
    // Fall through to fallback
  }
  const cachePath = path.join(__dirname, '..', 'game_cache.json');
  log('debug', `Using fallback cache path: ${cachePath}`);
  return cachePath;
}

const CACHE_FILE = getCacheFilePath();

// Manual override map for known game title -> Steam appId
const MANUAL_OVERRIDES = {
  'ARC Raiders Playtest': '2427520',
};

function initializeRPC() {
  if (isInitialized) return;
  // Honor environment variable to disable RPC entirely
  if (process.env.DISABLE_RPC === 'true' || process.env.DISABLE_RPC === '1') {
    log('info', 'Discord RPC disabled via DISABLE_RPC environment variable');
    isInitialized = true;
    client = null;
    return;
  }
  // Honor local-config.js persistent disable flag if present
  try {
    const localConfig = require('./local-config.js');
    if (localConfig && localConfig.DISABLE_RPC) {
      log('info', 'Discord RPC disabled via scripts/local-config.js');
      isInitialized = true;
      client = null;
      return;
    }
  } catch (e) {
    // ignore missing local-config
  }
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      gameCache = JSON.parse(data);
      log('debug', `Loaded ${Object.keys(gameCache).length} cached games`);
    } else {
      // Fallback: try to load a pre-populated common cache shipped with the app
      const fallback = path.join(__dirname, 'game_cache_common.json');
      if (fs.existsSync(fallback)) {
        try {
          const fallbackData = fs.readFileSync(fallback, 'utf8');
          const common = JSON.parse(fallbackData);
          gameCache = Object.assign({}, common);
          log('debug', `Loaded ${Object.keys(common).length} common cached games as fallback`);
        } catch (err) {
          log(
            'debug',
            'Failed to load fallback common cache:',
            err && err.message ? err.message : err,
          );
        }
      }
    }
  } catch (e) {
    log('warn', 'Failed to load game cache:', e.message);
    gameCache = {};
  }

  if (!client) {
    // Try settings file first, then environment variable, then local-config.js (development), then placeholder
    let settings = {};
    try {
      settings = require('./settings.js').loadSettings();
    } catch (e) {
      /* ignore missing settings */
    }

    let localConfig = {};
    try {
      localConfig = require('./local-config.js') || {};
    } catch (e) {
      /* ignore missing local config */
    }

    const clientId =
      settings.discordClientId ||
      process.env.DISCORD_CLIENT_ID ||
      localConfig.DISCORD_CLIENT_ID ||
      'YOUR_CLIENT_ID_HERE';
    if (clientId === 'YOUR_CLIENT_ID_HERE') {
      log(
        'warn',
        'Discord client ID not configured. Set DISCORD_CLIENT_ID environment variable or edit scripts/local-config.js',
      );
      log('info', 'Example: DISCORD_CLIENT_ID=1234567890123456789 npm start');
    }
    try {
      // Light probe: if DISCORD_DISABLE_IPC is set, skip initialization.
      if (process.env.DISCORD_DISABLE_IPC === 'true') {
        log('info', 'Skipping Discord RPC due to DISCORD_DISABLE_IPC');
        client = null;
      } else {
        // On Unix-like systems, discord creates a unix socket at /run/user/<uid>/discord-ipc-*
        // Probe common locations to avoid attempting to connect when IPC is unavailable.
        let shouldProbe = true;
        try {
          if (process.platform !== 'win32') {
            const uid = process.getuid ? process.getuid() : null;
            const candidates = [];
            if (uid !== null) candidates.push(`/run/user/${uid}/discord-ipc-0`);
            candidates.push('/tmp/discord-ipc-0');
            const exists = candidates.some(p => {
              try {
                return fs.existsSync(p);
              } catch (e) {
                return false;
              }
            });
            if (!exists) {
              log(
                'debug',
                'No Discord IPC socket found in common locations; skipping RPC initialization',
              );
              shouldProbe = false;
            }
          }
        } catch (e) {
          log('debug', 'Error probing Discord IPC socket:', e && e.message ? e.message : e);
        }

        if (shouldProbe) client = require('discord-rich-presence')(clientId);
      }
      log('debug', 'Discord RPC client initialized');
      // Avoid uncaught errors from the underlying transport
      try {
        if (client && typeof client.on === 'function') {
          client.on('error', err =>
            log('warn', 'Discord RPC client error:', err && err.message ? err.message : err),
          );
        }
      } catch (e) {
        log(
          'debug',
          'Failed to attach error handler to Discord RPC client:',
          e && e.message ? e.message : e,
        );
      }
    } catch (e) {
      log('error', 'Failed to initialize Discord RPC client:', e.message);
      client = null;
    }
  }
  isInitialized = true;
}

// Lazy require of GFN capsule downloader (optional)
let downloadGfnCapsule = null;
try {
  downloadGfnCapsule = require('./download_gfn_capsule').downloadAndProcess;
} catch (e) {
  // downloader not available, that's fine
}

// Batch cache writes to avoid excessive I/O
let cacheWriteTimer = null;
const CACHE_WRITE_DELAY_MS = 1000; // Batch writes within 1 second

function saveGameCache() {
  // Clear existing timer
  if (cacheWriteTimer) {
    clearTimeout(cacheWriteTimer);
  }

  // Schedule write after delay (batching)
  cacheWriteTimer = setTimeout(() => {
    try {
      const cacheData = JSON.stringify(gameCache, null, 2);
      // Write to Electron userData cache
      fs.writeFileSync(CACHE_FILE, cacheData);
      // Also write to repo-level cache for developer visibility
      const repoCachePath = path.join(__dirname, '..', 'game_cache.json');
      fs.writeFileSync(repoCachePath, cacheData);
      log('debug', 'Game cache saved successfully to both locations');
    } catch (e) {
      log('error', 'Error saving cache:', e.message);
    } finally {
      cacheWriteTimer = null;
    }
  }, CACHE_WRITE_DELAY_MS);
}

function isCacheEntryValid(entryTimestamp) {
  if (!entryTimestamp) return false;
  return Date.now() - entryTimestamp <= CACHE_TTL_MS;
}

// Cache normalized text to avoid repeated processing
const normalizedTextCache = new Map();
const NORMALIZE_CACHE_MAX_SIZE = 1000; // Limit cache size

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';

  // Check cache first
  if (normalizedTextCache.has(text)) {
    return normalizedTextCache.get(text);
  }

  // Normalize text
  const normalized = text
    .replace(/[™®©]/g, '') // Remove trademark symbols
    .replace(/[''""]/g, '') // Remove smart quotes
    .replace(/[^\w\s]/g, '') // Remove other punctuation
    .toLowerCase()
    .trim();

  // Cache result (with size limit to prevent memory issues)
  if (normalizedTextCache.size >= NORMALIZE_CACHE_MAX_SIZE) {
    // Remove oldest entry (simple FIFO)
    const firstKey = normalizedTextCache.keys().next().value;
    normalizedTextCache.delete(firstKey);
  }
  normalizedTextCache.set(text, normalized);

  return normalized;
}

// Optimized axios instance with better defaults for Arch Linux
const axiosInstance = axios.create({
  timeout: 10000, // 10 second timeout (reduced from default for faster failure)
  headers: {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.152 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    Connection: 'keep-alive', // HTTP keep-alive for better performance
    'Upgrade-Insecure-Requests': '1',
  },
  // Enable HTTP/2 if available (better performance on modern systems)
  httpAgent: false, // Let axios choose the best agent
  httpsAgent: false,
  // Max redirects
  maxRedirects: 5,
  // Validate status
  validateStatus: status => status >= 200 && status < 400,
});

async function requestWithBackoff(url, opts = {}, retries = 0) {
  try {
    // Merge opts with axios instance defaults
    const requestOpts = {
      ...opts,
      timeout: opts.timeout || 10000,
    };
    return await axiosInstance.get(url, requestOpts);
  } catch (err) {
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (
      err.response &&
      err.response.status >= 400 &&
      err.response.status < 500 &&
      err.response.status !== 429
    ) {
      log('debug', `Client error ${err.response.status}, not retrying: ${url}`);
      throw err;
    }

    if (retries >= MAX_RETRIES) {
      log('debug', `Max retries reached for ${url}`);
      throw err;
    }

    const backoff = INITIAL_BACKOFF_MS * Math.pow(2, retries);
    log(
      'debug',
      `Request failed, retrying in ${backoff}ms (attempt ${retries + 1}/${
        MAX_RETRIES + 1
      }): ${url}`,
    );
    await new Promise(r => setTimeout(r, backoff));
    return requestWithBackoff(url, opts, retries + 1);
  }
}

// Test helpers: allow tests to seed/inspect in-memory cache without filesystem access
function _setGameCache(obj) {
  gameCache = obj || {};
}

function _getGameCache() {
  return gameCache;
}

function _setClient(c) {
  client = c;
}

function _getClient() {
  return client;
}

function _setInitialized(v) {
  isInitialized = !!v;
}

async function getSteamAppId(gameName) {
  try {
    // Check manual overrides first
    if (MANUAL_OVERRIDES[gameName]) {
      log('debug', `Manual override found for "${gameName}": ${MANUAL_OVERRIDES[gameName]}`);
      gameCache[gameName] = { id: MANUAL_OVERRIDES[gameName], ts: Date.now() };
      saveGameCache();
      return MANUAL_OVERRIDES[gameName];
    }
    // Use cache if present and valid
    const cached = gameCache[gameName];
    if (cached && typeof cached === 'object') {
      if (isCacheEntryValid(cached.ts)) {
        log('debug', `Using TTL-valid cached Steam ID for ${gameName}: ${cached.id}`);
        return cached.id;
      }
    } else if (cached && typeof cached === 'string') {
      // legacy simple string cache entry
      log('debug', `Using legacy cached Steam ID for ${gameName}: ${cached}`);
      return cached;
    }

    // Check if request is already in flight (deduplication)
    if (pendingRequests.has(gameName)) {
      log('debug', `Request for "${gameName}" already pending, reusing existing request...`);
      return pendingRequests.get(gameName);
    }

    // Create promise for Steam lookup to enable deduplication
    const lookupPromise = (async () => {
      // Try several progressively simpler queries if Steam returns no results.
      const tried = new Set();
      const queriesToTry = [];
      // Primary: full game name
      queriesToTry.push(gameName);
      // Secondary: strip common qualifiers like playtest/demo/alpha/beta/test
      // Use compiled regex for better performance
      const qualifierRegex = /\b(playtest|play test|demo|alpha|beta|test|internal)\b/gi;
      const whitespaceRegex = /\s+/g;
      const stripped = gameName.replace(qualifierRegex, '').replace(whitespaceRegex, ' ').trim();
      if (stripped && stripped !== gameName) queriesToTry.push(stripped);
      // Tertiary: progressively shorter prefixes (drop trailing words)
      const parts = gameName.split(/\s+/).filter(Boolean);
      for (let n = parts.length - 1; n >= 1; n--) {
        const prefix = parts.slice(0, n).join(' ');
        if (prefix && !queriesToTry.includes(prefix)) queriesToTry.push(prefix);
      }

      let results = [];
      // Optimize: build URL once and reuse base
      const steamBaseUrl = 'https://store.steampowered.com/search/';
      for (const q of queriesToTry) {
        if (tried.has(q)) continue;
        tried.add(q);
        // Optimize: use URLSearchParams for proper encoding (Node.js compatible)
        const searchParams = new URLSearchParams();
        searchParams.set('term', q);
        searchParams.set('category1', '998');
        const url = `${steamBaseUrl}?${searchParams.toString()}`;
        log('debug', `Searching Steam for: "${q}"`);
        const resp = await requestWithBackoff(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GFN-Electron)' },
          timeout: 15000,
        });

        const $ = cheerio.load(resp.data);
        results = [];
        $('a[data-ds-appid]').each((i, element) => {
          const appId = $(element).attr('data-ds-appid');
          const titleElement = $(element).find('.title');
          const title = titleElement.text().trim();
          if (appId && title) results.push({ appId, title });
        });

        log('debug', `Found ${results.length} Steam results for query: "${q}"`);
        if (results.length > 0) break;
      }

      if (results.length === 0) return null;

      let best = null;
      let bestScore = 0;
      const normalizedSearch = normalizeText(gameName);

      // Pre-compute search words once for efficiency
      const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);
      const searchWordsSet = new Set(searchWords); // Use Set for O(1) lookup

      for (const result of results) {
        let score = 0;
        const normalizedTitle = normalizeText(result.title);

        // Fast path: exact match
        if (normalizedTitle === normalizedSearch) {
          score = 100;
        } else if (normalizedTitle.includes(normalizedSearch)) {
          score = 85;
        } else if (normalizedSearch.includes(normalizedTitle)) {
          score = 70;
        } else {
          // Word matching: use Set for faster lookup
          const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
          const titleWordsSet = new Set(titleWords);
          const commonWords = searchWords.filter(w => titleWordsSet.has(w));
          if (searchWords.length > 0) score = (commonWords.length / searchWords.length) * 50;
        }

        log('debug', `"${result.title}" -> score: ${score.toFixed(1)}`);
        if (score > bestScore) {
          best = result;
          bestScore = score;
        }
      }

      if (best && bestScore >= 25) {
        log(
          'info',
          `Steam ID found: "${gameName}" -> ${best.appId} (${
            best.title
          }, score: ${bestScore.toFixed(1)})`,
        );
        gameCache[gameName] = { id: best.appId, ts: Date.now() };
        saveGameCache();
        // Attempt to download and process GFN capsule image (non-blocking)
        try {
          if (downloadGfnCapsule) {
            const gfnOut = path.join(
              __dirname,
              '..',
              'GFN_Discord_Rich_Presence',
              'downloaded_capsules',
              `${best.appId}.png`,
            );
            if (!fs.existsSync(gfnOut)) {
              // fire-and-forget
              downloadGfnCapsule(best.appId).catch(err =>
                log('warn', 'GFN capsule download failed:', err && err.message ? err.message : err),
              );
            }
          }
        } catch (e) {
          log('debug', 'GFN capsule download skipped or failed:', e && e.message ? e.message : e);
        }
        return best.appId;
      }

      log(
        'warn',
        `No suitable Steam match found for: "${gameName}" (best score: ${bestScore.toFixed(1)})`,
      );
      return null;
    })();

    // Cache the promise for deduplication
    pendingRequests.set(gameName, lookupPromise);

    // Clean up after completion (success or failure)
    try {
      const result = await lookupPromise;
      return result;
    } finally {
      pendingRequests.delete(gameName);
    }
  } catch (e) {
    // Ensure cleanup on error
    pendingRequests.delete(gameName);
    log('error', 'Steam lookup error:', e && e.message ? e.message : e);
    return null;
  }
}

// Cache compiled regex for better performance
const GFN_SUFFIX_REGEX = /\s+on GeForce NOW$/i;

function extractGameName(title) {
  if (!title || typeof title !== 'string') return null;
  // Use includes check first (faster than regex)
  if (!title.includes('on GeForce NOW')) return null;
  return title.replace(GFN_SUFFIX_REGEX, '').trim() || null;
}

// Cache disable RPC flag to avoid repeated checks
let disableRPCCached = null;
function isRPCDisabled() {
  if (disableRPCCached === null) {
    disableRPCCached = process.argv.includes('--disable-rpc');
  }
  return disableRPCCached;
}

async function DiscordRPC(title) {
  if (isRPCDisabled()) {
    log('debug', 'Discord RPC disabled via --disable-rpc flag');
    return;
  }

  initializeRPC();

  log('info', '\n=== PAGE TITLE UPDATE ===');
  log('info', `Page title detected: "${title}"`);

  const gameName = extractGameName(title);
  log('info', `Extracted game name: "${gameName}"`);

  const details = gameName ? title : 'Home on GeForce NOW';
  let steamId = null;

  if (gameName) {
    if (gameCache[gameName]) {
      // gameCache may store either a legacy string or an object {id, ts}
      const entry = gameCache[gameName];
      if (typeof entry === 'string') {
        steamId = entry;
      } else if (entry && typeof entry === 'object') {
        steamId = entry.id;
      }
      log('debug', `Using cached Steam ID: ${steamId}`);
      // If steamId is not found on the cached object, fallback to lookup
      if (!steamId) {
        steamId = await getSteamAppId(gameName);
      }
    } else {
      steamId = await getSteamAppId(gameName);
    }
  }

  // Guard against missing Discord RPC client
  if (!client) {
    log('warn', 'Discord RPC client not initialized - skipping presence update');
    return;
  }

  try {
    const presenceData = {
      details,
      state: 'Not affiliated with NVIDIA',
      startTimestamp: Date.now(),
      instance: true,
    };

    if (steamId && /^\d{1,7}$/.test(steamId)) {
      presenceData.largeImageKey = steamId;
      client.updatePresence(presenceData);
      log('info', `Discord RPC: Successfully using Steam ID ${steamId} for artwork`);
    } else {
      presenceData.largeImageKey = 'nvidia';
      client.updatePresence(presenceData);
      log('info', 'Discord RPC: Using nvidia fallback icon');
    }
  } catch (err) {
    log('error', 'Discord RPC update failed:', err.message);
    log('debug', 'Full error:', err);
  }
}

module.exports = {
  DiscordRPC,
  getSteamAppId,
  requestWithBackoff,
  initializeRPC,
  normalizeText,
  isCacheEntryValid,
  getCacheFilePath,
  extractGameName,
  _test: {
    setGameCache: _setGameCache,
    getGameCache: _getGameCache,
    setClient: _setClient,
    getClient: _getClient,
    setInitialized: _setInitialized,
  },
};
