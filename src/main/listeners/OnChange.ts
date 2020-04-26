import * as C from '../utils/Conf';
import * as P from '../actions/Propagator';
import { ConfigurationChangeEvent, workspace } from 'vscode';
import { updateBuildItem, updateFlashItem, updateSetupDeviceItem, updateSetupProgrammerItem } from '../actions/StatusBar';
import { getCurrentFolder } from '../utils/WorkspaceFolders';

export async function onChangeConfiguration(event: ConfigurationChangeEvent): Promise<any> {
  if (!workspace.workspaceFolders) {
    return;
  }
  const changes: Promise<void>[] = [];
  workspace.workspaceFolders.forEach(folder => {
    const uri = folder.uri;
    if (event.affectsConfiguration(C.COMPILER.name(), uri)) {
      changes.push(P.updateCompiler(uri));
    }
    if (event.affectsConfiguration(C.LIBRARIES.name(), uri)) {
      changes.push(P.updateSourceLibraries(uri));
    }
    if (event.affectsConfiguration(C.PROGRAMMER.name(), uri)) {
      changes.push(P.updateProgrammerTool(uri));
    }
    if (event.affectsConfiguration(C.PROG_DEFS.name(), uri)) {
      changes.push(P.updateProgrammerDefs(uri));
    }
    if (event.affectsConfiguration(C.DEVICE_TYPE.name(), uri)) {
      changes.push(P.updateDeviceType(uri));
    }
    if (event.affectsConfiguration(C.DEVICE_FREQ.name(), uri)) {
      changes.push(P.updateDeviceFrequency(uri));
    }
    if (event.affectsConfiguration(C.PROG_TYPE.name(), uri)) {
      changes.push(P.updateProgrammerType(uri));
    }
    if (event.affectsConfiguration(C.PROG_PORT.name(), uri)) {
      changes.push(P.updateProgrammerPort(uri));
    }
    if (event.affectsConfiguration(C.PROG_RATE.name(), uri)) {
      changes.push(P.updateProgrammerRate(uri));
    }
  });
  return Promise.all(changes);
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
