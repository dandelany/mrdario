var path = require('path');
var webpack = require('webpack');

module.exports = {
    context: __dirname,
    entry: [
        'webpack-dev-server/client?http://localhost:6767',
        'webpack/hot/only-dev-server',
        './src/main.jsx'
    ],
    output: {
        path: path.join(__dirname, 'build/assets'),
        filename: 'bundle.js',
        publicPath: '/assets/'
    },
    devtool: 'source-map',

    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin()
    ],
    resolve: {
        extensions: ['', '.js', '.jsx']
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                loaders: ['react-hot', 'babel-loader'],
                exclude: /node_modules/
            }
        ]
    }
};