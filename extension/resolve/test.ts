import { resolveDependencies } from './resolve';
import * as fs from 'fs';
import * as path from 'path';

// 日志输出类
class Logger {
  private logFile: string;
  private logStream: fs.WriteStream;

  constructor(logFile: string) {
    this.logFile = logFile;
    // 确保日志目录存在
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 创建写入流
    this.logStream = fs.createWriteStream(logFile, { flags: 'w' });
  }

  log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // 同时输出到控制台和文件
    console.log(message);
    this.logStream.write(logMessage + '\n');
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorMessage = error ? `${message}: ${error.message || error}` : message;
    const logMessage = `[${timestamp}] ERROR: ${errorMessage}`;
    
    // 同时输出到控制台和文件
    console.error(errorMessage);
    this.logStream.write(logMessage + '\n');
    
    if (error && error.stack) {
      this.logStream.write(`[${timestamp}] STACK: ${error.stack}\n`);
    }
  }

  close() {
    this.logStream.end();
  }
}

async function testResolver() {
  const pagesDir = '/Users/youshiyitian/Code/xiaodian/github/wxa-channels-shop/src/miniprogram/subpackages/wxRecommend/pages';
  
  // 创建日志文件
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const logFile = path.join(__dirname, 'logs', `test-${timestamp}.log`);
  const logger = new Logger(logFile);
  
  logger.log('开始测试依赖解析器...');
  logger.log(`测试目录: ${pagesDir}`);
  logger.log(`日志文件: ${logFile}`);
  
  try {
    const startTime = Date.now();
    const dependencies = await resolveDependencies(pagesDir);
    const endTime = Date.now();
    
    logger.log('\n=== 解析完成 ===');
    logger.log(`解析耗时: ${endTime - startTime}ms`);
    logger.log(`依赖关系总数: ${Object.keys(dependencies).length}`);
    
    // 统计信息
    let totalDependencies = 0;
    for (const deps of Object.values(dependencies)) {
      totalDependencies += deps.length;
    }
    
    logger.log(`总依赖数: ${totalDependencies}`);
    
    // 显示详细的依赖关系
    logger.log('\n=== 详细依赖关系 ===');
    for (const [component, deps] of Object.entries(dependencies)) {
      if (deps.length > 0) {
        logger.log(`${component}:`);
        deps.forEach(dep => logger.log(`  -> ${dep}`));
      } else {
        logger.log(`${component}: (无依赖)`);
      }
    }
    
    // 将完整的依赖图输出到JSON格式
    logger.log('\n=== JSON格式依赖图 ===');
    logger.log(JSON.stringify(dependencies, null, 2));
    
    // 将依赖图保存到单独的JSON文件
    const jsonOutputFile = path.join(__dirname, 'logs', `dependencies-${timestamp}.json`);
    await fs.promises.writeFile(jsonOutputFile, JSON.stringify(dependencies, null, 2), 'utf-8');
    logger.log(`\n依赖图JSON已保存到: ${jsonOutputFile}`);
    
    logger.log('\n=== 测试完成 ===');
    logger.log(`结果已保存到: ${logFile}`);
    
  } catch (error) {
    logger.error('测试失败', error);
  } finally {
    logger.close();
  }
}

// 运行测试
testResolver();
