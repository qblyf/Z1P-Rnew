module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/.kiro', '<rootDir>/utils', '<rootDir>/features'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '.kiro/**/*.ts',
    'utils/**/*.ts',
    'features/**/*.ts',
    'features/**/*.tsx',
    '!.kiro/**/*.test.ts',
    '!utils/**/*.test.ts',
    '!features/**/*.test.ts',
    '!features/**/*.test.tsx',
    '!.kiro/**/*.d.ts',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-dnd|react-dnd-html5-backend|dnd-core)/)',
  ],
};
