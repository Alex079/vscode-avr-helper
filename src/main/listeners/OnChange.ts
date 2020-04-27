import * as C from '../utils/Conf';
import { propagateSettings } from '../actions/Propagator';
import { ConfigurationChangeEvent, window, workspace } from 'vscode';
import { updateBuildItem, updateFlashItem, updateSetupDeviceItem, updateSetupProgrammerItem } from '../actions/StatusBar';
import { getCurrentFolder } from '../utils/WorkspaceFolders';

export async function onChangeConfiguration(event: ConfigurationChangeEvent): Promise<any> {
  if (!workspace.workspaceFolders) {
    return;
  }
  workspace.workspaceFolders.forEach(folder => {
    const uri = folder.uri;
    if (event.affectsConfiguration(C.COMPILER.name(), uri) ||
        event.affectsConfiguration(C.LIBRARIES.name(), uri) ||
        event.affectsConfiguration(C.DEVICE_TYPE.name(), uri) ||
        event.affectsConfiguration(C.DEVICE_FREQ.name(), uri) ||
        event.affectsConfiguration(C.PROGRAMMER.name(), uri) ||
        event.affectsConfiguration(C.PROG_DEFS.name(), uri) ||
        event.affectsConfiguration(C.PROG_TYPE.name(), uri) ||
        event.affectsConfiguration(C.PROG_PORT.name(), uri) ||
        event.affectsConfiguration(C.PROG_RATE.name(), uri)) {
      return propagateSettings(uri)
        .then(updateStatusBar)
        .catch((reason) => window.showErrorMessage(reason.toString()));
    }
    return;
  });
  
}

function updateStatusBar(): void {
  const uri = getCurrentFolder()?.uri;
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
