import * as fs from 'fs';
import * as path from 'path';
import { useLogger } from 'reactive-vscode';

// 定义位置信息接口
export interface ComponentPosition {
  line: number;
  column: number;
}

// 定义返回结果的接口
export interface ComponentUsage {
  componentName: string;
  usedInFile: string;
  referencePath: string;
  relativeFilePath: string;
  wxmlFilePath: string;
  wxmlRelativePath: string;
  positions: ComponentPosition[];
}

// 主函数：查找组件使用情况
export function findComponentUsages(currentFilePath: string, projectRoot?: string): ComponentUsage[] {
  const logger = useLogger('Component Finder');
  const workspaceRoot = projectRoot || path.resolve(__dirname, '..');
  const results: ComponentUsage[] = [];

  logger.info('🔍 开始查找组件使用情况');
  logger.info('📁 当前文件:', currentFilePath);
  logger.info('📁 工作区根目录:', workspaceRoot);
  
  // 智能查找扫描目录
  function findScanRoot(): string {
    // 常见的微信小程序目录结构
    const possibleDirs = [
      path.resolve(workspaceRoot, 'src'),
      path.resolve(workspaceRoot, 'miniprogram'),
      path.resolve(workspaceRoot, 'app'),
      workspaceRoot // 最后尝试整个工作区
    ];
    
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        logger.info('📁 找到扫描目录:', dir);
        return dir;
      }
    }
    
    logger.info('📁 使用工作区根目录:', workspaceRoot);
    return workspaceRoot;
  }
  
  const scanRoot = findScanRoot();
  
  // 获取目标组件路径
  function getTargetComponentPath(filePath: string): string {
    // 将相对路径转换为绝对路径
    const absoluteFilePath = path.resolve(workspaceRoot, filePath);
    const relativePath = path.relative(workspaceRoot, absoluteFilePath);
    
    // 查找组件所在目录
    let componentPath = path.dirname(relativePath);
    
    // 如果当前文件就在组件目录中，找到包含.json文件的目录
    while (componentPath && componentPath !== '.' && componentPath !== '/') {
      const jsonFilePath = path.join(workspaceRoot, componentPath, path.basename(componentPath) + '.json');
      if (fs.existsSync(jsonFilePath)) {
        logger.info('🎯 检测到组件目录:', componentPath);
        return componentPath;
      }
      componentPath = path.dirname(componentPath);
    }
    
    // 如果没有找到，返回文件所在目录
    return path.dirname(relativePath);
  }

  // 将路径标准化（去除尾部斜杠，转换为绝对路径）
  function normalizePath(inputPath: string): string {
    const absolutePath = path.resolve(workspaceRoot, inputPath);
    return absolutePath.replace(/[\/\\]+$/, ''); // 移除尾部斜杠
  }

  // 检查组件在同路径下的wxml文件中的使用位置
  function findComponentPositionsInWxml(jsonFilePath: string, componentName: string): ComponentPosition[] {
    try {
      // 获取同名的wxml文件路径
      const wxmlFilePath = jsonFilePath.replace(/\.json$/, '.wxml');
      
      // 检查wxml文件是否存在
      if (!fs.existsSync(wxmlFilePath)) {
        logger.info('📄 WXML文件不存在:', wxmlFilePath);
        return [];
      }

      // 读取wxml文件内容
      const wxmlContent = fs.readFileSync(wxmlFilePath, 'utf8');
      
      // 转义组件名中的特殊正则字符
      const escapedComponentName = componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 创建正则表达式来匹配组件标签的使用
      // 只匹配开始标签: <componentName> 或 <componentName 或 <componentName/>
      // 更精确的匹配，确保是完整的标签名，支持换行和各种空白字符
      const componentRegex = new RegExp(`<${escapedComponentName}(?=\\s|>|/)`, 'g');
      
      const positions: ComponentPosition[] = [];
      const lines = wxmlContent.split('\n');
      
      logger.info('📄 正在检查文件:', wxmlFilePath);
      logger.info('🔍 查找组件:', `${componentName} (转义后: ${escapedComponentName})`);
      
      // 在整个文件内容中查找匹配
      let match;
      while ((match = componentRegex.exec(wxmlContent)) !== null) {
        // 计算匹配位置所在的行号和列号
        const beforeMatch = wxmlContent.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
        const columnNumber = lastNewlineIndex === -1 ? match.index + 1 : match.index - lastNewlineIndex;
        
        const position = {
          line: lineNumber,
          column: columnNumber
        };
        positions.push(position);
        
        // 获取匹配所在行的内容用于调试
        const matchLine = lines[lineNumber - 1] || '';
        logger.info('✅ 找到组件使用:', `line ${position.line}, col ${position.column} - "${matchLine.trim()}"`);
      }
      
      logger.info('📊 总共找到', positions.length, '个使用位置');
      return positions;
    } catch (error) {
      logger.error('❌ 检查WXML文件时出错:', jsonFilePath.replace('.json', '.wxml'), error);
      return [];
    }
  }

  // 获取目标组件路径
  const targetComponentPath = getTargetComponentPath(currentFilePath);
  const targetAbsolutePath = normalizePath(targetComponentPath);

  // 递归查找组件使用情况
  function searchComponentUsages(dir: string): void {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        searchComponentUsages(fullPath);
      } else if (file.endsWith('.json')) {
        try {
          const jsonContent = fs.readFileSync(fullPath, 'utf8');
          const json = JSON.parse(jsonContent);

          if (json.usingComponents) {
            for (const [componentName, compPath] of Object.entries(json.usingComponents)) {
              const jsonDir = path.dirname(fullPath);
              let resolvedPath: string;

              // 处理绝对路径（以 / 开头）
              if (typeof compPath === 'string' && compPath.startsWith('/')) {
                resolvedPath = path.resolve(workspaceRoot, 'src/miniprogram' + compPath);
              } else {
                // 处理相对路径
                resolvedPath = path.resolve(jsonDir, compPath as string);
              }

              // 标准化路径进行比较
              const normalizedResolvedPath = normalizePath(resolvedPath);

              if (normalizedResolvedPath.includes(targetAbsolutePath)) {
                // 检查同一路径下的wxml文件中组件的使用位置
                const positions = findComponentPositionsInWxml(fullPath, componentName);
                
                if (positions.length > 0) {
                  const relativeFilePath = path.relative(workspaceRoot, fullPath);
                  const wxmlFilePath = fullPath.replace(/\.json$/, '.wxml');
                  const wxmlRelativePath = relativeFilePath.replace(/\.json$/, '.wxml');
                  
                  results.push({
                    componentName,
                    usedInFile: fullPath,
                    referencePath: compPath as string,
                    relativeFilePath,
                    wxmlFilePath,
                    wxmlRelativePath,
                    positions
                  });

                  logger.info('✅ 组件被引用:', `"${componentName}" 在 ${relativeFilePath}`);
                  logger.info('📍 引用路径:', compPath);
                  logger.info('📌 位置:', positions.map(p => `line:${p.line} col:${p.column}`).join(', '));
                } else {
                  logger.warn('⚠️ 组件在JSON中声明但在WXML中未使用:', `"${componentName}" 在 ${path.relative(workspaceRoot, fullPath)}`);
                }
              }
            }
          }
        } catch (e) {
          // 忽略解析错误的JSON文件
          if (e instanceof SyntaxError) {
            logger.warn('⚠️ JSON解析错误:', fullPath);
          } else {
            logger.error('❌ 读取文件时出错:', fullPath, e);
          }
        }
      }
    }
  }

  logger.info('🔍 正在查找组件引用:', targetComponentPath);
  searchComponentUsages(scanRoot);
  logger.info('🎉 搜索完成！找到', results.length, '个引用');

  return results;
}

// 如果直接运行此文件，使用命令行参数
if (import.meta.url === `file://${process.argv[1]}`) {
  const cliLogger = useLogger('Component Finder CLI');
  const currentFilePath = process.argv[2];
  
  if (!currentFilePath) {
    cliLogger.error('❌ 请提供文件路径参数');
    cliLogger.info('用法: node find-usage.ts <文件路径>');
    process.exit(1);
  }

  const results = findComponentUsages(currentFilePath);
  cliLogger.info('📊 最终结果: 找到', results.length, '个组件引用');
}