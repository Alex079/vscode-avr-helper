import { CustomExecution, QuickPickItem, Task, TaskScope, WorkspaceFolder, tasks, window } from "vscode";
import { pickFolder, pickOne } from "../presentation/Inputs";
import { performBuild, performClean, performScan } from "./Builder";
import { AvrTaskTerminal } from "./Terminal";
import * as C from '../utils/Conf';

const BUILD = 'Build';
const CLEAN = 'Clean';
const SCAN = 'Scan';
const GOALS = [BUILD, CLEAN, SCAN];
const DEFAULT_GOAL = BUILD;

const toItem = (label: string): QuickPickItem => ({ label });
const fromItem = (i: QuickPickItem): string => i.label;

export const performBuildTask = () => {
  return pickFolder()
    .then(folder =>
      pickOne('Select build goal', GOALS.map(toItem), item => item.label === DEFAULT_GOAL)
        .then(fromItem)
        .then(run(folder))
    )
    .catch(console.log);
};

const run = (folder: WorkspaceFolder) => (goal: string): void => {
  const uri = folder.uri;
  switch (goal) {
    case SCAN:
      tasks.executeTask(new Task({ type: 'AVR.build' }, folder ?? TaskScope.Workspace, `🔍 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          performScan(uri, emitter).catch(retryBuildTask(folder))
        ))
      ));
      break;
    case CLEAN:
      tasks.executeTask(new Task({ type: 'AVR.build' }, folder ?? TaskScope.Workspace, `🧹 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          performClean(uri, emitter).catch(retryBuildTask(folder))
        ))
      ));
      break;
    case BUILD:
      tasks.executeTask(new Task({ type: 'AVR.build' }, folder ?? TaskScope.Workspace, `🔧 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          performBuild(uri, emitter).catch(retryBuildTask(folder))
        )), C.HIGHLIGHT.get(uri) ? '$gcc' : undefined
      ));
      break;
  }
};

export const retryBuildTask = (folder: WorkspaceFolder) => (reason: object) => {
  window.showErrorMessage(`${reason}`, ...GOALS)
    .then(goal => {
      if (goal) {
        run(folder)(goal);
      }
    });
};