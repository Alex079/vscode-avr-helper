import { Uri, workspace } from 'vscode';

class Conf<V> {
  private readonly section: string;
  private readonly property: string;

  constructor(section: string, property: string) {
    this.section = section;
    this.property = property;
  }
  name(): string {
    return `${this.section}.${this.property}`;
  }
  get(uri: Uri): V | undefined {
    return workspace.getConfiguration(this.section, uri).get(this.property);
  }
  set(uri: Uri, value: V | undefined): void {
    workspace.getConfiguration(this.section, uri).update(this.property, value);
  }
}

export const COMPILER = new Conf<string>('AVR.source', 'compiler');
export const LIBRARIES = new Conf<string[]>('AVR.source', 'libraries');
export const MAX_DEPTH = new Conf<number>('AVR.source', 'scanning depth');
export const HIGHLIGHT = new Conf<boolean>('AVR.source', 'highlight');
export const COMPILER_ARGS = new Conf<string[]>('AVR.compiler', 'arguments');
export const LINKER_ARGS = new Conf<string[]>('AVR.linker', 'arguments');
export const DISASM_ARGS = new Conf<string[]>('AVR.disassembler', 'arguments');
export const REPORTER_ARGS = new Conf<string[]>('AVR.reporter', 'arguments');
export const C_STD = new Conf<string>('AVR.compiler', 'C standard');
export const CPP_STD = new Conf<string>('AVR.compiler', 'C++ standard');
export const DEVICE_TYPE = new Conf<string>('AVR.device', 'type');
export const DEVICE_FREQ = new Conf<number>('AVR.device', 'frequency');
export const PROGRAMMER = new Conf<string>('AVR.programmer', 'tool');
export const PROGRAMMER_ARGS = new Conf<string[]>('AVR.programmer', 'arguments');
export const PROG_DEFS = new Conf<string>('AVR.programmer', 'definitions');
export const PROG_TYPE = new Conf<string>('AVR.programmer', 'type');
export const PROG_PORT = new Conf<string>('AVR.programmer', 'port');
export const PROG_RATE = new Conf<number>('AVR.programmer', 'rate');
