import vscode from '@tomjs/vite-plugin-vscode';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(async () => {
  // 动态导入 ESM 包以在 CommonJS 环境中使用
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  
  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag: string) => tag.startsWith('vscode-'),
          },
        },
      }),
      vscode({
        recommended: true,
        webview: {
          // csp: '<meta http-equiv="Content-Security-Policy" />',
        },
      }),
      tailwindcss(),
    ],
  };
});
