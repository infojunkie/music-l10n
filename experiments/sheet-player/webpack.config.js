const CompressionPlugin = require("compression-webpack-plugin")

module.exports = {
  entry: ['whatwg-fetch', './index.js'],
  output: {
      path: __dirname,
      filename: 'bundle.js'
  },
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.json$/, loader: 'json' },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['latest']
        }
      }
    ]
  },
  plugins: [
    new CompressionPlugin({
      test: /\.js/
    })
  ]
};
