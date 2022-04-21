import { window } from "vscode";

export const showAndReject = (reason: any) => {
    window.showErrorMessage(`${reason}`);
    return Promise.reject(reason);
};