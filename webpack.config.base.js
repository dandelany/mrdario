var path = require('path');
var webpack = require('webpack');

module.exports = {
    context: __dirname,
    entry: [
        './src/main.jsx'
    ],
    output: {
        path: path.join(__dirname, 'build/assets'),
        filename: 'bundle.js',
        publicPath: '/assets/'
    },
    devtool: 'source-map',

    plugins: [
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
                test: /.*img\/.*\.svg$/,
                loaders: [
                    'file-loader',
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