module.exports = {
  entry: './index.js',
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
          presets: ['es2016']
        }
      }
    ]
  }
};
