import React, { useState, useEffect, useMemo } from 'react';
import { vscodeApi } from '../utils';

// 定义接口
interface ComponentPosition {
  line: number;
  column: number;
}

interface ComponentUsage {
  componentName: string;
  usedInFile: string;
  referencePath: string;
  relativeFilePath: string;
  wxmlFilePath: string;
  wxmlRelativePath: string;
  positions: ComponentPosition[];
}

interface FileInfo {
  fileName: string;
  relativePath: string;
  directory: string;
  absolutePath: string;
  isValidType?: boolean;
}

const MphAnalyzer: React.FC = () => {
  // 状态管理
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [componentUsages, setComponentUsages] = useState<ComponentUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // 计算属性
  const hasUsages = useMemo(() => componentUsages.length > 0, [componentUsages]);
  const usageCount = useMemo(() => componentUsages.length, [componentUsages]);

  // 刷新组件信息
  const refreshComponentInfo = () => {
    setIsLoading(true);
    console.log('vscodeApi', vscodeApi);
    console.log('🔄 开始请求刷新...');
    console.log('📤 发送消息到扩展: type=refresh, data={}');
    
    try {
      vscodeApi.post('refresh', {});
      console.log('✅ 消息发送成功');
    } catch (error) {
      console.error('❌ 消息发送失败:', error);
    }
  };

  // 打开文件
  const openFile = (filePath: string) => {
    vscodeApi.post('openFile', { filePath });
  };

  // 打开当前文件
  const openCurrentFile = (filePath: string) => {
    vscodeApi.post('openCurrentFile', { filePath });
  };

  // 打开文件并跳转到指定位置
  const openFileAtPosition = (filePath: string, line: number, column: number) => {
    vscodeApi.post('openFileAtPosition', { filePath, line, column });
  };

  // 打开引用文件
  const openReferenceFile = (currentJsonPath: string, componentName: string, referencePath: string) => {
    vscodeApi.post('openReferenceFile', { currentJsonPath, componentName, referencePath });
  };

  // 从文件路径中提取组件名称
  const extractComponentName = (relativeFilePath: string): string => {
    const pathParts = relativeFilePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return fileName.replace('.json', '');
  };

  // 组件挂载时初始化
  useEffect(() => {
    console.log('MphAnalyzer mounted, window.__MPH_INIT__:', (window as any).__MPH_INIT__);
    console.log('🔧 手动刷新模式已启用，请点击刷新按钮获取数据');
    
    // 监听来自扩展的消息
    const handleMessage = (data: any) => {
      console.log('🎉 React组件收到消息:', data);
      console.log('📊 消息类型:', typeof data);
      console.log('📦 消息结构:', JSON.stringify(data, null, 2));
      
      // @tomjs/vscode-webview 的 on() 监听器接收的是直接的数据对象
      // 不需要检查 data.data，直接检查 data.fileInfo 和 data.componentUsages
      if (data && (data.fileInfo !== undefined || data.componentUsages !== undefined)) {
        console.log('✅ 数据结构正确，开始更新状态');
        console.log('📄 fileInfo:', data.fileInfo);
        console.log('🧩 componentUsages:', data.componentUsages);
        
        setFileInfo(data.fileInfo);
        setComponentUsages(data.componentUsages || []);
        setLastUpdated(new Date().toLocaleTimeString());
        
        console.log('🔄 状态更新完成:');
        console.log('   📄 fileInfo:', data.fileInfo);
        console.log('   🧩 componentUsages:', data.componentUsages || []);
        console.log('   ⏰ lastUpdated:', new Date().toLocaleTimeString());
      } else {
        console.log('❌ 数据结构不正确或为空');
        console.log('   data 存在:', !!data);
        console.log('   data.fileInfo 存在:', !!(data && data.fileInfo !== undefined));
        console.log('   data.componentUsages 存在:', !!(data && data.componentUsages !== undefined));
      }
      setIsLoading(false);
      console.log('✅ isLoading 设置为 false');
    };

    vscodeApi.on('refresh', handleMessage);

    // 清理函数
    return () => {
      // vscodeApi.off('refresh', handleMessage); // 如果有off方法的话
    };
  }, []);

  return (
    <div className="p-4 h-full overflow-y-auto font-sans bg-[var(--vscode-editor-background)]">
      {/* 刷新按钮 */}
      <div className="mb-6">
        <button 
          onClick={refreshComponentInfo}
          disabled={isLoading}
          title="手动刷新模式：点击获取当前文件的组件使用情况"
          className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md ${
            isLoading 
              ? 'bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] cursor-not-allowed opacity-70' 
              : 'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] active:scale-[0.98]'
          }`}
        >
          <span className={`text-base ${isLoading ? 'animate-spin' : ''}`}>
            {isLoading ? '⏳' : '🔄'}
          </span>
          <span>{isLoading ? '正在分析组件...' : '手动刷新分析'}</span>
        </button>
      </div>

      {/* 文件信息 */}
      {fileInfo && (
        <div className="bg-gradient-to-r from-[var(--vscode-editor-inactiveSelectionBackground)] to-[var(--vscode-editor-background)] p-4 rounded-xl border border-[var(--vscode-panel-border)] mb-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="font-bold text-lg mb-2 text-[var(--vscode-textLink-foreground)] flex items-center gap-2">
            <span className="text-xl">📄</span> 
            <span>{fileInfo.fileName}</span>
          </div>
          <div 
            className="font-mono text-sm text-[var(--vscode-descriptionForeground)] break-all cursor-pointer px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)] hover:scale-[1.02] flex items-center gap-2"
            onClick={() => openCurrentFile(fileInfo.absolutePath)}
            title={fileInfo.absolutePath}
          >
            <span className="text-base">📁</span> 
            <span>{fileInfo.relativePath}</span>
          </div>
        </div>
      )}

      {/* 组件使用情况 */}
      <div className="mb-6">
        <div className="text-lg font-bold text-[var(--vscode-textLink-foreground)] mb-4 pb-3 border-b-2 border-[var(--vscode-textLink-foreground)] flex items-center gap-2">
          <span className="text-xl">🔍</span> 
          <span>组件使用情况</span>
          <span className="bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] px-2 py-1 rounded-full text-sm font-medium">
            {usageCount}
          </span>
        </div>
        
        {/* 有使用情况时 */}
        {hasUsages && (
          <div className="flex flex-col gap-5">
            {componentUsages.map((usage) => (
              <div 
                key={usage.usedInFile}
                className="bg-gradient-to-br from-[var(--vscode-editor-background)] to-[var(--vscode-editor-inactiveSelectionBackground)] border border-[var(--vscode-panel-border)] p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="font-bold text-lg text-[var(--vscode-textLink-foreground)] mb-3 flex items-center gap-2">
                  <span className="text-xl">🧩</span> 
                  <span>{extractComponentName(usage.relativeFilePath)}</span>
                </div>
                
                <div 
                  className="text-sm mb-3 break-all text-[var(--vscode-textPreformat-foreground)] bg-[var(--vscode-textBlockQuote-background)] px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)] hover:scale-[1.01] flex items-center gap-2"
                  onClick={() => openReferenceFile(usage.usedInFile, usage.componentName, usage.referencePath)}
                  title={usage.referencePath}
                >
                  <span className="text-base">🔗</span> 
                  <span className="font-medium">引用链接:</span>
                  <span className="font-mono">{usage.referencePath}</span>
                </div>
                
                <div 
                  className="text-sm mb-4 text-[var(--vscode-descriptionForeground)] cursor-pointer px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)] hover:scale-[1.01] flex items-center gap-2"
                  onClick={() => openFile(usage.wxmlFilePath)}
                  title={usage.wxmlFilePath}
                >
                  <span className="text-base">📄</span> 
                  <span className="font-medium">使用于:</span>
                  <span className="font-mono">{usage.wxmlRelativePath}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {usage.positions.map((pos) => (
                    <button 
                      key={`${pos.line}-${pos.column}`}
                      onClick={() => openFileAtPosition(usage.wxmlFilePath, pos.line, pos.column)}
                      className="bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                    >
                      <span className="text-sm">📍</span> 
                      <span>{pos.line}:{pos.column}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 无使用情况时 */}
        {!hasUsages && fileInfo && fileInfo.isValidType && (
          <div className="text-center p-10 text-[var(--vscode-descriptionForeground)] bg-gradient-to-br from-[var(--vscode-editor-inactiveSelectionBackground)] to-[var(--vscode-editor-background)] rounded-xl border border-[var(--vscode-panel-border)] shadow-lg">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-lg font-medium mb-2">未找到使用情况</div>
            <div className="text-sm opacity-80">此组件暂未被其他文件引用</div>
          </div>
        )}
        
        {/* 文件类型不支持时 */}
        {fileInfo && fileInfo.isValidType === false && (
          <div className="text-center p-10 bg-gradient-to-br from-[var(--vscode-inputValidation-warningBackground)] to-[var(--vscode-editor-background)] border-2 border-[var(--vscode-inputValidation-warningBorder)] rounded-xl text-[var(--vscode-inputValidation-warningForeground)] shadow-lg">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg font-medium mb-2">文件类型不支持</div>
            <div className="text-sm opacity-90">
              当前文件类型不支持组件分析<br />
              请打开微信小程序相关文件<br />
              <span className="font-mono bg-black bg-opacity-20 px-2 py-1 rounded mt-2 inline-block">
                .json, .js, .ts, .wxml, .wxss
              </span>
            </div>
          </div>
        )}
        
        {/* 无文件时 */}
        {!fileInfo && (
          <div className="text-center py-16 text-[var(--vscode-descriptionForeground)]">
            <div className="text-5xl mb-4">📂</div>
            <div className="text-lg font-medium mb-2">暂无激活文件</div>
            <div className="text-sm opacity-80 mb-4">
              请打开一个微信小程序文件后点击刷新按钮
            </div>
            <div className="text-xs bg-[var(--vscode-editor-inactiveSelectionBackground)] px-3 py-2 rounded-lg inline-block">
              <span className="opacity-60">🔧 手动刷新模式：</span>需要手动点击刷新按钮获取数据
            </div>
          </div>
        )}
      </div>

      {/* 最后更新时间 */}
      {lastUpdated && (
        <div className="mt-6 text-xs text-[var(--vscode-descriptionForeground)] text-center bg-[var(--vscode-editor-inactiveSelectionBackground)] px-4 py-2 rounded-lg">
          <span className="opacity-60">最后更新:</span> 
          <span className="font-mono">{lastUpdated}</span>
        </div>
      )}
    </div>
  );
};

export default MphAnalyzer;
