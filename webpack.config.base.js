var path = require('path');
var webpack = require('webpack');
var HtmlPlugin = require('html-webpack-plugin');

module.exports = {
  context: __dirname,
  entry: {
    app: ['./src/main.js'],
    vendor: [
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
    filename: 'scripts/[name].[chunkhash:7].js'
  },
  recordsPath: path.join(__dirname, "webpack.records.json"),
  devtool: 'eval',
  // devtool: 'source-map',

  plugins: [
    new HtmlPlugin({
      template: 'src/app/index.ejs'
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
  }
};
