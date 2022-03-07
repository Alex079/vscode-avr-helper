import { join } from 'path';
import { run as runCLI } from 'jest';

export function run(): Promise<void> {
  return runCLI([`--config=${join(__dirname, '..', '..', 'jest-e2e.config.json')}`]);
}