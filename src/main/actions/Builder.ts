import { promises as fs } from 'fs';
import { spawnSync } from "child_process";
import { CustomExecution, EventEmitter, QuickPickItem, Task, tasks, TaskScope, Uri, window, workspace } from "vscode";
import * as C from '../utils/Conf';
import { getOutputElf, getOutputLst, getOutputObj, getOutputRoot } from "../utils/Files";
import { pickFolder, pickOne } from "../presentation/Inputs";
import { fdir } from "fdir";
import { basename, dirname, join, normalize } from 'path';
import { AvrBuildTaskTerminal } from './BuildTerminal';
import path = require('path');

const GOALS: string[] = ['build', 'clean', 'scan'];

const ANY_HEADER = /\.h(h|pp|xx|\+\+)?$/i;
const ANY_SOURCE = /\.c(c|pp|xx|\+\+)?$/i;

const toItem = (label: string): QuickPickItem => ({ label });
const fromItem = (i: QuickPickItem): string => i.label;
const hidden = (i: string) => i.startsWith('.');

const crawlSrc = (uri: Uri) => (dir: string) =>
  new fdir()
    .withBasePath()
    .withFullPaths()
    .withMaxDepth(C.MAX_DEPTH.get(uri) || 0)
    .exclude(hidden)
    .filter(v => ANY_SOURCE.test(v))
    .crawl(dir)
    .withPromise() as Promise<string[]>;

const crawlLib = (uri: Uri) => (dir: string) =>
  new fdir()
    .withBasePath()
    .withFullPaths()
    .withMaxDepth(C.MAX_DEPTH.get(uri) || 0)
    .exclude(hidden)
    .onlyDirs()
    .crawl(dir)
    .withPromise() as Promise<string[]>;

interface FileTime {
  time: number;
  file: string;
}

interface Sources {
  thisFolder: string[];
  extFolders: string[];
}

interface Linkable {
  target: string;
  source: string;
  needsRebuilding: boolean;
}

export function performBuildTask(): Promise<void> {
  return pickFolder()
    .then(folder => 
      pickOne('Select build goal', GOALS.map(toItem), () => false)
        .then(fromItem)
        .then(dispatch(folder.uri))
    )
    .catch(console.info);
}

const dispatch = (uri: Uri) => (goal: string): void => {
  switch (goal) {
    case 'scan':
      tasks.executeTask(new Task({type: 'AVR.build'}, workspace.getWorkspaceFolder(uri) ?? TaskScope.Workspace, `🔍 Scan "${uri.path}" (${new Date()})`, 'AVR Helper',
        new CustomExecution(async () => new AvrBuildTaskTerminal(emitter =>
          getSources(uri)
            .then(getDependencies(uri))
            .then(getLinkables(uri))
            .then(printInfo(uri, emitter))
            .catch(console.error)
        ))
      ));
      break;
    case 'clean':
      tasks.executeTask(new Task({type: 'AVR.build'}, workspace.getWorkspaceFolder(uri) ?? TaskScope.Workspace, `🧹 Clean "${uri.path}" (${new Date()})`, 'AVR Helper',
        new CustomExecution(async () => new AvrBuildTaskTerminal(emitter => clean(uri, emitter)))
      ));
      break;
    case 'build':
      tasks.executeTask(new Task({type: 'AVR.build'}, workspace.getWorkspaceFolder(uri) ?? TaskScope.Workspace, `🔧 Build "${uri.path}" (${new Date()})`, 'AVR Helper',
        new CustomExecution(async () => new AvrBuildTaskTerminal(emitter =>
          getSources(uri)
            .then(getDependencies(uri))
            .then(getLinkables(uri))
            .then(build(uri, emitter))
            .catch(console.error)
        )), C.HIGHLIGHT.get(uri) ? '$gcc' : undefined
      ));
      break;
  }
};

function clean(uri: Uri, emitter: EventEmitter<string>): Promise<void> {
  return fs
    .rm(getOutputRoot(uri.fsPath), { recursive: true, force: true })
    .then(() => emitter.fire('✅\n'))
    .catch(error => emitter.fire(`❌ ${error}\n`));
}

function getSources(uri: Uri): Promise<Sources> {
  const extLibraries: string[] = C.LIBRARIES.get(uri) ?? [];
  return Promise.all([crawlSrc(uri)(uri.fsPath), Promise.all(extLibraries.map(crawlSrc(uri))).then(paths => paths.flat())])
    .then(([thisFolder, extFolders]): Sources => ({ thisFolder, extFolders }));
}

function getDependencies(uri: Uri) {
  return async (src: Sources): Promise<string[]> => {
    const exe: string | undefined = C.COMPILER.get(uri);
    const devType: string | undefined = C.DEVICE_TYPE.get(uri);
    const devFrequency: number | undefined = C.DEVICE_FREQ.get(uri);
    if (!exe || !devType || !devFrequency) {
      return [];
    }
    const args: string[] = [
      '-MM',
      `-mmcu=${devType}`,
      `-DF_CPU=${devFrequency}UL`
    ];
    const libs: string[] = C.LIBRARIES.get(uri) ?? [];
    args.push(...(await Promise.all(libs.map(crawlLib(uri)))).flat().map(lib => `-I${lib}`));
    let toBeChecked: string[] = src.thisFolder;
    let unused: string[] = src.extFolders;
    let result: string[] = [];
    while (toBeChecked.length > 0) {
      const info = spawnSync(exe, [...args, ...toBeChecked], { cwd: uri.fsPath });
      if (info.error) {
        console.error(`${info.error.message}`);
        window.showErrorMessage(`Error: cannot collect dependencies. ${info.error.message}`);
        throw new Error(info.error.message);
      }
      if (info.status && info.status > 0) {
        console.warn(`${info.stderr.toString()}`);
        window.showWarningMessage(`Error ${info.status}: cannot collect dependencies. ${info.stderr.toString()}`);
        throw new Error(info.stderr.toString());
      }
      console.info(`${info.stderr.toString()}`);
      const newResult = info.stdout.toString()
        .replace(/\\ /g, '\u0000')
        .replace(/\\[\r\n]+/g, ' ')
        .replace(/\\:/g, ':')
        .trim()
        .split(/\s+/)
        .map(i => normalize(i.replace(/\u0000/g, ' ')));
      result.push(...newResult);
      const newBaseNames = new Set(newResult.filter(v => ANY_HEADER.test(v)).map(v => basename(v).replace(ANY_HEADER, '')));
      const previouslyUnused = unused;
      toBeChecked = [];
      unused = [];
      previouslyUnused.forEach(source => {
        if (newBaseNames.delete(basename(source).replace(ANY_SOURCE, ''))) {
          toBeChecked.push(source);
        }
        else {
          unused.push(source);
        }
      });
    }
    return result;
  };
}

function getLinkables(uri: Uri) {
  return (dependencies: string[]): Promise<Linkable[]> => {
    return Promise.all(
      groupDependencies(dependencies, uri)
        .map(group => Promise.all(group.map(getFileTime))
        .then(getLinkable))
    );
  };
}

function groupDependencies(dependencies: string[], uri: Uri): string[][] {
  return dependencies.reduce((result: string[][], current: string) => {
    if (current.endsWith(':')) {
      result.push([]);
    } else {
      result[result.length-1].push(current);
    }
    return result;
  }, [])
  .map(group => {
    group.push(join(getOutputObj(uri.fsPath), `${group[0].replace(':','_')}.obj`));
    return group;
  });
}

function getFileTime(file: string): Promise<FileTime> {
  return fs.stat(file)
    .then(stats => ({ time: stats.mtimeMs, file }))
    .catch(() => ({ time: -Infinity, file }));
}

function getLinkable(dependencies: FileTime[]): Linkable {
  const { file, time } = dependencies.pop() ?? {} as FileTime;
  return {
    target: file,
    source: dependencies[0]?.file,
    needsRebuilding: dependencies.some(dependency => time <= dependency.time)
  };
}

function build(uri: Uri, emitter: EventEmitter<string>) {
  return async (linkables: Linkable[]): Promise<void> => {
    const exe: string | undefined = C.COMPILER.get(uri);
    const devType: string | undefined = C.DEVICE_TYPE.get(uri);
    const devFrequency: number | undefined = C.DEVICE_FREQ.get(uri);
    if (!exe || !devType || !devFrequency) {
      return;
    }
    const mcuArgs = [
      `-mmcu=${devType}`,
      `-DF_CPU=${devFrequency}UL`
    ];
    return Promise
      .all(linkables
        .filter(linkable => linkable.needsRebuilding)
        .map(linkable => fs
          .mkdir(dirname(linkable.target), { recursive: true })
          .catch(() => {})
          .then(async () => {
            const compilerArgs: string[] = C.COMPILER_ARGS.get(uri) || [];
            const cppStandard: string | undefined = C.CPP_STD.get(uri);
            if (cppStandard) {
              compilerArgs.push(`-std=${cppStandard}`);
            }
            const libs: string[] = C.LIBRARIES.get(uri) || [];
            compilerArgs.push(...(await Promise.all(libs.map(crawlLib(uri)))).flat().map(lib => `-I${lib}`));
            const info = spawnSync(exe, [...mcuArgs, ...compilerArgs, '-c', linkable.source, '-o', linkable.target], { cwd: uri.fsPath });
            if (info.error) {
              emitter.fire(info.error.message);
              return false;
            }
            emitter.fire(info.stderr.toString());
            return !(info.status && info.status > 0);
          })
        )
      )
      .then(results => {
        const result = results.every(success => success);
        emitter.fire(`${result ? '✅' : '❌'} Compilation\n`);
        if (!result) {
          throw new Error('Compilation failed.');
        }
      })
      .then(() => {
        const linkerArgs: string[] = C.LINKER_ARGS.get(uri) || [];
        const info = spawnSync(exe, [...mcuArgs, ...linkerArgs, ...linkables.map(linkable => linkable.target), '-o', getOutputElf(uri.fsPath)], { cwd: uri.fsPath });
        if (info.error) {
          emitter.fire(info.error.message);
          return false;
        }
        emitter.fire(info.stderr.toString());
        return !(info.status && info.status > 0);
      })
      .then(result => {
        emitter.fire(`${result ? '✅' : '❌'} Linkage\n`);
        if (!result) {
          throw new Error('Linkage failed.');
        }
      })
      .then(() => {
        const disassemblerArgs: string[] = C.DISASM_ARGS.get(uri) || [];
        const info = spawnSync(join(dirname(exe), 'avr-objdump'), [...disassemblerArgs, getOutputElf(uri.fsPath)], { cwd: uri.fsPath });
        if (info.error) {
          emitter.fire(info.error.message);
          return false;
        }
        emitter.fire(info.stderr.toString());
        if (info.status && info.status > 0) {
          return false;
        }
        return fs.writeFile(getOutputLst(uri.fsPath), info.stdout)
          .then(() => true)
          .catch(error => {
            emitter.fire(`${error}\n`);
            return false;
          });
      })
      .then(result => emitter.fire(`${result ? '✅' : '❌'} Disassembling\n`))
      .then(() => {
        const reporterArgs: string[] = C.REPORTER_ARGS.get(uri) || [];
        if (reporterArgs.includes('-C')) {
          reporterArgs.push(`--mcu=${devType}`);
        }
        const info = spawnSync(join(dirname(exe), 'avr-size'), [...reporterArgs, getOutputElf(uri.fsPath)], { cwd: uri.fsPath });
        if (info.error) {
          emitter.fire(info.error.message);
          return;
        }
        emitter.fire(info.stderr.toString());
        if (info.status && info.status > 0) {
          return;
        }
        emitter.fire(info.stdout.toString());
      });
  };
}

function printInfo(uri: Uri, emitter: EventEmitter<string>) {
  return (linkables: Linkable[]): void => {
    linkables.forEach((linkable, index) => {
      const search = new RegExp(`^${uri.fsPath}${path.sep}`);
      emitter.fire(`${index === 0 ? ' ' : '│'} ┌─${linkable.source.replace(search, '')}\n`);
      emitter.fire(`${index === 0 ? '┌' : '├'}─${linkable.needsRebuilding ? '✖' : '┴'}─${linkable.target.replace(search, '')}\n`);
      emitter.fire('│\n');
    });
    emitter.fire(`└─🭬Build Target\n`);
  };
}