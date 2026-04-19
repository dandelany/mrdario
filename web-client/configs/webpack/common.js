// shared config (dev and prod)
const {resolve} = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  mode: 'development',
  context: resolve(__dirname, '../../src'),
  entry: './index.tsx',

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fallback: {
      path: require.resolve('path-browserify'),
      url: require.resolve('url/'),
    },
    plugins: [
      new TsConfigPathsPlugin()
    ]
  },

  output: {
    path: resolve(__dirname, '../../build'),
    publicPath: '/',
  },
  devServer: {
    port: 6868,
    historyApiFallback: true,
    client: {
      logging: "info",
    },
    // proxy: {
    //   'ws://localhost:3000': {
    //     target: 'ws://localhost:8000',
    //     ws: true,
    //     secure: false,
    //   },
    // }
  },
  devtool: 'eval-cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            }
          }
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', { loader: 'css-loader', options: { importLoaders: 1 } }],
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              api: 'modern',
            }
          },
        ],
      },
      {
        test: /\.module\.scss$/,
        use : [
          {
            loader: "style-loader",
            options: {
              esModule: false,
            }
          },
          {
            loader: "css-loader",
            options: {
              esModule: false,
              sourceMap: true,
              modules: {
                localIdentName: "[local]___[hash:base64:5]"
              }
            }
          },
          {
            loader: "sass-loader",
            options: {
              implementation: require('sass'),
              api: 'modern',
            }
          }
        ]
      },
      {
        test: /\.less/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          'less-loader',
        ],
      },
      {
        test: /\.svg$/,
        resourceQuery: /raw/,
        type: 'asset/source',
      },
      {
        test: /\.svg$/,
        resourceQuery: /inline/,
        type: 'asset/inline',
        use: [
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
        test: /\.svg$/,
        resourceQuery: { not: [/raw/, /inline/] },
        type: 'asset/resource',
        generator: {
          filename: 'svg/[name].[hash:7][ext]'
        },
        use: [
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
        type: 'asset/resource',
        generator: {
          filename: 'img/[contenthash][ext]'
        },
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              bypassOnDebug: true,
              optipng: {
                optimizationLevel: 7,
              },
              gifsicle: {
                interlaced: false,
              },
            }
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({template: 'index.html.ejs',}),
  ],
  performance: {
    hints: false,
  },
};
