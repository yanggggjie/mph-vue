import { v4 as uuidv4 } from 'uuid';

interface EnhancedDependencyGraph {
  nodes: any[];
  edges: any[];
}
// 从JSON文件读取依赖图数据
async function loadDependencyGraphFromJson(): Promise<EnhancedDependencyGraph> {
  const response = await fetch('/extension/resolve/wxRecommend-dependencies.json');
  const data = await response.json();
  return data.dependencyGraph;
}



// 转换为nodes和edges
export async function loadEnhancedDependencyDataFromStatic() {
  const enhancedGraph = await loadDependencyGraphFromJson();
  
  const nodes: any[] = [];
  const edges: any[] = [];
  
  // 找到所有页面节点作为根节点
  const rootPaths = Object.keys(enhancedGraph).filter(path => 
    path.includes('/pages/')
  );
  
  // 为每个根节点构建独立的树
  function buildTree(rootPath: string, currentPath: string, parentPathList: string[] = [], visited: Map<string, string> = new Map()): string {
    const levelKey = `${currentPath}@${parentPathList.join('->')}`;
    
    if (visited.has(levelKey)) {
      return visited.get(levelKey)!;
    }
    
    const nodeId = uuidv4();
    visited.set(levelKey, nodeId);
    
    nodes.push({
      id: nodeId,
      data: {
        path: currentPath,
        parentPathList: [...parentPathList]
      }
    });
    
    const dependencies = enhancedGraph[currentPath] || [];
    dependencies.forEach(dep => {
      const childNodeId = buildTree(rootPath, dep.path, [...parentPathList, currentPath], visited);
      
      edges.push({
        id: `${nodeId}-${childNodeId}`,
        source: nodeId,
        target: childNodeId
      });
    });
    
    return nodeId;
  }
  
  rootPaths.forEach(rootPath => {
    buildTree(rootPath, rootPath, [], new Map());
  });
  
  return { nodes, edges };
}