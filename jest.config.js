module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/dist/.*"],
  coveragePathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/node_modules/"],
  coverageThreshold: {
    // conservative defaults to avoid failing existing CI while still protecting coverage
    global: {
      branches: 40,
      functions: 80,
      lines: 58,
      statements: 58,
    },
  },
};
