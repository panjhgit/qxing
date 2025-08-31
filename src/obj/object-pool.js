/**
 * 高性能对象池管理器 (object-pool.js)
 *
 * 功能：
 * - 对象复用，减少垃圾回收
 * - 支持多种对象类型
 * - 自动扩容和收缩
 * - 性能监控和统计
 * - 内存泄漏检测
 */

// 对象池配置
const POOL_CONFIG = {
    // 初始池大小
    INITIAL_POOL_SIZE: 20,

    // 最大池大小
    MAX_POOL_SIZE: 200,

    // 扩容因子
    EXPANSION_FACTOR: 1.5,

    // 收缩阈值（使用率低于此值时收缩）
    SHRINK_THRESHOLD: 0.3,

    // 收缩因子
    SHRINK_FACTOR: 0.7,

    // 清理间隔（帧数）
    CLEANUP_INTERVAL: 300,

    // 内存泄漏检测阈值
    LEAK_DETECTION_THRESHOLD: 1000
};

// 对象池项
class PoolItem {
    constructor(object, type, isActive = false) {
        this.object = object;
        this.type = type;
        this.isActive = isActive;
        this.lastUsed = Date.now();
        this.useCount = 0;
        this.createdAt = Date.now();
    }

    // 激活对象
    activate() {
        this.isActive = true;
        this.lastUsed = Date.now();
        this.useCount++;
    }

    // 停用对象
    deactivate() {
        this.isActive = false;
    }

    // 重置对象状态
    reset() {
        if (this.object && typeof this.object.reset === 'function') {
            this.object.reset();
        }
        this.deactivate();
    }

    // 检查对象是否过期
    isExpired(maxAge = 300000) { // 默认5分钟
        return Date.now() - this.createdAt > maxAge;
    }
}

// 对象池类
class ObjectPool {
    constructor(type, createFunction, resetFunction = null) {
        this.type = type;
        this.createFunction = createFunction;
        this.resetFunction = resetFunction;

        // 池状态
        this.activeItems = new Set();
        this.inactiveItems = [];
        this.totalCreated = 0;
        this.totalReused = 0;

        // 性能统计
        this.stats = {
            poolSize: 0, activeCount: 0, inactiveCount: 0, hitRate: 0, memoryUsage: 0, lastCleanup: 0
        };

        // 初始化池
        this.initialize();
    }

    // 初始化对象池
    initialize() {
        console.log(`🔧 初始化对象池: ${this.type}`);

        // 预创建初始对象
        for (let i = 0; i < POOL_CONFIG.INITIAL_POOL_SIZE; i++) {
            this.createNewItem();
        }

        this.updateStats();
        console.log(`✅ 对象池初始化完成: ${this.type}, 初始大小: ${this.inactiveItems.length}`);
    }

    // 创建新对象
    createNewItem() {
        const object = this.createFunction();
        if (object) {
            const poolItem = new PoolItem(object, this.type);
            this.inactiveItems.push(poolItem);
            this.totalCreated++;
            return poolItem;
        }
        return null;
    }

    // 获取对象（优先从池中获取）
    get() {
        let poolItem = null;

        // 尝试从非活跃池中获取
        if (this.inactiveItems.length > 0) {
            poolItem = this.inactiveItems.pop();
            this.totalReused++;
        } else {
            // 池为空，创建新对象
            poolItem = this.createNewItem();
        }

        if (poolItem) {
            // 激活对象
            poolItem.activate();
            this.activeItems.add(poolItem);
            this.updateStats();

            return poolItem.object;
        }

        return null;
    }

    // 归还对象到池中
    return(object) {
        if (!object) return false;

        // 查找对应的池项
        let poolItem = null;
        for (const item of this.activeItems) {
            if (item.object === object) {
                poolItem = item;
                break;
            }
        }

        if (poolItem) {
            // 重置对象状态
            poolItem.reset();

            // 从活跃集合移除
            this.activeItems.delete(poolItem);

            // 检查池大小，决定是否添加到非活跃池
            if (this.inactiveItems.length < POOL_CONFIG.MAX_POOL_SIZE) {
                this.inactiveItems.push(poolItem);
            } else {
                // 池已满，丢弃对象
                this.totalCreated--;
            }

            this.updateStats();
            return true;
        }

        return false;
    }

    // 扩容池
    expand() {
        const currentSize = this.inactiveItems.length;
        const newSize = Math.floor(currentSize * POOL_CONFIG.EXPANSION_FACTOR);
        const expandCount = Math.min(newSize - currentSize, POOL_CONFIG.MAX_POOL_SIZE - currentSize);

        if (expandCount > 0) {
            console.log(`📈 扩容对象池: ${this.type}, 从 ${currentSize} 扩容到 ${currentSize + expandCount}`);

            for (let i = 0; i < expandCount; i++) {
                this.createNewItem();
            }

            this.updateStats();
        }
    }

    // 收缩池
    shrink() {
        const currentSize = this.inactiveItems.length;
        const newSize = Math.floor(currentSize * POOL_CONFIG.SHRINK_FACTOR);
        const shrinkCount = currentSize - newSize;

        if (shrinkCount > 0 && currentSize > POOL_CONFIG.INITIAL_POOL_SIZE) {
            console.log(`📉 收缩对象池: ${this.type}, 从 ${currentSize} 收缩到 ${newSize}`);

            // 移除最旧的对象
            this.inactiveItems.splice(0, shrinkCount);
            this.updateStats();
        }
    }

    // 清理过期对象
    cleanup() {
        const now = Date.now();
        const maxAge = 300000; // 5分钟

        // 清理活跃对象中的过期项
        for (const item of this.activeItems) {
            if (item.isExpired(maxAge)) {
                console.warn(`检测到过期对象: ${this.type}, 使用时间: ${now - item.lastUsed}ms`);
                this.activeItems.delete(item);
                this.totalCreated--;
            }
        }

        // 清理非活跃对象中的过期项
        this.inactiveItems = this.inactiveItems.filter(item => !item.isExpired(maxAge));

        this.updateStats();
        this.stats.lastCleanup = now;
    }

    // 更新统计信息
    updateStats() {
        this.stats.poolSize = this.inactiveItems.length + this.activeItems.size;
        this.stats.activeCount = this.activeItems.size;
        this.stats.inactiveCount = this.inactiveItems.length;

        // 计算命中率
        const totalRequests = this.totalCreated + this.totalReused;
        this.stats.hitRate = totalRequests > 0 ? (this.totalReused / totalRequests) : 0;

        // 估算内存使用
        this.stats.memoryUsage = this.stats.poolSize * 1024; // 假设每个对象1KB
    }

    // 获取统计信息
    getStats() {
        this.updateStats();
        return {
            ...this.stats, totalCreated: this.totalCreated, totalReused: this.totalReused, type: this.type
        };
    }

    // 重置池
    reset() {
        console.log(`🔄 重置对象池: ${this.type}`);

        // 清空所有对象
        this.activeItems.clear();
        this.inactiveItems = [];

        // 重置统计
        this.totalCreated = 0;
        this.totalReused = 0;

        // 重新初始化
        this.initialize();
    }

    // 销毁池
    destroy() {
        console.log(`🗑️ 销毁对象池: ${this.type}`);

        this.activeItems.clear();
        this.inactiveItems = [];
        this.totalCreated = 0;
        this.totalReused = 0;
    }

    // 获取对象池统计信息
}

// 对象池管理器
class ObjectPoolManager {
    constructor() {
        this.pools = new Map();
        this.frameCount = 0;
        this.lastCleanup = 0;

        // 性能监控
        this.performanceStats = {
            totalPools: 0, totalObjects: 0, totalMemoryUsage: 0, averageHitRate: 0, lastOptimization: 0
        };

        // 内存泄漏检测
        this.leakDetection = {
            enabled: true, threshold: POOL_CONFIG.LEAK_DETECTION_THRESHOLD, warnings: []
        };

        console.log('🚀 对象池管理器初始化完成');
    }

    // 创建对象池
    createPool(type, createFunction, resetFunction = null) {
        if (this.pools.has(type)) {
            console.warn(`对象池已存在: ${type}`);
            return this.pools.get(type);
        }

        const pool = new ObjectPool(type, createFunction, resetFunction);
        this.pools.set(type, pool);
        this.performanceStats.totalPools = this.pools.size;

        console.log(`✅ 创建对象池: ${type}`);
        return pool;
    }

    // 获取对象池
    getPool(type) {
        return this.pools.get(type);
    }

    // 从池中获取对象
    getObject(type) {
        const pool = this.pools.get(type);
        if (pool) {
            return pool.get();
        }

        console.warn(`对象池不存在: ${type}`);
        return null;
    }


    // 更新管理器
    update() {
        this.frameCount++;

        // 定期清理
        if (this.frameCount - this.lastCleanup >= POOL_CONFIG.CLEANUP_INTERVAL) {
            this.performCleanup();
            this.lastCleanup = this.frameCount;
        }

        // 定期优化
        if (this.frameCount % 600 === 0) { // 每10秒
            this.optimizePools();
        }

        // 内存泄漏检测
        if (this.leakDetection.enabled && this.frameCount % 300 === 0) {
            this.detectMemoryLeaks();
        }
    }

    // 执行清理
    performCleanup() {
        console.log('🧹 执行对象池清理...');

        let cleanedCount = 0;
        for (const [type, pool] of this.pools) {
            const beforeSize = pool.stats.poolSize;
            pool.cleanup();
            const afterSize = pool.stats.poolSize;
            cleanedCount += beforeSize - afterSize;
        }

        if (cleanedCount > 0) {
            console.log(`✅ 清理完成，释放 ${cleanedCount} 个对象`);
        }

        this.updatePerformanceStats();
    }

    // 优化对象池
    optimizePools() {
        console.log('⚡ 优化对象池...');

        for (const [type, pool] of this.pools) {
            const stats = pool.getStats();

            // 检查是否需要扩容
            if (stats.activeCount > stats.inactiveCount * 0.8) {
                pool.expand();
            }

            // 检查是否需要收缩
            if (stats.inactiveCount > stats.activeCount * 2) {
                pool.shrink();
            }
        }

        this.performanceStats.lastOptimization = Date.now();
        this.updatePerformanceStats();
    }

    // 检测内存泄漏
    detectMemoryLeaks() {
        for (const [type, pool] of this.pools) {
            const stats = pool.getStats();

            // 检查活跃对象数量是否异常增长
            if (stats.activeCount > this.leakDetection.threshold) {
                const warning = {
                    type: type,
                    activeCount: stats.activeCount,
                    timestamp: Date.now(),
                    message: `活跃对象数量异常: ${stats.activeCount}`
                };

                this.leakDetection.warnings.push(warning);
                console.warn(`内存泄漏警告: ${type} - ${warning.message}`);
            }
        }

        // 清理旧警告
        const now = Date.now();
        this.leakDetection.warnings = this.leakDetection.warnings.filter(warning => now - warning.timestamp < 60000 // 保留1分钟内的警告
        );
    }

    // 更新性能统计
    updatePerformanceStats() {
        let totalObjects = 0;
        let totalMemoryUsage = 0;
        let totalHitRate = 0;
        let poolCount = 0;

        for (const pool of this.pools.values()) {
            const stats = pool.getStats();
            totalObjects += stats.poolSize;
            totalMemoryUsage += stats.memoryUsage;
            totalHitRate += stats.hitRate;
            poolCount++;
        }

        this.performanceStats.totalObjects = totalObjects;
        this.performanceStats.totalMemoryUsage = totalMemoryUsage;
        this.performanceStats.averageHitRate = poolCount > 0 ? totalHitRate / poolCount : 0;
    }

    // 获取性能统计
    getPerformanceStats() {
        this.updatePerformanceStats();
        return {
            ...this.performanceStats,
            pools: Array.from(this.pools.entries()).map(([type, pool]) => pool.getStats()),
            leakWarnings: this.leakDetection.warnings.length,
            frameCount: this.frameCount
        };
    }

    // 重置所有池
    resetAllPools() {
        console.log('🔄 重置所有对象池...');

        for (const pool of this.pools.values()) {
            pool.reset();
        }

        this.frameCount = 0;
        this.lastCleanup = 0;
        this.updatePerformanceStats();
    }

}

// 创建全局对象池管理器实例
const objectPoolManager = new ObjectPoolManager();

// 导出
export {ObjectPool, ObjectPoolManager, objectPoolManager, POOL_CONFIG};
export default objectPoolManager;
