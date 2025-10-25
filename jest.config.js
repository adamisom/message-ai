module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/integration/', // Exclude integration tests from unit test runs
  ],
  collectCoverageFrom: [
    'utils/**/*.ts',
    'store/**/*.ts',
    'services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  moduleFileExtensions: ['ts', 'js'],
};

