import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { Uri } from 'vscode';
import * as C from '../utils/Conf';
import { C_CPP_PROPS, MAKE_PROPS } from '../utils/Files';
import { parseProperties, stringifyProperties } from '../utils/Properties';

const avrFilter = (c: any) => c.name === 'AVR';

async function mutateCCppProperties(folder: Uri, mutator: (conf: any) => void): Promise<void> {
  const name = join(folder.fsPath, C_CPP_PROPS);
  const location = dirname(name);
  return fs
    .mkdir(location)
    .catch(console.trace)
    .then(() => fs.readFile(name))
    .then(
      data => data ? JSON.parse(data.toString()) : {},
      () => {}
    )
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

async function mutateMakeProperties(folder: Uri, mutator: (conf: any) => void): Promise<void> {
  const name = join(folder.fsPath, MAKE_PROPS);
  const location = dirname(name);
  return fs
    .mkdir(location)
    .catch(console.trace)
    .then(() => fs.readFile(name))
    .then(
      data => parseProperties(data.toString()),
      () => {}
    )
    .then(properties => {
      mutator(properties);
      return stringifyProperties(properties);
    })
    .then(str => fs.writeFile(name, str));
}
export async function propagateSettings(uri: Uri): Promise<any> {
  const compiler: string | undefined = C.COMPILER.get(uri);
  const libraries: string[] = C.LIBRARIES.get(uri) ?? [];
  const deviceType: string | undefined = C.DEVICE_TYPE.get(uri);
  const deviceFreq: number | undefined = C.DEVICE_FREQ.get(uri);
  const programmer: string | undefined = C.PROGRAMMER.get(uri);
  const progDefs: string | undefined = C.PROG_DEFS.get(uri);
  const progType: string | undefined = C.PROG_TYPE.get(uri);
  const progPort: string | undefined = C.PROG_PORT.get(uri);
  const progRate: number | undefined = C.PROG_RATE.get(uri);
  return Promise.all([
    mutateMakeProperties(uri, (conf: any) => {
      conf[C.COMPILER.name()] = compiler ?? '';
      conf[C.LIBRARIES.name()] = libraries.join(' ');
      conf[C.DEVICE_TYPE.name()] = deviceType ?? '';
      conf[C.DEVICE_FREQ.name()] = deviceFreq ? `${deviceFreq}UL` : '';
      conf[C.PROGRAMMER.name()] = programmer ?? '';
      conf[C.PROG_DEFS.name()] = progDefs ?? '';
      conf[C.PROG_TYPE.name()] = progType ?? '';
      conf[C.PROG_PORT.name()] = progPort ?? '';
      conf[C.PROG_RATE.name()] = progRate ?? '';
    }),
    mutateCCppProperties(uri, (conf: any) => {
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
    })
  ]);
}
