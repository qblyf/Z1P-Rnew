module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/.kiro'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '.kiro/**/*.ts',
    '!.kiro/**/*.test.ts',
    '!.kiro/**/*.d.ts',
  ],
};
