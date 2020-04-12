import { createReadStream } from 'fs';

interface State {
  leftover: string;
  partFound: boolean;
  matchingPartFound: boolean;
  memoryFound: boolean;
  matchingMemoryFound: boolean;
  memory: string;
}

interface Capabilities {
  memories: string[];
}

export async function getDeviceCapabilities(file: string | undefined, deviceType: string | undefined): Promise<string[]> {
  if (!file) {
    return [];
  }
  const state: State = {
    leftover: '',
    partFound: false,
    matchingPartFound: false,
    memoryFound: false,
    matchingMemoryFound: false,
    memory: ''
  };
  const capabilities: Capabilities = {
    memories: []
  };
  return new Promise(resolve => {
    createReadStream(file)
      .on('data', (chunk: Buffer) => {
        const lines = `${state.leftover}${chunk.toString()}`.split('\n');
        state.leftover = lines.pop() ?? '';
        extractCapabilities(lines, capabilities, state, deviceType);
      })
      .on('end', () => {
        const lines = state.leftover.split('\n');
        extractCapabilities(lines, capabilities, state, deviceType);
        resolve(capabilities.memories);
      });
  });
}

function extractCapabilities(
  lines: string[],
  capabilities: Capabilities,
  state: State,
  deviceType: string | undefined
) {
  lines
    .map(line => line.replace(/#.*/, '').trim())
    .filter(line => line !== '')
    .forEach(line => {
      if (line === 'part') {
        state.partFound = true;
      } else if (line === ';') {
        if (state.memoryFound) {
          state.matchingMemoryFound = false;
          state.memoryFound = false;
        } else {
          state.matchingPartFound = false;
          state.partFound = false;
        }
      } else if (state.matchingMemoryFound) {
        //
      } else if (state.memoryFound) {
        if (/^write[^=]*=\s*"/.exec(line)) {
          state.matchingMemoryFound = true;
          capabilities.memories.push(state.memory);
        }
      } else if (state.matchingPartFound) {
        const mem = /memory\s+"([^"]*)"/.exec(line);
        if (mem) {
          state.memory = mem[1];
          state.memoryFound = true;
        }
      } else if (state.partFound) {
        const desc = /desc\s*=\s*"([^"]*)"\s*;/.exec(line.toLowerCase());
        if (desc) {
          if (desc[1] === deviceType) {
            state.matchingPartFound = true;
          } else {
            state.matchingPartFound = false;
            state.partFound = false;
          }
        }
      }
    });
}
