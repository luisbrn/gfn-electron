const axios = require('axios');
const fs = require('fs');
const path = require('path');

var client;
var gameCache = {};
var isInitialized = false;

// Get cache file path (works both in Electron and Node.js testing)
function getCacheFilePath() {
    try {
        const { app } = require('electron');
        return path.join(app.getPath('userData'), 'game_cache.json');
    } catch (error) {
        // Fallback for testing outside Electron
        return path.join(__dirname, '..', 'game_cache.json');
    }
}

const CACHE_FILE = getCacheFilePath();

// Initialize cache and Discord client
function initializeRPC() {
    if (isInitialized) return;
    
    // Load game cache
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, 'utf8');
            gameCache = JSON.parse(data);
            console.log(`Loaded game cache: ${Object.keys(gameCache).length} games`);
        }
    } catch (error) {
        console.error('Error loading game cache:', error);
        gameCache = {};
    }
    
    // Initialize Discord RPC client
    if (!client) {
        client = require('discord-rich-presence')('1425250342890639442');
    }
    
    isInitialized = true;
}

// Save game cache to disk
function saveGameCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(gameCache, null, 2));
    } catch (error) {
        console.error('Error saving game cache:', error);
    }
}

// Get Steam App ID by scraping Steam Store search results
async function getSteamAppId(gameName) {
    try {
        console.log(`Looking up "${gameName}" via Steam Store search...`);
        
        // Search Steam Store with the game name
        const searchUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(gameName)}&category1=998`;
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000 // 15 second timeout
        });

        // Extract Steam App IDs from search results
        const appIdRegex = /data-ds-appid="(\d+)"/g;
        const titleRegex = /<span class="title">([^<]+)<\/span>/g;
        
        let match;
        const results = [];
        
        // Extract all app IDs and titles
        const appIds = [];
        while ((match = appIdRegex.exec(response.data)) !== null) {
            appIds.push(match[1]);
        }
        
        const titles = [];
        while ((match = titleRegex.exec(response.data)) !== null) {
            titles.push(match[1].trim());
        }
        
        // Pair up app IDs with titles
        for (let i = 0; i < Math.min(appIds.length, titles.length); i++) {
            results.push({
                appId: appIds[i],
                title: titles[i]
            });
        }
        
        console.log(`Steam Store returned ${results.length} results`);
        
        if (results.length === 0) {
            console.log(`No Steam Store results found for "${gameName}"`);
            return null;
        }
        
        // Find the best match (prioritize exact matches)
        let bestMatch = null;
        let bestScore = 0;
        
        for (const result of results) {
            let score = 0;
            const resultTitle = result.title.toLowerCase();
            const searchName = gameName.toLowerCase();
            
            // Calculate match score
            if (resultTitle === searchName) {
                score = 100; // Perfect match
            } else if (resultTitle.includes(searchName)) {
                score = 75; // Contains the search term
            } else if (searchName.includes(resultTitle)) {
                score = 50; // Search term contains the result
            } else {
                // Check for word matches
                const searchWords = searchName.split(/\s+/);
                const titleWords = resultTitle.split(/\s+/);
                const commonWords = searchWords.filter(word => titleWords.includes(word));
                score = (commonWords.length / searchWords.length) * 25;
            }
            
            console.log(`Steam result: "${result.title}" (ID: ${result.appId}) - Score: ${score}`);
            
            if (score > bestScore) {
                bestMatch = result;
                bestScore = score;
            }
        }
        
        if (bestMatch && bestScore >= 25) { // Minimum threshold for a reasonable match
            console.log(`Selected Steam App ID: ${bestMatch.appId} for "${bestMatch.title}" (score: ${bestScore})`);
            
            // Cache the result
            gameCache[gameName] = bestMatch.appId;
            saveGameCache();
            return bestMatch.appId;
        } else {
            console.log(`No good Steam Store match found for "${gameName}"`);
            return null;
        }
        
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.error(`Steam Store search timed out for "${gameName}"`);
        } else {
            console.error(`Steam Store lookup failed for "${gameName}":`, error.message);
        }
        return null;
    }
}

// Extract game name from GeForce NOW title
function extractGameName(title) {
    if (!title.includes('on GeForce NOW')) {
        return null;
    }
    
    // Remove " on GeForce NOW" and any trailing/leading whitespace
    const gameName = title.replace(/\s+on GeForce NOW$/i, '').trim();
    return gameName || null;
}

async function DiscordRPC(title) {
    if (process.argv.includes("--disable-rpc")) return;

    // Initialize RPC system
    initializeRPC();

    // Debug: Log all page titles to see what's being detected
    console.log(`\n=== PAGE TITLE UPDATE ===`);
    console.log(`Page title detected: "${title}"`);

    const gameName = extractGameName(title);
    console.log(`Extracted game name: "${gameName}"`);
    
    let details = gameName ? title : "Home on GeForce NOW";
    let steamId = null;

    if (gameName) {
        // Check cache first
        if (gameCache[gameName]) {
            steamId = gameCache[gameName];
            console.log(`Using cached Steam ID for "${gameName}": ${steamId}`);
        } else {
            // Attempt Steam ID lookup
            console.log(`Looking up Steam ID for: "${gameName}"`);
            const foundSteamId = await getSteamAppId(gameName);
            
            if (foundSteamId) {
                steamId = foundSteamId;
                gameCache[gameName] = steamId;
                saveGameCache();
                console.log(`Found Steam ID ${steamId} for "${gameName}"`);
            } else {
                console.log(`No Steam ID found for "${gameName}"`);
            }
        }
    }

    // Update Discord Rich Presence with automatic fallback for missing artwork
    let largeImageKey = 'nvidia'; // Safe default
    let finalSteamId = null;
    
    if (steamId && /^\d{6,7}$/.test(steamId)) {
        // Try Steam ID first, but with automatic fallback detection
        console.log(`Discord RPC: Attempting Steam ID ${steamId} for "${gameName}"`);
        
        try {
            // First attempt with Steam ID
            client.updatePresence({
                details: details,
                state: `Not affiliated with NVIDIA`,
                startTimestamp: Date.now(),
                largeImageKey: steamId,
                instance: true,
            });
            
            // If we get here without error, Steam ID worked
            largeImageKey = steamId;
            finalSteamId = steamId;
            console.log(`Discord RPC: Successfully using Steam ID ${steamId}`);
            
        } catch (steamError) {
            // Steam ID failed (likely missing artwork), fall back to nvidia
            console.log(`Discord RPC: Steam ID ${steamId} failed (artwork not available), falling back to nvidia`);
            
            try {
                client.updatePresence({
                    details: details,
                    state: `Not affiliated with NVIDIA`,
                    startTimestamp: Date.now(),
                    largeImageKey: 'nvidia',
                    instance: true,
                });
                largeImageKey = 'nvidia';
                finalSteamId = null;
                console.log(`Discord RPC: Fallback to nvidia successful`);
                
            } catch (fallbackError) {
                console.error(`Discord RPC: Even nvidia fallback failed:`, fallbackError.message);
            }
        }
        
    } else {
        // No valid Steam ID, use nvidia directly
        console.log(`Discord RPC: No valid Steam ID, using nvidia icon`);
        
        try {
            client.updatePresence({
                details: details,
                state: `Not affiliated with NVIDIA`,
                startTimestamp: Date.now(),
                largeImageKey: 'nvidia',
                instance: true,
            });
            console.log(`Discord RPC: Using nvidia icon`);
            
        } catch (error) {
            console.error(`Discord RPC error:`, error.message);
        }
    }
    
    console.log(`=== DISCORD RPC COMPLETE ===\n`);
};

module.exports = { DiscordRPC };