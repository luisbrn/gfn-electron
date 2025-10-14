jest.resetModules();

describe('discord-rich-presence mocking', () => {
  let rpc;

  beforeEach(() => {
    jest.resetAllMocks();
    // Ensure we load the module fresh each test, picking up any per-test jest.mock calls
    jest.resetModules();
    rpc = require('../scripts/rpc');
    rpc._test.setGameCache({});
    rpc._test.setClient(null);
    rpc._test.setInitialized(false);
  });

  afterEach(() => {
    if (rpc && rpc._test) {
      rpc._test.setInitialized(false);
      rpc._test.setClient(null);
    }
  });

  test('initializes client when discord-rich-presence returns a client object', async () => {
    // Mock fs probing to indicate an IPC socket exists
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);

    // Provide a mock module for discord-rich-presence
    jest.mock('discord-rich-presence', () => {
      return function mockClient(id) {
        return {
          id,
          updatePresence: jest.fn(),
          on: jest.fn(),
        };
      };
    });

    // Reload rpc to pick up the mocked module
    jest.resetModules();
    rpc = require('../scripts/rpc');
    rpc._test.setInitialized(false);
    rpc._test.setClient(null);

    // Call initialize via DiscordRPC
    await rpc.DiscordRPC('Mock Game on GeForce NOW');

    const client = rpc._test.getClient();
    expect(client).not.toBeNull();
    expect(client.updatePresence).toBeDefined();
  });

  test('handles errors thrown by discord-rich-presence require gracefully', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);

    // Make require('discord-rich-presence') throw
    jest.mock('discord-rich-presence', () => {
      throw new Error('mock require failure');
    });

    jest.resetModules();
    rpc = require('../scripts/rpc');
    rpc._test.setInitialized(false);
    rpc._test.setClient(null);

    // Should not throw; DiscordRPC should catch and set client to null
    await rpc.DiscordRPC('Game on GeForce NOW');
    expect(rpc._test.getClient()).toBeNull();
  });

  test('attaches error handler when client.on exists', async () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);

    const mockOn = jest.fn();
    jest.mock('discord-rich-presence', () => {
      return function mockClient(id) {
        return {
          id,
          updatePresence: jest.fn(),
          on: mockOn,
        };
      };
    });

    jest.resetModules();
    rpc = require('../scripts/rpc');
    rpc._test.setInitialized(false);
    rpc._test.setClient(null);

    await rpc.DiscordRPC('Attach Event Game on GeForce NOW');
    // ensure we attached an error handler
    expect(mockOn).toHaveBeenCalled();
  });
});
