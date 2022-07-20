import { promises as fs } from 'fs';
import { QuickPickItem, Uri } from 'vscode';
import * as C from '../utils/Conf';
import { getCCppProps } from '../utils/Files';
import { parseProperties } from '../utils/Properties';
import { pickFile, pickFiles, pickFolder, pickNumber, pickOne, pickString } from '../presentation/Inputs';
import { propagateSettings } from './Propagator';
import { getProperties, getSizeFormat } from './ToolsCapabilities';
import { dirname } from 'path';
import { showMessageAndThrowError } from '../utils/ErrorHandler';

function listTypes(uri: Uri, kind: string): Promise<QuickPickItem[]> {
  return getProperties(uri, kind)
    .then(parseProperties)
    .then(properties => Object.entries<string>(properties))
    .then(properties => properties.map( ([ description, label ]) => ({ description, label }) ))
    .catch(showMessageAndThrowError);
}

export function setupTools(): Promise<void> {
  return pickFolder()
    .then(folder => {
      const uri = folder.uri;
      return prepareConfigFiles(uri)
        .then(() => pickFile('Full path to compiler executable', C.COMPILER.get(uri), true, true, false, 1, 4))
        .then(newCompiler => {
          const oldCompiler = C.COMPILER.get(uri);
          if (newCompiler && (oldCompiler !== newCompiler)) {
            C.REPORTER_ARGS.set(uri, [getSizeFormat(uri, dirname(newCompiler))]);
          }
          C.COMPILER.set(uri, newCompiler);
        })
        .then(() => pickFile('Full path to programmer executable', C.PROGRAMMER.get(uri), true, true, false, 2, 4))
        .then(newProgrammer => C.PROGRAMMER.set(uri, newProgrammer))
        .then(() => pickFile('Full path to programmer definitions', C.PROG_DEFS.get(uri), false, true, false, 3, 4))
        .then(newDefinitions => C.PROG_DEFS.set(uri, newDefinitions))
        .then(() => pickFiles('Full path to source libraries', C.LIBRARIES.get(uri), false, true, 4, 4))
        .then(newLibs => C.LIBRARIES.set(uri, newLibs));
    })
    .catch(console.log);
}

export function setupDevice(): Promise<void> {
  return pickFolder()
    .then(folder => {
      const uri = folder.uri;
      const cut = (s: string): string => s.split(/\s+/, 1)[0].toLowerCase();
      return listTypes(uri, '-p?')
        .then(devTypes => pickOne('Device type', devTypes, item => cut(item.label) === C.DEVICE_TYPE.get(uri), 1, 2))
        .then(newDevType => cut(newDevType.label))
        .then(newDevType => C.DEVICE_TYPE.set(uri, newDevType))
        .then(() => pickNumber('Device frequency', C.DEVICE_FREQ.get(uri), false, 2, 2))
        .then(newFrequency => C.DEVICE_FREQ.set(uri, newFrequency));
    })
    .catch(console.log);
}

export function setupProgrammer(): Promise<void> {
  return pickFolder()
    .then(folder => {
      const uri = folder.uri;
      return listTypes(uri, '-c?')
        .then(progTypes => pickOne('Programmer type', progTypes, item => item.description?.toLowerCase() === C.PROG_TYPE.get(uri), 1, 3))
        .then(newProgType => newProgType.description?.toLowerCase())
        .then(newProgType => C.PROG_TYPE.set(uri, newProgType))
        .then(() => pickString('Upload port', C.PROG_PORT.get(uri), false, 2, 3))
        .then(newPort => C.PROG_PORT.set(uri, newPort))
        .then(() => pickNumber('Upload rate', C.PROG_RATE.get(uri), false, 3, 3))
        .then(newRate => C.PROG_RATE.set(uri, newRate));
    })
    .catch(console.log);
}

function prepareConfigFiles(uri: Uri): Promise<void> {
  return fs.stat(getCCppProps(uri.fsPath))
    .then(() => {}, () => propagateSettings(uri));
}
