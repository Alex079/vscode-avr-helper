import { promises as fs } from 'fs';
import { Disposable, QuickPickItem, Uri, window, workspace } from 'vscode';
import { getPlusIcon } from '../utils/Files';

export async function pickFolder(): Promise<Uri> {
  const folders = workspace.workspaceFolders;
  if (folders) {
    const editorUri = window.activeTextEditor?.document.uri;
    if (editorUri) {
      const uri = workspace.getWorkspaceFolder(editorUri)?.uri;
      if (uri) {
        return uri;
      }
    }
    switch (folders.length) {
      case 1: return Promise.resolve(folders[0].uri);
      default: return new Promise((resolve, reject) =>
        window
          .showWorkspaceFolderPick({ ignoreFocusOut: true })
          .then(folder => folder?.uri)
          .then(uri => uri ? resolve(uri) : reject('Interrupted')));
    }
  }
  throw new Error('No folder');
}

export async function pickFile(placeholder: string, value: string | undefined, required: boolean, includeFiles: boolean, includeFolders: boolean): Promise<string> {
  const input = window.createInputBox();
  if (value) {
    input.value = value;
  }
  input.ignoreFocusOut = true;
  input.placeholder = placeholder;
  input.buttons = [{ iconPath: getPlusIcon() }];
  const disposables: Disposable[] = [];
  return new Promise<string>((resolve, reject) => {
    disposables.push(
      input.onDidHide(() => reject('Interrupted')),
      input.onDidAccept(() => {
        if (input.value) {
          fs.stat(input.value)
            .then(stat => {
              if ((includeFolders && stat.isDirectory()) || (includeFiles && stat.isFile())) {
                resolve(input.value);
              } else {
                input.validationMessage = 'Not accepted';
              }
            })
            .catch(() => (input.validationMessage = 'Does not exist'));
        }
        else {
          required ? (input.validationMessage = 'Must be specified') : resolve(undefined);
        }
      }),
      input.onDidTriggerButton(() => {
        window
          .showOpenDialog({
            canSelectFiles: includeFiles,
            canSelectFolders: includeFolders,
            canSelectMany: false,
            openLabel: placeholder
          })
          .then(uris => {
            if (uris?.length) {
              input.value = uris[0].fsPath;
            }
          });
      })
    );
    input.show();
  }).finally(() => {
    disposables.forEach(d => d.dispose());
    input.dispose();
  });
}

export async function pickFiles(placeholder: string, value: string[] | undefined, includeFiles: boolean, includeFolders: boolean): Promise<string[]> {
  const items: QuickPickItem[] = value ? value.map(lib => { return { label: lib, alwaysShow: true }; }) : [];
  const picker = window.createQuickPick();
  picker.items = items;
  picker.selectedItems = items;
  picker.ignoreFocusOut = true;
  picker.canSelectMany = true;
  picker.placeholder = placeholder;
  picker.buttons = [{ iconPath: getPlusIcon() }];
  const disposables: Disposable[] = [];
  return new Promise<string[]>((resolve, reject) => {
    disposables.push(
      picker.onDidHide(() => reject('Interrupted')),
      picker.onDidAccept(() => {
        const inputValue = picker.value.trim();
        if (inputValue) {
          fs.stat(inputValue).then(stat => {
            if ((includeFolders && stat.isDirectory()) || (includeFiles && stat.isFile())) {
              appendItem({ label: inputValue, alwaysShow: true, description: '(new)' });
              picker.value = '';
            }
          });
        }
        else {
          resolve(picker.selectedItems.map(item => item.label));
        }
      }),
      picker.onDidTriggerButton(() => {
        window
          .showOpenDialog({
            canSelectFiles: includeFiles,
            canSelectFolders: includeFolders,
            canSelectMany: true,
            openLabel: picker.placeholder
          })
          .then(uris =>
            uris?.forEach(uri => appendItem({ label: uri.fsPath, alwaysShow: true, description: '(new)' }))
          );
      })
    );
    picker.show();
  }).finally(() => {
    disposables.forEach(d => d.dispose());
    picker.dispose();
  });

  function appendItem(newItem: QuickPickItem) {
    let a;
    if (picker.items.every(i => i.label !== newItem.label)) {
      a = Array.from(picker.items);
      a.push(newItem);
      picker.items = a;
    }
    if (picker.selectedItems.every(i => i.label !== newItem.label)) {
      a = Array.from(picker.selectedItems);
      a.push(newItem);
      picker.selectedItems = a;
    }
  }
}

export async function pickNumber(placeholder: string, value: number | undefined, required: boolean): Promise<number> {
  const input = window.createInputBox();
  if (value) {
    input.value = value.toString();
  }
  input.ignoreFocusOut = true;
  input.placeholder = placeholder;
  const disposables: Disposable[] = [];
  return new Promise<number>((resolve, reject) => {
    disposables.push(
      input.onDidHide(() => reject('Interrupted')),
      input.onDidAccept(() => {
        if (isNaN(+input.value)) {
          input.validationMessage = 'Must be a number';
        } else if (input.value) {
          resolve(+input.value);
        } else {
          required ? (input.validationMessage = 'Must be specified') : resolve(undefined);
        }
      })
    );
    input.show();
  }).finally(() => {
    disposables.forEach(d => d.dispose());
    input.dispose();
  });
}

export async function pickString(placeholder: string, value: string | undefined, required: boolean): Promise<string> {
  const input = window.createInputBox();
  if (value) {
    input.value = value.toString();
  }
  input.ignoreFocusOut = true;
  input.placeholder = placeholder;
  const disposables: Disposable[] = [];
  return new Promise<string>((resolve, reject) => {
    disposables.push(
      input.onDidHide(() => reject('Interrupted')),
      input.onDidAccept(() => {
        if (input.value) {
          resolve(input.value);
        } else {
          required ? (input.validationMessage = 'Must be specified') : resolve(undefined);
        }
      })
    );
    input.show();
  }).finally(() => {
    disposables.forEach(d => d.dispose());
    input.dispose();
  });
}

export async function pickOne(
  placeholder: string,
  items: QuickPickItem[],
  active: (item: QuickPickItem) => boolean
): Promise<QuickPickItem> {
  const picker = window.createQuickPick();
  picker.items = items;
  picker.activeItems = items.filter(active);
  picker.ignoreFocusOut = true;
  picker.canSelectMany = false;
  picker.placeholder = placeholder;
  const disposables: Disposable[] = [];
  return new Promise<QuickPickItem>((resolve, reject) => {
    disposables.push(
      picker.onDidHide(() => reject('Interrupted')),
      picker.onDidAccept(() => {
        if (picker.selectedItems.length) {
          resolve(picker.selectedItems[0]);
        }
      })
    );
    picker.show();
  }).finally(() => {
    disposables.forEach(d => d.dispose());
    picker.dispose();
  });
}

export async function pickMany(
  placeholder: string,
  items: QuickPickItem[],
  active: (item: QuickPickItem) => boolean
): Promise<readonly QuickPickItem[]> {
  const picker = window.createQuickPick();
  picker.items = items;
  picker.activeItems = items.filter(active);
  picker.ignoreFocusOut = true;
  picker.canSelectMany = true;
  picker.placeholder = placeholder;
  const disposables: Disposable[] = [];
  return new Promise<readonly QuickPickItem[]>((resolve, reject) => {
    disposables.push(
      picker.onDidHide(() => reject('Interrupted')),
      picker.onDidAccept(() => {
        if (picker.selectedItems.length) {
          resolve(picker.selectedItems);
        }
      })
    );
    picker.show();
  }).finally(() => {
    disposables.forEach(d => d.dispose());
    picker.dispose();
  });
}