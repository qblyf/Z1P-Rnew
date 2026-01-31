module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/.kiro', '<rootDir>/utils'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '.kiro/**/*.ts',
    'utils/**/*.ts',
    '!.kiro/**/*.test.ts',
    '!utils/**/*.test.ts',
    '!.kiro/**/*.d.ts',
  ],
};
