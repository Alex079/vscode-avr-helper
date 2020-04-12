import { join } from 'path';
import { QuickPickItem, ShellExecution, Task, tasks } from 'vscode';
import { MAKE_TARGETS } from '../utils/Files';
import { getCurrentFolder } from '../utils/WorkspaceFolders';
import { pickOne } from './Inputs';

// export function perform(...target: string[]): () => void {
//     return () => pickFolder().then(async (folder) => {
//         if (folder) {
//             const file = join(folder.uri.fsPath, MAKE_TARGETS);
//             tasks.executeTask(
//                 new Task({type: "AVR.make"}, folder, target.join(','), 'My AVR',
//                 new ShellExecution('make', [`-f${file}`, ...target]), '$gcc'));
//         }
//     });
// }

const goals: QuickPickItem[] = [{ label: 'build' }, { label: 'clean' }, { label: 'scan' }];

export async function performMake(): Promise<void> {
  const folder = getCurrentFolder();
  if (folder) {
    const goal = await pickOne('Select build task', goals, () => false).then(g => g.label);
    const file = join(folder.uri.fsPath, MAKE_TARGETS);
    tasks.executeTask(
      new Task({ type: 'AVR.make' }, folder, goal, 'AVR', new ShellExecution('make', [`-f${file}`, goal]), '$gcc')
    );
  }
}
