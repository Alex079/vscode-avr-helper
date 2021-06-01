import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { Uri } from 'vscode';
import * as C from '../utils/Conf';
import { getCCppProps } from '../utils/Files';

const avrFilter = (c: any) => c.name === 'AVR';

async function mutateCCppProperties(folder: Uri, mutator: (conf: any) => void): Promise<void> {
  const name = getCCppProps(folder.fsPath);
  const location = dirname(name);
  return fs
    .mkdir(location)
    .catch(() => {})
    .then(() => fs.readFile(name))
    .then(data => data ? JSON.parse(data.toString()) : {})
    .catch(() => ({}))
    .then(properties => {
      if (!properties.configurations) {
        properties.configurations = [];
      }
      if (properties.configurations.filter(avrFilter).length === 0) {
        properties.configurations.push({
          name: 'AVR',
          intelliSenseMode: '${default}',
          cStandard: 'c11',
          cppStandard: 'c++14'
        });
      }
      properties.configurations.filter(avrFilter).forEach(mutator);
      return JSON.stringify(properties, undefined, '    ');
    })
    .then(str => fs.writeFile(name, str));
}

export function propagateSettings(uri: Uri): Promise<void> {
  const compiler: string | undefined = C.COMPILER.get(uri);
  const libraries: string[] = C.LIBRARIES.get(uri) ?? [];
  const deviceType: string | undefined = C.DEVICE_TYPE.get(uri);
  const deviceFreq: number | undefined = C.DEVICE_FREQ.get(uri);
  return mutateCCppProperties(uri, conf => {
    conf.compilerPath = compiler ?? '';
    conf.includePath = libraries.map(lib => join(lib, '**'));
    const newArgs = conf.compilerArgs
      ? conf.compilerArgs.filter((v: string) => !v.startsWith('-mmcu=') && !v.startsWith('-DF_CPU='))
      : [];
    if (deviceType) {
      newArgs.push(`-mmcu=${deviceType}`);
    }
    if (deviceFreq) {
      newArgs.push(`-DF_CPU=${deviceFreq}UL`);
    }
    conf.compilerArgs = newArgs;
  });
}
