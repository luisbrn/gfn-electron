// Manual Jest mock for discord-rich-presence used by tests to avoid real IPC/sockets.
module.exports = function mockClient(id) {
  return {
    id,
    updatePresence: () => {},
    on: () => {},
  };
};
