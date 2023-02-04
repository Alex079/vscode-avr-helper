import { CustomExecution, Task, TaskScope, WorkspaceFolder, tasks, window } from "vscode";
import { pickFolder } from "../presentation/Inputs";
import { AvrTaskTerminal } from "./Terminal";
import { performFlashDefault } from "./Flasher";
import { performBuild } from "./Builder";
import { getBuildItemFlag, getFlashItemFlag } from "../presentation/StatusBar";

export const performBuildFlashTask = () => pickFolder().then(run);

const run = (folder: WorkspaceFolder) => {
  const uri = folder.uri;
  tasks.executeTask(new Task({ type: 'AVR.build+flash' }, folder ?? TaskScope.Workspace, `⚡️ ${new Date()}`, 'AVR Helper',
    new CustomExecution(async () => new AvrTaskTerminal(async emitter => {
      if (getBuildItemFlag(uri)) {
        return performBuild(uri, emitter)
          .then(async () => {
            if (getFlashItemFlag(uri)) {
              return performFlashDefault(uri, emitter);
            }
          })
          .catch(retryBuildFlashTask(folder));
      }
    }))
  ));
};

export const retryBuildFlashTask = (folder: WorkspaceFolder) => (reason: object): void => {
  window.showErrorMessage(`${reason}`, '⚡️Quick')
    .then(goal => {
      if (goal) {
        run(folder);
      }
    });
};