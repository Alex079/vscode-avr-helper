import { Uri } from "vscode";
import * as C from '../utils/Conf';
import { join } from "path";
import { runCommand } from "./Spawner";

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
  const info = runCommand(exe, args, uri.fsPath);
  if (info.error) {
    throw new Error(info.error.message);
  }
  return info.stderr.toString();
}

export function getSizeFormat(uri: Uri, baseFolder: string): string {
  const info = runCommand(join(baseFolder, 'avr-size'), ['-h'], uri.fsPath);
  if (info.error) {
    console.log(info.error.message);
    return '-A';
  }
  return info.stderr.toString().includes('-C') ? '-C' : '-A';
}