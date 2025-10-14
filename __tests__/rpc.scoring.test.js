// Prevent real discord-rich-presence from creating background sockets/events during tests
jest.mock('discord-rich-presence', () => {
  return function mockClient(id) {
    return { id, updatePresence: () => {}, on: () => {} };
  };
});

describe('getSteamAppId scoring branches', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('exact title match scores 100', async () => {
    const html = `
      <a data-ds-appid="1001"><div class="title">Exact Match Game</div></a>
      <a data-ds-appid="1002"><div class="title">Other Game</div></a>
    `;
    jest.resetModules();
    jest.doMock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: html }) }));
    const rpc = require('../scripts/rpc');
    rpc._test.setGameCache({});
    const id = await rpc.getSteamAppId('Exact Match Game');
    expect(id).toBe('1001');
    expect(require('axios').get).toHaveBeenCalled();
  });

  test('title includes search scores 85', async () => {
    const html = `
      <a data-ds-appid="2001"><div class="title">Super Exact Match Game Deluxe</div></a>
    `;
    jest.resetModules();
    jest.doMock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: html }) }));
    const rpc = require('../scripts/rpc');
    rpc._test.setGameCache({});
    const id = await rpc.getSteamAppId('Exact Match Game');
    expect(id).toBe('2001');
  });

  test('search includes title (included-by) scores 70', async () => {
    const html = `
      <a data-ds-appid="3001"><div class="title">Match</div></a>
    `;
    jest.resetModules();
    jest.doMock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: html }) }));
    const rpc = require('../scripts/rpc');
    rpc._test.setGameCache({});
    const id = await rpc.getSteamAppId('Match Bigger Title');
    expect(id).toBe('3001');
  });

  test('partial-word matching gives fractional score > threshold', async () => {
    const html = `
      <a data-ds-appid="4001"><div class="title">Common Word Alpha Beta Gamma</div></a>
    `;
    jest.resetModules();
    jest.doMock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: html }) }));
    const rpc = require('../scripts/rpc');
    rpc._test.setGameCache({});
    const id = await rpc.getSteamAppId('Alpha Beta');
    // should select 4001 due to common word overlap
    expect(id).toBe('4001');
  });

  test('no results returns null', async () => {
    const html = `
      <div>No results here</div>
    `;
    jest.resetModules();
    jest.doMock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: html }) }));
    const rpc = require('../scripts/rpc');
    rpc._test.setGameCache({});
    const id = await rpc.getSteamAppId('Nonexistent Game');
    expect(id).toBeNull();
  });
});
