import { Uri } from 'vscode';
import { join } from 'path';
import { getContext } from './Context';

const OUTPUT_ROOT: string = 'build';
const OUTPUT_ELF: string = join(OUTPUT_ROOT, 'output.elf');
const OUTPUT_HEX: string = join(OUTPUT_ROOT, 'output.hex');
const OUTPUT_LST: string = join(OUTPUT_ROOT, 'output.lst');
const OUTPUT_OBJ: string = join(OUTPUT_ROOT, 'obj');
const C_CPP_PROPS: string = join('.vscode', 'c_cpp_properties.json');
const PLUS_LIGHT = join('resources', 'plus-light.svg');
const PLUS_DARK = join('resources', 'plus-dark.svg');

export const getOutputRoot = (folder: string) => join(folder, OUTPUT_ROOT);
export const getOutputElf = (folder: string) => join(folder, OUTPUT_ELF);
export const getOutputHex = (folder: string) => join(folder, OUTPUT_HEX);
export const getOutputLst = (folder: string) => join(folder, OUTPUT_LST);
export const getOutputObj = (folder: string) => join(folder, OUTPUT_OBJ);
export const getCCppProps = (folder: string) => join(folder, C_CPP_PROPS);
export const getPlusIcon = () => {
  const uri = getContext().extensionUri;
  return {
    light: Uri.joinPath(uri, PLUS_LIGHT),
    dark: Uri.joinPath(uri, PLUS_DARK)
  };
};
