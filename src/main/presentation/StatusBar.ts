import { commands, StatusBarItem, Uri, window } from 'vscode';
import * as C from '../utils/Conf';
import { getContext } from '../utils/Context';
import { setupDevice, setupProgrammer, setupTools } from '../actions/SetupTools';
import { performBuildTask } from '../actions/Builder';
import { performFlashTask } from '../actions/Flasher';

const items: { [key: string]: StatusBarItem } = {};

function getStatusBarItem(command: string, text: string, tooltip: string, run: () => void): StatusBarItem {
  const newItem = window.createStatusBarItem();
  newItem.command = command;
  newItem.text = text;
  newItem.tooltip = tooltip;
  getContext().subscriptions.push(commands.registerCommand(command, run), newItem);
  return newItem;
}

const SETUP_TOOLS = 'AVR.command.setup.tools';
const SETUP_DEVICE = 'AVR.command.setup.device';
const SETUP_PROGRAMMER = 'AVR.command.setup.programmer';
const PERFORM_BUILD = 'AVR.command.build';
const PERFORM_FLASH = 'AVR.command.flash';

const getSetupToolsItem = () => {
  if (items[SETUP_TOOLS]) {
    return items[SETUP_TOOLS];
  }
  return (items[SETUP_TOOLS] = getStatusBarItem(
    SETUP_TOOLS,
    '$(settings) AVR',
    'Edit AVR configuration',
    setupTools
  ));
};

const getSetupDeviceItem = () => {
  if (items[SETUP_DEVICE]) {
    return items[SETUP_DEVICE];
  }
  return (items[SETUP_DEVICE] = getStatusBarItem(
    SETUP_DEVICE,
    '',
    'Select device',
    setupDevice
  ));
};

const getSetupProgrammerItem = () => {
  if (items[SETUP_PROGRAMMER]) {
    return items[SETUP_PROGRAMMER];
  }
  return (items[SETUP_PROGRAMMER] = getStatusBarItem(
    SETUP_PROGRAMMER,
    '',
    'Select programmer',
    setupProgrammer
  ));
};

const getBuildItem = () => {
  if (items[PERFORM_BUILD]) {
    return items[PERFORM_BUILD];
  }
  return (items[PERFORM_BUILD] = getStatusBarItem(
    PERFORM_BUILD,
    '$(file-binary) Build',
    'Build source code',
    performBuildTask
  ));
};

const getFlashItem = () => {
  if (items[PERFORM_FLASH]) {
    return items[PERFORM_FLASH];
  }
  return (items[PERFORM_FLASH] = getStatusBarItem(
    PERFORM_FLASH,
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
  commands.executeCommand('setContext', `${SETUP_DEVICE}.enabled`, !!item.text);
};

export const updateSetupProgrammerItem = (uri: Uri | undefined) => {
  const item = getSetupProgrammerItem();
  item.text = uri ? getSetupProgrammerItemText(uri) : '';
  if (item.text) {
    item.show();
  } else {
    item.hide();
  }
  commands.executeCommand('setContext', `${SETUP_PROGRAMMER}.enabled`, !!item.text);
};

export const updateBuildItem = (uri: Uri | undefined) => {
  const item = getBuildItem();
  const show = uri ? getBuildItemFlag(uri) : false;
  if (show) {
    item.show();
  } else {
    item.hide();
  }
  commands.executeCommand('setContext', `${PERFORM_BUILD}.enabled`, show);
};

export const updateFlashItem = (uri: Uri | undefined) => {
  const item = getFlashItem();
  const show = uri ? getFlashItemFlag(uri) : false;
  if (show) {
    item.show();
  } else {
    item.hide();
  }
  commands.executeCommand('setContext', `${PERFORM_FLASH}.enabled`, show);
};

const getSetupDeviceItemText = (uri: Uri): string =>
  !!C.COMPILER.get(uri) && !!C.PROGRAMMER.get(uri) ? `${C.DEVICE_TYPE.get(uri) || '-'} | ${C.DEVICE_FREQ.get(uri) || '-'} Hz` : '';

const getSetupProgrammerItemText = (uri: Uri): string =>
  !!C.PROGRAMMER.get(uri) ? `${C.PROG_TYPE.get(uri) || '-'} | ${C.PROG_PORT.get(uri) || '-'} | ${C.PROG_RATE.get(uri) || '-'} Baud` : '';

const getBuildItemFlag = (uri: Uri): boolean =>
  !!C.COMPILER.get(uri) && !!C.PROGRAMMER.get(uri) && !!C.DEVICE_TYPE.get(uri) && !!C.DEVICE_FREQ.get(uri);

const getFlashItemFlag = (uri: Uri): boolean =>
  !!C.PROGRAMMER.get(uri) && !!C.DEVICE_TYPE.get(uri) && !!C.PROG_TYPE.get(uri);
