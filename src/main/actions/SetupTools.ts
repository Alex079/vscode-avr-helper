import { promises as fs } from 'fs';
import { Uri } from 'vscode';
import * as C from '../utils/Conf';
import { getCCppProps, getDefaultMakeLists, getDefaultMakeTargets, getMakeLists, getMakeProps, getMakeTargets } from '../utils/Files';
import { execFile } from '../utils/Promisified';
import { parseProperties } from '../utils/Properties';
import { pickFile, pickFiles, pickFolder, pickNumber, pickOne, pickString } from './Inputs';
import { propagateSettings } from './Propagator';

async function listTypes(uri: Uri, of: string): Promise<[string, string][]> {
  return execFile('make', [`-f${getMakeLists(uri.fsPath)}`, of], { cwd: uri.fsPath })
    .then(({stderr}) => Object.entries(parseProperties(stderr)));
}

export async function setupTools(): Promise<void> {
  const uri = await pickFolder();

  await prepareBuildFiles(uri)
    .then(() => pickFile('Full path to compiler executable', C.COMPILER.get(uri), true, true, false, 1, 4))
    .then(newCompiler => C.COMPILER.set(uri, newCompiler))

    .then(() => pickFile('Full path to programmer executable', C.PROGRAMMER.get(uri), true, true, false, 2, 4))
    .then(newProgrammer => C.PROGRAMMER.set(uri, newProgrammer))

    .then(() => pickFile('Full path to programmer definitions', C.PROG_DEFS.get(uri), false, true, false, 3, 4))
    .then(newDefinitions => C.PROG_DEFS.set(uri, newDefinitions))

    .then(() => pickFiles('Full path to source libraries', C.LIBRARIES.get(uri), false, true, 4, 4))
    .then(newLibs => C.LIBRARIES.set(uri, newLibs))

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
    .then(devTypes => pickOne('Device type', devTypes, item => item.label.toLowerCase() === C.DEVICE_TYPE.get(uri), 1, 2))
    .then(newDevType => newDevType.label.toLowerCase())
    .then(newDevType => C.DEVICE_TYPE.set(uri, newDevType))

    .then(() => pickNumber('Device frequency', C.DEVICE_FREQ.get(uri), true, 2, 2))
    .then(newFrequency => C.DEVICE_FREQ.set(uri, newFrequency))

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
    .then(progTypes => pickOne('Programmer type', progTypes, item => item.description?.toLowerCase() === C.PROG_TYPE.get(uri), 1, 3))
    .then(newProgType => newProgType.description?.toLowerCase())
    .then(newProgType => C.PROG_TYPE.set(uri, newProgType))

    .then(() => pickString('Upload port', C.PROG_PORT.get(uri), false, 2, 3))
    .then(newPort => C.PROG_PORT.set(uri, newPort))

    .then(() => pickNumber('Upload rate', C.PROG_RATE.get(uri), false, 3, 3))
    .then(newRate => C.PROG_RATE.set(uri, newRate))

    .catch(console.trace);
}

async function prepareBuildFiles(uri: Uri): Promise<void> {
  return fs

    .stat(getMakeProps(uri.fsPath))
    .then(() => fs.stat(getCCppProps(uri.fsPath)))
    .then(() => {}, () => propagateSettings(uri))
    .catch(reason => { throw new Error(reason); })

    .then(() => fs.stat(getMakeLists(uri.fsPath)))
    .then(() => {}, () => fs.copyFile(getDefaultMakeLists(), getMakeLists(uri.fsPath)))
    .catch(reason => { throw new Error(reason); })
    
    .then(() => fs.stat(getMakeTargets(uri.fsPath)))
    .then(() => {}, () => fs.copyFile(getDefaultMakeTargets(), getMakeTargets(uri.fsPath)))
    .catch(reason => { throw new Error(reason); });
}