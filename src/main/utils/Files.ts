import { Uri } from 'vscode';
import { getContext } from './Context';
import { join } from 'path';

export const C_CPP_PROPS: string = join('.vscode', 'c_cpp_properties.json');
export const MAKE_PROPS: string = join('.vscode', 'avr.properties.mk');
export const MAKE_LISTS: string = join('.vscode', 'avr.lists.mk');
export const MAKE_TARGETS: string = join('.vscode', 'avr.targets.mk');

export function getPlusIcon(): any {
  return {
    light: Uri.file(getContext().asAbsolutePath('resources/plus-light.svg')),
    dark: Uri.file(getContext().asAbsolutePath('resources/plus-dark.svg'))
  };
}

export function getDefaultFiles(): any {
  return {
    lists: getContext().asAbsolutePath('resources/avr.lists.mk'),
    targets: getContext().asAbsolutePath('resources/avr.targets.mk')
  };
}
