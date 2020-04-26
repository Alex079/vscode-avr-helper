import * as Mocha from 'mocha';
import * as path from 'path';

export async function run(): Promise<void> {
  try {
    new Mocha({ ui: 'tdd', color: true })
      .addFile(path.resolve(__dirname, 'index'))
      .run(failures => {
        if (failures > 0) {
          throw Error(`${failures} tests failed.`);
        }
      });
  }
  catch (e) {
    console.error(e);
  }
}