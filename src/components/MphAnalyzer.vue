<script setup lang="ts">
import { allComponents, provideVSCodeDesignSystem } from '@vscode/webview-ui-toolkit';
import { ref, computed, onMounted } from 'vue';
import { vscodeApi } from '../utils';

// 注册VSCode组件
provideVSCodeDesignSystem().register(allComponents);

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

// 响应式状态
const fileInfo = ref<FileInfo | null>(null);
const componentUsages = ref<ComponentUsage[]>([]);
const isLoading = ref(false);
const lastUpdated = ref('');

// 计算属性
const hasUsages = computed(() => componentUsages.value.length > 0);
const usageCount = computed(() => componentUsages.value.length);

// 刷新组件信息
function refreshComponentInfo() {
  isLoading.value = true;
  console.log('Requesting refresh...');
  vscodeApi.post('refresh', {});
}

// 监听来自扩展的消息
vscodeApi.on('refresh', (data: any) => {
  console.log('Received refresh response:', data);
  if (data && data.data) {
    fileInfo.value = data.data.fileInfo;
    componentUsages.value = data.data.componentUsages || [];
    lastUpdated.value = new Date().toLocaleTimeString();
  } else {
    console.log('No data received, fileInfo will be null');
  }
  isLoading.value = false;
});

// 打开文件
function openFile(filePath: string) {
  vscodeApi.post('openFile', { filePath });
}

// 打开当前文件
function openCurrentFile(filePath: string) {
  vscodeApi.post('openCurrentFile', { filePath });
}

// 打开文件并跳转到指定位置
function openFileAtPosition(filePath: string, line: number, column: number) {
  vscodeApi.post('openFileAtPosition', { filePath, line, column });
}

// 打开引用文件
function openReferenceFile(currentJsonPath: string, componentName: string, referencePath: string) {
  vscodeApi.post('openReferenceFile', { currentJsonPath, componentName, referencePath });
}

// 从文件路径中提取组件名称
function extractComponentName(relativeFilePath: string): string {
  const pathParts = relativeFilePath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  return fileName.replace('.json', '');
}

// 组件挂载时初始化
onMounted(() => {
  console.log('MphAnalyzer mounted, window.__MPH_INIT__:', (window as any).__MPH_INIT__);
  refreshComponentInfo();
});
</script>

<template>
  <div class="mph-analyzer">
    <!-- 刷新按钮 -->
    <div class="refresh-section">
      <vscode-button 
        :disabled="isLoading" 
        @click="refreshComponentInfo"
        class="refresh-btn"
      >
        <span v-if="isLoading">🔄 刷新中...</span>
        <span v-else>🔄 刷新组件信息</span>
      </vscode-button>
    </div>

    <!-- 文件信息 -->
    <div v-if="fileInfo" class="file-info">
      <div class="file-name">📄 {{ fileInfo.fileName }}</div>
      <div 
        class="file-path clickable" 
        @click="openCurrentFile(fileInfo.absolutePath)"
        :title="fileInfo.absolutePath"
      >
        📁 {{ fileInfo.relativePath }}
      </div>
    </div>

    <!-- 组件使用情况 -->
    <div class="usage-section">
      <div class="usage-title">
        🔍 组件使用情况 ({{ usageCount }})
      </div>
      
      <!-- 有使用情况时 -->
      <div v-if="hasUsages" class="usage-list">
        <div 
          v-for="usage in componentUsages" 
          :key="usage.usedInFile" 
          class="usage-item"
        >
          <div class="component-name">
            🧩 {{ extractComponentName(usage.relativeFilePath) }}
          </div>
          
          <div 
            class="reference-path clickable"
            @click="openReferenceFile(usage.usedInFile, usage.componentName, usage.referencePath)"
            :title="usage.referencePath"
          >
            🔗 引用链接: {{ usage.referencePath }}
          </div>
          
          <div 
            class="used-in-file clickable"
            @click="openFile(usage.wxmlFilePath)"
            :title="usage.wxmlFilePath"
          >
            📄 使用于: {{ usage.wxmlRelativePath }}
          </div>
          
          <div class="positions">
            <vscode-button 
              v-for="pos in usage.positions" 
              :key="`${pos.line}-${pos.column}`"
              size="small"
              appearance="secondary"
              @click="openFileAtPosition(usage.wxmlFilePath, pos.line, pos.column)"
              class="position-btn"
            >
              📃 line:{{ pos.line }} col:{{ pos.column }}
            </vscode-button>
          </div>
        </div>
      </div>
      
      <!-- 无使用情况时 -->
      <div v-else-if="fileInfo && fileInfo.isValidType" class="no-usage">
        <div class="no-usage-text">未找到此组件的使用情况</div>
      </div>
      
      <!-- 文件类型不支持时 -->
      <div v-else-if="fileInfo && fileInfo.isValidType === false" class="no-support">
        <div class="no-support-text">
          当前文件类型不支持组件分析<br>
          请打开微信小程序相关文件 (.json, .js, .ts, .wxml, .wxss)
        </div>
      </div>
      
      <!-- 无文件时 -->
      <div v-else class="no-file">
        <div class="no-file-text">
          暂无激活的文件<br>
          请打开一个文件后点击刷新
        </div>
      </div>
    </div>

    <!-- 最后更新时间 -->
    <div v-if="lastUpdated" class="time">
      最后更新: {{ lastUpdated }}
    </div>
  </div>
</template>

<style scoped>
.mph-analyzer {
  padding: 16px;
  font-family: var(--vscode-font-family);
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  height: 100%;
  overflow-y: auto;
}

.refresh-section {
  margin-bottom: 16px;
}

.refresh-btn {
  width: 100%;
}

.file-info {
  background-color: var(--vscode-editor-inactiveSelectionBackground);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  border-left: 3px solid var(--vscode-textLink-foreground);
}

.file-name {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 6px;
  color: var(--vscode-textLink-foreground);
}

.file-path {
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  word-break: break-all;
}

.clickable {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.clickable:hover {
  background-color: var(--vscode-list-hoverBackground);
  color: var(--vscode-textLink-foreground);
}

.usage-section {
  margin-bottom: 16px;
}

.usage-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--vscode-textLink-foreground);
  margin-bottom: 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
  padding-bottom: 6px;
}

.usage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-item {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  padding: 12px;
  border-radius: 4px;
}

.component-name {
  font-weight: bold;
  font-size: 14px;
  color: var(--vscode-textLink-foreground);
  margin-bottom: 8px;
}

.reference-path, .used-in-file {
  font-size: 12px;
  margin-bottom: 6px;
  word-break: break-all;
}

.reference-path {
  color: var(--vscode-textPreformat-foreground);
  background-color: var(--vscode-textBlockQuote-background);
  padding: 4px 6px;
  border-radius: 3px;
}

.used-in-file {
  color: var(--vscode-descriptionForeground);
}

.positions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.position-btn {
  font-size: 11px;
}

.no-usage, .no-support, .no-file {
  text-align: center;
  padding: 24px;
  color: var(--vscode-descriptionForeground);
  font-style: italic;
}

.no-usage {
  background-color: var(--vscode-editor-inactiveSelectionBackground);
  border-radius: 4px;
}

.no-support {
  background-color: var(--vscode-inputValidation-warningBackground);
  border: 1px solid var(--vscode-inputValidation-warningBorder);
  border-radius: 4px;
  color: var(--vscode-inputValidation-warningForeground);
}

.no-file {
  padding: 40px;
}

.time {
  margin-top: 16px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-align: center;
}
</style>