const rpc = require('../scripts/rpc');
const axios = require('axios');

jest.mock('axios');

describe('rpc helpers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    rpc._test.setGameCache({});
  });

  test('normalizeText removes symbols and lowercases', () => {
    const input = "Call of Duty®: Modern Warfare™ 'Special'";
    const out = rpc.normalizeText(input);
    expect(out).toContain('call of duty');
    expect(out).not.toContain('®');
    expect(out).not.toContain('™');
  });

  test('isCacheEntryValid returns false for null/old entries and true for fresh ones', () => {
    expect(rpc.isCacheEntryValid(null)).toBe(false);
    const now = Date.now();
    expect(rpc.isCacheEntryValid(now)).toBe(true);
    const old = now - 1000 * 60 * 60 * 24 * 31;
    expect(rpc.isCacheEntryValid(old)).toBe(false);
  });

  test('extractGameName returns correct game or null', () => {
    expect(rpc.extractGameName('Halo Infinite on GeForce NOW')).toBe('Halo Infinite');
    expect(rpc.extractGameName('Welcome to GeForce NOW')).toBeNull();
  });

  test('getSteamAppId returns null when no results found', async () => {
    axios.get.mockResolvedValue({ data: '<html><body>No results here</body></html>' });
    const id = await rpc.getSteamAppId('Nonexistent Game 12345');
    expect(id).toBeNull();
  });

  test('requestWithBackoff throws after retries exhausted', async () => {
    const error = new Error('network');
    axios.get.mockRejectedValue(error);
    await expect(rpc.requestWithBackoff('http://example.invalid', {}, 0)).rejects.toThrow(
      'network',
    );
  }, 15000);
});
