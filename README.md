# MPH Vue - 微信小程序组件使用情况查找器 (Vue版)

专为微信小程序开发者设计的VSCode扩展，基于Vue技术栈开发。快速查找组件在项目中的使用位置，支持精确定位到WXML文件的具体行列，提供一键跳转功能。

## 功能特性

### 🔍 组件使用情况分析
- 智能分析微信小程序组件的使用情况
- 精确定位组件在WXML文件中的使用位置（行列信息）
- 支持一键跳转到组件定义和使用位置

### 🎯 侧边栏面板
- 专用的MPH组件分析面板
- 实时显示当前文件的组件引用信息
- 直观的UI界面，便于快速导航

### ⚡ 快速操作
- 刷新组件信息
- 一键打开面板
- 命令面板集成

## 使用方法

1. **打开微信小程序项目**
2. **激活扩展**: 扩展会在打开JSON、JavaScript或TypeScript文件时自动激活
3. **查看组件分析**: 点击左侧活动栏的搜索图标打开MPH面板
4. **选择文件**: 打开任意组件文件（.json、.ts、.js、.wxml等）
5. **点击刷新**: 在面板中点击"刷新组件信息"按钮
6. **查看结果**: 面板将显示该组件在项目中的所有使用位置
7. **快速跳转**: 点击任意位置信息即可跳转到对应文件和行列

## 命令

- `MPH: Hello World` - 显示欢迎消息
- `MPH: 打开 MPH 面板` - 打开组件分析面板  
- `MPH: 刷新组件信息` - 刷新当前组件的使用情况

## 技术栈

- **前端**: Vue 3 + Vite + TypeScript
- **扩展框架**: VSCode Extension API
- **构建工具**: @tomjs/vite-plugin-vscode
- **UI组件**: VSCode Webview UI Toolkit
- **通信**: @tomjs/vscode-webview API

## 项目结构

```
mph-vue/
├── extension/              # 扩展后端逻辑
│   ├── index.ts           # 扩展入口点
│   ├── find-usage.ts      # 组件查找核心逻辑
│   └── views/
│       ├── mphVueView.ts  # MPH Vue组件分析面板
│       ├── mphView.ts     # 原始HTML面板（备用）
│       ├── sidebarView.ts # Vue示例面板
│       └── panel.ts       # 面板基础功能
├── src/                   # Vue前端源码
│   ├── components/
│   │   └── MphAnalyzer.vue # MPH组件分析Vue组件
│   ├── utils/
│   │   ├── index.ts       # 工具函数
│   │   └── vscode.ts      # VSCode API封装
│   ├── App.vue            # Vue应用入口
│   └── main.ts            # 前端入口点
├── package.json           # 项目配置
└── vite.config.ts         # Vite配置
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 运行扩展
# 按F5在VSCode中启动扩展开发主机
```

## 迁移说明

本项目是从原始的MPH项目迁移而来，保留了所有核心功能的同时，使用Vue 3重新设计了用户界面。主要改进包括：

- ✅ **完整功能迁移**: 保留原版所有组件使用情况分析功能
- ✅ **精确位置跳转**: 支持跳转到WXML文件的具体行列位置
- ✅ **Vue 3界面**: 使用Vue 3 + TypeScript开发现代化用户界面
- ✅ **VSCode UI组件**: 集成VSCode Webview UI Toolkit，保持界面一致性
- ✅ **响应式设计**: 响应式数据管理，实时更新组件信息
- ✅ **TypeScript支持**: 全面的类型安全和智能提示
- ✅ **HMR支持**: 开发时支持热模块替换，提升开发效率
- ✅ **ES模块支持**: 使用现代ES模块语法，更好的性能

### Vue界面特性

- **组件化设计**: 模块化的Vue组件，易于维护和扩展  
- **实时通信**: 前后端通过@tomjs/vscode-webview API实时通信
- **用户友好**: 直观的操作界面，点击即可跳转到目标位置
- **状态管理**: 响应式状态管理，自动更新界面数据

## 许可证

MIT License
