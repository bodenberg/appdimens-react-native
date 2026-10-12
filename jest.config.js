/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {tsconfig: {jsx: 'react', esModuleInterop: true, isolatedModules: true}, diagnostics: false}],
  },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/strategies/*/number.ts'],
  coverageThreshold: {
    global: {branches: 80, functions: 80, lines: 90, statements: 90},
  },
};
