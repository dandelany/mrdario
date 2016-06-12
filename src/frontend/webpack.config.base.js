var path = require('path');
var webpack = require('webpack');
var HtmlPlugin = require('html-webpack-plugin');
//
// const babelSettings = {
//   extends: path.join(__dirname, '/.babelrcbad')
// };

module.exports = {
  context: __dirname,
  entry: {
    app: ['./app/main.js'],
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
      template: 'app/index.ejs'
    }),
    new webpack.NoErrorsPlugin()
  ],
  resolve: {
    root: [
      path.join(__dirname, '.'),
      // path.join(__dirname, '..')
    ],
    alias: {
      // app: "frontend",
      // game: "game"
    },

    extensions: ['', '.js', '.jsx']
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loaders: ['babel-loader'],
        // loader: 'babel?' + JSON.stringify(babelSettings),
        // exclude: /node_modules/,

        include: [
          path.join(__dirname, 'app'),
          path.join(__dirname, 'game'),
          // path.join(__dirname, '../game')
        ],

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
