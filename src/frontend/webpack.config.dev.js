var webpack = require('webpack');
var _ = require('lodash');
var config = require('./webpack.config.base');

config = _.merge(config, {
  devServer: {
    port: 6767,
    contentBase: "./build",
    hot: true,
    proxy: {
      'localhost:3000': {
        target: 'ws://localhost:8000',
        ws: true,
        secure: false,
      },
      // '/wsapi/*': {
      //   target: 'ws://localhost:8000',
      //   ws: true,
      //   secure: false,
      // }
    }
  },
  entry: _.assign({}, config.entry, {
    app: [
      'webpack-dev-server/client?http://localhost:6767',
      'webpack/hot/only-dev-server'
    ].concat(config.entry.app)
  }),
  plugins: config.plugins.concat([
    new webpack.HotModuleReplacementPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      // cant use chunkhash with HMR
      filename: 'scripts/vendor.[hash:7].js',
      minChunks: Infinity
    })
  ]),
  module: {
    loaders: [
      {loaders: ['react-hot'].concat(config.module.loaders[0].loaders)}
    ]
  }
});


module.exports = config;
