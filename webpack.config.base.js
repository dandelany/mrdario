var path = require('path');
var webpack = require('webpack');
var HtmlPlugin = require('html-webpack-plugin');
var CleanPlugin = require('clean-webpack-plugin');

module.exports = {
    context: __dirname,
    entry: [
        './src/main.jsx'
    ],
    output: {
        path: path.join(__dirname, 'build'),
        filename: 'scripts/bundle.[hash:7].js',
        //publicPath: '/'
    },
    devtool: 'source-map',

    plugins: [
        new CleanPlugin(['build']),
        new HtmlPlugin({
            template: 'src/app/index.html'
            //favicon: 'src/images/favicon.png'
        }),
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