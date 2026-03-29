export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['**/*.ts', '!**/generated/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@kharcha/shared$': '<rootDir>/../../packages/shared/src',
    '^@kharcha/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};
