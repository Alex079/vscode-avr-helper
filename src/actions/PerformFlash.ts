import { join } from 'path';
import { ShellExecution, Task, tasks } from 'vscode';
import { DEVICE_TYPE, PROG_DEFS } from '../utils/Conf';
import { MAKE_TARGETS } from '../utils/Files';
import { getCurrentFolder } from '../utils/WorkspaceFolders';
import { getDeviceCapabilities } from './DeviceCapabilities';
import { pickMany } from './Inputs';

export async function performFlash(): Promise<void> {
  const folder = getCurrentFolder();
  if (folder) {
    const goals = await getDeviceCapabilities(PROG_DEFS.get(folder.uri), DEVICE_TYPE.get(folder.uri))
      .then(v => v.map(g => { return { label: g }; }))
      .then(g => pickMany('Select area to flash', g, () => false))
      .then(g => g.map(i => i.label));
    const file = join(folder.uri.fsPath, MAKE_TARGETS);
    tasks.executeTask(
      new Task(
        { type: 'AVR.make' }, folder, goals.join(', '), 'AVR',
        new ShellExecution('make', [`-f${file}`, ...goals]), '$gcc')
    );
  }
}
