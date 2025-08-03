import { defineExtension, useCommand, useLogger } from 'reactive-vscode'
import { window, commands } from 'vscode'
import { useMphWebviewView } from './views/mphWebviewView'
export const logger = useLogger('MPH Vue')

const {activate,deactivate} = defineExtension((context) => {

  logger.info('🚀 MPH Vue 扩展开始激活!')
  logger.info('Extension context path:', context.extensionPath)
  logger.show()

  // 注册MPH组件分析的Vue webview view
  logger.info('📝 开始初始化 WebView...')
  const { updateWebview } = useMphWebviewView()
  logger.info('✅ WebView 初始化完成')

  // MPH 相关命令
  logger.info('⚡ 开始注册命令...')
  
  useCommand('mph.helloWorld', () => {
    window.showInformationMessage('Hello World from MPH Vue!')
    logger.info('👋 执行了 Hello World 命令')
  })

  useCommand('mph.openPanel', () => {
    commands.executeCommand('workbench.view.extension.mph-explorer')
    logger.info('📂 打开了 MPH 面板')
  })

  useCommand('mph.refresh', () => {
    logger.info('🔄 开始刷新 MPH 视图...')
    updateWebview()
    logger.info('✅ 刷新了 MPH 视图')
  })

  logger.info('🎉 MPH Vue 扩展激活完成!')
})

export { activate, deactivate }