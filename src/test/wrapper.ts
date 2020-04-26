import * as path from 'path';
import { mkdirSync } from 'fs';
import { runTests } from 'vscode-test';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
    const extensionTestsPath = path.resolve(__dirname, 'runner');
    const extensionWorkspacePath = path.resolve(__dirname, 'workspace');
    try {
      mkdirSync(extensionWorkspacePath);
    }
    catch (e) {
      console.info(`Workspace already exists: ${e}`);
    }
    await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: [extensionWorkspacePath] });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
