import * as Mocha from 'mocha';
import * as glob from 'glob';
import { join } from 'path';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    allowUncaught: true,
    color: true,
    timeout: 10000
  });
  const testsRoot = __dirname;
  console.log(testsRoot);
  return new Promise((resolve, reject) => {
    glob('**/*.test.js', { cwd: testsRoot }, (error, matches) => {
      if (error) {
        reject(error);
        return;
      }
      console.log(matches);
      matches.forEach(match => mocha.addFile(join(testsRoot, match)));
      console.log(`files: ${mocha.files}`);
      try {
        mocha.run(failures => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          }
          else {
            resolve();
          }
        });
      }
      catch (error) {
        reject(error);
      }
    });
  });
}
