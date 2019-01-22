var path = require('path');
var webpack = require('webpack');
var CleanPlugin = require('clean-webpack-plugin');
var _ = require('lodash');
var config = require('./webpack.config.base');

config = _.merge(config, {
  plugins: config.plugins.concat([
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new CleanPlugin(['build/frontend'], { root: path.resolve(__dirname , '../..'), verbose: true }),
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      filename: 'scripts/vendor.[chunkhash:7].js',
      minChunks: Infinity
    })
  ])
});

module.exports = config;
