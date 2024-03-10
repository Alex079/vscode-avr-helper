import * as assert from 'assert';
import { promises as fs } from 'fs';
import { propagateSettings } from '../../main/actions/Propagator';
import { pickFolder } from '../../main/presentation/Inputs';
import { join } from 'path';

suite('Actions Test Suite', () => {
  
  test('Pick folder and propagate C/C++ defaults', () => {
        return pickFolder().then(folder => 
      propagateSettings(folder.uri)
        .then(() => fs.readFile(join(folder.uri.fsPath, '.vscode', 'c_cpp_properties.json')))
        .then(buffer => JSON.parse(buffer.toString()))
        .then(json => {
          const conf = json.configurations[0];
          assert.strictEqual(conf.name, 'AVR');
          assert.strictEqual(conf.intelliSenseMode, '${default}');
          assert.strictEqual(conf.cStandard, '${default}');
          assert.strictEqual(conf.cppStandard, '${default}');
          assert.strictEqual(conf.compilerPath, '');
          assert.deepStrictEqual(conf.includePath, []);
          assert.deepStrictEqual(conf.compilerArgs, [
            "-g",
            "-Os",
            "-Wall",
            "-Wextra",
            "-fpermissive",
            "-fno-exceptions",
            "-fno-threadsafe-statics",
            "-pipe"
          ]);
        })
    );
  });

});
