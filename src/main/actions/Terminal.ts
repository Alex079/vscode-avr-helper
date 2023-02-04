import { Event, EventEmitter, Pseudoterminal } from "vscode";

const icon = (result: boolean) => result ? '✅' : '❌';

export class PrintEmitter extends EventEmitter<string> {
  fire(data: string): void {
    super.fire(data.replace(/(\r(?!\n)|(?<!\r)\n)/g, '\r\n'));
  }
  fireLine(data: string): void {
    this.fire(data);
    super.fire('\r\n');
  }
  fireIconLine(result: boolean, data?: string): void {
    super.fire(icon(result) );
    if (data) { super.fire(data); }
    super.fire('\r\n');
  }
}

export class AvrTaskTerminal implements Pseudoterminal {

  constructor(whenOpen: (emitter: PrintEmitter) => Promise<void>) {
    this.whenOpen = whenOpen;
  }

  private readonly whenOpen: (emitter: PrintEmitter) => Promise<void>;
  private readonly printEmitter = new PrintEmitter();
  private readonly exitCodeEmitter = new EventEmitter<number>();

  onDidWrite: Event<string> = this.printEmitter.event;
  onDidClose: Event<number> = this.exitCodeEmitter.event;

  open(): void {
    this.whenOpen(this.printEmitter)
      .then(() => this.exitCodeEmitter.fire(0))
      .catch(() => this.exitCodeEmitter.fire(255));
  }

  close(): void {
    this.printEmitter.dispose();
    this.exitCodeEmitter.dispose();
  }

}