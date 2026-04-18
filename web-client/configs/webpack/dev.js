// development config
const { merge } = require('webpack-merge');
const commonConfig = require('./common');
const {resolve} = require('path');

module.exports = merge(commonConfig, {
  mode: 'development',
  entry: [
    // 'react-hot-loader/patch', // activate HMR for React
    // `webpack-dev-server/client?http://${require("os").hostname()}:6868`,// bundle the client for webpack-dev-server and connect to the provided endpoint
    // 'webpack/hot/only-dev-server', // bundle the client for hot reloading, only- means to only hot reload for successful updates
    './index.tsx' // the entry point of our app
  ],
  devServer: {
    port: 6869,
    historyApiFallback: {
      rewrites: [
        { from: /^\/$/, to: '/views/landing.html' },
        { from: /^\/subpage/, to: '/views/subpage.html' },
        { from: /./, to: '/views/404.html' }
      ]
    },
    client: {
      logging: "info",
    },
    proxy: {
      'ws://localhost:3000': {
        target: 'ws://localhost:8000',
        ws: true,
        secure: false,
      },
    }
  },
  output: {
    path: resolve(__dirname, '../../build'),
    publicPath: '/',
  },
  devtool: 'eval-cheap-module-source-map',
  plugins: [],
});
