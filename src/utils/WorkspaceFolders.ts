import { WorkspaceFolder, window, workspace } from 'vscode';

export function getCurrentFolder(): WorkspaceFolder | undefined {
  const folders = workspace.workspaceFolders;
  if (folders) {
    const editorUri = window.activeTextEditor?.document.uri;
    if (editorUri) {
      const folder = workspace.getWorkspaceFolder(editorUri);
      if (folder) {
        return folder;
      }
    }
    if (folders.length === 1) {
      return folders[0];
    }
  }
  return undefined;
}
