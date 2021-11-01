import { Event, EventEmitter, Pseudoterminal } from "vscode";

export class AvrBuildTaskTerminal implements Pseudoterminal {

    constructor(whenOpen: (writer: (data: string) => void) => Promise<void>) {
        this.whenOpen = whenOpen;
    }

    private readonly whenOpen: (writer: (data: string) => void) => Promise<void>;
    private readonly writeEmitter = new EventEmitter<string>();
	private readonly closeEmitter = new EventEmitter<number>();

	onDidWrite: Event<string> = this.writeEmitter.event;
	onDidClose?: Event<number> = this.closeEmitter.event;

    open(): void {
        this.whenOpen(this.writeEmitter.fire).then(() => this.closeEmitter.fire(0));
    }

    close(): void {
        this.writeEmitter.dispose();
        this.closeEmitter.dispose();
    }
    
}