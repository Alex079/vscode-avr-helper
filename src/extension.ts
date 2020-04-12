import { ExtensionContext, window, workspace } from 'vscode';
import { showSetupToolsItem } from './actions/StatusBar';
import { onChangeConfiguration, onChangeActiveTextEditor, onChangeWorkspaceFolder } from './listeners/OnChange';
import { setContext } from './utils/Context';

export function activate(context: ExtensionContext): void {
  setContext(context);

  showSetupToolsItem();

  onChangeActiveTextEditor(undefined);

  context.subscriptions.push(
    workspace.onDidChangeConfiguration(onChangeConfiguration),
    workspace.onDidChangeWorkspaceFolders(onChangeWorkspaceFolder),
    window.onDidChangeActiveTextEditor(onChangeActiveTextEditor)
  );
}

export function deactivate(): void {
  //
}
