const fs = require('fs');
const path = require('path');

// Prevent real discord-rich-presence from creating background sockets/events during tests
jest.mock('discord-rich-presence', () => {
  return function mockClient(id) {
    return { id, updatePresence: () => {}, on: () => {} };
  };
});

describe('initializeRPC fallback and local-config', () => {
  const scriptsDir = path.join(__dirname, '..', 'scripts');
  const localConfigPath = path.join(scriptsDir, 'local-config.js');
  const localConfigBackup = path.join(scriptsDir, 'local-config.js.bak');
  const commonCachePath = path.join(scriptsDir, 'game_cache_common.json');
  const repoCachePath = path.join(__dirname, '..', 'game_cache.json');
  const repoCacheBackup = path.join(__dirname, '..', 'game_cache.json.bak');

  beforeEach(() => {
    // ensure clean module cache
    jest.resetModules();
  });

  afterEach(() => {
    // cleanup
    try {
      if (fs.existsSync(commonCachePath)) fs.unlinkSync(commonCachePath);
    } catch (e) {
      // ignore cleanup errors in test
    }
    // restore any backed-up local-config
    try {
      if (fs.existsSync(localConfigBackup)) {
        if (fs.existsSync(localConfigPath)) fs.unlinkSync(localConfigPath);
        fs.renameSync(localConfigBackup, localConfigPath);
      } else {
        // ensure no stray local-config remains
        if (fs.existsSync(localConfigPath)) fs.unlinkSync(localConfigPath);
      }
    } catch (e) {
      // ignore restoration errors in test
    }
    // restore repo-level game_cache.json if we moved it
    try {
      if (fs.existsSync(repoCacheBackup)) {
        if (fs.existsSync(repoCachePath)) fs.unlinkSync(repoCachePath);
        fs.renameSync(repoCacheBackup, repoCachePath);
      }
    } catch (e) {
      // ignore restoration errors in test
    }
    jest.resetModules();
  });

  test('initializeRPC respects scripts/local-config.js DISABLE_RPC', () => {
    jest.isolateModules(() => {
      jest.doMock('../scripts/local-config.js', () => ({ DISABLE_RPC: true }), { virtual: true });
      const rpc = require('../scripts/rpc');
      rpc._test.setInitialized(false);
      rpc.initializeRPC();
      expect(rpc._test.getClient()).toBeNull();
    });
  });

  test('initializeRPC loads game_cache_common.json fallback', () => {
    const common = { 'Fallback Game': { id: '99999', ts: Date.now() } };

    jest.isolateModules(() => {
      // mock fs so CACHE_FILE appears missing and the common cache is present
      jest.resetModules();
      const path = require('path');
      const scriptsDirLocal = path.join(__dirname, '..', 'scripts');
      const repoCache = path.join(__dirname, '..', 'game_cache.json');
      const commonCache = path.join(scriptsDirLocal, 'game_cache_common.json');

      jest.doMock('fs', () => ({
        existsSync: p => {
          if (p === repoCache) return false;
          if (p === commonCache) return true;
          return false;
        },
        readFileSync: p => {
          if (p === commonCache) return JSON.stringify(common);
          throw new Error('unexpected read');
        },
        writeFileSync: () => {},
      }));

      // ensure local-config does not disable RPC
      try {
        jest.unmock('../scripts/local-config.js');
      } catch (e) {
        // ignore
      }
      jest.doMock('../scripts/local-config.js', () => ({}), { virtual: true });

      const rpc = require('../scripts/rpc');
      rpc._test.setInitialized(false);
      rpc.initializeRPC();
      const cache = rpc._test.getGameCache();
      expect(cache['Fallback Game']).toBeDefined();
      expect(cache['Fallback Game'].id).toBe('99999');
    });
  });
});
