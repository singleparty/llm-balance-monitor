import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'statusBar.showTime';
  statusBarItem.text = '$(clock) Hello';
  statusBarItem.tooltip = 'Click to show current time';
  statusBarItem.show();

  const disposable = vscode.commands.registerCommand('statusBar.showTime', () => {
    const now = new Date().toLocaleTimeString();
    vscode.window.showInformationMessage(`Current time: ${now}`);
    statusBarItem.text = `$(clock) ${now}`;
  });

  context.subscriptions.push(statusBarItem, disposable);
}

export function deactivate() {
  statusBarItem?.dispose();
}
