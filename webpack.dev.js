//@ts-check

'use strict';

module.exports = require('webpack-merge')(require('./webpack.config'),
  /**@type {import('webpack').Configuration}*/
  {
    mode: "development",
    devtool: "inline-source-map",
    entry: {
      'test/index': './src/test/index',
      'test/runner': './src/test/runner',
      'test/wrapper': './src/test/wrapper'
    }
  }
);