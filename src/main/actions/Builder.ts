import { promises as fs } from 'fs';
import { Uri } from "vscode";
import * as C from '../utils/Conf';
import { getOutputElf, getOutputHex, getOutputLst, getOutputObj, getOutputRoot } from "../utils/Files";
import { fdir } from "fdir";
import { basename, dirname, join, normalize, sep } from 'path';
import { runCommand } from './Spawner';
import { PrintEmitter } from './Terminal';

const ANY_HEADER = /\.h(h|pp|xx|\+\+)?$/i;
const ANY_SOURCE = /\.c(c|pp|xx|\+\+)?$/i;

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

export const performScan = (uri: Uri, emitter: PrintEmitter) => 
  getSources(uri)
    .then(getDependencies(uri, emitter))
    .then(getLinkables(uri))
    .then(printInfo(uri, emitter))
    .then(() => emitter.fireIconLine(true));

export const performBuild = (uri: Uri, emitter: PrintEmitter) => 
  getSources(uri)
    .then(getDependencies(uri, emitter))
    .then(getLinkables(uri))
    .then(build(uri, emitter))
    .then(() => emitter.fireIconLine(true));

export const performClean = (uri: Uri, emitter: PrintEmitter) => 
  fs.rm(getOutputRoot(uri.fsPath), { recursive: true, force: true })
    .then(() => emitter.fireIconLine(true));

function getSources(uri: Uri): Promise<Sources> {
  const extLibraries = C.LIBRARIES.get(uri) ?? [];
  return Promise.all([crawlSrc(uri)(uri.fsPath), Promise.all(extLibraries.map(crawlSrc(uri))).then(paths => paths.flat())])
    .then(([thisFolder, extFolders]): Sources => ({ thisFolder, extFolders }));
}

const getDependencies = (uri: Uri, emitter: PrintEmitter) => async (src: Sources): Promise<string[]> => {
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
  emitter.fireLine(`Working directory: ${uri.fsPath}`);
  while (toBeChecked.length > 0) {
    const info = await runCommand(exe, [...args, ...toBeChecked], uri.fsPath, emitter);
    if (info.message) {
      throw new Error(`Error: cannot collect dependencies. ${info.message}`);
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

function build(uri: Uri, emitter: PrintEmitter) {
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
          .then(() => runCommand(exe, [...mcuArgs, ...compilerArgs, ...additionalArgs, '-c', linkable.source, '-o', linkable.target], uri.fsPath, emitter))
          .then(info => info.message === undefined)
        )
      )
      .then(results => {
        const result = results.every(success => success);
        emitter.fireIconLine(result, 'Compilation');
        if (!result) {
          throw new Error('Compilation failed.');
        }
      })
      .then(() => {
        const linkerArgs = C.LINKER_ARGS.get(uri) ?? [];
        const linkTargets = linkables.map(linkable => linkable.target);
        return runCommand(exe, [...mcuArgs, ...linkerArgs, ...linkTargets, '-o', buildTarget], uri.fsPath, emitter);
      })
      .then(info => info.message === undefined)
      .then(result => {
        emitter.fireIconLine(result, 'Linkage');
        if (!result) {
          throw new Error('Linkage failed.');
        }
      })
      .then(async () => {
        if (C.DUMP_LST.get(uri)) {
          const disassemblerArgs: string[] = C.DISASM_ARGS.get(uri) ?? [];
          const objdump = join(dirname(exe), 'avr-objdump');
          return runCommand(objdump, [...disassemblerArgs , buildTarget], uri.fsPath, emitter)
            .then(info => info.message === undefined
              ? fs.writeFile(getOutputLst(uri.fsPath), info.stdout)
                  .then(() => true)
                  .catch(error => {
                    emitter.fireLine(`${error}`);
                    return false;
                  })
              : false)
            .then(result => emitter.fireIconLine(result, 'Disassembling'));
        }
      })
      .then(async () => {
        if (C.DUMP_HEX.get(uri)) {
          const objcopy = join(dirname(exe), 'avr-objcopy');
          return runCommand(objcopy, ['-Oihex', '-j.text', '-j.data', buildTarget, getOutputHex(uri.fsPath)], uri.fsPath, emitter)
            .then(info => info.message === undefined)
            .then(result => emitter.fireIconLine(result, 'Dumping HEX'));
        }
      })
      .then(() => {
        const reporterArgs = C.REPORTER_ARGS.get(uri) ?? [];
        if (reporterArgs.includes('-C')) {
          reporterArgs.push(`--mcu=${devType}`);
        }
        runCommand(join(dirname(exe), 'avr-size'), [...reporterArgs, buildTarget], uri.fsPath, emitter)
          .then(info => {
            if (info.message === undefined) {
              emitter.fireLine(info.stdout);
            }
          });
      });
  };
}

function printInfo(uri: Uri, emitter: PrintEmitter) {
  return (linkables: Linkable[]): void => {
    linkables.forEach((linkable, index) => {
      const search: string = `${uri.fsPath}${sep}`;
      emitter.fireLine(`${index === 0 ? ' ' : '│'} ┌─${linkable.source.replace(search, '')}`);
      emitter.fireLine(`${index === 0 ? '┌' : '├'}─${linkable.needsRebuilding ? '✖' : '┴'}─${linkable.target.replace(search, '')}`);
      emitter.fireLine('│');
    });
    emitter.fireLine(  `└─► Build Target\n`);
  };
}