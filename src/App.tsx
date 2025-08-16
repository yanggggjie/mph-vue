import React, { useState } from 'react';
import './index.css';
import MphAnalyzer from './components/MphAnalyzer';
import DependencyGraph from './components/DependencyGraph';

declare global {
  interface Window {
    __FLAG1__: any;
    __FLAG2__: any;
  }
}

console.log('--inject--', window.__FLAG1__, window.__FLAG2__);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'graph'>('analyzer');

  return (
    <div className="h-full flex flex-col">
      {/* Tab 导航 */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('analyzer')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'analyzer'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔍 组件分析
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'graph'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 依赖关系图
        </button>
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'analyzer' && <MphAnalyzer />}
        {activeTab === 'graph' && (
          <div className="p-4 h-full">
            <DependencyGraph />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
