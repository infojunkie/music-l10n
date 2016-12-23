module.exports = {
  entry: './lib/index.js',
  output: {
    filename: 'dist/music-l10n.js'
  },
  module: {
    preLoaders: [{
      test: /\.js$/,
      loaders: ['eslint'],
    }],
    loader: {
      test: /\.js$/,
      loaders: ['babel']
    }
  }
};
