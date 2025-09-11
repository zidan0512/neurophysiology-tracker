module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    serviceworker: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': ['warn'],
    'no-console': ['warn'],
    'no-debugger': ['error'],
    'no-alert': ['warn'],
    'prefer-const': ['error'],
    'no-var': ['error']
  },
  globals: {
    'Chart': 'readonly',
    'jsPDF': 'readonly'
  }
};