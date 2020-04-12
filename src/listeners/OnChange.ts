import { ConfigurationChangeEvent, workspace, WorkspaceFoldersChangeEvent, TextEditor } from 'vscode';
import * as P from '../actions/Propagator';
import { COMPILER, DEVICE_FREQ, DEVICE_TYPE, LIBRARIES, PROGRAMMER, PROG_DEFS, PROG_PORT, PROG_RATE, PROG_TYPE } from '../utils/Conf';
import { getCurrentFolder } from '../utils/WorkspaceFolders';
import { updateSetupDeviceItem, updateSetupProgrammerItem, updateBuildItem, updateFlashItem } from '../actions/StatusBar';
import { getSetupDeviceItemText, getSetupProgrammerItemText, getFlashItemFlag, getBuildItemFlag } from '../utils/StatusBar';

export async function onChangeConfiguration(event: ConfigurationChangeEvent): Promise<any> {
  if (!workspace.workspaceFolders) {
    return;
  }
  const changes: Promise<void>[] = [];
  workspace.workspaceFolders.forEach(folder => {
    const uri = folder.uri;
    if (event.affectsConfiguration(COMPILER.name(), uri)) {
      changes.push(P.updateCompiler(uri));
    }
    if (event.affectsConfiguration(LIBRARIES.name(), uri)) {
      changes.push(P.updateSourceLibraries(uri));
    }
    if (event.affectsConfiguration(PROGRAMMER.name(), uri)) {
      changes.push(P.updateProgrammerTool(uri));
    }
    if (event.affectsConfiguration(PROG_DEFS.name(), uri)) {
      changes.push(P.updateProgrammerDefs(uri));
    }
    if (event.affectsConfiguration(DEVICE_TYPE.name(), uri)) {
      changes.push(P.updateDeviceType(uri));
    }
    if (event.affectsConfiguration(DEVICE_FREQ.name(), uri)) {
      changes.push(P.updateDeviceFrequency(uri));
    }
    if (event.affectsConfiguration(PROG_TYPE.name(), uri)) {
      changes.push(P.updateProgrammerType(uri));
    }
    if (event.affectsConfiguration(PROG_PORT.name(), uri)) {
      changes.push(P.updateProgrammerPort(uri));
    }
    if (event.affectsConfiguration(PROG_RATE.name(), uri)) {
      changes.push(P.updateProgrammerRate(uri));
    }
  });
  return Promise.all(changes);
}

function updateStatusBar(): void {
  const uri = getCurrentFolder()?.uri;
  updateSetupDeviceItem(uri ? getSetupDeviceItemText(uri) : '');
  updateSetupProgrammerItem(uri ? getSetupProgrammerItemText(uri) : '');
  updateBuildItem(uri ? getBuildItemFlag(uri) : false);
  updateFlashItem(uri ? getFlashItemFlag(uri) : false);
}

export async function onChangeWorkspaceFolder(event: WorkspaceFoldersChangeEvent): Promise<any> {
  updateStatusBar();
}

export async function onChangeActiveTextEditor(editor: TextEditor | undefined): Promise<any> {
  updateStatusBar();
}
