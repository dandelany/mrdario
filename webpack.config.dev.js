var webpack = require('webpack');
var _ = require('lodash');
var config = require('./webpack.config.base');

config = _.merge(config, {
    devServer: {
        port: 6767,
        contentBase: "./build",
        hot: true
    },
    entry: [
        'webpack-dev-server/client?http://localhost:6767',
        'webpack/hot/only-dev-server'
    ].concat(config.entry.app),
    plugins: config.plugins.concat([
        new webpack.HotModuleReplacementPlugin()
    ]),
    module: {
        loaders: [
            {loaders: ['react-hot'].concat(config.module.loaders[0].loaders)}
        ]
    }
});

module.exports = config;
