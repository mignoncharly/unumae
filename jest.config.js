/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  /*
   * Bounded on purpose. jest-expo workers are heavy — each one loads the React
   * Native module graph — and letting Jest spawn one per core made the suite
   * hang indefinitely on this machine rather than merely run slowly. Two
   * workers finish all suites in about ninety seconds and never stall.
   *
   * Jest also warns that a worker did not exit gracefully. That is
   * @testing-library/react-native v14's async teardown, not a test holding a
   * timer: the suites pass and the exit code is 0. Recorded here rather than
   * silenced with --forceExit, which would hide a real leak later.
   */
  maxWorkers: 2,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/tests/**/*.test.ts',
  ],
};
