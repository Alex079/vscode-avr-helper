import { promises as fs } from 'fs';
import { spawnSync } from "child_process";
import { QuickPickItem, ShellExecution, Task, tasks, Uri, window, WorkspaceFolder } from "vscode";
import * as C from '../utils/Conf';
import { getMakeTargets, getOutput } from "../utils/Files";
import { pickFolder, pickMany, pickOne } from "../presentation/Inputs";
import { getDeviceMemoryAreas } from './DeviceCapabilities';

const GOALS: string[] = ['build', 'clean', 'scan'];
const ERASE: string = '(erase chip)';

const toItem = (i: string): QuickPickItem => ({ label: i });
const fromItem = (i: QuickPickItem): string => i.label;
const toFile = (folder: WorkspaceFolder): string => getMakeTargets(folder.uri.fsPath);

export async function performBuildTask(): Promise<void> {
  pickFolder().then(folder => 
    pickOne('Select build goal', GOALS.map(toItem), () => false)
      .then(fromItem)
      .then(goal =>
        tasks.executeTask(
          new Task(
            { type: 'AVR.make' }, folder, goal, 'AVR',
            new ShellExecution('make', [`-f${toFile(folder)}`, goal]),
            '$gcc'
          )
        )
      )
  )
  .catch(console.trace);
}

export async function performFlashTask(): Promise<void> {
  pickFolder().then(folder => {
    const outputFile = getOutput(folder.uri.fsPath);
    fs.stat(outputFile)
      .then(stat => {
        if (!stat.isFile()) {
          throw new Error();
        }
      })
      .then(() => getDeviceMemoryAreas(folder.uri))
      .then(areas => pickMany('Select areas to flash', [ERASE, ...areas].map(toItem), () => false))
      .then(areas => areas.map(fromItem))
      .then(areas => {
        const exe: string | undefined = C.PROGRAMMER.get(folder.uri);
        const progType: string | undefined = C.PROG_TYPE.get(folder.uri);
        const devType: string | undefined = C.DEVICE_TYPE.get(folder.uri);
        if (!exe || !progType || ! devType) {
          return;
        }
        const args: string[] = [
          '-v',
          '-p', devType,
          '-c', progType
        ];
        const defs: string | undefined = C.PROG_DEFS.get(folder.uri);
        if (defs) {
          args.push('-C', defs);
        }
        const port: string | undefined = C.PROG_PORT.get(folder.uri);
        if (port) {
          args.push('-P', port);
        }
        const rate: number | undefined = C.PROG_RATE.get(folder.uri);
        if (rate) {
          args.push('-b', `${rate}`);
        }
        args.push(...areas.map(v => v === ERASE ? '-e' : `-U${v}:w:${outputFile}:e`));
        tasks.executeTask(
          new Task(
            { type: 'AVR.flash' }, folder, areas.toString(), 'AVR', new ShellExecution(exe, args)
          )
        );
      })
      .catch((reason) => window.showErrorMessage(reason.toString()));
  })
  .catch(console.trace);
}

export async function getList(uri: Uri, kind: string): Promise<string> {
  const exe: string | undefined = C.PROGRAMMER.get(uri);
  if (!exe) {
    return '';
  }
  const args: string[] = [kind];
  const defs: string | undefined = C.PROG_DEFS.get(uri);
  if (defs) {
    args.push('-C', defs);
  }
  const info = spawnSync(exe, args, { cwd: uri.fsPath });
  if (info.error) {
    throw new Error(info.error.message);
  }
  return info.stderr.toString();
}

export async function getDeviceInfo(uri: Uri): Promise<string> {
  const exe: string | undefined = C.PROGRAMMER.get(uri);
  const progType: string | undefined = C.PROG_TYPE.get(uri);
  const devType: string | undefined = C.DEVICE_TYPE.get(uri);
  if (!exe || !progType || ! devType) {
    return '';
  }
  const args: string[] = [
    '-v',
    '-p', devType,
    '-c', progType
  ];
  const defs: string | undefined = C.PROG_DEFS.get(uri);
  if (defs) {
    args.push('-C', defs);
  }
  const port: string | undefined = C.PROG_PORT.get(uri);
  if (port) {
    args.push('-P', port);
  }
  const rate: number | undefined = C.PROG_RATE.get(uri);
  if (rate) {
    args.push('-b', `${rate}`);
  }
  const info = spawnSync(exe, args, { cwd: uri.fsPath });
  if (info.error) {
    throw new Error(info.error.message);
  }
  if (info.status && info.status > 0) {
    throw new Error(info.stderr.toString());
  }
  return info.stderr.toString();
}