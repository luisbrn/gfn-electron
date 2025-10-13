module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/dist/.*'],
  // Prevent Jest from scanning build artifacts which can create haste map collisions
  // (e.g. package.json inside dist/linux-unpacked). This ensures tests and coverage
  // runs are stable even if a previous build step created a `dist/` tree.
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  coveragePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['lcov', 'json', 'text', 'text-summary'],
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
