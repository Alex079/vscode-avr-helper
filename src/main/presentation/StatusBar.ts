import { commands, StatusBarItem, Uri, window } from 'vscode';
import * as C from '../utils/Conf';
import { getContext } from '../utils/Context';
import { performBuildTask, performFlashTask } from '../actions/Runner';
import { setupDevice, setupProgrammer, setupTools } from '../actions/SetupTools';

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
    performBuildTask
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
    performFlashTask
  ));
};

export const showSetupToolsItem = () => {
  getSetupToolsItem().show();
};

export const updateSetupDeviceItem = (uri: Uri | undefined) => {
  const item = getSetupDeviceItem();
  item.text = uri ? getSetupDeviceItemText(uri) : '';
  if (item.text) {
    item.show();
  } else {
    item.hide();
  }
};

export const updateSetupProgrammerItem = (uri: Uri | undefined) => {
  const item = getSetupProgrammerItem();
  item.text = uri ? getSetupProgrammerItemText(uri) : '';
  if (item.text) {
    item.show();
  } else {
    item.hide();
  }
};

export const updateBuildItem = (uri: Uri | undefined) => {
  const item = getBuildItem();
  if (uri ? getBuildItemFlag(uri) : false) {
    item.show();
  } else {
    item.hide();
  }
};

export const updateFlashItem = (uri: Uri | undefined) => {
  const item = getFlashItem();
  if (uri ? getFlashItemFlag(uri) : false) {
    item.show();
  } else {
    item.hide();
  }
};

const getSetupDeviceItemText = (uri: Uri): string =>
  !!C.COMPILER.get(uri) && !!C.PROGRAMMER.get(uri) ? `${C.DEVICE_TYPE.get(uri) ?? '-'} | ${C.DEVICE_FREQ.get(uri) ?? '-'} Hz` : '';

const getSetupProgrammerItemText = (uri: Uri): string =>
  !!C.PROGRAMMER.get(uri) ? `${C.PROG_TYPE.get(uri) ?? '-'} | ${C.PROG_PORT.get(uri) ?? '-'} | ${C.PROG_RATE.get(uri) ?? '-'} Baud` : '';

const getBuildItemFlag = (uri: Uri): boolean =>
  !!C.COMPILER.get(uri) && !!C.PROGRAMMER.get(uri) && !!C.DEVICE_TYPE.get(uri) && !!C.DEVICE_FREQ.get(uri);

const getFlashItemFlag = (uri: Uri): boolean =>
  !!C.PROGRAMMER.get(uri) && !!C.DEVICE_TYPE.get(uri) && !!C.PROG_TYPE.get(uri);
