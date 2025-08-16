import vscode from '@tomjs/vite-plugin-vscode';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(async () => {
  // 动态导入 ESM 包以在 CommonJS 环境中使用
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  
  return {
    plugins: [
      react(),
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
