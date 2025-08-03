import type { Disposable, ExtensionContext, Webview } from 'vscode';
import { window, workspace, Position, Range, Selection, TextEditorRevealType } from 'vscode';
import { findComponentUsages } from '../find-usage';
import * as path from 'path';
import * as fs from 'fs';

export class MphWebviewHelper {
  public static setupHtml(webview: Webview, context: ExtensionContext) {
    return __getWebviewHtml__({
      serverUrl: process.env.VITE_DEV_SERVER_URL,
      webview,
      context,
      injectCode: `<script>window.__MPH_INIT__=true;</script>`,
    });
  }

  // 监听activeEditor变化并自动刷新
  public static setupActiveEditorListener(webview: Webview, disposables: Disposable[]) {
    window.onDidChangeActiveTextEditor((editor) => {
      console.log('Active editor changed:', editor ? 'exists' : 'null');
      if (editor) {
        // 延迟一点时间确保编辑器完全激活
        setTimeout(() => {
          MphWebviewHelper.handleRefresh(webview, {});
        }, 100);
      }
    }, null, disposables);
  }

  public static setupWebviewHooks(webview: Webview, disposables: Disposable[]) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const type = message.type;
        const data = message.data;
        console.log(`MPH received message type: ${type}`, data);
        
        switch (type) {
          case 'refresh':
            MphWebviewHelper.handleRefresh(webview, data);
            break;
          case 'openFile':
            MphWebviewHelper.openFile(data.filePath);
            break;
          case 'openCurrentFile':
            MphWebviewHelper.openFile(data.filePath);
            break;
          case 'openFileAtPosition':
            MphWebviewHelper.openFileAtPosition(data.filePath, data.line, data.column);
            break;
          case 'openReferenceFile':
            MphWebviewHelper.openReferenceFile(data.currentJsonPath, data.componentName, data.referencePath);
            break;
          default:
            console.log('Unknown message type:', type);
        }
      },
      undefined,
      disposables,
    );
  }

  private static handleRefresh(webview: Webview, data: any) {
    try {
      console.log('MPH: handleRefresh called');
      const fileInfo = MphWebviewHelper.getCurrentFileInfo();
      
      // 只对有效的文件类型进行组件分析
      const componentUsages = (fileInfo && fileInfo.isValidType) 
        ? MphWebviewHelper.getComponentUsages() 
        : [];
      
      // 发送数据回Vue组件
      webview.postMessage({
        type: 'refresh',
        data: {
          fileInfo,
          componentUsages
        }
      });

      console.log('MPH: Data sent to webview, fileInfo:', fileInfo ? 'exists' : 'null');
      
      if (fileInfo && !fileInfo.isValidType) {
        window.showInformationMessage('当前文件类型不支持组件分析');
      } else {
        window.showInformationMessage('组件信息已更新！');
      }
    } catch (error) {
      console.error('刷新组件信息失败:', error);
      window.showErrorMessage('刷新组件信息失败');
    }
  }

  // 获取当前激活文件的信息
  private static getCurrentFileInfo() {
    const activeEditor = window.activeTextEditor;
    console.log('MPH: activeEditor:', activeEditor ? 'exists' : 'null');
    if (activeEditor) {
      const fileName = path.basename(activeEditor.document.fileName);
      const relativePath = workspace.asRelativePath(activeEditor.document.fileName);
      const directory = path.dirname(relativePath);
      const absolutePath = activeEditor.document.fileName;
      
      console.log('MPH: Current file:', fileName);
      
      // 检查是否是微信小程序相关文件类型
      const validExtensions = ['.json', '.js', '.ts', '.wxml', '.wxss', '.scss'];
      const fileExtension = path.extname(fileName).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        console.log('MPH: File type not supported for component analysis:', fileExtension);
        return {
          fileName,
          relativePath,
          directory: directory === '.' ? '根目录' : directory,
          absolutePath,
          isValidType: false
        };
      }
      
      return {
        fileName,
        relativePath,
        directory: directory === '.' ? '根目录' : directory,
        absolutePath,
        isValidType: true
      };
    }
    console.log('MPH: No active editor found');
    return null;
  }

  // 获取组件使用情况
  private static getComponentUsages() {
    const activeEditor = window.activeTextEditor;
    if (activeEditor && workspace.workspaceFolders) {
      const relativePath = workspace.asRelativePath(activeEditor.document.fileName);
      const workspaceRoot = workspace.workspaceFolders[0].uri.fsPath;
      
      try {
        return findComponentUsages(relativePath, workspaceRoot);
      } catch (error) {
        console.error('查找组件使用情况时出错:', error);
        return [];
      }
    }
    return [];
  }

  // 打开文件
  private static openFile(filePath: string) {
    workspace.openTextDocument(filePath).then(doc => {
      window.showTextDocument(doc);
    }, (err: any) => {
      window.showErrorMessage(`无法打开文件: ${filePath}`);
      console.error('打开文件失败:', err);
    });
  }

  // 打开文件并跳转到指定位置
  private static openFileAtPosition(filePath: string, line: number, column: number) {
    if (filePath && line && column) {
      workspace.openTextDocument(filePath).then(doc => {
        window.showTextDocument(doc).then(editor => {
          // 跳转到指定位置（VSCode位置从0开始，所以需要减1）
          const position = new Position(line - 1, column - 1);
          editor.selection = new Selection(position, position);
          editor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
        });
      }, (err: any) => {
        window.showErrorMessage(`无法打开文件: ${filePath}`);
        console.error('打开文件失败:', err);
      });
    }
  }

  // 打开使用者的JSON文件并跳转到组件声明位置
  private static openReferenceFile(currentJsonPath: string, componentName: string, referencePath: string) {
    if (currentJsonPath && componentName) {
      try {
        // 查找组件在JSON文件中的声明位置
        const jsonContent = fs.readFileSync(currentJsonPath, 'utf8');
        const lines = jsonContent.split('\n');
        
        let foundLine = -1;
        let foundColumn = -1;
        
        // 在JSON文件中查找组件声明
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // 查找 "componentName": 的模式
          const regex = new RegExp(`"${componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`);
          const match = regex.exec(line);
          if (match) {
            foundLine = i + 1; // 行号从1开始
            foundColumn = match.index + 1; // 列号从1开始
            break;
          }
        }
        
        // 打开JSON文件
        workspace.openTextDocument(currentJsonPath).then(doc => {
          window.showTextDocument(doc).then(editor => {
            if (foundLine > 0 && foundColumn > 0) {
              // 跳转到找到的位置
              const position = new Position(foundLine - 1, foundColumn - 1);
              editor.selection = new Selection(position, position);
              editor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
            }
          });
        }, (err: any) => {
          window.showErrorMessage(`无法打开文件: ${currentJsonPath}`);
          console.error('打开文件失败:', err);
        });
      } catch (error) {
        window.showErrorMessage(`查找组件声明失败: ${componentName}`);
        console.error('查找组件声明失败:', error);
      }
    }
  }
}