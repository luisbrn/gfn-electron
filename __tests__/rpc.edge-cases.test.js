describe('rpc edge cases', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('requestWithBackoff exhausts retries and throws', async () => {
    const axios = require('axios');
    axios.get = jest.fn().mockRejectedValue(new Error('network fail'));
    const rpc = require('../scripts/rpc');
    await expect(rpc.requestWithBackoff('http://nope')).rejects.toThrow('network fail');
    expect(axios.get).toHaveBeenCalled();
  });

  test('initializeRPC handles client.on throwing when attaching handler', () => {
    jest.isolateModules(() => {
      jest.doMock(
        'discord-rich-presence',
        () => {
          return function mockClient() {
            return {
              on: () => {
                throw new Error('attach fail');
              },
              updatePresence: () => {},
            };
          };
        },
        { virtual: true },
      );
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
      const rpc = require('../scripts/rpc');
      rpc._test.setInitialized(false);
      // should not throw
      expect(() => rpc.initializeRPC()).not.toThrow();
    });
  });

  test('getCacheFilePath uses electron.app.getPath when electron present', () => {
    // Ensure module cache is clear and mock electron before loading rpc
    jest.resetModules();
    // Attempt a non-virtual mock so Jest will resolve our mock for 'electron'
    jest.doMock('electron', () => ({ app: { getPath: () => '/tmp/userdata' } }));
    const rpc = require('../scripts/rpc');
    const p = rpc.getCacheFilePath();
    expect(p).toContain('/tmp/userdata');
    // cleanup
    try {
      jest.unmock('electron');
    } catch (e) {
      // ignore if not mocked
    }
    jest.resetModules();
  });
});
