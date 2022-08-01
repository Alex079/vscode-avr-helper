import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { Uri } from 'vscode';
import * as C from '../utils/Conf';
import { showMessageAndThrowError } from '../utils/ErrorHandler';
import { getCCppProps } from '../utils/Files';

const avrFilter = (c: any) => c.name === 'AVR';
const DEFAULT = '${default}';

function mutateCCppProperties(folder: Uri, mutator: (conf: any) => void): Promise<void> {
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
          intelliSenseMode: DEFAULT
        });
      }
      properties.configurations.filter(avrFilter).forEach(mutator);
      return JSON.stringify(properties, undefined, '    ');
    })
    .then(str => fs.writeFile(name, str))
    .catch(showMessageAndThrowError);
}

export function propagateSettings(uri: Uri): Promise<void> {
  const compiler = C.COMPILER.get(uri) || '';
  const cStandard = C.C_STD.get(uri) || DEFAULT;
  const cppStandard = C.CPP_STD.get(uri) || DEFAULT;
  const compilerArgs = C.COMPILER_ARGS.get(uri) ?? [];
  const libraries = C.LIBRARIES.get(uri) ?? [];
  const deviceType = C.DEVICE_TYPE.get(uri);
  const deviceFreq = C.DEVICE_FREQ.get(uri);
  return mutateCCppProperties(uri, conf => {
    conf.compilerPath = compiler;
    conf.cStandard = cStandard;
    conf.cppStandard = cppStandard;
    conf.includePath = libraries.map(lib => join(lib, '**'));
    conf.compilerArgs = [...compilerArgs];
    if (deviceType) {
      conf.compilerArgs.push(`-mmcu=${deviceType}`);
    }
    if (deviceFreq) {
      conf.compilerArgs.push(`-DF_CPU=${deviceFreq}UL`);
    }
  });
}
