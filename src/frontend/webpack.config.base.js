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
      "react-slider"
    ]
  },
  output: {
    path: path.join(__dirname, '../../build/frontend'),
    filename: 'scripts/[name].[chunkhash:7].js'
  },
  recordsPath: path.join(__dirname, "webpack.records.json"),
  devtool: 'eval',
  // devtool: 'source-map',

  plugins: [
    new HtmlPlugin({
      template: 'app/index.ejs'
    }),
    new webpack.NoEmitOnErrorsPlugin()
  ],
  resolve: {
    modules: [
      path.join(__dirname, '.'),
      'node_modules'
    ],
    // alias: {
      // app: "frontend",
      // game: "game"
    // },

    extensions: ['.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: ['babel-loader'],
        include: [
          path.join(__dirname, 'app'),
          path.join(__dirname, 'game'),
          path.join(__dirname, 'node_modules/gamepad-plus/src')
        ]
      },
      {
        test: /\.less?$/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /.*img\/.*\.svg$/,
        use: [
          "file-loader?name=svg/[name].[hash:7].[ext]",
          {
            loader: 'svgo-loader',
            options: {
              plugins: [
                {removeViewBox: false}
              ]
            }
          }
        ]
      }
    ],
  }
};
