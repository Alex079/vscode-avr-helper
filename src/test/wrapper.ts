import * as path from 'path';
import { promises as fs } from 'fs';
import { runTests } from '@vscode/test-electron';

const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
const extensionTestsPath = path.resolve(__dirname, 'runner');
const extensionWorkspacePath = path.resolve(__dirname, 'workspace');
fs.mkdir(extensionWorkspacePath)
  .catch(() => {})
  .then(() => runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: [extensionWorkspacePath] }));
