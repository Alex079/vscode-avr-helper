import { runTests } from '@vscode/test-electron';
import { join, resolve } from 'path';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';

async function main() {
  try {
    const extensionDevelopmentPath = resolve();
    const extensionTestsPath = __dirname;
    const exitCode = await fs
      .mkdtemp(join(tmpdir(), 'avr-helper-test-'))
      .then(extensionWorkspacePath => runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: ['--disable-extensions', '--no-sandbox', '--disable-gpu', '--enable-software-rendering', '--ozone-platform=x11', extensionWorkspacePath] }));
    if (exitCode > 0) {
      console.error(`Failed to run tests: ${exitCode}`);
      process.exit(exitCode);
    }
  }
  catch (error) {
    console.error(`Failed to run tests: ${error}`);
    process.exit(1);
  }
}

main();
