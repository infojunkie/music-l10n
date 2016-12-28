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
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['latest']
        }
      }
    ]
  }
};
