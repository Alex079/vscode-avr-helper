import { Uri } from 'vscode';
import { execFile } from '../utils/Promisified';
import { getMakeLists } from '../utils/Files';

export async function getDeviceMemoryAreas(uri: Uri): Promise<string[]> {
  return execFile('make', [`-f${getMakeLists(uri.fsPath)}`, 'list-info'], { cwd: uri.fsPath })
    .then(({ stderr }) => stderr.split('\n'))
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
