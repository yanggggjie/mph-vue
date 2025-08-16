import * as fs from 'node:fs';
import * as path from 'node:path';

interface ComponentDependency {
  [key: string]: string[];
}

interface UsingComponents {
  [componentName: string]: string;
}

interface ComponentJson {
  component?: boolean;
  usingComponents?: UsingComponents;
  [key: string]: any;
}

export class MiniProgramResolver {
  private workspaceRoot: string;
  private miniprogramRoot: string;
  private dependencyGraph: ComponentDependency = {};
  private processedPaths = new Set<string>();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.miniprogramRoot = path.join(workspaceRoot, 'src', 'miniprogram');
  }

  /**
   * 解析给定pages目录下的所有页面依赖
   * @param pagesDir 绝对路径的pages目录
   * @returns 依赖邻接表
   */
  async resolvePagesDirectory(pagesDir: string): Promise<ComponentDependency> {
    this.dependencyGraph = {};
    this.processedPaths.clear();

    console.log(`开始解析pages目录: ${pagesDir}`);

    // 扫描pages目录下的所有子目录
    const pageDirectories = await this.scanPageDirectories(pagesDir);
    console.log(`发现 ${pageDirectories.length} 个页面目录:`, pageDirectories);

    // 解析每个页面的依赖
    for (const pageDir of pageDirectories) {
      await this.resolvePageDependencies(pageDir);
    }

    return this.dependencyGraph;
  }

  /**
   * 扫描pages目录下的所有页面目录
   */
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
      console.error(`读取pages目录失败: ${pagesDir}`, error);
    }

    return pageDirectories;
  }

  /**
   * 判断是否为页面目录
   * 检查是否有同名的json、ts、wxml文件，且json中没有component: true
   */
  private async isPageDirectory(dirPath: string): Promise<boolean> {
    const dirName = path.basename(dirPath);
    
    // 检查必需文件是否存在
    const requiredFiles = [
      `${dirName}.json`,
      `${dirName}.ts`,
      `${dirName}.wxml`
    ];

    for (const fileName of requiredFiles) {
      const filePath = path.join(dirPath, fileName);
      if (!fs.existsSync(filePath)) {
        return false;
      }
    }

    // 检查json文件，确认不是组件
    try {
      const jsonPath = path.join(dirPath, `${dirName}.json`);
      const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
      const config: ComponentJson = JSON.parse(jsonContent);
      
      // 如果有component: true，则是组件，不是页面
      return !config.component;
    } catch (error) {
      console.error(`读取json文件失败: ${dirPath}`, error);
      return false;
    }
  }

  /**
   * 解析单个页面的依赖关系
   */
  private async resolvePageDependencies(pageDir: string): Promise<void> {
    const pageName = path.basename(pageDir);
    const relativePath = this.getRelativePath(pageDir);
    const pageKey = relativePath;

    console.log(`解析页面: ${pageKey}`);

    // 如果已经处理过，跳过
    if (this.processedPaths.has(pageKey)) {
      return;
    }

    this.processedPaths.add(pageKey);
    this.dependencyGraph[pageKey] = [];

    try {
      // 读取json配置
      const jsonPath = path.join(pageDir, `${pageName}.json`);
      const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
      const config: ComponentJson = JSON.parse(jsonContent);

      if (!config.usingComponents) {
        console.log(`页面 ${pageKey} 没有使用组件`);
        return;
      }

      // 读取wxml文件
      const wxmlPath = path.join(pageDir, `${pageName}.wxml`);
      const wxmlContent = await fs.promises.readFile(wxmlPath, 'utf-8');

      // 解析每个使用的组件
      for (const [componentName, componentPath] of Object.entries(config.usingComponents)) {
        // 检查组件是否在wxml中实际使用
        const isUsed = this.isComponentUsedInWxml(componentName, wxmlContent);
        console.log(`检查组件 ${componentName} 是否在wxml中使用: ${isUsed}`);
        
        if (isUsed) {
          const absoluteComponentPath = this.resolveComponentPath(componentPath, pageDir);
          console.log(`解析组件路径: ${componentPath} -> ${absoluteComponentPath}`);
          
          if (absoluteComponentPath) {
            const isValid = await this.isValidComponent(absoluteComponentPath);
            console.log(`组件路径有效性: ${absoluteComponentPath} -> ${isValid}`);
            
            if (isValid) {
              const componentKey = this.getRelativePath(absoluteComponentPath);
              this.dependencyGraph[pageKey].push(componentKey);
              
              console.log(`发现依赖: ${pageKey} -> ${componentKey}`);
              
              // 递归解析组件的依赖
              await this.resolveComponentDependencies(absoluteComponentPath);
            }
          }
        }
      }
    } catch (error) {
      console.error(`解析页面依赖失败: ${pageDir}`, error);
    }
  }

  /**
   * 解析组件的依赖关系
   */
  private async resolveComponentDependencies(componentPath: string): Promise<void> {
    const componentKey = this.getRelativePath(componentPath);

    // 如果已经处理过，跳过
    if (this.processedPaths.has(componentKey)) {
      return;
    }

    this.processedPaths.add(componentKey);
    this.dependencyGraph[componentKey] = [];

    try {
      // 获取组件的json文件路径
      const jsonPath = this.getComponentJsonPath(componentPath);
      if (!jsonPath || !fs.existsSync(jsonPath)) {
        return;
      }

      const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8');
      const config: ComponentJson = JSON.parse(jsonContent);

      if (!config.usingComponents) {
        console.log(`组件 ${componentKey} 没有依赖其他组件`);
        return;
      }

      // 获取组件的wxml文件路径
      const wxmlPath = this.getComponentWxmlPath(componentPath);
      if (!wxmlPath || !fs.existsSync(wxmlPath)) {
        return;
      }

      const wxmlContent = await fs.promises.readFile(wxmlPath, 'utf-8');

      // 解析每个使用的组件
      for (const [componentName, subComponentPath] of Object.entries(config.usingComponents)) {
        if (this.isComponentUsedInWxml(componentName, wxmlContent)) {
          const absoluteSubComponentPath = this.resolveComponentPath(subComponentPath, componentPath);
          
          if (absoluteSubComponentPath && await this.isValidComponent(absoluteSubComponentPath)) {
            const subComponentKey = this.getRelativePath(absoluteSubComponentPath);
            this.dependencyGraph[componentKey].push(subComponentKey);
            
            console.log(`发现组件依赖: ${componentKey} -> ${subComponentKey}`);
            
            // 递归解析子组件的依赖
            await this.resolveComponentDependencies(absoluteSubComponentPath);
          }
        }
      }
    } catch (error) {
      console.error(`解析组件依赖失败: ${componentPath}`, error);
    }
  }

  /**
   * 检查组件是否在wxml中实际使用
   */
  private isComponentUsedInWxml(componentName: string, wxmlContent: string): boolean {
    // 简单的正则匹配，检查是否有对应的标签
    const tagRegex = new RegExp(`<${componentName}[\\s>]`, 'g');
    return tagRegex.test(wxmlContent);
  }

  /**
   * 解析组件路径为绝对路径
   */
  private resolveComponentPath(componentPath: string, basePath: string): string | null {
    try {
      let resolvedPath: string;
      
      if (componentPath.startsWith('/')) {
        // 绝对路径，基于miniprogram根目录
        resolvedPath = path.join(this.miniprogramRoot, componentPath.substring(1));
      } else {
        // 相对路径，基于当前文件目录解析
        resolvedPath = path.resolve(basePath, componentPath);
      }
      
      // 微信小程序的组件路径通常指向组件目录，而不是具体文件
      // 如果解析的路径不存在，尝试将其理解为组件目录
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
      console.error(`解析组件路径失败: ${componentPath}`, error);
      return null;
    }
  }

  /**
   * 验证组件路径是否有效
   */
  private async isValidComponent(componentPath: string): Promise<boolean> {
    // 检查是否为目录
    if (!fs.existsSync(componentPath) || !fs.lstatSync(componentPath).isDirectory()) {
      return false;
    }

    const dirName = path.basename(componentPath);
    
    // 检查两种命名规则
    // 规则1: 目录同名文件
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

    // 规则2: index文件
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

  /**
   * 获取组件的json文件路径
   */
  private getComponentJsonPath(componentPath: string): string | null {
    const dirName = path.basename(componentPath);
    
    // 规则1: 目录同名文件
    const namedJsonPath = path.join(componentPath, `${dirName}.json`);
    if (fs.existsSync(namedJsonPath)) {
      return namedJsonPath;
    }

    // 规则2: index文件
    const indexJsonPath = path.join(componentPath, 'index.json');
    if (fs.existsSync(indexJsonPath)) {
      return indexJsonPath;
    }

    return null;
  }

  /**
   * 获取组件的wxml文件路径
   */
  private getComponentWxmlPath(componentPath: string): string | null {
    const dirName = path.basename(componentPath);
    
    // 规则1: 目录同名文件
    const namedWxmlPath = path.join(componentPath, `${dirName}.wxml`);
    if (fs.existsSync(namedWxmlPath)) {
      return namedWxmlPath;
    }

    // 规则2: index文件
    const indexWxmlPath = path.join(componentPath, 'index.wxml');
    if (fs.existsSync(indexWxmlPath)) {
      return indexWxmlPath;
    }

    return null;
  }

  /**
   * 获取相对于miniprogram根目录的路径
   */
  private getRelativePath(absolutePath: string): string {
    const relativePath = path.relative(this.miniprogramRoot, absolutePath);
    return '/' + relativePath.replace(/\\/g, '/');
  }

  /**
   * 打印依赖图
   */
  printDependencyGraph(): void {
    console.log('\n=== 依赖邻接表 ===');
    console.log(JSON.stringify(this.dependencyGraph, null, 2));
  }
}

// 使用示例
export async function resolveDependencies(pagesDir: string) {
  // 从pagesDir推断workspaceRoot
  const workspaceRoot = pagesDir.replace(/\/src\/miniprogram.*$/, '');
  
  const resolver = new MiniProgramResolver(workspaceRoot);
  const dependencies = await resolver.resolvePagesDirectory(pagesDir);
  
  resolver.printDependencyGraph();
  return dependencies;
}

// 导出默认函数供外部调用
export default resolveDependencies;
