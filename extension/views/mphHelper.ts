import type { Disposable, ExtensionContext, Webview } from 'vscode';
import { window, workspace, Position, Range, Selection, TextEditorRevealType } from 'vscode';
import { useLogger, useActiveTextEditor, useEvent } from 'reactive-vscode';
import { findComponentUsages } from '../find-usage';
import * as path from 'path';
import * as fs from 'fs';

// 创建全局 logger
const logger = useLogger('MPH Helper');

// 设置 HTML 内容
export function setupHtml(webview: Webview, context: ExtensionContext): string {
  logger.info('🌐 设置 HTML 内容');
  try {
    const html = __getWebviewHtml__({
      serverUrl: process.env.VITE_DEV_SERVER_URL,
      webview,
      context,
      injectCode: `<script>window.__MPH_INIT__=true;</script>`,
    });
    logger.info('✅ HTML 内容生成成功，长度:', html.length);
    return html;
  } catch (error) {
    logger.error('❌ HTML 生成失败:', error);
    throw error;
  }
}

// 监听活动编辑器变化并自动刷新
export function setupActiveEditorListener(webview: Webview, disposables: Disposable[]): void {
  logger.info('👁️ 设置活动编辑器监听器');
  
  const addListener = useEvent(window.onDidChangeActiveTextEditor);
  addListener((editor) => {
    logger.info('📝 Active editor changed:', editor ? 'exists' : 'null');
    if (editor) {
      // 延迟一点时间确保编辑器完全激活
      setTimeout(() => {
        handleRefresh(webview, {});
      }, 100);
    }
  }, null, disposables);
  
  logger.info('✅ 活动编辑器监听器设置完成');
}

// 设置 webview 消息钩子
export function setupWebviewHooks(webview: Webview, disposables: Disposable[]): void {
  logger.info('🔗 设置 webview 消息钩子');
  
  const addListener = useEvent(webview.onDidReceiveMessage);
  addListener((message: any) => {
    const type = message.type;
    const data = message.data;
    logger.info(`📨 MPH received message type: ${type}`, data);
    
    switch (type) {
      case 'refresh':
        handleRefresh(webview, data);
        break;
      case 'openFile':
        openFile(data.filePath);
        break;
      case 'openCurrentFile':
        openFile(data.filePath);
        break;
      case 'openFileAtPosition':
        openFileAtPosition(data.filePath, data.line, data.column);
        break;
      case 'openReferenceFile':
        openReferenceFile(data.currentJsonPath, data.componentName, data.referencePath);
        break;
      default:
        logger.warn('❓ Unknown message type:', type);
    }
  }, null, disposables);
  
  logger.info('✅ webview 消息钩子设置完成');
}

// 处理刷新逻辑
function handleRefresh(webview: Webview, data: any): void {
  try {
    logger.info('🔄 handleRefresh called');
    const fileInfo = getCurrentFileInfo();
    
    // 只对有效的文件类型进行组件分析
    const componentUsages = (fileInfo && fileInfo.isValidType) 
      ? getComponentUsages() 
      : [];
    
    // 发送数据回Vue组件
    webview.postMessage({
      type: 'refresh',
      data: {
        fileInfo,
        componentUsages
      }
    });

    logger.info('📤 Data sent to webview, fileInfo:', fileInfo ? 'exists' : 'null');
    
    if (fileInfo && !fileInfo.isValidType) {
      window.showInformationMessage('当前文件类型不支持组件分析');
    } else {
      window.showInformationMessage('组件信息已更新！');
    }
  } catch (error) {
    logger.error('❌ 刷新组件信息失败:', error);
    window.showErrorMessage('刷新组件信息失败');
  }
}

// 获取当前激活文件的信息
function getCurrentFileInfo() {
  const activeEditor = window.activeTextEditor;
  logger.info('📄 获取当前文件信息, activeEditor:', activeEditor ? 'exists' : 'null');
  
  if (activeEditor) {
    const fileName = path.basename(activeEditor.document.fileName);
    const relativePath = workspace.asRelativePath(activeEditor.document.fileName);
    const directory = path.dirname(relativePath);
    const absolutePath = activeEditor.document.fileName;
    
    logger.info('📁 Current file:', fileName);
    
    // 检查是否是微信小程序相关文件类型
    const validExtensions = ['.json', '.js', '.ts', '.wxml', '.wxss', '.scss'];
    const fileExtension = path.extname(fileName).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      logger.info('❌ File type not supported for component analysis:', fileExtension);
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
  
  logger.info('❌ No active editor found');
  return null;
}

// 获取组件使用情况
function getComponentUsages() {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && workspace.workspaceFolders) {
    const relativePath = workspace.asRelativePath(activeEditor.document.fileName);
    const workspaceRoot = workspace.workspaceFolders[0].uri.fsPath;
    
    try {
      logger.info('🔍 开始查找组件使用情况...');
      const usages = findComponentUsages(relativePath, workspaceRoot);
      logger.info('✅ 组件使用情况查找完成，找到', usages.length, '个结果');
      return usages;
    } catch (error) {
      logger.error('❌ 查找组件使用情况时出错:', error);
      return [];
    }
  }
  return [];
}

// 打开文件
function openFile(filePath: string): void {
  logger.info('📂 打开文件:', filePath);
  workspace.openTextDocument(filePath).then(doc => {
    window.showTextDocument(doc);
    logger.info('✅ 文件打开成功');
  }, (err: any) => {
    window.showErrorMessage(`无法打开文件: ${filePath}`);
    logger.error('❌ 打开文件失败:', err);
  });
}

// 打开文件并跳转到指定位置
function openFileAtPosition(filePath: string, line: number, column: number): void {
  if (filePath && line && column) {
    logger.info('📍 打开文件并跳转到位置:', filePath, `行:${line}, 列:${column}`);
    workspace.openTextDocument(filePath).then(doc => {
      window.showTextDocument(doc).then(editor => {
        // 跳转到指定位置（VSCode位置从0开始，所以需要减1）
        const position = new Position(line - 1, column - 1);
        editor.selection = new Selection(position, position);
        editor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
        logger.info('✅ 成功跳转到指定位置');
      });
    }, (err: any) => {
      window.showErrorMessage(`无法打开文件: ${filePath}`);
      logger.error('❌ 打开文件失败:', err);
    });
  }
}

// 打开使用者的JSON文件并跳转到组件声明位置
function openReferenceFile(currentJsonPath: string, componentName: string, referencePath: string): void {
  if (currentJsonPath && componentName) {
    try {
      logger.info('🔍 查找组件声明位置:', componentName, 'in', currentJsonPath);
      
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
            logger.info('✅ 成功跳转到组件声明位置:', `行:${foundLine}, 列:${foundColumn}`);
          } else {
            logger.warn('⚠️ 未找到组件声明位置');
          }
        });
      }, (err: any) => {
        window.showErrorMessage(`无法打开文件: ${currentJsonPath}`);
        logger.error('❌ 打开文件失败:', err);
      });
    } catch (error) {
      window.showErrorMessage(`查找组件声明失败: ${componentName}`);
      logger.error('❌ 查找组件声明失败:', error);
    }
  }
}

// 为了保持向后兼容，导出一个对象，模拟原来的类接口
export const MphWebviewHelper = {
  setupHtml,
  setupActiveEditorListener,
  setupWebviewHooks
};