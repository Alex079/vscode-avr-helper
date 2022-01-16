import { Uri } from "vscode";
import * as C from '../utils/Conf';
import { spawnSync } from "child_process";
import { dirname, join } from "path";

export async function getProperties(uri: Uri, kind: string): Promise<string> {
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

export function getSizeFormat(uri: Uri, baseFolder: string): string {
  const info = spawnSync(join(baseFolder, 'avr-size'), ['-h'], { cwd: uri.fsPath });
  if (info.error) {
    console.warn(info.error.message);
    return '-A';
  }
  return info.stderr.toString().includes('-C') ? '-C' : '-A';
}