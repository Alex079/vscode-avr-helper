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
  return runCommand(exe, args, uri.fsPath)
    .then(process => {
      if (process.status.errorMessage) {
        throw new Error('Could not get device properties.');
      }
      return process.stderr;
    });
}

export async function getSizeFormat(uri: Uri, baseFolder: string): Promise<string> {
  return runCommand(join(baseFolder, 'avr-size'), ['-h'], uri.fsPath)
    .then(info => info.stderr.includes('-C') ? '-C' : '-A');
}