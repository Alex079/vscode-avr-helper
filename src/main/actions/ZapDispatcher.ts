import { CustomExecution, Task, TaskScope, WorkspaceFolder, tasks, window } from "vscode";
import { pickFolder } from "../presentation/Inputs";
import { AvrTaskTerminal } from "./Terminal";
import { performFlashDefault } from "./Flasher";
import { performBuild } from "./Builder";
import { getBuildItemFlag, getFlashItemFlag } from "../presentation/StatusBar";

export const performZapTask = () => pickFolder().then(zap);

const zap = (folder: WorkspaceFolder) => {
  const uri = folder.uri;
  tasks.executeTask(new Task({ type: 'AVR.zap' }, folder ?? TaskScope.Workspace, `⚡️ ${new Date()}`, 'AVR Helper',
    new CustomExecution(async () => new AvrTaskTerminal(async emitter => {
      if (getBuildItemFlag(uri)) {
        return performBuild(uri, emitter)
          .then(async () => {
            if (getFlashItemFlag(uri)) {
              return performFlashDefault(uri, emitter);
            }
          })
          .catch(askToZapAfterError(folder));
      }
    }))
  ));
};

const askToZapAfterError = (folder: WorkspaceFolder) => (reason: object): void => {
  console.log(`${reason}`);
  window.showErrorMessage(`${reason}`, 'Zap')
    .then(goal => {
      if (goal) {
        zap(folder);
      }
    });
};