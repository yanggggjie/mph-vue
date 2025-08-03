import { computed, createSingletonComposable, useWebviewView, useLogger, extensionContext, watchEffect } from 'reactive-vscode'
import { setupHtml, setupWebviewHooks, setupActiveEditorListener } from './mphHelper'

export const useMphWebviewView = createSingletonComposable(() => {
  const logger = useLogger('MPH WebView Provider')
  
  logger.info('🎯 初始化 MPH WebView 组合式函数')

  // 初始 HTML 内容（占位符）
  const html = computed(() => {
    logger.info('🌐 生成初始 HTML 内容')
    return '<html><body><h1>🚀 正在加载 MPH Vue...</h1></body></html>'
  })

  const { view, context, postMessage, forceRefresh } = useWebviewView(
    'mphView',
    html,
    {
      webviewOptions: computed(() => {
        logger.info('⚙️ 设置 webview options')
        return {
          enableScripts: true,
          localResourceRoots: extensionContext.value ? [extensionContext.value.extensionUri] : [],
        }
      }),
      title: 'MPH组件分析',
      // 移除这里的 onDidReceiveMessage，让 setupWebviewHooks 来处理所有消息
    },
  )

  // 监听 view 的创建并设置完整的功能
  const disposables: any[] = []
  
  watchEffect(() => {
    if (view.value && extensionContext.value) {
      logger.info('✅ WebView 已创建，开始设置功能')
      
      try {
        // 设置 HTML 内容
        const vueHtml = setupHtml(view.value.webview, extensionContext.value)
        view.value.webview.html = vueHtml
        logger.info('🎨 HTML 内容设置成功')
        
        
        // 设置消息处理钩子
        setupWebviewHooks(view.value.webview, disposables)
        logger.info('🔗 消息处理钩子设置完成')
        
        // 设置活动编辑器监听器
        setupActiveEditorListener(view.value.webview, disposables)
        logger.info('👁️ 活动编辑器监听器设置完成')
        
        logger.info('🎉 MPH WebView 完全初始化完成')
      } catch (error) {
        logger.error('❌ WebView 设置过程中出错:', error)
      }
    }
  })

  // 更新 webview 的函数
  function updateWebview() {
    logger.info('🔄 updateWebview 被调用')
    if (view.value) {
      // 不直接发送消息，而是触发 handleRefresh 来处理完整的数据获取和发送
      logger.info('🔄 通过 handleRefresh 处理数据刷新')
      // 导入并调用 handleRefresh
      const { handleRefreshExternal } = require('./mphHelper')
      handleRefreshExternal(view.value.webview)
    } else {
      logger.warn('⚠️ WebView 未初始化，无法刷新')
    }
  }

  return { 
    view, 
    context, 
    postMessage, 
    forceRefresh, 
    updateWebview 
  }
})