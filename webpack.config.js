var webpack = require('webpack');
var CleanPlugin = require('clean-webpack-plugin');
var _ = require('lodash');
var config = require('./webpack.config.base');

config = _.merge(config, {
  plugins: config.plugins.concat([
    new CleanPlugin(['build']),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      filename: 'scripts/vendor.[chunkhash:7].js',
      minChunks: Infinity
    })
  ])
});

module.exports = config;
