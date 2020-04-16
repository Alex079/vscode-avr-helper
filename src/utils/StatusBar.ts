import { DEVICE_FREQ, DEVICE_TYPE, PROG_PORT, PROG_RATE, PROG_TYPE, COMPILER, PROGRAMMER } from './Conf';
import { Uri } from 'vscode';

export const getSetupDeviceItemText = (uri: Uri): string =>
  !!COMPILER.get(uri) && !!PROGRAMMER.get(uri) ? `${DEVICE_TYPE.get(uri) ?? '-'} | ${DEVICE_FREQ.get(uri) ?? '-'} Hz` : '';

export const getSetupProgrammerItemText = (uri: Uri): string =>
  !!PROGRAMMER.get(uri) ? `${PROG_TYPE.get(uri) ?? '-'} | ${PROG_PORT.get(uri) ?? '-'} | ${PROG_RATE.get(uri) ?? '-'} Baud` : '';

export const getBuildItemFlag = (uri: Uri): boolean => !!DEVICE_TYPE.get(uri) && !!DEVICE_FREQ.get(uri);

export const getFlashItemFlag = (uri: Uri): boolean => !!PROG_TYPE.get(uri);
