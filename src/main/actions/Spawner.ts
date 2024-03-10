import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { PrintEmitter } from "./Terminal";

interface ProcessStatus {
  exitCode?: number,
  errorMessage?: string
}

interface ProcessInfo {
  stdout: string,
  stderr: string,
  status: ProcessStatus
}

export function runCommand(exe: string, args: string[], cwd: string, emitter?: PrintEmitter, command?: string): Promise<ProcessInfo> {
  if (emitter) {
    emitter.fireLine(`\nCommand: ${command ? 'echo ' + command + ' | ' : ''}${exe} ${args.join(' ')}`);
  }
  else {
    console.log(`Command: ${command ? 'echo ' + command + ' | ' : ''}${exe} ${args.join(' ')}`);
  }
  const process = spawn(exe, args, { cwd, stdio: command ? 'pipe' : undefined });
  if (command) {
    process.stdin.write(`${command}\n`);
    process.stdin.end();
  }
  return Promise.all([
    resolveStdout(process),
    resolveStderr(process, emitter),
    resolveStatus(process)
  ])
  .then(([stdout, stderr, status]) => {
    if (status.errorMessage) {
      const text = `Error: ${status.errorMessage}`;
      if (emitter) {
        emitter.fireLine(text);
      }
      else {
        console.error(text);
      }
    }
    return {stdout, stderr, status};
  });
}

function resolveStdout(process: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise<string>(resolve => {
    let stdout = '';
    process.stdout
      .on('data', rawChunk => {
        const chunk = rawChunk.toString();
        stdout += chunk;
      })
      .on('end', () => {
        resolve(stdout);
      });
  });
}

function resolveStderr(process: ChildProcessWithoutNullStreams, emitter: PrintEmitter | undefined): Promise<string> {
  return new Promise<string>(resolve => {
    let result = '';
    process.stderr
      .on('data', rawChunk => {
        const chunk = rawChunk.toString();
        result += chunk;
        if (emitter) { emitter.fire(chunk); }
      })
      .on('end', () => {
        resolve(result);
      });
  });
}

function resolveStatus(process: ChildProcessWithoutNullStreams): Promise<ProcessStatus> {
  return new Promise<ProcessStatus>(resolve => {
    process
      .on('exit', code => {
        resolve({ exitCode: code ?? undefined });
      })
      .on('error', error => {
        resolve({ errorMessage: error.message });
      });
  });
}
