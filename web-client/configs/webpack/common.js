// shared config (dev and prod)
const {resolve} = require('path');
const {CheckerPlugin, TsConfigPathsPlugin} = require('awesome-typescript-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  context: resolve(__dirname, '../../src'),
  entry: './index.tsx',

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    plugins: [
      new TsConfigPathsPlugin()
    ]
  },

  output: {
    path: resolve(__dirname, '../../build'),
    publicPath: '/',
  },
  devServer: {
    // hot: true, // enable HMR on the server
    port: 6868,

    historyApiFallback: true,
    clientLogLevel: "info",
    // proxy: {
    //   'ws://localhost:3000': {
    //     target: 'ws://localhost:8000',
    //     ws: true,
    //     secure: false,
    //   },
    // }
  },
  devtool: 'cheap-module-eval-source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader', 'source-map-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        use: ['babel-loader', 'awesome-typescript-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', { loader: 'css-loader', options: { importLoaders: 1 } }],
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        loaders: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          'sass-loader',
        ],
      },
      {
        test: /\.module\.scss$/,
        loaders : [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
              modules: true,
              localIdentName: "[local]___[hash:base64:5]"
            }
          },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.less/,
        loaders: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          'less-loader',
        ],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'svg/[name].[hash:7].[ext]'
            }
          },
          {
            loader: 'svgo-loader',
            options: {
              plugins: [
                {removeViewBox: false}
              ]
            }
          }
        ]
      },
      {
        test: /\.(jpe?g|png|gif)$/i,
        loaders: [
          'file-loader?hash=sha512&digest=hex&name=img/[hash].[ext]',
          'image-webpack-loader?bypassOnDebug&optipng.optimizationLevel=7&gifsicle.interlaced=false',
        ],
      },
    ],
  },
  plugins: [
    new CheckerPlugin(),
    new HtmlWebpackPlugin({template: 'index.html.ejs',}),
  ],
  performance: {
    hints: false,
  },
};