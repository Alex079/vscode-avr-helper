import { QuickPickItem, Uri } from 'vscode';
import { getOutputElf } from "../utils/Files";
import { pickMany } from "../presentation/Inputs";
import * as C from '../utils/Conf';
import { runCommand } from './Spawner';
import { PrintEmitter } from './Terminal';

const ERASE: [string, string] = ['(erase chip)', ''];
const DEFAULT_AREA: string = 'flash';
const toItem = ([label, description]: [string, string]): QuickPickItem => ({ label, description });
const fromItem = (i: QuickPickItem): string => i.label;

export const performFlash = (uri: Uri, emitter: PrintEmitter) =>
  getDeviceInfo(uri, emitter)
    .then(parseMemoryAreas)
    .then(areas => pickMany('Select areas to flash', [ERASE, ...areas].map(toItem), item => item.label === DEFAULT_AREA).catch(() => []))
    .then(areas => areas.map(fromItem))
    .then(flashAreas(uri, emitter))
    .then(() => emitter.fireIconLine(true));

export const performFlashDefault = (uri: Uri, emitter: PrintEmitter) =>
  Promise.resolve([DEFAULT_AREA])
    .then(flashAreas(uri, emitter))
    .then(() => emitter.fireIconLine(true));

async function getDeviceInfo(uri: Uri, emitter: PrintEmitter): Promise<string[]> {
  const exe = C.PROGRAMMER.get(uri);
  const progType = C.PROG_TYPE.get(uri);
  const devType = C.DEVICE_TYPE.get(uri);
  if (!exe || !progType || ! devType) {
    return [];
  }
  const args: string[] = [
    ...C.PROGRAMMER_ARGS.get(uri) ?? [],
    '-q', '-q',
    '-p', devType,
    '-c', 'dryrun',
    '-t'
  ];
  const defs = C.PROG_DEFS.get(uri);
  if (defs) {
    args.push('-C', defs);
  }
  return runCommand(exe, args, uri.fsPath, emitter, 'part')
    .then(info => {
      if (info.status.exitCode === 0) {
        return info.stdout.split('\n');
      }
      throw new Error('Fetching device info failed.');
    });
}

function parseMemoryAreas(lines: string[]): [string, string][] {
  let memoryIsFound: boolean = false;
  const result: [string, string][] = [];
  lines.forEach(line => {
    if (memoryIsFound) {
      if (line === '') {
        memoryIsFound = false;
      }
      else if (line && !line.startsWith('-')) {
        const [name, size] = line.matchAll(/\S+/g);
        result.push([name[0], `(${size[0]} B)`]);
      }
    }
    else if (/^\s*Memory/.test(line)) {
      memoryIsFound = true;
    }
  });
  return result;
}

function flashAreas(uri: Uri, emitter: PrintEmitter) {
  return async (areas: string[]) => {
    if (areas.length === 0) {
      return;
    }
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
    const outputFile = getOutputElf(uri.fsPath);
    args.push(...areas.map(v => v === ERASE[0] ? '-e' : `-U${v}:w:${outputFile}:e`));
    return runCommand(exe, args, uri.fsPath, emitter)
      .then(info => {
        if (info.status.exitCode !== 0) {
          throw new Error('Flashing failed.');
        }
      });
  };
}