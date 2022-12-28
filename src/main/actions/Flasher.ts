import { CustomExecution, EventEmitter, QuickPickItem, Task, TaskScope, Uri, WorkspaceFolder, commands, tasks, window, workspace } from 'vscode';
import { getOutputElf } from "../utils/Files";
import { pickFolder, pickMany } from "../presentation/Inputs";
import { promises as fs } from 'fs';
import * as C from '../utils/Conf';
import { checkInfo, runCommand } from './Spawner';
import { AvrTaskTerminal } from './Terminal';

const ERASE: string = '(erase chip)';
const toItem = (label: string): QuickPickItem => ({ label });
const fromItem = (i: QuickPickItem): string => i.label;

export function performFlashTask(): Promise<void> {
  return pickFolder()
    .then(flash)
    .catch(console.log);
}

const flash = (folder: WorkspaceFolder) => {
  const uri = folder.uri;
  const outputFile = getOutputElf(uri.fsPath);
  fs.stat(outputFile)
    .then(stats => {
      if (!stats.isFile()) {
        throw new Error(`${outputFile} is not a file`);
      }
    })
    .then(() => tasks.executeTask(new Task({type: 'AVR.flash'}, folder ?? TaskScope.Workspace, `⚡️ ${new Date()}`, 'AVR Helper',
      new CustomExecution(async () => new AvrTaskTerminal(emitter =>
        getDeviceInfo(uri, emitter)
          .then(parseMemoryAreas)
          .then(areas => pickMany('Select areas to flash', [ERASE, ...areas].map(toItem), () => false))
          .then(areas => areas.map(fromItem))
          .then(flashAreas(uri, outputFile, emitter))
          .then(() => emitter.fire('✅'))
          .catch(handleFlashError(folder))
      ))
    )));
};

const handleFlashError = (folder: WorkspaceFolder) => (reason: object): void => {
  console.log(`${reason}`);
  window.showErrorMessage(`${reason}`, 'Retry')
    .then(goal => {
      if (goal) {
        flash(folder);
      }
    });
};

async function getDeviceInfo(uri: Uri, emitter: EventEmitter<string>): Promise<string[]> {
  const exe = C.PROGRAMMER.get(uri);
  const progType = C.PROG_TYPE.get(uri);
  const devType = C.DEVICE_TYPE.get(uri);
  if (!exe || !progType || ! devType) {
    return [];
  }
  const args: string[] = [
    ...C.PROGRAMMER_ARGS.get(uri) ?? [],
    '-v',
    '-p', devType,
    '-c', progType
  ];
  const defs = C.PROG_DEFS.get(uri);
  if (defs) {
    args.push('-C', defs);
  }
  const port = C.PROG_PORT.get(uri);
  if (port) {
    args.push('-P', port);
  }
  const rate = C.PROG_RATE.get(uri);
  if (rate) {
    args.push('-b', `${rate}`);
  }
  const info = runCommand(exe, args, uri.fsPath, emitter);
  if (checkInfo(info, emitter)) {
    return info.stderr.toString().split('\n');
  }
  throw new Error('Fetching device info failed.');
}

function parseMemoryAreas(lines: string[]): string[] {
  let memoryIsFound: boolean = false;
  const result: string[] = [];
  lines.forEach(line => {
    if (memoryIsFound) {
      if (line === '') {
        memoryIsFound = false;
      }
      else {
        const description = /\S+/.exec(line)?.[0];
        if (description && description !== '-----------') {
          result.push(description);
        }
      }
    }
    else {
      if (/^\s*Memory Type/.test(line)) {
        memoryIsFound = true;
      }
    }
  });
  return result;
}

function flashAreas(uri: Uri, outputFile: string, emitter: EventEmitter<string>) {
  return (areas: string[]): void => {
    const exe = C.PROGRAMMER.get(uri);
    const progType = C.PROG_TYPE.get(uri);
    const devType = C.DEVICE_TYPE.get(uri);
    if (!exe || !progType || !devType) {
      return;
    }
    const args = [
      ...C.PROGRAMMER_ARGS.get(uri) ?? [],
      '-v',
      '-p', devType,
      '-c', progType
    ];
    const defs = C.PROG_DEFS.get(uri);
    if (defs) {
      args.push('-C', defs);
    }
    const port = C.PROG_PORT.get(uri);
    if (port) {
      args.push('-P', port);
    }
    const rate = C.PROG_RATE.get(uri);
    if (rate) {
      args.push('-b', `${rate}`);
    }
    args.push(...areas.map(v => v === ERASE ? '-e' : `-U${v}:w:${outputFile}:e`));
    const info = runCommand(exe, args, uri.fsPath, emitter);
    if (!checkInfo(info, emitter)) {
      throw new Error('Flashing failed.');
    }
  };
}