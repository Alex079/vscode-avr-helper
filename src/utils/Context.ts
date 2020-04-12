import { ExtensionContext } from 'vscode';

let context: ExtensionContext | undefined = undefined;

export function setContext(value: ExtensionContext): void {
  context = value;
}

export function getContext(): ExtensionContext {
  if (context) {
    return context;
  }
  throw new Error('No context');
}
