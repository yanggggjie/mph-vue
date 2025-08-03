import * as fs from 'fs';
import * as path from 'path';
import { logger } from './index';
// 导入 wxml-parser
import { parse as parseWxml } from '@wxml/parser';

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

// 解析方法枚举
export enum ParseMethod {
  REGEX = 'regex',
  PARSER = 'parser'
}

// ==================== 主函数：查找组件使用情况 ====================
export function findComponentUsages(
  currentFilePath: string, 
  projectRoot?: string, 
  parseMethod: ParseMethod = ParseMethod.PARSER
): ComponentUsage[] {
  const workspaceRoot = projectRoot || path.resolve(__dirname, '..');
  const results: ComponentUsage[] = [];

  logger.info('[Component Finder] 🔍 开始查找组件使用情况');
  logger.info('[Component Finder] 📁 当前文件:', currentFilePath);
  logger.info('[Component Finder] 📁 工作区根目录:', workspaceRoot);
  logger.info('[Component Finder] 🔧 解析方法:', parseMethod.toUpperCase());
  
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

  // ==================== 方法1: 使用正则表达式查找组件位置 ====================
  function findComponentPositionsInWxmlByRegex(jsonFilePath: string, componentName: string): ComponentPosition[] {
    logger.info('🔍 [REGEX] 开始在WXML中查找组件位置');
    logger.info('   📋 JSON文件:', jsonFilePath);
    logger.info('   🧩 组件名:', componentName);
    
    try {
      // 获取同名的wxml文件路径
      const wxmlFilePath = jsonFilePath.replace(/\.json$/, '.wxml');
      logger.info('   📄 对应WXML文件:', wxmlFilePath);
      
      // 检查wxml文件是否存在
      if (!fs.existsSync(wxmlFilePath)) {
        logger.info('❌ WXML文件不存在:', wxmlFilePath);
        return [];
      }
      logger.info('✅ WXML文件存在，开始读取...');

      // 读取wxml文件内容
      const wxmlContent = fs.readFileSync(wxmlFilePath, 'utf8');
      const contentLength = wxmlContent.length;
      const lineCount = wxmlContent.split('\n').length;
      logger.info('📊 文件统计:');
      logger.info('   📏 内容长度:', contentLength, '字符');
      logger.info('   📄 行数:', lineCount, '行');
      
      // 转义组件名中的特殊正则字符
      const escapedComponentName = componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      logger.info('🔧 正则表达式准备:');
      logger.info('   🧩 原始组件名:', componentName);
      logger.info('   🔒 转义后:', escapedComponentName);
      
      // 创建正则表达式来匹配组件标签的使用
      const componentRegex = new RegExp(`<${escapedComponentName}(?=\\s|>|/)`, 'g');
      logger.info('   🎯 正则表达式:', componentRegex.toString());
      
      const positions: ComponentPosition[] = [];
      const lines = wxmlContent.split('\n');
      
      logger.info('🔍 开始逐行扫描...');
      
      // 在整个文件内容中查找匹配
      let match;
      let matchCount = 0;
      while ((match = componentRegex.exec(wxmlContent)) !== null) {
        matchCount++;
        logger.info(`🎯 找到第${matchCount}个匹配:`);
        // 计算匹配位置所在的行号和列号
        const beforeMatch = wxmlContent.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
        const columnNumber = lastNewlineIndex === -1 ? match.index + 1 : match.index - lastNewlineIndex;
        
        logger.info(`   📍 位置计算:`);
        logger.info(`     🔢 匹配索引: ${match.index}`);
        logger.info(`     📄 行号: ${lineNumber}`);
        logger.info(`     📏 列号: ${columnNumber}`);
        
        const position = {
          line: lineNumber,
          column: columnNumber
        };
        positions.push(position);
        
        // 获取匹配所在行的内容用于调试
        const matchLine = lines[lineNumber - 1] || '';
        const trimmedLine = matchLine.trim();
        logger.info(`   📝 匹配行内容: "${trimmedLine}"`);
        logger.info(`   ✅ 位置记录: line ${position.line}, col ${position.column}`);
        
        // 显示匹配的上下文（前后几个字符）
        const contextStart = Math.max(0, match.index - 10);
        const contextEnd = Math.min(wxmlContent.length, match.index + match[0].length + 10);
        const context = wxmlContent.substring(contextStart, contextEnd);
        logger.info(`   🔍 匹配上下文: "${context}"`);
      }
      
      logger.info('📊 [REGEX] WXML扫描完成统计:');
      logger.info('   🎯 总匹配数:', matchCount);
      logger.info('   📌 有效位置数:', positions.length);
      logger.info('   📄 扫描行数:', lineCount);
      
      return positions;
    } catch (error) {
      logger.error('❌ [REGEX] 检查WXML文件时出错:', jsonFilePath.replace('.json', '.wxml'), error);
      return [];
    }
  }

  // ==================== AST 调试辅助函数 ====================
  function debugASTStructure(ast: any, maxDepth: number = 2): void {
    logger.info('🔧 [DEBUG] AST 结构分析:');
    
    function analyzeNode(node: any, depth: number = 0, path: string = 'root'): void {
      if (!node || depth > maxDepth) return;
      
      const indent = '  '.repeat(depth + 1);
      logger.info(`${indent}📊 ${path}:`);
      logger.info(`${indent}   类型: ${node.type || '未知'}`);
      logger.info(`${indent}   名称: ${node.name || '无'}`);
      
      // 分析位置信息
      if (node.loc && node.loc.start) {
        logger.info(`${indent}   位置: line ${node.loc.start.line}, col ${node.loc.start.column}`);
      } else if (node.start !== undefined) {
        logger.info(`${indent}   偏移: ${node.start}`);
      } else {
        logger.info(`${indent}   位置: 无`);
      }
      
      // 统计子节点
      if (node.children && Array.isArray(node.children)) {
        logger.info(`${indent}   子节点: ${node.children.length}个`);
        if (depth < maxDepth) {
          node.children.forEach((child: any, index: number) => 
            analyzeNode(child, depth + 1, `${path}.children[${index}]`)
          );
        }
      }
      
      if (node.body && Array.isArray(node.body)) {
        logger.info(`${indent}   body节点: ${node.body.length}个`);
        if (depth < maxDepth) {
          node.body.forEach((child: any, index: number) => 
            analyzeNode(child, depth + 1, `${path}.body[${index}]`)
          );
        }
      }
    }
    
    analyzeNode(ast);
  }

  // ==================== 方法2: 使用 wxml-parser 查找组件位置 ====================
  function findComponentPositionsInWxmlByParser(jsonFilePath: string, componentName: string): ComponentPosition[] {
    logger.info('🔍 [PARSER] 开始在WXML中查找组件位置');
    logger.info('   📋 JSON文件:', jsonFilePath);
    logger.info('   🧩 组件名:', componentName);
    
    try {
      // 获取同名的wxml文件路径
      const wxmlFilePath = jsonFilePath.replace(/\.json$/, '.wxml');
      logger.info('   📄 对应WXML文件:', wxmlFilePath);
      
      // 检查wxml文件是否存在
      if (!fs.existsSync(wxmlFilePath)) {
        logger.info('❌ WXML文件不存在:', wxmlFilePath);
        return [];
      }
      logger.info('✅ WXML文件存在，开始读取和解析...');

      // 读取wxml文件内容
      const wxmlContent = fs.readFileSync(wxmlFilePath, 'utf8');
      logger.info('📊 文件内容长度:', wxmlContent.length, '字符');
      
      // 使用 wxml-parser 解析内容
      logger.info('🔧 开始解析 WXML AST...');
      const ast = parseWxml(wxmlContent);
      
      logger.info('✅ AST 解析完成:');
      logger.info('   📊 AST类型:', ast.type);
      logger.info('   📄 子节点数量:', ast.body?.length || 0);
      logger.info('   ❌ 解析错误数量:', ast.errors?.length || 0);
      
      // 调试模式：分析AST结构
      if (process.env.MPH_DEBUG_AST === 'true') {
        debugASTStructure(ast, 3);
      }
      
      // 如果有解析错误，记录但继续处理
      if (ast.errors && ast.errors.length > 0) {
        logger.warn('⚠️ WXML解析警告:');
        ast.errors.forEach((error, index) => {
          logger.warn(`   ${index + 1}. ${error.type}: ${error.value}`);
        });
      }
      
      const positions: ComponentPosition[] = [];
      
      // 递归遍历 AST 查找匹配的元素
      function traverseAST(node: any) {
        if (!node) return;
        
        // 检查当前节点是否是我们要找的组件
        if (node.type === 'WXElement' && node.name === componentName) {
          logger.info('🎯 [PARSER] 找到匹配的组件元素:');
          logger.info('   🧩 组件名:', node.name);
          logger.info('   🔍 节点结构调试:');
          logger.info('     📊 节点类型:', node.type);
          logger.info('     📍 节点位置信息:', node.loc ? '存在' : '不存在');
          logger.info('     🏷️ startTag信息:', node.startTag ? '存在' : '不存在');
          
          // 根据实际AST结构提取位置信息
          let position: ComponentPosition | null = null;
          
          // 方法1: 优先使用 startTag 的位置信息（更精确指向标签开始）
          if (node.startTag && node.startTag.loc && node.startTag.loc.start) {
            position = {
              line: node.startTag.loc.start.line,
              column: node.startTag.loc.start.column
            };
            logger.info('   📍 使用 startTag.loc 位置信息');
            logger.info(`     📄 行: ${position.line}, 列: ${position.column}`);
          }
          // 方法2: 使用节点本身的位置信息
          else if (node.loc && node.loc.start) {
            position = {
              line: node.loc.start.line,
              column: node.loc.start.column
            };
            logger.info('   📍 使用 node.loc 位置信息');
            logger.info(`     📄 行: ${position.line}, 列: ${position.column}`);
          }
          // 方法3: 回退到 start/startLine 属性（如果存在）
          else if (node.startLine && node.startColumn) {
            position = {
              line: node.startLine,
              column: node.startColumn
            };
            logger.info('   📍 使用 node.startLine/startColumn 位置信息');
            logger.info(`     📄 行: ${position.line}, 列: ${position.column}`);
          }
          // 方法4: 尝试从其他属性提取位置
          else if (typeof node.start === 'number') {
            // 如果只有字符偏移量，需要计算行列号
            const beforeMatch = wxmlContent.substring(0, node.start);
            const line = beforeMatch.split('\n').length;
            const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
            const column = lastNewlineIndex === -1 ? node.start + 1 : node.start - lastNewlineIndex;
            
            position = { line, column };
            logger.info('   📍 从字符偏移量计算位置信息');
            logger.info(`     🔢 字符偏移: ${node.start} -> 行: ${line}, 列: ${column}`);
          }
          
          if (position) {
            logger.info(`   ✅ 最终位置: line ${position.line}, col ${position.column}`);
            positions.push(position);
            
            // 显示上下文信息
            try {
              const lines = wxmlContent.split('\n');
              const contextLine = lines[position.line - 1];
              if (contextLine) {
                const trimmedLine = contextLine.trim();
                logger.info(`   📝 匹配行内容: "${trimmedLine}"`);
                
                // 高亮显示匹配的组件名（如果可能）
                if (contextLine.includes(`<${componentName}`)) {
                  const highlightIndex = contextLine.indexOf(`<${componentName}`);
                  logger.info(`   🎯 组件位置: 行内第${highlightIndex + 1}个字符开始`);
                }
              }
            } catch (e) {
              logger.warn('   ⚠️ 无法获取上下文信息:', e);
            }
          } else {
            logger.warn('   ❌ 无法从任何属性获取位置信息，跳过此节点');
            logger.info('   🔧 节点调试信息:');
            logger.info('     📊 可用属性:', Object.keys(node));
            logger.info('     🏷️ startTag属性:', node.startTag ? Object.keys(node.startTag) : '无');
          }
        }
        
        // 递归遍历子节点
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(traverseAST);
        }
        
        // 遍历 body 节点（用于根节点）  
        if (node.body && Array.isArray(node.body)) {
          node.body.forEach(traverseAST);
        }
      }
      
      // 开始遍历 AST
      logger.info('🔍 开始遍历 AST 查找组件...');
      traverseAST(ast);
      
      logger.info('📊 [PARSER] WXML扫描完成统计:');
      logger.info('   🎯 找到的组件数量:', positions.length);
      
      return positions;
    } catch (error) {
      logger.error('❌ [PARSER] 解析WXML文件时出错:', jsonFilePath.replace('.json', '.wxml'), error);
      logger.error('   💡 回退到正则表达式方法');
      // 发生错误时回退到正则表达式方法
      return findComponentPositionsInWxmlByRegex(jsonFilePath, componentName);
    }
  }

  // ==================== 通用的组件位置查找函数 ====================
  function findComponentPositionsInWxml(
    jsonFilePath: string, 
    componentName: string, 
    method: ParseMethod = ParseMethod.PARSER
  ): ComponentPosition[] {
    logger.info(`🔧 使用 ${method.toUpperCase()} 方法查找组件位置`);
    
    switch (method) {
      case ParseMethod.REGEX:
        return findComponentPositionsInWxmlByRegex(jsonFilePath, componentName);
      case ParseMethod.PARSER:
        return findComponentPositionsInWxmlByParser(jsonFilePath, componentName);
      default:
        logger.warn('⚠️ 未知的解析方法，使用默认的 PARSER 方法');
        return findComponentPositionsInWxmlByParser(jsonFilePath, componentName);
    }
  }

  // 获取目标组件路径
  logger.info('🎯 开始解析目标组件路径...');
  const targetComponentPath = getTargetComponentPath(currentFilePath);
  const targetAbsolutePath = normalizePath(targetComponentPath);
  logger.info('✅ 目标组件路径解析完成:');
  logger.info('   📁 相对路径:', targetComponentPath);
  logger.info('   📂 绝对路径:', targetAbsolutePath);

  // 递归查找组件使用情况
  function searchComponentUsages(dir: string): void {
    logger.info('📂 扫描目录:', path.relative(workspaceRoot, dir));
    
    let files: string[];
    try {
      files = fs.readdirSync(dir);
      logger.info('📄 找到', files.length, '个文件/目录');
    } catch (error) {
      logger.error('❌ 无法读取目录:', dir, error);
      return;
    }

    let jsonFileCount = 0;
    let dirCount = 0;

    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          dirCount++;
          logger.info('📁 进入子目录:', file);
          searchComponentUsages(fullPath);
        } else if (file.endsWith('.json')) {
          jsonFileCount++;
          logger.info('📋 处理JSON文件:', file);
        try {
          const jsonContent = fs.readFileSync(fullPath, 'utf8');
          const json = JSON.parse(jsonContent);
          logger.info('✅ JSON文件解析成功');

          if (json.usingComponents) {
            const componentCount = Object.keys(json.usingComponents).length;
            logger.info('🔍 发现', componentCount, '个组件声明');
            
            for (const [componentName, compPath] of Object.entries(json.usingComponents)) {
              logger.info('🧩 分析组件:', componentName);
              logger.info('   📍 声明路径:', compPath);
              
              const jsonDir = path.dirname(fullPath);
              let resolvedPath: string;

              // 处理绝对路径（以 / 开头）
              if (typeof compPath === 'string' && compPath.startsWith('/')) {
                // 尝试多种可能的根目录结构
                const possibleRoots = [
                  path.resolve(workspaceRoot, 'src/miniprogram'),
                  path.resolve(workspaceRoot, 'miniprogram'), 
                  path.resolve(workspaceRoot, 'app'),
                  scanRoot
                ];
                
                // 找到第一个存在的根目录
                let foundRoot = scanRoot;
                for (const root of possibleRoots) {
                  const testPath = path.resolve(root + compPath);
                  if (fs.existsSync(testPath + '.js') || fs.existsSync(testPath + '.ts') || fs.existsSync(testPath)) {
                    foundRoot = root;
                    break;
                  }
                }
                
                resolvedPath = path.resolve(foundRoot + compPath);
                logger.info('   🌐 解析为绝对路径:', resolvedPath);
                logger.info('   🏠 使用根目录:', foundRoot);
              } else {
                // 处理相对路径
                resolvedPath = path.resolve(jsonDir, compPath as string);
                logger.info('   📁 解析为相对路径:', resolvedPath);
              }

              // 标准化路径进行比较
              const normalizedResolvedPath = normalizePath(resolvedPath);
              const normalizedTargetPath = normalizePath(targetAbsolutePath);
              logger.info('   🔧 标准化解析路径:', normalizedResolvedPath);
              logger.info('   🎯 标准化目标路径:', normalizedTargetPath);
              
              // 更精确的路径匹配：检查是否指向同一个组件目录
              const isMatch = normalizedResolvedPath === normalizedTargetPath || 
                            normalizedResolvedPath.startsWith(normalizedTargetPath + path.sep) ||
                            normalizedTargetPath.startsWith(normalizedResolvedPath + path.sep) ||
                            path.basename(normalizedResolvedPath) === path.basename(normalizedTargetPath);
              
              logger.info('   🔍 路径匹配结果:', isMatch ? '✅ 匹配' : '❌ 不匹配');

              if (isMatch) {
                logger.info('🎉 找到匹配的组件引用！开始检查WXML使用情况...');
                
                // 🔥 这里是关键修改：使用新的通用函数，支持两种解析方法
                const positions = findComponentPositionsInWxml(fullPath, componentName, parseMethod);
                
                if (positions.length > 0) {
                  const relativeFilePath = path.relative(workspaceRoot, fullPath);
                  const wxmlFilePath = fullPath.replace(/\.json$/, '.wxml');
                  const wxmlRelativePath = relativeFilePath.replace(/\.json$/, '.wxml');
                  
                  logger.info('📦 创建结果对象:');
                  logger.info('   🧩 组件名:', componentName);
                  logger.info('   📄 JSON文件:', relativeFilePath);
                  logger.info('   📄 WXML文件:', wxmlRelativePath);
                  logger.info('   📍 引用路径:', compPath);
                  logger.info('   📌 使用位置数量:', positions.length);
                  logger.info('   🔧 解析方法:', parseMethod.toUpperCase());
                  
                  const result = {
                    componentName,
                    usedInFile: fullPath,
                    referencePath: compPath as string,
                    relativeFilePath,
                    wxmlFilePath,
                    wxmlRelativePath,
                    positions
                  };
                  
                  results.push(result);
                  logger.info('✅ 结果已添加到列表，当前总数:', results.length);

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
        } else {
          // 跳过非JSON文件
          logger.info('⏭️ 跳过非JSON文件:', file);
        }
      } catch (error) {
        logger.error('❌ 处理文件时出错:', file, error);
      }
    }
    
    logger.info('📊 目录扫描完成:');
    logger.info('   📁 子目录数量:', dirCount);
    logger.info('   📋 JSON文件数量:', jsonFileCount);
    logger.info('   📄 总文件数量:', files.length);
  }

  logger.info('🔍 正在查找组件引用:', targetComponentPath);
  searchComponentUsages(scanRoot);
  logger.info(`🎉 搜索完成！使用 ${parseMethod.toUpperCase()} 方法找到`, results.length, '个引用');

  return results;
}

// ==================== 测试和调试函数 ====================
export function testWxmlParser(wxmlContent: string, componentName?: string): any {
  logger.info('🧪 [TEST] 开始测试 WXML 解析器');
  logger.info('   📄 内容长度:', wxmlContent.length, '字符');
  
  try {
    // 解析 WXML
    const ast = parseWxml(wxmlContent);
    logger.info('✅ AST 解析成功');
    logger.info('   📊 类型:', ast.type);
    logger.info('   📄 子节点数量:', ast.body?.length || 0);
    logger.info('   ❌ 错误数量:', ast.errors?.length || 0);
    
    // 如果指定了组件名，查找该组件
    if (componentName) {
      logger.info(`🔍 搜索组件: ${componentName}`);
      const positions: ComponentPosition[] = [];
      
      function traverseForTest(node: any): void {
        if (!node) return;
        
        if (node.type === 'WXElement' && node.name === componentName) {
          let position: ComponentPosition | null = null;
          
          if (node.startTag && node.startTag.loc && node.startTag.loc.start) {
            position = {
              line: node.startTag.loc.start.line,
              column: node.startTag.loc.start.column
            };
          } else if (node.loc && node.loc.start) {
            position = {
              line: node.loc.start.line,
              column: node.loc.start.column
            };
          }
          
          if (position) {
            positions.push(position);
            logger.info(`   🎯 找到组件: line ${position.line}, col ${position.column}`);
          }
        }
        
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(traverseForTest);
        }
        if (node.body && Array.isArray(node.body)) {
          node.body.forEach(traverseForTest);
        }
      }
      
      traverseForTest(ast);
      logger.info(`📊 总共找到 ${positions.length} 个 ${componentName} 组件`);
      
      return { ast, positions };
    }
    
    return { ast };
  } catch (error) {
    logger.error('❌ 解析失败:', error);
    return { error };
  }
}

// ==================== 导出便捷函数 ====================
export function findComponentUsagesWithRegex(currentFilePath: string, projectRoot?: string): ComponentUsage[] {
  return findComponentUsages(currentFilePath, projectRoot, ParseMethod.REGEX);
}

export function findComponentUsagesWithParser(currentFilePath: string, projectRoot?: string): ComponentUsage[] {
  return findComponentUsages(currentFilePath, projectRoot, ParseMethod.PARSER);
}

// 如果直接运行此文件，使用命令行参数
if (import.meta.url === `file://${process.argv[1]}`) {
  const currentFilePath = process.argv[2];
  const method = process.argv[3] as ParseMethod || ParseMethod.PARSER;
  
  if (!currentFilePath) {
    logger.error('❌ 请提供文件路径参数');
    logger.info('用法: node find-usage.ts <文件路径> [regex|parser]');
    process.exit(1);
  }

  const results = findComponentUsages(currentFilePath, undefined, method);
  logger.info(`📊 最终结果: 使用 ${method.toUpperCase()} 方法找到`, results.length, '个组件引用');
}