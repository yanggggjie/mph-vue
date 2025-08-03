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
  <div class="p-4 h-full overflow-y-auto font-sans text-[var(--vscode-foreground)] bg-[var(--vscode-editor-background)]">
    <!-- 刷新按钮 -->
    <div class="mb-4">
      <vscode-button 
        :disabled="isLoading" 
        @click="refreshComponentInfo"
        class="w-full"
      >
        <span v-if="isLoading">🔄 刷新中...</span>
        <span v-else>🔄 刷新组件信息</span>
      </vscode-button>
    </div>

    <!-- 文件信息 -->
    <div v-if="fileInfo" class="bg-[var(--vscode-editor-inactiveSelectionBackground)] p-3 rounded-lg border-l-4 border-[var(--vscode-textLink-foreground)] mb-4 shadow-sm">
      <div class="font-bold text-base mb-1.5 text-[var(--vscode-textLink-foreground)] flex items-center gap-1">
        <span>📄</span> {{ fileInfo.fileName }}
      </div>
      <div 
        class="font-mono text-xs text-[var(--vscode-descriptionForeground)] break-all cursor-pointer px-1 py-0.5 rounded transition-colors duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)]"
        @click="openCurrentFile(fileInfo.absolutePath)"
        :title="fileInfo.absolutePath"
      >
        <span>📁</span> {{ fileInfo.relativePath }}
      </div>
    </div>

    <!-- 组件使用情况 -->
    <div class="mb-4">
      <div class="text-base font-bold text-[var(--vscode-textLink-foreground)] mb-3 border-b border-[var(--vscode-panel-border)] pb-2 flex items-center gap-1">
        <span>🔍</span> 组件使用情况 ({{ usageCount }})
      </div>
      
      <!-- 有使用情况时 -->
      <div v-if="hasUsages" class="flex flex-col gap-4">
        <div 
          v-for="usage in componentUsages" 
          :key="usage.usedInFile" 
          class="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div class="font-bold text-base text-[var(--vscode-textLink-foreground)] mb-2 flex items-center gap-1">
            <span>🧩</span> {{ extractComponentName(usage.relativeFilePath) }}
          </div>
          
          <div 
            class="text-xs mb-1.5 break-all text-[var(--vscode-textPreformat-foreground)] bg-[var(--vscode-textBlockQuote-background)] px-2 py-1 rounded cursor-pointer transition-colors duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)]"
            @click="openReferenceFile(usage.usedInFile, usage.componentName, usage.referencePath)"
            :title="usage.referencePath"
          >
            <span>🔗</span> 引用链接: {{ usage.referencePath }}
          </div>
          
          <div 
            class="text-xs mb-1.5 text-[var(--vscode-descriptionForeground)] cursor-pointer px-1 py-0.5 rounded transition-colors duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)]"
            @click="openFile(usage.wxmlFilePath)"
            :title="usage.wxmlFilePath"
          >
            <span>📄</span> 使用于: {{ usage.wxmlRelativePath }}
          </div>
          
          <div class="flex flex-wrap gap-2 mt-2">
            <vscode-button 
              v-for="pos in usage.positions" 
              :key="`${pos.line}-${pos.column}`"
              size="small"
              appearance="secondary"
              @click="openFileAtPosition(usage.wxmlFilePath, pos.line, pos.column)"
              class="text-[11px]"
            >
              <span>📃</span> line:{{ pos.line }} col:{{ pos.column }}
            </vscode-button>
          </div>
        </div>
      </div>
      
      <!-- 无使用情况时 -->
      <div v-else-if="fileInfo && fileInfo.isValidType" class="text-center p-8 text-[var(--vscode-descriptionForeground)] italic bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded-lg">
        <div>未找到此组件的使用情况</div>
      </div>
      
      <!-- 文件类型不支持时 -->
      <div v-else-if="fileInfo && fileInfo.isValidType === false" class="text-center p-8 bg-[var(--vscode-inputValidation-warningBackground)] border border-[var(--vscode-inputValidation-warningBorder)] rounded-lg text-[var(--vscode-inputValidation-warningForeground)] italic">
        <div>
          当前文件类型不支持组件分析<br>
          请打开微信小程序相关文件 (.json, .js, .ts, .wxml, .wxss)
        </div>
      </div>
      
      <!-- 无文件时 -->
      <div v-else class="text-center py-12 text-[var(--vscode-descriptionForeground)] italic">
        <div>
          暂无激活的文件<br>
          请打开一个文件后点击刷新
        </div>
      </div>
    </div>

    <!-- 最后更新时间 -->
    <div v-if="lastUpdated" class="mt-4 text-[11px] text-[var(--vscode-descriptionForeground)] text-center">
      最后更新: {{ lastUpdated }}
    </div>
  </div>
</template>