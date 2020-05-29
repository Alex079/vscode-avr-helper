import { Uri } from 'vscode';
import { join } from 'path';
import { getContext } from './Context';

const OUTPUT: string = join('.vscode', 'avr.build', 'output.elf');
const C_CPP_PROPS: string = join('.vscode', 'c_cpp_properties.json');
const MAKE_PROPS: string = join('.vscode', 'avr.properties.mk');
const MAKE_TARGETS: string = join('.vscode', 'avr.targets.mk');
const PLUS_LIGHT = join('resources', 'plus-light.svg');
const PLUS_DARK = join('resources', 'plus-dark.svg');
const DEFAULT_MAKE_TARGETS: string = join('resources', 'avr.targets.mk');

export const getOutput = (folder: string) => join(folder, OUTPUT);
export const getCCppProps = (folder: string) => join(folder, C_CPP_PROPS);
export const getMakeProps = (folder: string) => join(folder, MAKE_PROPS);
export const getMakeTargets = (folder: string) => join(folder, MAKE_TARGETS);
export const getDefaultMakeTargets = () => join(getContext().extensionPath, DEFAULT_MAKE_TARGETS);
export const getPlusIcon = () => {
  const uri = getContext().extensionUri;
  return {
    light: Uri.joinPath(uri, PLUS_LIGHT),
    dark: Uri.joinPath(uri, PLUS_DARK)
  };
};
