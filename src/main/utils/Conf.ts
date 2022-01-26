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

export const COMPILER: Conf = new Conf('AVR.source', 'compiler');
export const C_STD: Conf = new Conf('AVR.source', 'standard.C');
export const CPP_STD: Conf = new Conf('AVR.source', 'standard.C++');
export const COMPILER_ARGS: Conf = new Conf('AVR.source', 'arguments.compiler');
export const LINKER_ARGS: Conf = new Conf('AVR.source', 'arguments.linker');
export const DISASM_ARGS: Conf = new Conf('AVR.source', 'arguments.disassembler');
export const REPORTER_ARGS: Conf = new Conf('AVR.source', 'arguments.reporter');
export const HIGHLIGHT: Conf = new Conf('AVR.source', 'highlight');
export const LIBRARIES: Conf = new Conf('AVR.source', 'libraries');
export const MAX_DEPTH: Conf = new Conf('AVR.source', 'crawler.max.depth');
export const DEVICE_TYPE: Conf = new Conf('AVR.device', 'type');
export const DEVICE_FREQ: Conf = new Conf('AVR.device', 'frequency');
export const PROGRAMMER: Conf = new Conf('AVR.programmer', 'tool');
export const PROG_DEFS: Conf = new Conf('AVR.programmer', 'definitions');
export const PROG_TYPE: Conf = new Conf('AVR.programmer', 'type');
export const PROG_PORT: Conf = new Conf('AVR.programmer', 'port');
export const PROG_RATE: Conf = new Conf('AVR.programmer', 'rate');
