import { StatusBarItem, commands, window } from 'vscode';
import { getContext } from '../utils/Context';
import { performFlash } from './PerformFlash';
import { performMake } from './PerformMake';
import { setupDevice, setupProgrammer, setupTools } from './SetupTools';

const items: { [key: string]: StatusBarItem } = {};

function getStatusBarItem(command: string, text: string, tooltip: string, run: () => {}): StatusBarItem {
  const newItem = window.createStatusBarItem();
  newItem.command = command;
  newItem.text = text;
  newItem.tooltip = tooltip;
  getContext().subscriptions.push(commands.registerCommand(command, run), newItem);
  return newItem;
}

const getSetupToolsItem = () => {
  if (items['setup.tools']) {
    return items['setup.tools'];
  }
  return (items['setup.tools'] = getStatusBarItem(
    'AVR.command.setup.tools',
    '$(settings) AVR',
    'Edit AVR configuration',
    setupTools
  ));
};

const getSetupDeviceItem = () => {
  if (items['setup.device']) {
    return items['setup.device'];
  }
  return (items['setup.device'] = getStatusBarItem(
    'AVR.command.setup.device',
    '',
    'Select device',
    setupDevice
  ));
};

const getSetupProgrammerItem = () => {
  if (items['setup.programmer']) {
    return items['setup.programmer'];
  }
  return (items['setup.programmer'] = getStatusBarItem(
    'AVR.command.setup.programmer',
    '',
    'Select programmer',
    setupProgrammer
  ));
};

const getBuildItem = () => {
  if (items['build']) {
    return items['build'];
  }
  return (items['build'] = getStatusBarItem(
    'AVR.command.build',
    '$(file-binary) Build',
    'Build source code',
    performMake
  ));
};

const getFlashItem = () => {
  if (items['flash']) {
    return items['flash'];
  }
  return (items['flash'] = getStatusBarItem(
    'AVR.command.flash',
    '$(flame) Flash',
    'Flash binary to device',
    performFlash
  ));
};

export const showSetupToolsItem = () => {
  getSetupToolsItem().show();
};

export const updateSetupDeviceItem = (text: string) => {
  const sbi = getSetupDeviceItem();
  sbi.text = text;
  if (text) {
    sbi.show();
  } else {
    sbi.hide();
  }
};

export const updateSetupProgrammerItem = (text: string) => {
  const sbi = getSetupProgrammerItem();
  sbi.text = text;
  if (text) {
    sbi.show();
  } else {
    sbi.hide();
  }
};

export const updateBuildItem = (display: boolean) => {
  const sbi = getBuildItem();
  if (display) {
    sbi.show();
  } else {
    sbi.hide();
  }
};

export const updateFlashItem = (display: boolean) => {
  const sbi = getFlashItem();
  if (display) {
    sbi.show();
  } else {
    sbi.hide();
  }
};
