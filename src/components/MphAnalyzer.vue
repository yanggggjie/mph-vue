<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
  console.log('vscodeApi', vscodeApi)
  console.log('🔄 开始请求刷新...');
  console.log('📤 发送消息到扩展: type=refresh, data={}');
  
  try {
    vscodeApi.post('refresh', {});
    console.log('✅ 消息发送成功');
  } catch (error) {
    console.error('❌ 消息发送失败:', error);
  }
}

// 监听来自扩展的消息
vscodeApi.on('refresh', (data: any) => {
  console.log('🎉 Vue组件收到消息:', data);
  console.log('📊 消息类型:', typeof data);
  console.log('📦 消息结构:', JSON.stringify(data, null, 2));
  
  // @tomjs/vscode-webview 的 on() 监听器接收的是直接的数据对象
  // 不需要检查 data.data，直接检查 data.fileInfo 和 data.componentUsages
  if (data && (data.fileInfo !== undefined || data.componentUsages !== undefined)) {
    console.log('✅ 数据结构正确，开始更新状态');
    console.log('📄 fileInfo:', data.fileInfo);
    console.log('🧩 componentUsages:', data.componentUsages);
    
    fileInfo.value = data.fileInfo;
    componentUsages.value = data.componentUsages || [];
    lastUpdated.value = new Date().toLocaleTimeString();
    
    console.log('🔄 状态更新完成:');
    console.log('   📄 fileInfo.value:', fileInfo.value);
    console.log('   🧩 componentUsages.value:', componentUsages.value);
    console.log('   ⏰ lastUpdated.value:', lastUpdated.value);
  } else {
    console.log('❌ 数据结构不正确或为空');
    console.log('   data 存在:', !!data);
    console.log('   data.fileInfo 存在:', !!(data && data.fileInfo !== undefined));
    console.log('   data.componentUsages 存在:', !!(data && data.componentUsages !== undefined));
  }
  isLoading.value = false;
  console.log('✅ isLoading 设置为 false');
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

// 组件挂载时初始化（仅显示初始状态，不自动刷新）
onMounted(() => {
  console.log('MphAnalyzer mounted, window.__MPH_INIT__:', (window as any).__MPH_INIT__);
  console.log('🔧 手动刷新模式已启用，请点击刷新按钮获取数据');
  // 不再自动刷新，需要用户手动点击刷新按钮
  // refreshComponentInfo();
});
</script>

<template>
  <div class="p-4 h-full overflow-y-auto font-sans bg-[var(--vscode-editor-background)]">
    <!-- 刷新按钮 -->
    <div class="mb-6">
      <button 
        @click="refreshComponentInfo"
        :disabled="isLoading"
        title="手动刷新模式：点击获取当前文件的组件使用情况"
        class="w-full px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        :class="isLoading 
          ? 'bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] cursor-not-allowed opacity-70' 
          : 'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] active:scale-[0.98]'"
      >
        <span class="text-base" :class="isLoading ? 'animate-spin' : ''">
          {{ isLoading ? '⏳' : '🔄' }}
        </span>
        <span>{{ isLoading ? '正在分析组件...' : '手动刷新分析' }}</span>
      </button>
    </div>

    <!-- 文件信息 -->
    <div v-if="fileInfo" class="bg-gradient-to-r from-[var(--vscode-editor-inactiveSelectionBackground)] to-[var(--vscode-editor-background)] p-4 rounded-xl border border-[var(--vscode-panel-border)] mb-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div class="font-bold text-lg mb-2 text-[var(--vscode-textLink-foreground)] flex items-center gap-2">
        <span class="text-xl">📄</span> 
        <span>{{ fileInfo.fileName }}</span>
      </div>
      <div 
        class="font-mono text-sm text-[var(--vscode-descriptionForeground)] break-all cursor-pointer px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)] hover:scale-[1.02] flex items-center gap-2"
        @click="openCurrentFile(fileInfo.absolutePath)"
        :title="fileInfo.absolutePath"
      >
        <span class="text-base">📁</span> 
        <span>{{ fileInfo.relativePath }}</span>
      </div>
    </div>

    <!-- 组件使用情况 -->
    <div class="mb-6">
      <div class="text-lg font-bold text-[var(--vscode-textLink-foreground)] mb-4 pb-3 border-b-2 border-[var(--vscode-textLink-foreground)] flex items-center gap-2">
        <span class="text-xl">🔍</span> 
        <span>组件使用情况</span>
        <span class="bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] px-2 py-1 rounded-full text-sm font-medium">
          {{ usageCount }}
        </span>
      </div>
      
      <!-- 有使用情况时 -->
      <div v-if="hasUsages" class="flex flex-col gap-5">
        <div 
          v-for="usage in componentUsages" 
          :key="usage.usedInFile" 
          class="bg-gradient-to-br from-[var(--vscode-editor-background)] to-[var(--vscode-editor-inactiveSelectionBackground)] border border-[var(--vscode-panel-border)] p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        >
          <div class="font-bold text-lg text-[var(--vscode-textLink-foreground)] mb-3 flex items-center gap-2">
            <span class="text-xl">🧩</span> 
            <span>{{ extractComponentName(usage.relativeFilePath) }}</span>
          </div>
          
          <div 
            class="text-sm mb-3 break-all text-[var(--vscode-textPreformat-foreground)] bg-[var(--vscode-textBlockQuote-background)] px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)] hover:scale-[1.01] flex items-center gap-2"
            @click="openReferenceFile(usage.usedInFile, usage.componentName, usage.referencePath)"
            :title="usage.referencePath"
          >
            <span class="text-base">🔗</span> 
            <span class="font-medium">引用链接:</span>
            <span class="font-mono">{{ usage.referencePath }}</span>
          </div>
          
          <div 
            class="text-sm mb-4 text-[var(--vscode-descriptionForeground)] cursor-pointer px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--vscode-list-hoverBackground)] hover:text-[var(--vscode-textLink-foreground)] hover:scale-[1.01] flex items-center gap-2"
            @click="openFile(usage.wxmlFilePath)"
            :title="usage.wxmlFilePath"
          >
            <span class="text-base">📄</span> 
            <span class="font-medium">使用于:</span>
            <span class="font-mono">{{ usage.wxmlRelativePath }}</span>
          </div>
          
          <div class="flex flex-wrap gap-2 mt-3">
            <button 
              v-for="pos in usage.positions" 
              :key="`${pos.line}-${pos.column}`"
              @click="openFileAtPosition(usage.wxmlFilePath, pos.line, pos.column)"
              class="bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1.5 shadow-sm hover:shadow-md"
            >
              <span class="text-sm">📍</span> 
              <span>{{ pos.line }}:{{ pos.column }}</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 无使用情况时 -->
      <div v-else-if="fileInfo && fileInfo.isValidType" class="text-center p-10 text-[var(--vscode-descriptionForeground)] bg-gradient-to-br from-[var(--vscode-editor-inactiveSelectionBackground)] to-[var(--vscode-editor-background)] rounded-xl border border-[var(--vscode-panel-border)] shadow-lg">
        <div class="text-4xl mb-4">🔍</div>
        <div class="text-lg font-medium mb-2">未找到使用情况</div>
        <div class="text-sm opacity-80">此组件暂未被其他文件引用</div>
      </div>
      
      <!-- 文件类型不支持时 -->
      <div v-else-if="fileInfo && fileInfo.isValidType === false" class="text-center p-10 bg-gradient-to-br from-[var(--vscode-inputValidation-warningBackground)] to-[var(--vscode-editor-background)] border-2 border-[var(--vscode-inputValidation-warningBorder)] rounded-xl text-[var(--vscode-inputValidation-warningForeground)] shadow-lg">
        <div class="text-4xl mb-4">⚠️</div>
        <div class="text-lg font-medium mb-2">文件类型不支持</div>
        <div class="text-sm opacity-90">
          当前文件类型不支持组件分析<br>
          请打开微信小程序相关文件<br>
          <span class="font-mono bg-black bg-opacity-20 px-2 py-1 rounded mt-2 inline-block">
            .json, .js, .ts, .wxml, .wxss
          </span>
        </div>
      </div>
      
      <!-- 无文件时 -->
      <div v-else class="text-center py-16 text-[var(--vscode-descriptionForeground)]">
        <div class="text-5xl mb-4">📂</div>
        <div class="text-lg font-medium mb-2">暂无激活文件</div>
        <div class="text-sm opacity-80 mb-4">
          请打开一个微信小程序文件后点击刷新按钮
        </div>
        <div class="text-xs bg-[var(--vscode-editor-inactiveSelectionBackground)] px-3 py-2 rounded-lg inline-block">
          <span class="opacity-60">🔧 手动刷新模式：</span>需要手动点击刷新按钮获取数据
        </div>
      </div>
    </div>

    <!-- 最后更新时间 -->
    <div v-if="lastUpdated" class="mt-6 text-xs text-[var(--vscode-descriptionForeground)] text-center bg-[var(--vscode-editor-inactiveSelectionBackground)] px-4 py-2 rounded-lg">
      <span class="opacity-60">最后更新:</span> 
      <span class="font-mono">{{ lastUpdated }}</span>
    </div>
  </div>
</template>