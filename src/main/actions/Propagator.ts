import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { Uri, window } from 'vscode';
import { COMPILER, DEVICE_FREQ, DEVICE_TYPE, LIBRARIES, PROG_DEFS, PROG_PORT, PROG_RATE, PROG_TYPE, PROGRAMMER } from '../utils/Conf';
import { C_CPP_PROPS, MAKE_PROPS } from '../utils/Files';
import { parseProperties, stringifyProperties } from '../utils/Properties';
import * as bar from './StatusBar';

async function mutateCCppProperties(folder: Uri, mutator: (conf: any) => void): Promise<void> {
  const name = join(folder.fsPath, C_CPP_PROPS);
  const location = dirname(name);
  return fs
    .mkdir(location)
    .catch(console.trace)
    .then(() => fs.readFile(name))
    .then(
      data => JSON.parse(data.toString()),
      () => {
        return {};
      }
    )
    .then(properties => {
      if (!properties.configurations) {
        properties.configurations = [];
      }
      const avrFilter = (c: any) => c.name === 'AVR';
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
      () => {
        return {};
      }
    )
    .then(properties => {
      mutator(properties);
      return stringifyProperties(properties);
    })
    .then(str => fs.writeFile(name, str));
}

export async function updateCompiler(uri: Uri): Promise<void> {
  const value: string | undefined = COMPILER.get(uri);
  Promise.all([
    mutateMakeProperties(uri, (conf: any) => (conf[COMPILER.name()] = value ?? '')),
    mutateCCppProperties(uri, (conf: any) => (conf.compilerPath = value ?? ''))
  ])
  .then(
    () => window.showInformationMessage('Compiler is updated'),
    (reason) => window.showErrorMessage(`Failure to update compiler.\n${reason.toString()}`)
  );
}

export async function updateSourceLibraries(uri: Uri): Promise<void> {
  const value: Array<string> = LIBRARIES.get(uri) ?? [];
  Promise.all([
    mutateMakeProperties(uri, (conf: any) => (conf[LIBRARIES.name()] = value.join(' '))),
    mutateCCppProperties(uri, (conf: any) => (conf.includePath = value.map(lib => join(lib, '**'))))
  ])
  .then(
    () => window.showInformationMessage('Libraries are updated'),
    (reason) => window.showErrorMessage(`Failure to update libraries.\n${reason.toString()}`)
  );
}

export async function updateProgrammerTool(uri: Uri): Promise<void> {
  const value: string | undefined = PROGRAMMER.get(uri);
  mutateMakeProperties(uri, (conf: any) => (conf[PROGRAMMER.name()] = value ?? ''))
  .then(() => {
    DEVICE_TYPE.set(uri, undefined);
    DEVICE_FREQ.set(uri, undefined);
    bar.updateSetupDeviceItem(uri);
  })
  .then(() => {
    PROG_TYPE.set(uri, undefined);
    PROG_PORT.set(uri, undefined);
    PROG_RATE.set(uri, undefined);
    bar.updateSetupProgrammerItem(uri);
  })
  .then(
    () => window.showInformationMessage('Programmer is updated'),
    (reason) => window.showErrorMessage(`Failure to update programmer.\n${reason.toString()}`)
  );
}

export async function updateProgrammerDefs(uri: Uri): Promise<void> {
  const value: string | undefined = PROG_DEFS.get(uri);
  mutateMakeProperties(uri, (conf: any) => (conf[PROG_DEFS.name()] = value ?? ''))
  .then(() => {
    DEVICE_TYPE.set(uri, undefined);
    DEVICE_FREQ.set(uri, undefined);
    bar.updateSetupDeviceItem(uri);
  })
  .then(() => {
    PROG_TYPE.set(uri, undefined);
    PROG_PORT.set(uri, undefined);
    PROG_RATE.set(uri, undefined);
    bar.updateSetupProgrammerItem(uri);
  })
  .then(
    () => window.showInformationMessage('Programmer definitions are updated'),
    (reason) => window.showErrorMessage(`Failure to update programmer definitions.\n${reason.toString()}`)
  );
}

export async function updateProgrammerType(uri: Uri): Promise<void> {
  const value: string | undefined = PROG_TYPE.get(uri);
  mutateMakeProperties(uri, (conf: any) => (conf[PROG_TYPE.name()] = value ?? ''))
  .then(() => bar.updateSetupProgrammerItem(uri))
  .then(() => bar.updateFlashItem(uri))
  .then(
    () => window.showInformationMessage('Programmer type is updated'),
    (reason) => window.showErrorMessage(`Failure to update programmer type.\n${reason.toString()}`)
  );
}

export async function updateProgrammerPort(uri: Uri): Promise<void> {
  const value: string | undefined = PROG_PORT.get(uri);
  mutateMakeProperties(uri, (conf: any) => (conf[PROG_PORT.name()] = value ?? ''))
  .then(() => bar.updateSetupProgrammerItem(uri))
  .then(
    () => window.showInformationMessage('Programmer upload port is updated'),
    (reason) => window.showErrorMessage(`Failure to update programmer upload port.\n${reason.toString()}`)
  );
}

export async function updateProgrammerRate(uri: Uri): Promise<void> {
  const value: number | undefined = PROG_RATE.get(uri);
  mutateMakeProperties(uri, (conf: any) => (conf[PROG_RATE.name()] = value ?? ''))
  .then(() => bar.updateSetupProgrammerItem(uri))
  .then(
    () => window.showInformationMessage('Programmer upload rate is updated'),
    (reason) => window.showErrorMessage(`Failure to update programmer upload rate.\n${reason.toString()}`)
  );
}

export async function updateDeviceType(uri: Uri): Promise<void> {
  const value: string | undefined = DEVICE_TYPE.get(uri);
  Promise.all([
    mutateMakeProperties(uri, (conf: any) => (conf[DEVICE_TYPE.name()] = value ?? '')),
    mutateCCppProperties(uri, (conf: any) => {
      const newArgs = conf.compilerArgs ? conf.compilerArgs.filter((v: string) => !v.startsWith('-mmcu=')) : [];
      if (value) {
        newArgs.push(`-mmcu=${value}`);
      }
      conf.compilerArgs = newArgs;
    })
  ])
  .then(() => bar.updateSetupDeviceItem(uri))
  .then(() => bar.updateBuildItem(uri))
  .then(
    () => window.showInformationMessage('Device type is updated'),
    (reason) => window.showErrorMessage(`Failure to update device type.\n${reason.toString()}`)
  );
}

export async function updateDeviceFrequency(uri: Uri): Promise<void> {
  const value: number | undefined = DEVICE_FREQ.get(uri);
  Promise.all([
    mutateMakeProperties(uri, (conf: any) => (conf[DEVICE_FREQ.name()] = value ? `${value}UL` : '')),
    mutateCCppProperties(uri, (conf: any) => {
      const newArgs = conf.compilerArgs ? conf.compilerArgs.filter((v: string) => !v.startsWith('-DF_CPU=')) : [];
      if (value) {
        newArgs.push(`-DF_CPU=${value}UL`);
      }
      conf.compilerArgs = newArgs;
    })
  ])
  .then(() => bar.updateSetupDeviceItem(uri))
  .then(() => bar.updateBuildItem(uri))
  .then(
    () => window.showInformationMessage('Device frequency is updated'),
    (reason) => window.showErrorMessage(`Failure to update device frequency.\n${reason.toString()}`)
  );
}

export async function propagateDefaults(uri: Uri): Promise<void> {
  const compiler: string | undefined = COMPILER.get(uri);
  const libraries: string[] = LIBRARIES.get(uri) ?? [];
  const deviceType: string | undefined = DEVICE_TYPE.get(uri);
  const deviceFreq: number | undefined = DEVICE_FREQ.get(uri);
  const programmer: string | undefined = PROGRAMMER.get(uri);
  const progDefs: string | undefined = PROG_DEFS.get(uri);
  const progType: string | undefined = PROG_TYPE.get(uri);
  const progPort: string | undefined = PROG_PORT.get(uri);
  const progRate: number | undefined = PROG_RATE.get(uri);
  return Promise.all([
    mutateMakeProperties(uri, (conf: any) => {
      conf[COMPILER.name()] = compiler ?? '';
      conf[LIBRARIES.name()] = libraries.join(' ');
      conf[DEVICE_TYPE.name()] = deviceType ?? '';
      conf[DEVICE_FREQ.name()] = deviceFreq ? `${deviceFreq}UL` : '';
      conf[PROGRAMMER.name()] = programmer ?? '';
      conf[PROG_DEFS.name()] = progDefs ?? '';
      conf[PROG_TYPE.name()] = progType ?? '';
      conf[PROG_PORT.name()] = progPort ?? '';
      conf[PROG_RATE.name()] = progRate ?? '';
    }),
    mutateCCppProperties(uri, (conf: any) => {
      conf.compilerPath = compiler;
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
  ])
  .then(() => {});
}
