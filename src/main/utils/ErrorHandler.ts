import { window } from "vscode";

export const showMessageAndGetError = (reason?: any) => {
  window.showErrorMessage(`${reason}`);
  return (reason instanceof Error) ? reason : new Error(reason);
};

export const showMessageAndThrowError = (reason?: any) => {
  throw showMessageAndGetError(reason);
};