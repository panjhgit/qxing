/**
 * 内存管理优化配置 (memory-optimization.js)
 * 
 * 功能：
 * - 内存使用监控
 * - 垃圾回收优化建议
 * - 对象生命周期管理
 * - 内存泄漏检测配置
 */

// 内存优化配置
const MEMORY_CONFIG = {
    // 内存监控配置
    MONITORING: {
        ENABLED: true,
        INTERVAL: 5000, // 5秒检查一次
        WARNING_THRESHOLD: 50 * 1024 * 1024, // 50MB警告阈值
        CRITICAL_THRESHOLD: 100 * 1024 * 1024, // 100MB临界阈值
        MAX_OBJECTS_PER_TYPE: 1000, // 每种类型最大对象数
        CLEANUP_INTERVAL: 30000 // 30秒清理一次
    },
    
    // 对象池配置
    OBJECT_POOL: {
        ENABLED: true,
        INITIAL_SIZE: 20,
        MAX_SIZE: 200,
        EXPANSION_THRESHOLD: 0.8, // 使用率80%时扩容
        SHRINK_THRESHOLD: 0.3, // 使用率30%时收缩
        CLEANUP_AGE: 300000 // 5分钟清理过期对象
    },
    
    // 垃圾回收配置
    GARBAGE_COLLECTION: {
        ENABLED: true,
        FORCE_GC_INTERVAL: 60000, // 1分钟强制GC
        MEMORY_THRESHOLD: 80 * 1024 * 1024, // 80MB时强制GC
        OBJECT_COUNT_THRESHOLD: 5000 // 对象数量超过5000时强制GC
    },
    
    // 内存泄漏检测配置
    LEAK_DETECTION: {
        ENABLED: true,
        CHECK_INTERVAL: 10000, // 10秒检查一次
        WARNING_THRESHOLD: 100, // 100个对象警告
        CRITICAL_THRESHOLD: 500, // 500个对象临界
        MAX_AGE: 300000 // 5分钟最大对象年龄
    }
};

// 内存监控器
class MemoryMonitor {
    constructor() {
        this.stats = {
            totalMemory: 0,
            usedMemory: 0,
            freeMemory: 0,
            objectCounts: {},
            lastCheck: 0,
            warnings: [],
            optimizations: []
        };
        
        this.isMonitoring = false;
        this.monitorInterval = null;
        

    }
    
    // 开始监控
    start() {
        if (this.isMonitoring) {
            throw new Error('内存监控已在运行中');
            return;
        }
        
        this.isMonitoring = true;
        this.monitorInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, MEMORY_CONFIG.MONITORING.INTERVAL);
        

    }
    
    // 停止监控
    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        this.isMonitoring = false;

    }
    
    // 检查内存使用情况
    checkMemoryUsage() {
        // 获取内存信息（如果可用）
        if (performance && performance.memory) {
            this.stats.totalMemory = performance.memory.totalJSHeapSize;
            this.stats.usedMemory = performance.memory.usedJSHeapSize;
            this.stats.freeMemory = performance.memory.totalJSHeapSize - performance.memory.usedJSHeapSize;
        }
        
        // 检查对象池状态
        this.checkObjectPoolStatus();
        
        // 检查内存泄漏
        this.checkMemoryLeaks();
        
        // 生成优化建议
        this.generateOptimizations();
        
        this.stats.lastCheck = Date.now();
    }
    
    // 检查对象池状态
    checkObjectPoolStatus() {
        if (!window.objectPoolManager) return;
        
        const poolStats = window.objectPoolManager.getPerformanceStats();
        this.stats.objectCounts = {};
        
        poolStats.pools.forEach(pool => {
            this.stats.objectCounts[pool.type] = {
                total: pool.poolSize,
                active: pool.activeCount,
                inactive: pool.inactiveCount,
                hitRate: pool.hitRate
            };
        });
    }
    
    // 检查内存泄漏
    checkMemoryLeaks() {
        if (!MEMORY_CONFIG.LEAK_DETECTION.ENABLED) return;
        
        for (const [type, info] of Object.entries(this.stats.objectCounts)) {
            if (info.active > MEMORY_CONFIG.LEAK_DETECTION.CRITICAL_THRESHOLD) {
                this.addWarning('CRITICAL', `严重内存泄漏: ${type} 类型有 ${info.active} 个活跃对象`);
            } else if (info.active > MEMORY_CONFIG.LEAK_DETECTION.WARNING_THRESHOLD) {
                this.addWarning('WARNING', `内存泄漏警告: ${type} 类型有 ${info.active} 个活跃对象`);
            }
        }
    }
    
    // 生成优化建议
    generateOptimizations() {
        this.stats.optimizations = [];
        
        // 检查对象池命中率
        for (const [type, info] of Object.entries(this.stats.objectCounts)) {
            if (info.hitRate < 0.5) {
                this.stats.optimizations.push(`建议优化 ${type} 对象池，当前命中率: ${(info.hitRate * 100).toFixed(1)}%`);
            }
        }
        
        // 检查内存使用
        if (this.stats.usedMemory > MEMORY_CONFIG.MONITORING.WARNING_THRESHOLD) {
            this.stats.optimizations.push(`内存使用较高: ${(this.stats.usedMemory / 1024 / 1024).toFixed(1)}MB，建议清理无用对象`);
        }
        
        // 检查对象数量
        const totalObjects = Object.values(this.stats.objectCounts).reduce((sum, info) => sum + info.total, 0);
        if (totalObjects > MEMORY_CONFIG.MONITORING.MAX_OBJECTS_PER_TYPE) {
            this.stats.optimizations.push(`对象数量过多: ${totalObjects}，建议优化对象创建和销毁逻辑`);
        }
    }
    
    // 添加警告
    addWarning(level, message) {
        const warning = {
            level: level,
            message: message,
            timestamp: Date.now()
        };
        
        this.stats.warnings.push(warning);
        
        // 限制警告数量
        if (this.stats.warnings.length > 100) {
            this.stats.warnings.shift();
        }
        
        // 输出警告
        if (level === 'CRITICAL') {
            console.error('🚨', message);
        } else {
            console.warn('⚠️', message);
        }
    }
    
    // 获取内存统计
    getMemoryStats() {
        return {
            ...this.stats,
            monitoring: this.isMonitoring,
            config: MEMORY_CONFIG
        };
    }
    
    // 重置监控器
    reset() {
        this.stats = {
            totalMemory: 0,
            usedMemory: 0,
            freeMemory: 0,
            objectCounts: {},
            lastCheck: 0,
            warnings: [],
            optimizations: []
        };
        

    }
}

// 创建全局内存监控器实例
const memoryMonitor = new MemoryMonitor();

// 导出
export { MemoryMonitor, memoryMonitor, MEMORY_CONFIG };
export default memoryMonitor;
