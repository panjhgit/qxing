/**
 * 对象管理健康检查工具 (health-checker.js)
 * 
 * 功能：
 * - 检测内存泄漏
 * - 验证对象引用正确性
 * - 检查对象池性能
 * - 生成健康报告
 */

// 健康检查配置
const HEALTH_CHECK_CONFIG = {
    // 检查间隔（帧数）
    CHECK_INTERVAL: 600, // 10秒（恢复正常频率）
    
    // 内存泄漏检测阈值
    LEAK_THRESHOLD: {
        ACTIVE_OBJECTS: 2000, // 提高阈值，适应正常游戏对象数量
        MEMORY_USAGE: 100 * 1024 * 1024, // 100MB（提高阈值）
        OBJECT_AGE: 600000 // 10分钟（提高阈值）
    },
    
    // 性能阈值
    PERFORMANCE_THRESHOLD: {
        POOL_HIT_RATE: 0.3, // 30%（降低阈值，适应游戏需求）
        OBJECT_CREATION_RATE: 20, // 每秒创建对象数（提高阈值）
        CLEANUP_INTERVAL: 30000 // 30秒（恢复正常频率）
    }
};

// 健康检查器类
class ObjectHealthChecker {
    constructor() {
        this.lastCheck = 0;
        this.frameCount = 0;
        this.healthHistory = [];
        this.maxHistorySize = 100;
        
        // 健康状态
        this.healthStatus = {
            overall: 'healthy',
            memoryLeaks: [],
            referenceIssues: [],
            performanceIssues: [],
            lastCheck: 0
        };
        
        // 对象管理健康检查器初始化完成
    }
    
    // 执行健康检查
    checkHealth() {
        this.frameCount++;
        
        // 定期检查
        if (this.frameCount - this.lastCheck < HEALTH_CHECK_CONFIG.CHECK_INTERVAL) {
            return this.healthStatus;
        }
        
        // 开始对象管理健康检查
        
        // 重置状态
        this.healthStatus = {
            overall: 'healthy',
            memoryLeaks: [],
            referenceIssues: [],
            performanceIssues: [],
            lastCheck: Date.now()
        };
        
        // 检查各个组件
        this.checkObjectManager();
        this.checkObjectPool();
        this.checkMemoryUsage();
        this.checkReferenceIntegrity();
        this.checkPerformance();
        
        // 更新整体状态
        this.updateOverallStatus();
        
        // 记录历史
        this.recordHealthHistory();
        
        this.lastCheck = this.frameCount;
        
        // 健康检查完成
        
        return this.healthStatus;
    }
    
    // 检查对象管理器
    checkObjectManager() {
        if (!window.objectManager) {
            this.healthStatus.referenceIssues.push('对象管理器未初始化');
            return;
        }
        
        try {
            const stats = window.objectManager.getStats();
            
            // 只在有问题时输出详细信息
            if (stats.totalObjects > HEALTH_CHECK_CONFIG.LEAK_THRESHOLD.ACTIVE_OBJECTS * 0.8) {
                // 对象管理器检查
            }
            
            // 🔴 智能检查：分析对象类型分布
            const zombieCount = stats.objectCounts.zombie || 0;
            const characterCount = stats.objectCounts.character || 0;
            const buildingCount = stats.objectCounts.building || 0;
            const partnerCount = stats.objectCounts.partner || 0;
            
            // 计算正常游戏对象的预期数量
            const expectedGameObjects = characterCount + partnerCount + buildingCount;
            const zombieRatio = zombieCount / Math.max(1, expectedGameObjects);
            

            
            // 检查对象数量（考虑游戏逻辑）
            if (stats.totalObjects > HEALTH_CHECK_CONFIG.LEAK_THRESHOLD.ACTIVE_OBJECTS) {
                // 如果僵尸比例过高（超过10:1），可能是问题
                if (zombieRatio > 10) {
                    this.healthStatus.memoryLeaks.push(`僵尸数量异常: ${zombieCount} 只僵尸，比例过高`);
                }
            }
            
            // 检查对象计数一致性
            const totalCount = Object.values(stats.objectCounts).reduce((sum, count) => sum + count, 0);
            if (totalCount !== stats.totalObjects) {
                this.healthStatus.referenceIssues.push(`对象计数不一致: 总计${stats.totalObjects}, 分类统计${totalCount}`);
            }
            
        } catch (error) {
            this.healthStatus.referenceIssues.push(`对象管理器检查失败: ${error.message}`);
        }
    }
    
    // 检查对象池
    checkObjectPool() {
        if (!window.objectPoolManager) {
            this.healthStatus.referenceIssues.push('对象池管理器未初始化');
            return;
        }
        
        try {
            const stats = window.objectPoolManager.getPerformanceStats();
            
            // 检查命中率
            if (stats.averageHitRate < HEALTH_CHECK_CONFIG.PERFORMANCE_THRESHOLD.POOL_HIT_RATE) {
                this.healthStatus.performanceIssues.push(`对象池命中率过低: ${(stats.averageHitRate * 100).toFixed(1)}%`);
            }
            
            // 检查内存使用
            if (stats.totalMemoryUsage > HEALTH_CHECK_CONFIG.LEAK_THRESHOLD.MEMORY_USAGE) {
                this.healthStatus.memoryLeaks.push(`对象池内存使用过高: ${(stats.totalMemoryUsage / 1024 / 1024).toFixed(1)}MB`);
            }
            
            // 检查泄漏警告
            if (stats.leakWarnings > 0) {
                this.healthStatus.memoryLeaks.push(`检测到 ${stats.leakWarnings} 个内存泄漏警告`);
            }
            
        } catch (error) {
            this.healthStatus.referenceIssues.push(`对象池检查失败: ${error.message}`);
        }
    }
    
    // 检查内存使用
    checkMemoryUsage() {
        if (!window.memoryMonitor) {
            this.healthStatus.referenceIssues.push('内存监控器未初始化');
            return;
        }
        
        try {
            const stats = window.memoryMonitor.getMemoryStats();
            
            // 检查内存使用
            if (stats.usedMemory > HEALTH_CHECK_CONFIG.LEAK_THRESHOLD.MEMORY_USAGE) {
                this.healthStatus.memoryLeaks.push(`内存使用过高: ${(stats.usedMemory / 1024 / 1024).toFixed(1)}MB`);
            }
            
            // 检查警告数量
            if (stats.warnings.length > 10) {
                this.healthStatus.memoryLeaks.push(`内存警告过多: ${stats.warnings.length} 个`);
            }
            
        } catch (error) {
            this.healthStatus.referenceIssues.push(`内存检查失败: ${error.message}`);
        }
    }
    
    // 检查引用完整性
    checkReferenceIntegrity() {
        // 检查全局引用
        const requiredGlobals = ['objectManager', 'objectPoolManager', 'memoryMonitor'];
        
        for (const global of requiredGlobals) {
            if (!window[global]) {
                this.healthStatus.referenceIssues.push(`全局引用缺失: ${global}`);
            }
        }
        
        // 🔴 新增：验证统一管理架构
        if (window.objectManager) {
            try {
                // 检查对象管理器是否包含所有类型的对象
                const objectTypes = ['character', 'zombie', 'partner', 'building', 'item', 'map'];
                for (const type of objectTypes) {
                    const objects = window.objectManager.getObjectsByType(type);
                    if (objects && objects.length > 0) {
                        // 验证对象引用
                        for (const obj of objects) {
                            if (!obj || !obj.id) {
                                this.healthStatus.referenceIssues.push(`对象管理器中存在无效的${type}对象引用`);
                                break;
                            }
                        }
                    }
                }
                
                // 检查各管理器是否使用对象管理器作为数据源
                const managers = ['zombieManager', 'characterManager', 'partnerManager'];
                for (const manager of managers) {
                    if (window[manager]) {
                        try {
                            // 验证管理器方法是否返回对象管理器中的数据
                            if (typeof window[manager].getAllZombies === 'function') {
                                const managerObjects = window[manager].getAllZombies();
                                const objectManagerObjects = window.objectManager.getAllZombies();
                                
                                if (managerObjects.length !== objectManagerObjects.length) {
                                    this.healthStatus.referenceIssues.push(`${manager} 与对象管理器数据不一致`);
                                }
                            }
                        } catch (error) {
                            this.healthStatus.referenceIssues.push(`${manager} 检查失败: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                this.healthStatus.referenceIssues.push(`统一管理架构验证失败: ${error.message}`);
            }
        }
    }
    
    // 检查性能
    checkPerformance() {
        // 检查对象创建频率
        if (window.objectPoolManager) {
            const stats = window.objectPoolManager.getPerformanceStats();
            
            // 计算对象创建率
            const timeElapsed = (Date.now() - this.healthStatus.lastCheck) / 1000;
            if (timeElapsed > 0) {
                const creationRate = stats.totalCreated / timeElapsed;
                if (creationRate > HEALTH_CHECK_CONFIG.PERFORMANCE_THRESHOLD.OBJECT_CREATION_RATE) {
                    this.healthStatus.performanceIssues.push(`对象创建频率过高: ${creationRate.toFixed(1)}/秒`);
                }
            }
        }
    }
    
    // 更新整体状态
    updateOverallStatus() {
        const hasMemoryLeaks = this.healthStatus.memoryLeaks.length > 0;
        const hasReferenceIssues = this.healthStatus.referenceIssues.length > 0;
        const hasPerformanceIssues = this.healthStatus.performanceIssues.length > 0;
        
        if (hasMemoryLeaks) {
            this.healthStatus.overall = 'critical';
        } else if (hasReferenceIssues) {
            this.healthStatus.overall = 'warning';
        } else if (hasPerformanceIssues) {
            this.healthStatus.overall = 'warning';
        } else {
            this.healthStatus.overall = 'healthy';
        }
    }
    
    // 记录健康历史
    recordHealthHistory() {
        this.healthHistory.push({
            timestamp: Date.now(),
            status: this.healthStatus.overall,
            issues: {
                memoryLeaks: this.healthStatus.memoryLeaks.length,
                referenceIssues: this.healthStatus.referenceIssues.length,
                performanceIssues: this.healthStatus.performanceIssues.length
            }
        });
        
        // 限制历史记录大小
        if (this.healthHistory.length > this.maxHistorySize) {
            this.healthHistory.shift();
        }
    }
    
    // 获取健康报告
    getHealthReport() {
        const report = {
            currentStatus: this.healthStatus,
            history: this.healthHistory,
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }
    
    // 生成建议
    generateRecommendations() {
        const recommendations = [];
        
        if (this.healthStatus.memoryLeaks.length > 0) {
            recommendations.push('🔴 立即检查内存泄漏问题');
            recommendations.push('建议增加对象清理频率');
        }
        
        if (this.healthStatus.referenceIssues.length > 0) {
            recommendations.push('🟡 检查对象引用完整性');
            recommendations.push('建议重启对象管理系统');
        }
        
        if (this.healthStatus.performanceIssues.length > 0) {
            recommendations.push('🟡 优化对象池配置');
            recommendations.push('建议调整对象创建策略');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('✅ 系统运行正常，无需特殊处理');
        }
        
        return recommendations;
    }
    
    // 重置检查器
    reset() {
        this.lastCheck = 0;
        this.frameCount = 0;
        this.healthHistory = [];
        this.healthStatus = {
            overall: 'healthy',
            memoryLeaks: [],
            referenceIssues: [],
            performanceIssues: [],
            lastCheck: 0
        };
    }

    // 🔴 新增：销毁检查器
    destroy() {
        console.log('🗑️ 销毁健康检查器...');
        
        // 重置状态
        this.reset();
        
        // 健康检查器不使用定时器，所以不需要清除定时器
        
        console.log('✅ 健康检查器已销毁');
    }
}

// 创建全局健康检查器实例
const objectHealthChecker = new ObjectHealthChecker();

// 导出
export { ObjectHealthChecker, objectHealthChecker, HEALTH_CHECK_CONFIG };
export default objectHealthChecker;
