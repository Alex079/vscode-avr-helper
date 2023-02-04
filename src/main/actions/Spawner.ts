import { spawn } from "child_process";
import { PrintEmitter } from "./Terminal";

interface ProcessInfo {
  stdout: string,
  stderr: string,
  message?: string
}

export function runCommand(exe: string, args: string[], cwd: string, emitter?: PrintEmitter): Promise<ProcessInfo> {
  if (emitter) { emitter.fireLine(`\nCommand: ${exe} ${args.join(' ')}`); }
  console.log(`Command: ${exe} ${args.join(' ')}`);
  const process = spawn(exe, args, { cwd });
  return Promise.all([
    new Promise<string>(resolve => {
      var stdout = '';
      process.stdout
        .on('data', rawChunk => {
          const chunk = rawChunk.toString();
          stdout += chunk;
        })
        .on('end', () => {
          resolve(stdout);
        });
    }),
    new Promise<string>(resolve => {
      var result = '';
      process.stderr
        .on('data', rawChunk => {
          const chunk = rawChunk.toString();
          result += chunk;
          if (emitter) { emitter.fire(chunk); }
        })
        .on('end', () => {
          resolve(result);
        });
    }),
    new Promise<string | undefined>(resolve => {
      process
        .on('exit', code => {
          resolve(code === 0 ? undefined : `${code}`);
        })
        .on('error', error => {
          resolve(error.message);
        });
    })
  ])
  .then(([stdout, stderr, message]) => ({stdout, stderr, message}));
}