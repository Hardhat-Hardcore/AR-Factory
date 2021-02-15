module.exports = {
  'env': {
    'node': true,
    'commonjs': true,
    'es2021': true,
    'es6': true,
    'mocha': true
  },
  'extends': 'eslint:recommended',
  'parserOptions': {
    'ecmaVersion': 12
  },
  'rules': {
    'indent': [ 'error', 2 ],
    'linebreak-style': [ 'error', 'unix' ],
    'quotes': [ 'error', 'single' ],
    'semi': [ 'error', 'never' ],
    'camelcase': [ 'error', {'properties': 'always'}]
  },
  'ignorePatterns': ['README.md', 'contracts/', 'node_modules/', 'artifacts/',
    'coverage/', 'package-lock.json', 'cache/', 'coverage.json', 'package.json',
    'clinet/', '/docs']
}
