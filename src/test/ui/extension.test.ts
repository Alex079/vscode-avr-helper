import * as assert from 'assert';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { InputBox, StatusBar, VSBrowser } from 'vscode-extension-tester';

describe('Status bar test suite', () => {

  let ws: string;
  let bin: string;
  let statusBar: StatusBar;

  const fakeWorkspace = async () => {
    ws = await fs
      .mkdtemp(join(tmpdir(), 'avr-helper-test-'))
      .then(async (dir) => {
        await fs.writeFile(join(dir, 'main.cpp'), 'int main() {return 0;}');
        return dir;
      });
      /*await*/ VSBrowser.instance.openResources(ws);
    console.log('Workspace: ' + ws);
  };

  const fakeBinaries = async () => {
    bin = await fs
      .mkdtemp(join(tmpdir(), 'avr-helper-test-'))
      .then(async (dir) => {
        await fs.writeFile(join(dir, 'avr-gcc'), 'echo stub');
        await fs.writeFile(join(dir, 'avr-objdump'), 'echo stub');
        await fs.writeFile(join(dir, 'avr-size'), 'echo stub');
        await fs.writeFile(join(dir, 'avrdude'), 'echo stub');
        return dir;
      });
    console.log('Binaries: ' + bin);
  };

  before('Fake workspace', fakeWorkspace);

  before('Fake binaries', fakeBinaries);

  before('Statusbar', () => { statusBar = new StatusBar(); });

  it('AVR settings', async () => {
    await VSBrowser.instance.driver.wait(() => statusBar.getItem('settings  AVR, Edit AVR configuration'), 1000)
      .then(item => {
        assert.ok(item);
        item.click();
      });
    await InputBox.create()
      .then(box => box
        .setText(join(bin, 'avr-gcc'))
        .then(() => box.confirm())
      );
    await InputBox.create()
      .then(box => box
        .setText(join(bin, 'avrdude'))
        .then(() => box.confirm())
      );
    await InputBox.create()
      .then(box => box.confirm());
    await InputBox.create()
      .then(box => box.confirm());
    
    const settings = require(join(ws, '.vscode', 'settings.json'));
    assert.strictEqual(settings['AVR.source.compiler'], join(bin, 'avr-gcc'));
    assert.strictEqual(settings['AVR.programmer.tool'], join(bin, 'avrdude'));

    const cProps = require(join(ws, '.vscode', 'c_cpp_properties.json'));
    assert.strictEqual(cProps.configurations[0].compilerPath, join(bin, 'avr-gcc'));

    await new StatusBar().wait(100)
      .then(statusBar => {
        assert.ok(statusBar.getItem('- | - Hz, Select device'));
        assert.ok(statusBar.getItem('- | - | - Baud, Select programmer'));
      });
  });
  
});