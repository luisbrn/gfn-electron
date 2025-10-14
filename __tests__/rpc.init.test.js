const rpc = require('../scripts/rpc');

describe('initializeRPC guard behavior', () => {
  const origDisable = process.env.DISABLE_RPC;
  const origDisableIpc = process.env.DISCORD_DISABLE_IPC;

  beforeEach(() => {
    jest.resetAllMocks();
    rpc._test.setGameCache({});
    rpc._test.setClient(null);
    rpc._test.setInitialized(false);
    // Ensure environment is clean unless a specific test sets it
    delete process.env.DISABLE_RPC;
    delete process.env.DISCORD_DISABLE_IPC;
  });

  afterEach(() => {
    if (typeof origDisable === 'undefined') delete process.env.DISABLE_RPC;
    else process.env.DISABLE_RPC = origDisable;
    if (typeof origDisableIpc === 'undefined') delete process.env.DISCORD_DISABLE_IPC;
    else process.env.DISCORD_DISABLE_IPC = origDisableIpc;
    rpc._test.setInitialized(false);
    rpc._test.setClient(null);
  });

  test('initializeRPC respects DISABLE_RPC environment variable', async () => {
    process.env.DISABLE_RPC = 'true';
    // pre-seed a fake client; initializeRPC should null it when DISABLE_RPC is set
    const fakeClient = { updatePresence: jest.fn() };
    rpc._test.setClient(fakeClient);

    // Call DiscordRPC which calls initializeRPC internally
    await rpc.DiscordRPC('Some Game on GeForce NOW');

    // The fake client should not have been used because RPC was disabled
    // The client should be null (disabled) after initialization when DISABLE_RPC is set
    expect(rpc._test.getClient()).toBeNull();
  });

  test('initializeRPC respects DISCORD_DISABLE_IPC environment variable', async () => {
    process.env.DISCORD_DISABLE_IPC = 'true';
    // Do not pre-seed client here; DISCORD_DISABLE_IPC should prevent initialization
    await rpc.DiscordRPC('Some Game on GeForce NOW');

    // If DISCORD_DISABLE_IPC is set the RPC client should be null (not initialized)
    expect(rpc._test.getClient()).toBeNull();
  });
});
