import type { 
  Disposable, 
  ExtensionContext, 
  WebviewView, 
  WebviewViewProvider,
  WebviewViewResolveContext
} from 'vscode';
import { MphWebviewHelper } from './mphHelper';

export class MphVueViewProvider implements WebviewViewProvider {
  public static readonly viewType = 'mphView';
  private _view?: WebviewView;
  private _disposables: Disposable[] = [];
  private _context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this._context = context;
  }

  public resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    _token: any
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri]
    };

    // 使用MphWebviewHelper设置HTML和消息处理
    webviewView.webview.html = MphWebviewHelper.setupHtml(webviewView.webview, this._context);
    webviewView.title = 'MPH组件分析';

    // 设置消息处理
    MphWebviewHelper.setupWebviewHooks(webviewView.webview, this._disposables);
    
    // 设置activeEditor监听器
    MphWebviewHelper.setupActiveEditorListener(webviewView.webview, this._disposables);
  }

  // 更新webview
  public updateWebview() {
    if (this._view) {
      // 触发刷新
      this._view.webview.postMessage({ type: 'refresh', data: {} });
    }
  }

  public dispose() {
    // 清理所有disposables
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}