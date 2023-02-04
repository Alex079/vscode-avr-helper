import { CustomExecution, Task, TaskScope, WorkspaceFolder, tasks, window } from "vscode";
import { pickFolder } from "../presentation/Inputs";
import { getOutputElf } from "../utils/Files";
import { promises as fs } from 'fs';
import { AvrTaskTerminal } from "./Terminal";
import { performFlash } from "./Flasher";
import { askToRebuildAfterError as askToRebuildAfterError } from "./BuildDispatcher";

export const performFlashTask = () => pickFolder().then(flash);

const flash = (folder: WorkspaceFolder) => {
  const uri = folder.uri;
  const outputFile = getOutputElf(uri.fsPath);
  return fs.stat(outputFile)
    .then(stats => {
      if (!stats.isFile()) {
        throw new Error(`${outputFile} is not a file`);
      }
    })
    .then(() =>
      tasks.executeTask(new Task({ type: 'AVR.flash' }, folder ?? TaskScope.Workspace, `🔥 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          performFlash(uri, emitter).catch(askToReflashAfterError(folder))
        ))
      ))
    )
    .catch(askToRebuildAfterError(folder));
};

const askToReflashAfterError = (folder: WorkspaceFolder) => (reason: object): void => {
  console.log(`${reason}`);
  window.showErrorMessage(`${reason}`, 'Flash')
    .then(goal => {
      if (goal) {
        flash(folder);
      }
    });
};