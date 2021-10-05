import { promises as fs } from 'fs';
import { QuickPickItem, Uri } from 'vscode';
import * as C from '../utils/Conf';
import { getCCppProps } from '../utils/Files';
import { parseProperties } from '../utils/Properties';
import { pickFile, pickFiles, pickFolder, pickNumber, pickOne, pickString } from '../presentation/Inputs';
import { propagateSettings } from './Propagator';
import { getProperties } from './ToolsCapabilities';

async function listTypes(uri: Uri, kind: string): Promise<QuickPickItem[]> {
  return getProperties(uri, kind)
    .then(parseProperties)
    .then(properties => Object.entries<string>(properties))
    .then(properties => properties.map( ([ description, label ]) => ({ description, label }) ));
}

export async function setupTools(): Promise<void> {
  const uri = (await pickFolder()).uri;

  prepareConfigFiles(uri)
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
  const folder = await pickFolder();
  const devTypes = await listTypes(folder.uri, '-p?');
  const cut = (s: string): string => s.split(/\s+/, 1)[0].toLowerCase();

  pickOne('Device type', devTypes, item => cut(item.label) === C.DEVICE_TYPE.get(folder.uri), 1, 2)
    .then(newDevType => cut(newDevType.label))
    .then(newDevType => C.DEVICE_TYPE.set(folder.uri, newDevType))
    .then(() => pickNumber('Device frequency', C.DEVICE_FREQ.get(folder.uri), true, 2, 2))
    .then(newFrequency => C.DEVICE_FREQ.set(folder.uri, newFrequency))
    .catch(console.trace);
}

export async function setupProgrammer(): Promise<void> {
  const folder = await pickFolder();
  const progTypes = await listTypes(folder.uri, '-c?');

  pickOne('Programmer type', progTypes, item => item.description?.toLowerCase() === C.PROG_TYPE.get(folder.uri), 1, 3)
    .then(newProgType => newProgType.description?.toLowerCase())
    .then(newProgType => C.PROG_TYPE.set(folder.uri, newProgType))
    .then(() => pickString('Upload port', C.PROG_PORT.get(folder.uri), false, 2, 3))
    .then(newPort => C.PROG_PORT.set(folder.uri, newPort))
    .then(() => pickNumber('Upload rate', C.PROG_RATE.get(folder.uri), false, 3, 3))
    .then(newRate => C.PROG_RATE.set(folder.uri, newRate))
    .catch(console.trace);
}

async function prepareConfigFiles(uri: Uri): Promise<void> {
  fs.stat(getCCppProps(uri.fsPath))
    .catch(() => propagateSettings(uri));
}
