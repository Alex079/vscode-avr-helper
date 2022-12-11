import { SpawnSyncReturns, spawnSync } from "child_process";

export function runCommand(exe: string, args: string[], cwd: string): SpawnSyncReturns<Buffer> {
  console.log(`working directory: ${cwd}\ncommand: ${exe} ${args.join(' ')}`);
  return spawnSync(exe, args, { cwd });
}