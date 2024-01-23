module.exports = {
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true
  },
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: [
    '@typescript-eslint'
  ],
  parserOptions: {
    ecmaVersion: 2022
  },
  rules: {
  }
}
