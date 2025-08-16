import React, { useEffect, useState, useCallback } from 'react';
import dagre from '@dagrejs/dagre';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
  Position,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { loadEnhancedDependencyDataFromStatic } from '../utils/loadDependencyData';



// 简化路径名称
const simplifyPath = (fullPath: string): string => {
  const parts = fullPath.split('/').filter(Boolean);
  let fileName = parts[parts.length - 1];
  
  if (fileName.endsWith('.wxml')) {
    fileName = fileName.replace('.wxml', '');
  }
  
  // 如果文件名是index，使用父目录名称
  if (fileName === 'index' && parts.length > 1) {
    fileName = parts[parts.length - 2];
  }
  
  if (fullPath.includes('/pages/')) {
    return `📄 ${fileName}`;
  } else if (fullPath.includes('/components/')) {
    return `🧩 ${fileName}`;
  }
  
  return fileName || fullPath;
};

// 创建Dagre图实例
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// 使用Dagre进行层级布局
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  
  // 设置图的方向和属性
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 50,
    edgesep: 10,
    ranksep: 80,
  });

  // 添加节点到dagre图
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: 120, 
      height: 60 
    });
  });

  // 添加边到dagre图
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 执行布局计算
  dagre.layout(dagreGraph);

  // 应用计算出的位置到节点
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 60, // 节点宽度的一半
        y: nodeWithPosition.y - 30, // 节点高度的一半
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};



const DependencyGraphInner: React.FC = () => {
  const [graphData, setGraphData] = useState<{ nodes: any[], edges: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadEnhancedDependencyDataFromStatic();
        
        // 转换为ReactFlow格式
        const flowNodes: Node[] = data.nodes.map((node: any) => ({
          id: node.id,
          type: 'default',
          data: {
            label: simplifyPath(node.data.path),
          },
          position: { x: 0, y: 0 }, // 将在布局计算中设置
          style: {
            background: node.data.path.includes('/pages/') ? '#e3f2fd' : '#f3e5f5',
            border: `2px solid ${node.data.path.includes('/pages/') ? '#1976d2' : '#7b1fa2'}`,
            borderRadius: '6px',
            padding: '8px',
            fontSize: '14px',
            fontWeight: '500',
            width: '120px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          },
        }));

        const flowEdges: Edge[] = data.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
        }));

        setGraphData({ nodes: flowNodes, edges: flowEdges });
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 应用布局
  const layoutedElements = graphData ? getLayoutedElements(graphData.nodes, graphData.edges) : { nodes: [], edges: [] };

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedElements.edges);

  useEffect(() => {
    if (graphData) {
      const layouted = getLayoutedElements(graphData.nodes, graphData.edges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    }
  }, [graphData, setNodes, setEdges]);


  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
        
        {/* 布局切换面板 */}
        <Panel position="top-right" className="bg-white p-2 rounded shadow">
        </Panel>
      </ReactFlow>
    </div>
  );
};

const DependencyGraph: React.FC = () => {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner />
    </ReactFlowProvider>
  );
};

export default DependencyGraph;