import { ConfigurationChangeEvent, Uri, window, workspace } from 'vscode';
import * as C from '../utils/Conf';
import { propagateSettings } from '../actions/Propagator';
import { updateBuildItem, updateFlashItem, updateSetupDeviceItem, updateSetupProgrammerItem } from '../presentation/StatusBar';

export async function onChangeConfiguration(event: ConfigurationChangeEvent): Promise<any> {
  if (!workspace.workspaceFolders) {
    return;
  }
  updateStatusBar();
  workspace.workspaceFolders.forEach(folder => {
    const uri = folder.uri;
    if (event.affectsConfiguration(C.COMPILER.name(), uri) ||
        event.affectsConfiguration(C.LIBRARIES.name(), uri) ||
        event.affectsConfiguration(C.DEVICE_TYPE.name(), uri) ||
        event.affectsConfiguration(C.DEVICE_FREQ.name(), uri)) {
      return propagateSettings(uri)
        .catch((reason) => window.showErrorMessage(reason.toString()));
    }
    return;
  });
}

function getCurrentUri(): Uri | undefined {
  const folders = workspace.workspaceFolders;
  if (folders) {
    const editorUri = window.activeTextEditor?.document.uri;
    if (editorUri) {
      const folder = workspace.getWorkspaceFolder(editorUri);
      if (folder) {
        return folder.uri;
      }
    }
    if (folders.length === 1) {
      return folders[0].uri;
    }
  }
  return undefined;
}

function updateStatusBar(): void {
  const uri = getCurrentUri();
  updateSetupDeviceItem(uri);
  updateSetupProgrammerItem(uri);
  updateBuildItem(uri);
  updateFlashItem(uri);
}

export async function onChangeWorkspaceFolder(): Promise<any> {
  updateStatusBar();
}

export async function onChangeActiveTextEditor(): Promise<any> {
  updateStatusBar();
}
