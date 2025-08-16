// 增强的数据结构定义 - 支持精确行列定位

/**
 * 组件引用位置信息
 */
export interface ComponentReference {
  /** 引用的行号 (从1开始) */
  line: number;
  /** 引用的列号 (从1开始) */
  column: number;
}

/**
 * 组件依赖信息
 */
export interface ComponentDependency {
  /** 被引用组件的wxml文件路径 */
  path: string;
  /** 引用位置列表 (支持同一组件被多次引用) */
  referList: ComponentReference[];
}

/**
 * 增强的依赖邻接表
 * Key: wxml文件的完整路径
 * Value: 该文件引用的所有组件的详细信息
 */
export interface EnhancedDependencyGraph {
  [wxmlFilePath: string]: ComponentDependency[];
}

/**
 * 示例数据结构
 */
const exampleEnhancedDependencyGraph: EnhancedDependencyGraph = {
  "/subpackages/wxRecommend/pages/recommendDiscover/recommendDiscover.wxml": [
    {
      path: "/main/components/navigationBar/navigationBar.wxml",
      referList: [
        { line: 15, column: 8 },
        { line: 42, column: 12 }  // 同一组件被引用两次
      ]
    },
    {
      path: "/subpackages/wxRecommend/components/shopItem/shopItem.wxml",
      referList: [
        { line: 28, column: 4 }
      ]
    }
  ],
  "/main/components/navigationBar/navigationBar.wxml": [
    // navigationBar 组件没有依赖其他组件
  ]
};

export { exampleEnhancedDependencyGraph };
