const NodeEnvironment = require('jest-environment-node');
const vscode = require('vscode');

class VsCodeEnvironment extends NodeEnvironment {
  constructor(config: any) {
    super(config);
  }

  public async setup() {
    await super.setup();
    this.global.vscode = vscode;
  }

  public async teardown() {
    this.global.vscode = {};
    return await super.teardown();
  }
}

module.exports = VsCodeEnvironment;