module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  'parserOptions': {
    'project': './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
  ],
  'extends': [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@stencil-community/recommended',
  ],
  'rules': {
    'quotes': ['error', 'single'],
    '@typescript-eslint/ban-types': 'off',
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': ['error'],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        'varsIgnorePattern': '^h$'
      }
    ],
    'react/jsx-no-bind': [
      'warn',
      {
        'ignoreRefs': true,
        'allowArrowFunctions': true,
      }
    ],
    '@stencil-community/required-jsdoc': 'off',
    '@stencil-community/async-methods': 'off'
  },
};
