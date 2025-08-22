module.exports = {
  env: {
    node: true,
    es2022: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off',
    indent: ['error', 2],
    quotes: ['error', 'single'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'max-len': ['off'],
    'require-jsdoc': 'off',
    'operator-linebreak': 'off',
    'no-multi-spaces': 'off'
  }
};
