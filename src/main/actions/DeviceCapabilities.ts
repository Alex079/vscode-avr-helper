import { Uri } from 'vscode';
import { getDeviceInfo } from './Runner';

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
