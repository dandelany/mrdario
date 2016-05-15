'use strict';
var _ = require('lodash');
var webpackConfig = require('./webpack.config.js');
var webpackDevConfig = require('./webpack.config.dev.js');

module.exports = function(grunt) {
  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // clean out old js files from js build folder
    clean: {
      build: {
        files: [{
          dot: true,
          src: [
            'build/js*', '!build/js/.git*'
          ]
        }]
      }
    },

    // transpile JSX/ES6 to normal JS
    // (this is the standard build in lib)
    //babel: {
    //    build: {
    //        files: [{
    //            expand: true,
    //            cwd: 'src',
    //            src: ['*.js', '*.jsx'],
    //            dest: 'lib',
    //            ext: '.js'
    //        }]
    //    }
    //},

    // also create a self-contained bundle version
    webpack: {
      options: webpackConfig
    },

    // minify bundle
    //uglify: {
    //    build: {
    //        files: {'build/react-datascope.min.js': 'build/react-datascope.js'}
    //    }
    //},

    //watch: {
    //    build: {
    //        files: 'src/*.*',
    //        tasks: ['build', 'shell:sayBuiltJs']
    //    }
    //},
    //
    //shell: {
    //    sayBuiltJs: { command: 'say "built js" -v Cellos' }
    //},



    'webpack-dev-server': {
      dev: {
        hot: true,
        port: 6767,
        contentBase: './build',
        webpack: webpackDevConfig,
        publicPath: webpackDevConfig.output.publicPath,
        historyApiFallback: true,
        keepalive: true
      }
    }

  });

  //
  grunt.registerTask('default', 'webpack-dev-server');

  //grunt.registerTask('examples', function(target) {
  //    return grunt.task.run(['webpack-dev-server']);
  //});

  //grunt.registerTask('build', ['clean', 'babel', 'webpack:build', 'uglify']);
  //grunt.registerTask('build', ['clean', 'babel']);
};


