module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/integration/', // Exclude integration tests from unit test runs
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts', // Entry point, no logic to test
  ],
  moduleFileExtensions: ['ts', 'js'],
  // Setup file to mock Firebase Admin and environment variables
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // Clear mocks between tests
  clearMocks: true,
  // Verbose output for debugging
  verbose: false,
  // Transform settings for ts-jest
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },
};

