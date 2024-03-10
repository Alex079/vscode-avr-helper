const { defineConfig } = require('@vscode/test-cli');
const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

module.exports = fs.mkdtemp(join(tmpdir(), 'avr-helper-test-'))
  .then(workspaceFolder => defineConfig({
    files: 'out/test/unit/**/*.test.js',
    workspaceFolder,
    mocha: {
      ui: 'tdd',
      timeout: 5000
    }
  }));