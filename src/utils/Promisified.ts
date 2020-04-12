import * as p from 'child_process';
import { promisify } from 'util';

export const execFile = promisify(p.execFile);
