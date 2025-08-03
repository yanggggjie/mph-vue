import { createApp } from 'vue';
import App from './App.vue';

// 添加全局的 webview 消息监听调试
console.log('🚀 Vue 应用开始初始化');

// 检查 vscode API 是否可用
if (typeof acquireVsCodeApi !== 'undefined') {
  console.log('✅ VSCode API 可用');
  
  // 添加原生的消息监听器来调试
  window.addEventListener('message', (event) => {
    console.log('🎯 原生消息监听器收到消息:', event);
    console.log('   📦 消息数据:', event.data);
    console.log('   🌐 来源:', event.origin);
  });
} else {
  console.warn('❌ VSCode API 不可用');
}

createApp(App).mount('#app');
console.log('✅ Vue 应用挂载完成');
