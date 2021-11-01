import { promises as fs } from 'fs';
import { spawnSync } from "child_process";
import { CustomExecution, Event, EventEmitter, Pseudoterminal, QuickPickItem, Task, tasks, TaskScope, Uri, window, workspace, WorkspaceFolder } from "vscode";
import * as C from '../utils/Conf';
import { getOutputElf, getOutputLst, getOutputObj, getOutputRoot } from "../utils/Files";
import { pickFolder, pickOne } from "../presentation/Inputs";
import { fdir } from "fdir";
import { basename, dirname, join, normalize } from 'path';
import { AvrBuildTaskTerminal } from './BuildTerminal';

const GOALS: string[] = ['build', 'clean', 'scan'];

const ANY_HEADER = /\.h(|h|pp|xx|\+\+)$/i;
const ANY_SOURCE = /\.c(|c|pp|xx|\+\+)$/i;

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

export async function performBuildTask(): Promise<void> {
  pickFolder()
    .then(folder => 
      pickOne('Select build goal', GOALS.map(toItem), () => false)
        .then(fromItem)
        .then(dispatch(folder.uri))
    )
    .catch(v => window.showErrorMessage(`${v}`));
}

const dispatch = (uri: Uri) => async (goal: string): Promise<void> => {
  switch (goal) {
    case 'scan':
      return getSources(uri)
        .then(getDependencies(uri))
        .then(getLinkables(uri))
        .then(v => {
          console.log(v);
          const a = v.map(l => `${l.source}[${l.needsRebuilding ? 'rebuild' : 'OK'}]`).join(' ');
          window.showInformationMessage(a);
        })
        .catch(v => {
          console.error(v);
          window.showErrorMessage(`${v}`);
        });
    case 'clean':
      return fs
        .rm(getOutputRoot(uri.fsPath), { recursive: true })
        .catch(() => {});
    case 'build':
      return getSources(uri)
        .then(getDependencies(uri))
        .then(getLinkables(uri))
        .then(compile(uri))
        .then(v => {
          console.log(v);
          window.showInformationMessage(`${v}`);
        })
        .catch(v => {
          console.error(v);
          window.showErrorMessage(`${v}`);
        });
  }
};

async function getSources(uri: Uri): Promise<Sources> {
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
      groupDependencies(dependencies, uri).map(group => Promise.all(group.map(getFileTime)).then(getLinkable))
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

async function getFileTime(file: string): Promise<FileTime> {
  return fs.stat(file)
    // .then(stats => {
    //   if (stats.isFile()) {
    //     return { time: stats.mtimeMs, file };
    //   }
    //   //return fs.rm(file, { recursive: true }).then(() => ({ time: -Infinity, file }));
    //   return { time: -Infinity, file };
    // })
    .then(stats => ({ time: stats.mtimeMs, file }))
    .catch(() => ({ time: -Infinity, file }));
}

function getLinkable(dependencies: FileTime[]): Linkable {
  const { file, time } = dependencies.pop() ?? {} as FileTime;
  return {
    target: file,
    source: dependencies[0]?.file,
    needsRebuilding: time <= Math.max(...dependencies.map(v => v.time))
  };
}

function compile(uri: Uri) {
  return async (linkables: Linkable[]): Promise<string | undefined> => {
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
    const compilerArgs: string[] = C.COMPILER_ARGS.get(uri) || [];
    const cppStandard: string | undefined = C.CPP_STD.get(uri);
    if (cppStandard) {
      compilerArgs.push(`-std=${cppStandard}`);
    }
    const linkerArgs: string[] = C.LINKER_ARGS.get(uri) || [];
    const libs: string[] = C.LIBRARIES.get(uri) || [];
    const includes = (await Promise.all(libs.map(crawlLib(uri)))).flat().map(lib => `-I${lib}`);
    // tasks.executeTask(new Task({type: 'AVR.build'}, workspace.getWorkspaceFolder(uri) ?? TaskScope.Workspace, 'AAA', 'BBB', new CustomExecution(async () => new AvrBuildTaskTerminal(
    //   (writer) =>
    return Promise
      .all(linkables
        .filter(linkable => linkable.needsRebuilding)
        .map(v => { console.info(`To be compiled ${v.target}`); return v; })
        .map(linkable => fs.mkdir(dirname(linkable.target), { recursive: true })
          .catch(() => {})
          .then(() => spawnSync(exe, [...mcuArgs, ...compilerArgs, ...includes, '-c', linkable.source, `-o${linkable.target}`], { cwd: uri.fsPath }))
        )
      )
      .then(infos => infos.forEach(info => {
        if (info.error) {
          console.error(`${info.error.message}`);
          window.showErrorMessage(`Error: cannot compile. ${info.error.message}`);
          throw new Error(info.error.message);
        }
        // writer(info.stderr.toString());
        if (info.status && info.status > 0) {
          console.warn(`${info.stderr.toString()}`);
          window.showWarningMessage(`Error ${info.status}: cannot compile. ${info.stderr.toString()}`);
          throw new Error(info.stderr.toString());
        }
        const warnings = info.stderr.toString();
        if (warnings) {
          console.info(warnings);
          window.showWarningMessage(`Warnings: ${warnings}`);
        }

      }))
      .then(() => console.info(`Linking`))
      .then(() => spawnSync(exe, [...mcuArgs, ...linkerArgs, ...includes, ...linkables.map(linkable => linkable.source), `-o${getOutputElf(uri.fsPath)}`], { cwd: uri.fsPath }))
      .then(info => {
        if (info.error) {
          console.error(`${info.error.message}`);
          window.showErrorMessage(`Error: cannot link. ${info.error.message}`);
          throw new Error(info.error.message);
        }
        // writer(info.stderr.toString());
        if (info.status && info.status > 0) {
          console.warn(`${info.stderr.toString()}`);
          window.showWarningMessage(`Error ${info.status}: cannot link. ${info.stderr.toString()}`);
          throw new Error(info.stderr.toString());
        }
        console.info(`${info.stderr.toString()}`);
      })
      .then(() => console.info(`Disassembling`))
      .then(() => spawnSync(join(dirname(exe), 'avr-objdump'), ['--disassemble', '--source', '--line-numbers', '--demangle', getOutputElf(uri.fsPath)], { cwd: uri.fsPath }))
      .then(info => {
        if (info.error) {
          console.error(`${info.error.message}`);
          window.showErrorMessage(`Error: cannot disassemble. ${info.error.message}`);
          throw new Error(info.error.message);
        }
        // writer(info.stderr.toString());
        if (info.status && info.status > 0) {
          console.warn(`${info.stderr.toString()}`);
          window.showWarningMessage(`Error ${info.status}: cannot disassemble. ${info.stderr.toString()}`);
          throw new Error(info.stderr.toString());
        }
        return fs.writeFile(getOutputLst(uri.fsPath), info.stdout);
      })
      .then(() => spawnSync(join(dirname(exe), 'avr-size'), ['-A', getOutputElf(uri.fsPath)], { cwd: uri.fsPath }))
      .then(info => {
        if (info.error) {
          console.error(`${info.error.message}`);
          window.showErrorMessage(`Error: cannot print size. ${info.error.message}`);
          throw new Error(info.error.message);
        }
        // writer(info.stderr.toString());
        if (info.status && info.status > 0) {
          console.warn(`${info.stderr.toString()}`);
          window.showWarningMessage(`Error ${info.status}: cannot print size. ${info.stderr.toString()}`);
          throw new Error(info.stderr.toString());
        }
        // writer(info.stdout.toString());
        return info.stdout.toString();
      })
      ;
      // .then(() => undefined)
    // ))));
    // return undefined;
  };
}
