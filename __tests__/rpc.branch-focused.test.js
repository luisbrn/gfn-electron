const rpc = require('../scripts/rpc');
const fs = require('fs');

jest.mock('axios');

describe('branch-focused tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
    rpc._test.setGameCache({});
    rpc._test.setClient(null);
    rpc._test.setInitialized(false);
  });

  test('requestWithBackoff retries then succeeds', async () => {
    const axios = require('axios');
    let calls = 0;
    axios.get.mockImplementation(() => {
      calls += 1;
      if (calls < 2) return Promise.reject(new Error('transient'));
      return Promise.resolve({ data: '<html></html>' });
    });
    const res = await rpc.requestWithBackoff('http://example.test');
    expect(res).toBeDefined();
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test('getSteamAppId handles saveGameCache write error gracefully', async () => {
    // Seed a minimal axios response with one Steam result
    const axios = require('axios');
    axios.get.mockResolvedValue({
      data: '<a data-ds-appid="12345"><div class="title">Test Game</div></a>',
    });

    // Make fs.writeFileSync throw when saving cache
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('disk full');
    });

    const id = await rpc.getSteamAppId('Test Game');
    expect(id).toBe('12345');
    // restore
    fs.writeFileSync.mockRestore();
  });

  test('DiscordRPC handles client.updatePresence throwing', async () => {
    // Provide a client that throws when updatePresence is called
    const badClient = {
      updatePresence: () => {
        throw new Error('boom');
      },
    };
    rpc._test.setClient(badClient);
    rpc._test.setInitialized(true);

    // Call DiscordRPC with a title that will not trigger Steam lookup
    await expect(rpc.DiscordRPC('Home on GeForce NOW')).resolves.toBeUndefined();
  });
});
