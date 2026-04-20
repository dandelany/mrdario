// production config
const { merge } = require('webpack-merge');
const {resolve} = require('path');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

const commonConfig = require('./common');

module.exports = merge(commonConfig, {
  mode: 'production',
  entry: './index.tsx',
  output: {
    filename: 'js/bundle.[fullhash].min.js',
    path: resolve(__dirname, '../../build'),
    publicPath: '/',
  },
  devtool: 'source-map',
  optimization: {
    minimizer: [
      '...',
      new ImageMinimizerPlugin({
        test: /\.(jpe?g|png|gif)$/i,
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminMinify,
          options: {
            plugins: [
              ['imagemin-gifsicle', { interlaced: false }],
              ['imagemin-optipng', { optimizationLevel: 7 }],
            ],
          },
        },
      }),
    ],
  },
  plugins: [],
});
