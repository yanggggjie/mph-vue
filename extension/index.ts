import type { ExtensionContext } from 'vscode';
import { commands, window } from 'vscode';
import { initExtension } from '@tomjs/vscode';
import { MphVueViewProvider } from './views/mphVueView';

let currentMphView: MphVueViewProvider | undefined;

export function activate(context: ExtensionContext) {
  console.log('Congratulations, your extension "mph-vue" is now active!');
  
  // 初始化@tomjs/vscode扩展工具
  initExtension(context);

  // 注册MPH组件分析的Vue webview view provider
  const mphVueViewProvider = new MphVueViewProvider(context);
  currentMphView = mphVueViewProvider;
  context.subscriptions.push(
    window.registerWebviewViewProvider(MphVueViewProvider.viewType, mphVueViewProvider)
  );

  // MPH 相关命令
  context.subscriptions.push(
    commands.registerCommand('mph.helloWorld', () => {
      window.showInformationMessage('Hello World from MPH Vue!');
    })
  );

  context.subscriptions.push(
    commands.registerCommand('mph.openPanel', () => {
      commands.executeCommand('workbench.view.extension.mph-explorer');
    })
  );

  context.subscriptions.push(
    commands.registerCommand('mph.refresh', () => {
      if (currentMphView) {
        currentMphView.updateWebview();
      }
    })
  );
}

export function deactivate() {}
