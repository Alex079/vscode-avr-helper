import { Uri } from 'vscode';
import * as C from '../utils/Conf';
import { spawnSync } from 'child_process';

async function getDeviceInfo(uri: Uri): Promise<string> {
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

export async function getDeviceMemoryAreas(uri: Uri): Promise<string[]> {
  return getDeviceInfo(uri)
    .then((info) => info.split('\n'))
    .then((lines) => {
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
          if (/^\s*Memory Type/.exec(line)) {
            memoryIsFound = true;
          }
        }
      });
      return result;
    });
}
