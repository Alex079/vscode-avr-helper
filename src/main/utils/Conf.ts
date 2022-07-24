import { Uri, workspace } from 'vscode';

class Conf {
  private readonly section: string;
  private readonly property: string;

  constructor(section: string, property: string) {
    this.section = section;
    this.property = property;
  }
  name(): string {
    return `${this.section}.${this.property}`;
  }
  get<V>(uri: Uri): V | undefined {
    return workspace.getConfiguration(this.section, uri).get(this.property);
  }
  set<V>(uri: Uri, value: V | undefined): void {
    workspace.getConfiguration(this.section, uri).update(this.property, value);
  }
}

export const COMPILER = new Conf('AVR.source', 'compiler');
export const LIBRARIES = new Conf('AVR.source', 'libraries');
export const MAX_DEPTH = new Conf('AVR.source', 'scanning depth');
export const HIGHLIGHT = new Conf('AVR.source', 'highlight');
export const COMPILER_ARGS = new Conf('AVR.compiler', 'arguments');
export const LINKER_ARGS = new Conf('AVR.linker', 'arguments');
export const DISASM_ARGS = new Conf('AVR.disassembler', 'arguments');
export const REPORTER_ARGS = new Conf('AVR.reporter', 'arguments');
export const C_STD = new Conf('AVR.compiler', 'C standard');
export const CPP_STD = new Conf('AVR.compiler', 'C++ standard');
export const DEVICE_TYPE = new Conf('AVR.device', 'type');
export const DEVICE_FREQ = new Conf('AVR.device', 'frequency');
export const PROGRAMMER = new Conf('AVR.programmer', 'tool');
export const PROGRAMMER_ARGS = new Conf('AVR.programmer', 'arguments');
export const PROG_DEFS = new Conf('AVR.programmer', 'definitions');
export const PROG_TYPE = new Conf('AVR.programmer', 'type');
export const PROG_PORT = new Conf('AVR.programmer', 'port');
export const PROG_RATE = new Conf('AVR.programmer', 'rate');
