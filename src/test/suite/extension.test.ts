import * as assert from 'assert';
import * as vscode from 'vscode';

test('Sample test', async () => {
  await vscode.window.showInformationMessage('Sample test');
  assert.ok(true, 'Sample test');
});
