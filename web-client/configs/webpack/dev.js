// development config
const merge = require('webpack-merge');
const webpack = require('webpack');
const commonConfig = require('./common');

module.exports = merge(commonConfig, {
  mode: 'development',
  entry: [
    // 'react-hot-loader/patch', // activate HMR for React
    // `webpack-dev-server/client?http://${require("os").hostname()}:6868`,// bundle the client for webpack-dev-server and connect to the provided endpoint
    // 'webpack/hot/only-dev-server', // bundle the client for hot reloading, only- means to only hot reload for successful updates
    './index.tsx' // the entry point of our app
  ],
  devServer: {
    // hot: true, // enable HMR on the server
    port: 6868,
    proxy: {
      'ws://localhost:3000': {
        target: 'ws://localhost:8000',
        ws: true,
        secure: false,
      },
    }
  },
  devtool: 'cheap-module-eval-source-map',
  plugins: [
    // new webpack.HotModuleReplacementPlugin(), // enable HMR globally
    new webpack.NamedModulesPlugin(), // prints more readable module names in the browser console on HMR updates
  ],
});
