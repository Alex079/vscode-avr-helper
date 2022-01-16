import { Event, EventEmitter, Pseudoterminal } from "vscode";

class PrintEmitter extends EventEmitter<string> {
  fire(data: string): void {
    super.fire(data?.replace(/(\r\n|\r(?!\n)|(?<!\r)\n)/g, '\r\n'));
  }
}

export class AvrBuildTaskTerminal implements Pseudoterminal {

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