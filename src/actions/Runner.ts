import { join } from 'path';
import { getCurrentFolder } from "../utils/WorkspaceFolders";
import { pickOne, pickMany } from "./Inputs";
import { tasks, Task, ShellExecution, QuickPickItem, WorkspaceFolder, window } from "vscode";
import { MAKE_TARGETS } from "../utils/Files";
import { getDeviceMemoryAreas } from './DeviceCapabilities';

const buildGoals: string[] = ['build', 'clean', 'scan'];

const toItem = (i: string): QuickPickItem => { return { label: i }; };
const fromItem = (i: QuickPickItem): string => i.label;
const toFile = (folder: WorkspaceFolder): string => join(folder.uri.fsPath, MAKE_TARGETS);

export async function performBuildTask(): Promise<void> {
    const folder = getCurrentFolder();
    if (folder) {
        pickOne('Select build goal', buildGoals.map(toItem), () => false)
        .then(fromItem)
        .then((goal) => tasks.executeTask(new Task(
            { type: 'AVR.make' }, folder, goal, 'AVR',
            new ShellExecution('make', [`-f${toFile(folder)}`, goal]), '$gcc'
        )));
    }
}

export async function performFlashTask(): Promise<void> {
    const folder = getCurrentFolder();
    if (folder) {
        getDeviceMemoryAreas(folder.uri)
        .then(areas => pickMany('Select areas to flash', areas.map(toItem), () => false))
        .then(areas => areas.map(fromItem))
        .then(areas => tasks.executeTask(new Task(
            { type: 'AVR.make' }, folder, areas.toString(), 'AVR',
            new ShellExecution('make', [`-f${toFile(folder)}`, 'write', `MEMORY="${areas.join(' ')}"`]), '$gcc' // just in case make decides to rebuild
        )))
        .catch((reason) => window.showErrorMessage(`Uploading failed.\n${reason.toString()}`));
    }
}