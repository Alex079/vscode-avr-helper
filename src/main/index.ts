import { ExtensionContext, window, workspace } from 'vscode';
import { onChangeActiveTextEditor, onChangeConfiguration, onChangeWorkspaceFolder } from './listeners/OnChange';
import { setContext } from './utils/Context';
import { showSetupToolsItem } from './actions/StatusBar';

export function activate(context: ExtensionContext): void {
  setContext(context);
  showSetupToolsItem();
  onChangeActiveTextEditor();
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(onChangeConfiguration),
    workspace.onDidChangeWorkspaceFolders(onChangeWorkspaceFolder),
    window.onDidChangeActiveTextEditor(onChangeActiveTextEditor)
  );
}

export function deactivate(): void {
  //
}
