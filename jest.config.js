module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'server.js',
    'public/**/*.js',
    '!public/sw.js',
    '!node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};