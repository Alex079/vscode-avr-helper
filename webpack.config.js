//@ts-check

'use strict';

const path = require('path');
const nodeExternals = require('webpack-node-externals');

/**@type {import('webpack').Configuration}*/
module.exports = {
  mode: "production",
  devtool: 'source-map',
  target: 'node',
  node: {
    __dirname: false,
    __filename: false
  },
  entry: {
    'extension': './src/main/index'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  externals: [
    {
      vscode: 'commonjs vscode'
    },
    nodeExternals()
  ],
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, 'src'),
        loader: 'ts-loader'
      }
    ]
  }
};