var path = require('path');
var webpack = require('webpack');
var HtmlPlugin = require('html-webpack-plugin');
var packageJson = require('./package.json');

module.exports = {
    context: __dirname,
    entry: {
        app: './src/main.jsx',
        vendor: [
            "babel/polyfill",
            "classnames",
            "events",
            "immutable",
            "javascript-state-machine",
            "keymirror",
            "lodash",
            "mousetrap",
            "react",
            "react-router",
            "react-slider",
            "reflux"
        ]
    },
    output: {
        path: path.join(__dirname, 'build'),
        filename: 'scripts/main.[chunkhash:7].js'
    },
    devtool: 'source-map',

    plugins: [
        new HtmlPlugin({
            template: 'src/app/index.html'
            //favicon: 'src/images/favicon.png'
        }),
        new webpack.optimize.CommonsChunkPlugin(
            'vendor', 'scripts/vendor.[chunkhash:7].js'
        ),
        new webpack.NoErrorsPlugin()
    ],
    resolve: {
        root: path.join(__dirname, 'src'),
        extensions: ['', '.js', '.jsx']
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                loaders: ['babel-loader'],
                exclude: /node_modules/
            },
            {
                test: /\.less?$/,
                loader: "style!css!less"
            },
            {
                test: /.*img\/.*\.svg$/,
                loaders: [
                    "file?name=svg/[name].[hash:7].[ext]",
                    'svgo-loader'
                ]
            }
        ]
        //postLoaders: [
        //    {
        //        test: /\.svg$/,
        //        loaders: ['img?minimize']
        //    }
        //]
    }
};