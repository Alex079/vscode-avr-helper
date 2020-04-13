import { promises as fs } from 'fs';
import { join } from 'path';
import { Uri } from 'vscode';
import { COMPILER, DEVICE_FREQ, DEVICE_TYPE, LIBRARIES, PROGRAMMER, PROG_DEFS, PROG_PORT, PROG_RATE, PROG_TYPE } from '../utils/Conf';
import { C_CPP_PROPS, MAKE_LISTS, MAKE_PROPS, MAKE_TARGETS, getDefaultFiles } from '../utils/Files';
import { execFile } from '../utils/Promisified';
import { parseProperties } from '../utils/Properties';
import { pickFile, pickFiles, pickFolder, pickNumber, pickOne, pickString } from './Inputs';
import { propagateDefaults } from './Propagator';

async function listTypes(uri: Uri, of: string): Promise<[string, string][]> {
  const file = join(uri.fsPath, MAKE_LISTS);
  return execFile('make', [`-f${file}`, of], { cwd: uri.fsPath }).then(({stderr}) => Object.entries(parseProperties(stderr)));
}

export async function setupTools(): Promise<void> {
  const uri = await pickFolder();

  await prepareBuildFiles(uri)
    .then(() => pickFile('Full path to compiler executable', COMPILER.get(uri), true, true, false))
    .then(newCompiler => COMPILER.set(uri, newCompiler))

    .then(() => pickFile('Full path to programmer executable', PROGRAMMER.get(uri), true, true, false))
    .then(newProgrammer => PROGRAMMER.set(uri, newProgrammer))

    .then(() => pickFile('Full path to programmer definitions', PROG_DEFS.get(uri), false, true, false))
    .then(newDefinitions => PROG_DEFS.set(uri, newDefinitions))

    .then(() => pickFiles('Full path to source libraries', LIBRARIES.get(uri), false, true))
    .then(newLibs => LIBRARIES.set(uri, newLibs))

    .catch(console.trace);
}

export async function setupDevice(): Promise<void> {
  const uri = await pickFolder();

  await prepareBuildFiles(uri)
    .then(() => listTypes(uri, 'list-part'))
    .then(devTypes =>
      devTypes.map(([id, name]) => {
        return { label: name ? name : id, description: id };
      })
    )
    .then(devTypes => pickOne('Device type', devTypes, item => item.label.toLowerCase() === DEVICE_TYPE.get(uri)))
    .then(newDevType => newDevType.label.toLowerCase())
    .then(newDevType => DEVICE_TYPE.set(uri, newDevType))

    .then(() => pickNumber('Device frequency', DEVICE_FREQ.get(uri), true))
    .then(newFrequency => DEVICE_FREQ.set(uri, newFrequency))

    .catch(console.trace);
}

export async function setupProgrammer(): Promise<void> {
  const uri = await pickFolder();

  await prepareBuildFiles(uri)
    .then(() => listTypes(uri, 'list-prog'))
    .then(progTypes =>
      progTypes.map(([id, name]) => {
        return { label: name ? name : id, description: id };
      })
    )
    .then(progTypes =>
      pickOne('Programmer type', progTypes, item => item.description?.toLowerCase() === PROG_TYPE.get(uri))
    )
    .then(newProgType => newProgType.description?.toLowerCase())
    .then(newProgType => PROG_TYPE.set(uri, newProgType))

    .then(() => pickString('Upload port', PROG_PORT.get(uri), false))
    .then(newPort => PROG_PORT.set(uri, newPort))

    .then(() => pickNumber('Upload rate', PROG_RATE.get(uri), false))
    .then(newRate => PROG_RATE.set(uri, newRate))

    .catch(console.trace);
}

async function prepareBuildFiles(uri: Uri): Promise<void> {
  const DEFAULT: any = getDefaultFiles();
  return fs
    .stat(join(uri.fsPath, MAKE_PROPS))
    .then(() => fs.stat(join(uri.fsPath, C_CPP_PROPS)))
    .then(
      () => {},
      () => propagateDefaults(uri)
    )
    .catch(reason => {
      throw new Error(reason);
    })
    .then(() => fs.stat(join(uri.fsPath, MAKE_TARGETS)))
    .then(
      () => {},
      () => fs.copyFile(DEFAULT.targets, join(uri.fsPath, MAKE_TARGETS))
    )
    .catch(reason => {
      throw new Error(reason);
    })
    .then(() => fs.stat(join(uri.fsPath, MAKE_LISTS)))
    .then(
      () => {},
      () => fs.copyFile(DEFAULT.lists, join(uri.fsPath, MAKE_LISTS))
    )
    .catch(reason => {
      throw new Error(reason);
    });
}
