import { CustomExecution, QuickPickItem, Task, TaskScope, WorkspaceFolder, tasks, window } from "vscode";
import { pickFolder, pickOne } from "../presentation/Inputs";
import { performBuild, performClean, performScan } from "./Builder";
import { AvrTaskTerminal } from "./Terminal";
import * as C from '../utils/Conf';

const GOALS = ['build', 'clean', 'scan'];
const DEFAULT_GOAL = 'build';

const toItem = (label: string): QuickPickItem => ({ label });
const fromItem = (i: QuickPickItem): string => i.label;

export const performBuildTask = () => {
  return pickFolder()
    .then(folder =>
      pickOne('Select build goal', GOALS.map(toItem), item => item.label === DEFAULT_GOAL)
        .then(fromItem)
        .then(dispatch(folder))
    )
    .catch(console.log);
};

const dispatch = (folder: WorkspaceFolder) => (goal: string): void => {
  const uri = folder.uri;
  switch (goal) {
    case 'scan':
      tasks.executeTask(new Task({ type: 'AVR.build' }, folder ?? TaskScope.Workspace, `🔍 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          performScan(uri, emitter).catch(askToRebuildAfterError(folder))
        ))
      ));
      break;
    case 'clean':
      tasks.executeTask(new Task({ type: 'AVR.build' }, folder ?? TaskScope.Workspace, `🧹 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          performClean(uri, emitter).catch(askToRebuildAfterError(folder))
        ))
      ));
      break;
    case 'build':
      tasks.executeTask(new Task({ type: 'AVR.build' }, folder ?? TaskScope.Workspace, `🔧 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          performBuild(uri, emitter).catch(askToRebuildAfterError(folder))
        )), C.HIGHLIGHT.get(uri) ? '$gcc' : undefined
      ));
      break;
  }
};

export const askToRebuildAfterError = (folder: WorkspaceFolder) => (reason: object): void => {
  console.log(`${reason}`);
  window.showErrorMessage(`${reason}`, ...GOALS)
    .then(goal => {
      if (goal) {
        dispatch(folder)(goal);
      }
    });
};