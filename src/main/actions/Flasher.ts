import { QuickPickItem, ShellExecution, Task, Uri, WorkspaceFolder, tasks } from 'vscode';
import { getOutputElf } from "../utils/Files";
import { pickFolder, pickMany } from "../presentation/Inputs";
import { promises as fs } from 'fs';
import * as C from '../utils/Conf';
import { showMessageAndThrowError } from '../utils/ErrorHandler';
import { runCommand } from './Spawner';

const ERASE: string = '(erase chip)';
const toItem = (i: string): QuickPickItem => ({ label: i });
const fromItem = (i: QuickPickItem): string => i.label;

export function performFlashTask(): Promise<void> {
  return pickFolder()
    .then(folder => {
      const outputFile = getOutputElf(folder.uri.fsPath);
      return fs.stat(outputFile)
        .then(stats => {
          if (stats.isFile()) {
            return getDeviceInfo(folder.uri).split('\n');
          }
          throw new Error(`${outputFile} is not a file`);
        })
        .catch(showMessageAndThrowError)
        .then(parseMemoryAreas)
        .then(areas => pickMany('Select areas to flash', [ERASE, ...areas].map(toItem), () => false))
        .then(areas => areas.map(fromItem))
        .then(flashAreas(folder, outputFile));
    })
    .catch(console.log);
}

function getDeviceInfo(uri: Uri): string {
  const exe = C.PROGRAMMER.get(uri);
  const progType = C.PROG_TYPE.get(uri);
  const devType = C.DEVICE_TYPE.get(uri);
  if (!exe || !progType || ! devType) {
    return '';
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
  const info = runCommand(exe, args, uri.fsPath);
  if (info.error) {
    throw new Error(info.error.message);
  }
  if (info.status && info.status > 0) {
    throw new Error(info.stderr.toString());
  }
  return info.stderr.toString();
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

function flashAreas(folder: WorkspaceFolder, outputFile: string) {
  return (areas: string[]): void => {
    const exe = C.PROGRAMMER.get(folder.uri);
    const progType = C.PROG_TYPE.get(folder.uri);
    const devType = C.DEVICE_TYPE.get(folder.uri);
    if (!exe || !progType || !devType) {
      return;
    }
    const args = [
      ...C.PROGRAMMER_ARGS.get(folder.uri) ?? [],
      '-v',
      '-p', devType,
      '-c', progType
    ];
    const defs = C.PROG_DEFS.get(folder.uri);
    if (defs) {
      args.push('-C', defs);
    }
    const port = C.PROG_PORT.get(folder.uri);
    if (port) {
      args.push('-P', port);
    }
    const rate = C.PROG_RATE.get(folder.uri);
    if (rate) {
      args.push('-b', `${rate}`);
    }
    args.push(...areas.map(v => v === ERASE ? '-e' : `-U${v}:w:${outputFile}:e`));
    tasks.executeTask(
      new Task(
        { type: 'AVR.flash' }, folder, areas.toString(), 'AVR', new ShellExecution(exe, args)
      )
    );
  };
}