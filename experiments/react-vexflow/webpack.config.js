var webpack = require('webpack');

var prod = process.env.NODE_ENV === 'production';

function entry() {
    var mainEntry = './src/index.jsx';
    if (prod) {
        return [mainEntry];
    } else {
        return [
            'webpack-dev-server/client?http://localhost:8080',
            'webpack/hot/only-dev-server',
            mainEntry,
        ];
    }
}

function loaders() {
    var base = [
        !prod && {
            test: /\.jsx?$/,
            exclude: /node_modules/,
            loader: 'react-hot',
        },
        {
            test: /\.jsx?$/,
            exclude: /node_modules/,
            loader: 'babel',
            query: {
                presets: ['react', 'es2015'],
                plugins: 'transform-object-rest-spread',
                retainLines: true,
                cacheDirectory: true,
            },
        },
        {
            test: /\.css$/,
            loader: 'style-loader!css-loader',
        },
        {
            test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
            loader: "file",
        },
        {
            test: /\.(woff|woff2)$/,
            loader:"url?prefix=font/&limit=5000",
        },
        {
            test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
            loader: "url?limit=10000&mimetype=application/octet-stream",
        },
        {
            test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
            loader: "url?limit=10000&mimetype=image/svg+xml",
        },
    ];
    return base.filter(function(x) { return x; });
}

function plugins() {
    var plugins = [];
    plugins.push(new webpack.DefinePlugin({ '__PROD__': prod }));
    if (prod) {
        plugins.push(new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
            },
        }));
    }
    if (!prod) {
        plugins.push(new webpack.HotModuleReplacementPlugin());
    }
    return plugins;
}

module.exports = {
    devtool: prod ? "source-map" : "eval",
    entry: entry(),
    module: {
        loaders: loaders(),
    },
    resolve: {
        extensions: ['', '.js', '.jsx'],
    },
    output: {
        path: __dirname + '/dist',
        publicPath: '/',
        filename: 'bundle.js',
    },
    devServer: {
        contentBase: './dist',
        hot: !prod,
    },
    plugins: plugins(),
};
