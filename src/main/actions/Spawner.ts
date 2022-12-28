import { SpawnSyncReturns, spawnSync } from "child_process";
import { EventEmitter } from "vscode";

export function runCommand(exe: string, args: string[], cwd: string, emitter: EventEmitter<string>): SpawnSyncReturns<Buffer> {
  emitter.fire(`\nCommand: ${exe} ${args.join(' ')}`);
  return runCommandStandalone(exe, args, cwd);
}

export function runCommandStandalone(exe: string, args: string[], cwd: string): SpawnSyncReturns<Buffer> {
  console.log();
  return spawnSync(exe, args, { cwd });
}

export function checkInfo(info: SpawnSyncReturns<Buffer>, emitter: EventEmitter<string>): boolean {
  if (info.error) {
    emitter.fire(info.error.message);
    return false;
  }
  emitter.fire(info.stderr.toString());
  if (info.status && info.status > 0) {
    return false;
  }
  return true;
}