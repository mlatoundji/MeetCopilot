// webpack.config.cjs
const path = require('path');

module.exports = {
  mode: 'development', // ou 'production'
  entry: './app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
};
