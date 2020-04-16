import { Uri } from 'vscode';
import { join } from 'path';
import { execFile } from '../utils/Promisified';
import { MAKE_LISTS } from '../utils/Files';

export async function getDeviceMemoryAreas(uri: Uri): Promise<string[]> {
  return execFile('make', [`-f${join(uri.fsPath, MAKE_LISTS)}`, 'list-info'], { cwd: uri.fsPath })
    .then(({ stderr }) => stderr.split('\n'))
    .then((lines) => {
      let memoryIsFound: boolean = false;
      const result: string[] = [];
      lines.forEach(line => {
        if (memoryIsFound) {
          if (line === '') {
            memoryIsFound = false;
          }
          const desc = /^\s*([^\s]+)/.exec(line);
          if (desc) {
            if (desc[1] !== '-----------') {
              result.push(desc[1]);
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
