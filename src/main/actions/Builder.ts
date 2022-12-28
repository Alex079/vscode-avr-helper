import { promises as fs } from 'fs';
import { CustomExecution, EventEmitter, QuickPickItem, Task, TaskScope, Uri, WorkspaceFolder, tasks, window } from "vscode";
import * as C from '../utils/Conf';
import { getOutputElf, getOutputHex, getOutputLst, getOutputObj, getOutputRoot } from "../utils/Files";
import { pickFolder, pickOne } from "../presentation/Inputs";
import { fdir } from "fdir";
import { basename, dirname, join, normalize, sep } from 'path';
import { AvrTaskTerminal } from './Terminal';
import { checkInfo, runCommand } from './Spawner';

const GOALS = ['build', 'clean', 'scan'];
const DEFAULT_GOAL = 'build';

const ANY_HEADER = /\.h(h|pp|xx|\+\+)?$/i;
const ANY_SOURCE = /\.c(c|pp|xx|\+\+)?$/i;

const toItem = (label: string): QuickPickItem => ({ label });
const fromItem = (i: QuickPickItem): string => i.label;
const hidden = (i: string) => i.startsWith('.');

const crawlSrc = (uri: Uri) => (dir: string) =>
  new fdir()
    .withBasePath()
    .withFullPaths()
    .withMaxDepth(C.MAX_DEPTH.get(uri) ?? 0)
    .exclude(hidden)
    .filter(v => ANY_SOURCE.test(v))
    .crawl(dir)
    .withPromise() as Promise<string[]>;

const crawlLib = (uri: Uri) => (dir: string) =>
  new fdir()
    .withBasePath()
    .withFullPaths()
    .withMaxDepth(C.MAX_DEPTH.get(uri) ?? 0)
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
      pickOne('Select build goal', GOALS.map(toItem), item => item.label === DEFAULT_GOAL)
        .then(fromItem)
        .then(dispatch(folder))
    )
    .catch(console.log);
}

const dispatch = (folder: WorkspaceFolder) => (goal: string): void => {
  const uri = folder.uri;
  switch (goal) {
    case 'scan':
      tasks.executeTask(new Task({type: 'AVR.build'}, folder ?? TaskScope.Workspace, `🔍 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          getSources(uri)
            .then(getDependencies(uri, emitter))
            .then(getLinkables(uri))
            .then(printInfo(uri, emitter))
            .catch(handleBuildError(folder))
        ))
      ));
      break;
    case 'clean':
      tasks.executeTask(new Task({type: 'AVR.build'}, folder ?? TaskScope.Workspace, `🧹 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          clean(uri, emitter)
        ))
      ));
      break;
    case 'build':
      tasks.executeTask(new Task({type: 'AVR.build'}, folder ?? TaskScope.Workspace, `🔧 ${new Date()}`, 'AVR Helper',
        new CustomExecution(async () => new AvrTaskTerminal(emitter =>
          getSources(uri)
            .then(getDependencies(uri, emitter))
            .then(getLinkables(uri))
            .then(build(uri, emitter))
            .then(() => emitter.fire('✅'))
            .catch(handleBuildError(folder))
        )), C.HIGHLIGHT.get(uri) ? '$gcc' : undefined
      ));
      break;
  }
};

const handleBuildError = (folder: WorkspaceFolder) => (reason: object): void => {
  console.log(`${reason}`);
  window.showErrorMessage(`${reason}`, ...GOALS)
    .then(goal => {
      if (goal) {
        dispatch(folder)(goal);
      }
    });
};

function clean(uri: Uri, emitter: EventEmitter<string>): Promise<void> {
  return fs
    .rm(getOutputRoot(uri.fsPath), { recursive: true, force: true })
    .then(() => emitter.fire('✅'))
    .catch(error => emitter.fire(`❌ ${error}`));
}

function getSources(uri: Uri): Promise<Sources> {
  const extLibraries = C.LIBRARIES.get(uri) ?? [];
  return Promise.all([crawlSrc(uri)(uri.fsPath), Promise.all(extLibraries.map(crawlSrc(uri))).then(paths => paths.flat())])
    .then(([thisFolder, extFolders]): Sources => ({ thisFolder, extFolders }));
}

const getDependencies = (uri: Uri, emitter: EventEmitter<string>) => async (src: Sources): Promise<string[]> => {
  const exe = C.COMPILER.get(uri);
  const devType = C.DEVICE_TYPE.get(uri);
  if (!exe || !devType) {
    return [];
  }
  const args: string[] = [
    '-MM',
    `-mmcu=${devType}`
  ];
  const devFrequency = C.DEVICE_FREQ.get(uri);
  if (devFrequency) {
    args.push(`-DF_CPU=${devFrequency}UL`);
  }
  const libs = C.LIBRARIES.get(uri) ?? [];
  args.push(...(await Promise.all(libs.map(crawlLib(uri)))).flat().map(lib => `-I${lib}`));
  let toBeChecked: string[] = src.thisFolder;
  let unused: string[] = src.extFolders;
  let result: string[] = [];
  emitter.fire(`Working directory: ${uri.fsPath}`);
  while (toBeChecked.length > 0) {
    const info = runCommand(exe, [...args, ...toBeChecked], uri.fsPath, emitter);
    if (info.error) {
      throw new Error(`Error: cannot collect dependencies. ${info.error.message}`);
    }
    if (info.status && info.status > 0) {
      throw new Error(`Error ${info.status}: cannot collect dependencies. ${info.stderr.toString()}`);
    }
    console.log(`${info.stderr.toString()}`);
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

const getLinkables = (uri: Uri) => (dependencies: string[]): Promise<Linkable[]> => {
  return Promise.all(
    groupDependencies(dependencies, uri)
      .map(group => Promise.all(group.map(getFileTime))
      .then(getLinkable))
  );
};

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
    const exe = C.COMPILER.get(uri);
    const devType = C.DEVICE_TYPE.get(uri);
    if (!exe || !devType) {
      return;
    }
    const mcuArgs = [
      `-mmcu=${devType}`
    ];
    const devFrequency = C.DEVICE_FREQ.get(uri);
    if (devFrequency) {
      mcuArgs.push(`-DF_CPU=${devFrequency}UL`);
    }
    const additionalArgs: string[] = [];
    const cppStandard = C.CPP_STD.get(uri);
    if (cppStandard) {
      additionalArgs.push(`-std=${cppStandard}`);
    }
    const libs = C.LIBRARIES.get(uri) ?? [];
    additionalArgs.push(...(await Promise.all(libs.map(crawlLib(uri)))).flat().map(lib => `-I${lib}`));
    const compilerArgs = C.COMPILER_ARGS.get(uri) ?? [];
    const buildTarget = getOutputElf(uri.fsPath);
    return Promise
      .all(linkables
        .filter(linkable => linkable.needsRebuilding)
        .map(linkable => fs
          .mkdir(dirname(linkable.target), { recursive: true })
          .catch(() => {})
          .then(() => {
            const info = runCommand(exe, [...mcuArgs, ...compilerArgs, ...additionalArgs, '-c', linkable.source, '-o', linkable.target], uri.fsPath, emitter);
            return checkInfo(info, emitter);
          })
        )
      )
      .then(results => {
        const result = results.every(success => success);
        emitter.fire(`${icon(result)} Compilation`);
        if (!result) {
          throw new Error('Compilation failed.');
        }
      })
      .then(() => {
        const linkerArgs = C.LINKER_ARGS.get(uri) ?? [];
        const linkTargets = linkables.map(linkable => linkable.target);
        const info = runCommand(exe, [...mcuArgs, ...linkerArgs, ...linkTargets, '-o', buildTarget], uri.fsPath, emitter);
        return checkInfo(info, emitter);
      })
      .then(result => {
        emitter.fire(`${icon(result)} Linkage`);
        if (!result) {
          throw new Error('Linkage failed.');
        }
      })
      .then(async () => {
        if (C.DUMP_LST.get(uri)) {
          const disassemblerArgs: string[] = C.DISASM_ARGS.get(uri) ?? [];
          const objdump = join(dirname(exe), 'avr-objdump');
          const info = runCommand(objdump, [...disassemblerArgs , buildTarget], uri.fsPath, emitter);
          return (
            checkInfo(info, emitter)
              ? fs.writeFile(getOutputLst(uri.fsPath), info.stdout)
                  .then(() => true)
                  .catch(error => {
                    emitter.fire(`${error}`);
                    return false;
                  })
              : Promise.resolve(false))
            .then(result => emitter.fire(`${icon(result)} Disassembling`));
        }
      })
      .then(() => {
        if (C.DUMP_HEX.get(uri)) {
          const objcopy = join(dirname(exe), 'avr-objcopy');
          const info = runCommand(objcopy, ['-Oihex', '-j.text', '-j.data', buildTarget, getOutputHex(uri.fsPath)], uri.fsPath, emitter);
          const result = checkInfo(info, emitter);
          return emitter.fire(`${icon(result)} Dumping HEX`);
        }
      })
      .then(() => {
        const reporterArgs = C.REPORTER_ARGS.get(uri) ?? [];
        if (reporterArgs.includes('-C')) {
          reporterArgs.push(`--mcu=${devType}`);
        }
        const info = runCommand(join(dirname(exe), 'avr-size'), [...reporterArgs, buildTarget], uri.fsPath, emitter);
        if (checkInfo(info, emitter)) {
          emitter.fire(info.stdout.toString());
        }
      });
  };
}

const icon = (result: boolean) => result ? '✅' : '❌';

function printInfo(uri: Uri, emitter: EventEmitter<string>) {
  return (linkables: Linkable[]): void => {
    linkables.forEach((linkable, index) => {
      const search: string = `${uri.fsPath}${sep}`;
      emitter.fire(`${index === 0 ? ' ' : '│'} ┌─${linkable.source.replace(search, '')}`);
      emitter.fire(`${index === 0 ? '┌' : '├'}─${linkable.needsRebuilding ? '✖' : '┴'}─${linkable.target.replace(search, '')}`);
      emitter.fire('│');
    });
    emitter.fire(`└─► Build Target\n`);
  };
}