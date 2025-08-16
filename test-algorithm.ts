#!/usr/bin/env bun

// 测试更新后的依赖图算法
import { loadDependencyDataFromStatic } from './src/utils/loadDependencyData';

console.log('🚀 开始测试更新后的依赖图算法...\n');

try {
  const result = loadDependencyDataFromStatic();
  
  console.log('\n📊 测试结果汇总:');
  console.log(`✅ 总节点数: ${result.nodes.length}`);
  console.log(`✅ 总边数: ${result.edges.length}`);
  
  // 分析节点数据结构
  console.log('\n🔍 节点数据结构验证:');
  const sampleNode = result.nodes[0];
  console.log('示例节点结构:', {
    id: sampleNode.id,
    path: sampleNode.data.path,
    parentPathList: sampleNode.data.parentPathList,
    referencedBy: sampleNode.data.referencedBy,
    treeRoot: sampleNode.data.treeRoot,
    originalPath: sampleNode.data.originalPath
  });
  
  // 验证UUID格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validUUIDs = result.nodes.every(node => uuidRegex.test(node.id));
  console.log(`✅ UUID格式验证: ${validUUIDs ? '通过' : '失败'}`);
  
  // 验证边的ID格式
  const validEdgeIds = result.edges.every(edge => edge.id === `${edge.source}-${edge.target}`);
  console.log(`✅ 边ID格式验证: ${validEdgeIds ? '通过' : '失败'}`);
  
  // 分析特定路径的复制情况
  console.log('\n🔎 特定路径分析:');
  const targetPaths = [
    '/main/components/navigationBar',
    '/subpackages/wxRecommend/components/behaviorReport/behaviorReportSloter',
    '/main/components/actionSheet'
  ];
  
  targetPaths.forEach(targetPath => {
    const instances = result.nodes.filter(node => node.data.originalPath === targetPath);
    console.log(`\n📍 路径: ${targetPath}`);
    console.log(`   实例数量: ${instances.length}`);
    
    if (instances.length > 0) {
      console.log(`   被引用的树: ${instances[0].data.referencedBy.join(', ')}`);
      
      // 显示每个实例的上下文
      instances.forEach((instance, index) => {
        console.log(`   实例${index + 1}:`);
        console.log(`     所属树: ${instance.data.treeRoot}`);
        console.log(`     父路径: ${instance.data.parentPathList.join(' -> ')}`);
        console.log(`     节点ID: ${instance.id}`);
      });
    }
  });
  
  // 验证树的独立性
  console.log('\n🌳 树独立性验证:');
  const treeRoots = [...new Set(result.nodes.map(node => node.data.treeRoot))];
  console.log(`发现 ${treeRoots.length} 个独立的树:`);
  
  treeRoots.forEach(root => {
    const treeNodes = result.nodes.filter(node => node.data.treeRoot === root);
    const uniquePaths = new Set(treeNodes.map(node => node.data.originalPath));
    const duplicatedPaths = treeNodes.filter(node => 
      treeNodes.filter(n => n.data.originalPath === node.data.originalPath).length > 1
    );
    
    console.log(`\n  🌲 树: ${root}`);
    console.log(`     节点数: ${treeNodes.length}`);
    console.log(`     唯一路径数: ${uniquePaths.size}`);
    console.log(`     内部重复节点数: ${duplicatedPaths.length}`);
    
    if (duplicatedPaths.length > 0) {
      const duplicatedPathGroups = new Map<string, number>();
      duplicatedPaths.forEach(node => {
        const path = node.data.originalPath;
        duplicatedPathGroups.set(path, (duplicatedPathGroups.get(path) || 0) + 1);
      });
      
      console.log(`     重复路径详情:`);
      duplicatedPathGroups.forEach((count, path) => {
        console.log(`       ${path}: ${count} 个实例`);
      });
    }
  });
  
  // 验证边的连接性
  console.log('\n🔗 边连接性验证:');
  const nodeIds = new Set(result.nodes.map(node => node.id));
  const invalidEdges = result.edges.filter(edge => 
    !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
  );
  
  console.log(`✅ 边连接性: ${invalidEdges.length === 0 ? '所有边都有效' : `发现${invalidEdges.length}条无效边`}`);
  
  if (invalidEdges.length > 0) {
    console.log('无效边详情:', invalidEdges.slice(0, 5));
  }
  
  console.log('\n🎉 算法测试完成！');
  
} catch (error) {
  console.error('❌ 测试过程中发生错误:', error);
  process.exit(1);
}
