import * as fs from 'node:fs';
import * as path from 'node:path';
import { ComponentReference, ComponentDependency, EnhancedDependencyGraph } from './enhanced-types';

interface UsingComponents {
  [componentName: string]: string;
}

interface ComponentJson {
  component?: boolean;
  usingComponents?: UsingComponents;
  [key: string]: any;
}

export class EnhancedMiniProgramResolver {
  private workspaceRoot: string;
  private miniprogramRoot: string;
  private dependencyGraph: EnhancedDependencyGraph = {};
  private processedPaths = new Set<string>();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.miniprogramRoot = path.join(workspaceRoot, 'src', 'miniprogram');
  }

  async resolvePagesDirectory(pagesDir: string): Promise<EnhancedDependencyGraph> {
    this.dependencyGraph = {};
    this.processedPaths.clear();

    const pageDirectories = await this.scanPageDirectories(pagesDir);

    for (const pageDir of pageDirectories) {
      await this.resolvePageDependencies(pageDir);
    }

    return this.dependencyGraph;
  }

  private async scanPageDirectories(pagesDir: string): Promise<string[]> {
    const pageDirectories: string[] = [];
    
    try {
      const entries = await fs.promises.readdir(pagesDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(pagesDir, entry.name);
          if (await this.isPageDirectory(fullPath)) {
            pageDirectories.push(fullPath);
          }
        }
      }
    } catch (error) {
      // ignore error
    }

    return pageDirectories;
  }

  /**
   * 判断是否为页面目录
   */
  private async isPageDirectory(dirPath: string): Promise<boolean> {
    const dirName = path.basename(dirPath);
    
    // 支持两种格式：{dirName}.json 或 index.json
    const possibleFormats = [
      // 格式1：与目录名相同的文件名
      {
        json: `${dirName}.json`,
        ts: `${dirName}.ts`,
        wxml: `${dirName}.wxml`
      },
      // 格式2：index 文件名
      {
        json: 'index.json',
        ts: 'index.ts',
        wxml: 'index.wxml'
      }
    ];

    for (const format of possibleFormats) {
      const requiredFiles = [format.json, format.ts, format.wxml];
      let allFilesExist = true;

      for (const fileName of requiredFiles) {
        const filePath = path.join(dirPath, fileName);
        if (!fs.existsSync(filePath)) {
          allFilesExist = false;
          break;
        }
      }

      if (allFilesExist) {
        try {
          const jsonPath = path.join(dirPath, format.json);
          const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
          const config: ComponentJson = JSON.parse(jsonContent);
          
          // 页面的配置文件不应该有 component: true
          return !config.component;
        } catch (error) {
          console.error(`❌ 读取json文件失败: ${dirPath}`, error);
          continue;
        }
      }
    }

    return false;
  }

  private async resolvePageDependencies(pageDir: string): Promise<void> {
    const pageName = path.basename(pageDir);
    
    let wxmlPath: string;
    let jsonPath: string;
    
    if (fs.existsSync(path.join(pageDir, `${pageName}.wxml`))) {
      wxmlPath = path.join(pageDir, `${pageName}.wxml`);
      jsonPath = path.join(pageDir, `${pageName}.json`);
    } else if (fs.existsSync(path.join(pageDir, 'index.wxml'))) {
      wxmlPath = path.join(pageDir, 'index.wxml');
      jsonPath = path.join(pageDir, 'index.json');
    } else {
      return;
    }

    const wxmlKey = this.getRelativeWxmlPath(wxmlPath);

    if (this.processedPaths.has(wxmlKey)) {
      return;
    }

    this.processedPaths.add(wxmlKey);
    this.dependencyGraph[wxmlKey] = [];

    try {
      const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
      const config: ComponentJson = JSON.parse(jsonContent);

      if (!config.usingComponents) {
        return;
      }

      const wxmlContent = await fs.promises.readFile(wxmlPath, 'utf-8');

      for (const [componentName, componentPath] of Object.entries(config.usingComponents)) {
        if (this.isComponentUsedInWxml(componentName, wxmlContent)) {
          const absoluteComponentPath = this.resolveComponentPath(componentPath, pageDir);
          
          if (absoluteComponentPath && await this.isValidComponent(absoluteComponentPath)) {
            const componentWxmlPath = this.getComponentWxmlPath(absoluteComponentPath);
            
            if (componentWxmlPath) {
              const componentWxmlKey = this.getRelativeWxmlPath(componentWxmlPath);
              const references = this.findComponentReferencesInWxml(componentName, wxmlContent);
              
              const componentDependency: ComponentDependency = {
                path: componentWxmlKey,
                referList: references
              };
              
              this.dependencyGraph[wxmlKey].push(componentDependency);
              
              await this.resolveComponentDependencies(absoluteComponentPath);
            }
          }
        }
      }
    } catch (error) {
      // ignore error
    }
  }

  private async resolveComponentDependencies(componentPath: string): Promise<void> {
    const componentWxmlPath = this.getComponentWxmlPath(componentPath);
    if (!componentWxmlPath) {
      return;
    }

    const wxmlKey = this.getRelativeWxmlPath(componentWxmlPath);

    if (this.processedPaths.has(wxmlKey)) {
      return;
    }

    this.processedPaths.add(wxmlKey);
    this.dependencyGraph[wxmlKey] = [];

    try {
      const jsonPath = this.getComponentJsonPath(componentPath);
      if (!jsonPath || !fs.existsSync(jsonPath)) {
        return;
      }

      const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
      const config: ComponentJson = JSON.parse(jsonContent);

      if (!config.usingComponents) {
        return;
      }

      const wxmlContent = await fs.promises.readFile(componentWxmlPath, 'utf-8');

      for (const [componentName, subComponentPath] of Object.entries(config.usingComponents)) {
        if (this.isComponentUsedInWxml(componentName, wxmlContent)) {
          const absoluteSubComponentPath = this.resolveComponentPath(subComponentPath, componentPath);
          
          if (absoluteSubComponentPath && await this.isValidComponent(absoluteSubComponentPath)) {
            const subComponentWxmlPath = this.getComponentWxmlPath(absoluteSubComponentPath);
            
            if (subComponentWxmlPath) {
              const subComponentWxmlKey = this.getRelativeWxmlPath(subComponentWxmlPath);
              const references = this.findComponentReferencesInWxml(componentName, wxmlContent);
              
              const componentDependency: ComponentDependency = {
                path: subComponentWxmlKey,
                referList: references
              };
              
              this.dependencyGraph[wxmlKey].push(componentDependency);
              
              await this.resolveComponentDependencies(absoluteSubComponentPath);
            }
          }
        }
      }
    } catch (error) {
      // ignore error
    }
  }

  private isComponentUsedInWxml(componentName: string, wxmlContent: string): boolean {
    const tagRegex = new RegExp(`<${componentName}[\\s>]`, 'g');
    return tagRegex.test(wxmlContent);
  }

  private findComponentReferencesInWxml(componentName: string, wxmlContent: string): ComponentReference[] {
    const references: ComponentReference[] = [];
    const lines = wxmlContent.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const startTagRegex = new RegExp(`<${componentName}(?:\\s[^>]*)?(?:/>|>)`, 'g');
      let match;
      
      while ((match = startTagRegex.exec(line)) !== null) {
        references.push({
          line: lineIndex + 1,
          column: match.index + 1
        });
      }
      
      startTagRegex.lastIndex = 0;
    });
    
    return references;
  }

  /**
   * 获取相对于miniprogram根目录的wxml路径
   */
  private getRelativeWxmlPath(wxmlPath: string): string {
    const relativePath = path.relative(this.miniprogramRoot, wxmlPath);
    return '/' + relativePath.replace(/\\/g, '/');
  }

  private resolveComponentPath(componentPath: string, basePath: string): string | null {
    try {
      let resolvedPath: string;
      
      if (componentPath.startsWith('/')) {
        resolvedPath = path.join(this.miniprogramRoot, componentPath.substring(1));
      } else {
        resolvedPath = path.resolve(basePath, componentPath);
      }
      
      if (!fs.existsSync(resolvedPath)) {
        const componentDir = path.dirname(resolvedPath);
        if (fs.existsSync(componentDir) && fs.lstatSync(componentDir).isDirectory()) {
          return componentDir;
        }
      } else if (fs.lstatSync(resolvedPath).isDirectory()) {
        return resolvedPath;
      }
      
      return resolvedPath;
    } catch (error) {
      return null;
    }
  }

  private async isValidComponent(componentPath: string): Promise<boolean> {
    if (!fs.existsSync(componentPath) || !fs.lstatSync(componentPath).isDirectory()) {
      return false;
    }

    const dirName = path.basename(componentPath);
    
    const namedJsonPath = path.join(componentPath, `${dirName}.json`);
    if (fs.existsSync(namedJsonPath)) {
      try {
        const jsonContent = await fs.promises.readFile(namedJsonPath, 'utf-8');
        const config: ComponentJson = JSON.parse(jsonContent);
        return config.component === true;
      } catch {
        return false;
      }
    }

    const indexJsonPath = path.join(componentPath, 'index.json');
    if (fs.existsSync(indexJsonPath)) {
      try {
        const jsonContent = await fs.promises.readFile(indexJsonPath, 'utf-8');
        const config: ComponentJson = JSON.parse(jsonContent);
        return config.component === true;
      } catch {
        return false;
      }
    }

    return false;
  }

  private getComponentJsonPath(componentPath: string): string | null {
    const dirName = path.basename(componentPath);
    
    const namedJsonPath = path.join(componentPath, `${dirName}.json`);
    if (fs.existsSync(namedJsonPath)) {
      return namedJsonPath;
    }

    const indexJsonPath = path.join(componentPath, 'index.json');
    if (fs.existsSync(indexJsonPath)) {
      return indexJsonPath;
    }

    return null;
  }

  private getComponentWxmlPath(componentPath: string): string | null {
    const dirName = path.basename(componentPath);
    
    const namedWxmlPath = path.join(componentPath, `${dirName}.wxml`);
    if (fs.existsSync(namedWxmlPath)) {
      return namedWxmlPath;
    }

    const indexWxmlPath = path.join(componentPath, 'index.wxml');
    if (fs.existsSync(indexWxmlPath)) {
      return indexWxmlPath;
    }

    return null;
  }

  getStatistics() {
    const totalFiles = Object.keys(this.dependencyGraph).length;
    let totalReferences = 0;
    let totalDependencies = 0;
    const componentRefCounts = new Map<string, number>();
    
    Object.values(this.dependencyGraph).forEach(deps => {
      totalDependencies += deps.length;
      deps.forEach(dep => {
        const refCount = dep.referList.length;
        totalReferences += refCount;
        componentRefCounts.set(dep.path, (componentRefCounts.get(dep.path) || 0) + refCount);
      });
    });
    
    let mostReferencedComponent = { path: '', count: 0 };
    componentRefCounts.forEach((count, path) => {
      if (count > mostReferencedComponent.count) {
        mostReferencedComponent = { path, count };
      }
    });

    return {
      totalFiles,
      totalDependencies,
      totalReferences,
      mostReferencedComponent,
      averageReferencesPerDependency: totalDependencies > 0 ? (totalReferences / totalDependencies).toFixed(2) : 0
    };
  }
}

export async function resolveEnhancedDependencies(pagesDir: string): Promise<EnhancedDependencyGraph> {
  const workspaceRoot = pagesDir.replace(/\/src\/miniprogram.*$/, '');
  
  const resolver = new EnhancedMiniProgramResolver(workspaceRoot);
  const result = await resolver.resolvePagesDirectory(pagesDir);
  
  return result;
}

async function main() {
  try {
    const wxRecommendPath = path.join(__dirname, '../../../wxa-channels-shop/src/miniprogram/subpackages/wxRecommend');
    
    if (!fs.existsSync(wxRecommendPath)) {
      console.error(`目录不存在: ${wxRecommendPath}`);
      process.exit(1);
    }
    
    const workspaceRoot = path.join(__dirname, '../../../wxa-channels-shop');
    const resolver = new EnhancedMiniProgramResolver(workspaceRoot);
    const pagesPath = path.join(wxRecommendPath, 'pages');
    const allDependencies = await resolver.resolvePagesDirectory(pagesPath);
    const stats = resolver.getStatistics();
    
    console.log('解析统计:');
    console.log(`  总文件数: ${stats.totalFiles}`);
    console.log(`  总依赖数: ${stats.totalDependencies}`);
    console.log(`  总引用数: ${stats.totalReferences}`);
    console.log(`  最常被引用的组件: ${stats.mostReferencedComponent.path} (${stats.mostReferencedComponent.count}次)`);
    
    const outputData = {
      metadata: {
        scanPath: wxRecommendPath,
        timestamp: new Date().toISOString(),
        statistics: stats
      },
      dependencyGraph: allDependencies
    };
    
    const outputPath = path.join(__dirname, 'wxRecommend-dependencies.json');
    await fs.promises.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
    
    console.log(`结果已保存到: ${outputPath}`);
    
  } catch (error) {
    console.error('解析失败:', error);
    process.exit(1);
  }
}

// 检查是否直接运行此文件
if (require.main === module) {
  main();
}

export default resolveEnhancedDependencies;

