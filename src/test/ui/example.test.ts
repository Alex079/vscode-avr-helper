import * as assert from 'assert';
import { promises as fs } from 'fs';
import { syncBuiltinESMExports } from 'module';
import { tmpdir } from 'os';
import { join } from 'path';
import { InputBox, StatusBar, VSBrowser, WebDriver } from 'vscode-extension-tester';

describe('My Test Suite', () => {
  let browser: VSBrowser;
  let driver: WebDriver;

  before('Before test', async () => {
    browser = VSBrowser.instance;
    driver = browser.driver;
  });

  it('VSCode is opened', async () => {
    await fs
      .mkdtemp(join(tmpdir(), 'avr-helper-test-'))
      .then(dir => browser.openResources(dir))
      .then(() => driver.getTitle())
      .then(title => assert.ok(title.includes('Visual Studio Code')));
    await new StatusBar()
      .getItem('settings  AVR, Edit AVR configuration')
      .then(i => i?.click());
    await new InputBox()
      .wait(100)
      .then(i => i.getPlaceHolder())
      .then(placeholder => assert.ok(placeholder.includes('path')));
  });
});