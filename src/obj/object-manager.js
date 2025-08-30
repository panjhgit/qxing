/**
 * 对象管理器 (object-manager.js)
 * 
 * 功能：
 * - 统一管理游戏对象的生命周期
 * - 与对象池协同工作，管理对象内存
 * - 与四叉树协同工作，管理空间索引
 * - 避免功能重叠，明确职责分工
 */

import { objectPoolManager } from './object-pool.js';

// 对象类型枚举
const OBJECT_TYPE = {
    CHARACTER: 'character',
    ZOMBIE: 'zombie',
    BUILDING: 'building',
    ITEM: 'item'
};

// 对象状态枚举
const OBJECT_STATE = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DEAD: 'dead',
    DESTROYED: 'destroyed'
};

// 对象管理器类
class ObjectManager {
    constructor() {
        this.objects = new Map(); // 所有对象的映射
        this.objectCounts = new Map(); // 各类型对象的数量统计
        this.spatialIndex = null; // 空间索引引用
        
        // 初始化对象计数
        Object.values(OBJECT_TYPE).forEach(type => {
            this.objectCounts.set(type, 0);
        });
        
        console.log('🚀 对象管理器初始化完成');
    }
    
    // 设置空间索引引用
    setSpatialIndex(spatialIndex) {
        this.spatialIndex = spatialIndex;
        console.log('✅ 空间索引引用已设置');
    }
    
    // 创建对象
    createObject(type, createFunction, x, y, properties = {}) {
        if (!this.spatialIndex) {
            console.error('❌ 空间索引未设置');
            return null;
        }
        
        // 从对象池获取对象
        let object = null;
        if (objectPoolManager) {
            const pool = objectPoolManager.getPool(type);
            if (pool) {
                object = pool.get();
                if (object) {
                    // 重新初始化对象属性
                    this.initializeObject(object, type, x, y, properties);
                    console.log('✅ 从对象池获取对象:', type, object.id);
                }
            }
        }
        
        // 对象池不可用时，使用传统创建方式
        if (!object && createFunction) {
            object = createFunction(type, x, y, properties);
            console.log('✅ 传统方式创建对象:', type, object.id);
        }
        
        if (object) {
            // 添加到空间索引
            const spatialIndexResult = this.spatialIndex.addToSpatialIndex(object);
            if (spatialIndexResult) {
                // 设置空间索引ID
                object._spatialIndexId = Date.now() + Math.random();
                
                // 添加到对象管理器
                this.objects.set(object.id, {
                    object: object,
                    type: type,
                    state: OBJECT_STATE.ACTIVE,
                    createdAt: Date.now(),
                    lastUpdated: Date.now()
                });
                
                // 更新计数
                const currentCount = this.objectCounts.get(type) || 0;
                this.objectCounts.set(type, currentCount + 1);
                
                console.log('✅ 对象已添加到空间索引和管理器:', type, object.id);
                return object;
            } else {
                console.error('❌ 对象添加到空间索引失败:', type, object.id);
                return null;
            }
        }
        
        return null;
    }
    
    // 初始化对象属性
    initializeObject(object, type, x, y, properties) {
        if (!object) return;
        
        // 基础属性
        object.x = x || 0;
        object.y = y || 0;
        object.type = type;
        object.id = object.id || Date.now() + Math.random();
        
        // 应用自定义属性
        Object.assign(object, properties);
        
        // 调用对象的初始化方法
        if (typeof object.setupProperties === 'function') {
            object.setupProperties();
        }
        
        // 重置状态
        object.hp = object.maxHp || object.hp || 100;
        object.state = 'idle';
        object.isActive = true;
    }
    
    // 销毁对象
    destroyObject(objectId) {
        const objectInfo = this.objects.get(objectId);
        if (!objectInfo) {
            console.warn('⚠️ 对象不存在:', objectId);
            return false;
        }
        
        const { object, type } = objectInfo;
        console.log('🗑️ 销毁对象:', type, objectId);
        
        // 从空间索引移除
        if (this.spatialIndex && this.spatialIndex.removeFromSpatialIndex) {
            const removeResult = this.spatialIndex.removeFromSpatialIndex(object);
            if (removeResult) {
                console.log('✅ 对象已从空间索引移除:', objectId);
            } else {
                console.warn('⚠️ 对象从空间索引移除失败:', objectId);
            }
        }
        
        // 归还到对象池
        if (objectPoolManager) {
            const pool = objectPoolManager.getPool(type);
            if (pool) {
                // 重置对象状态
                object.hp = 0;
                object.state = OBJECT_STATE.DEAD;
                object.isActive = false;
                
                // 归还到对象池
                pool.return(object);
                console.log('✅ 对象已归还到对象池:', objectId);
            }
        }
        
        // 从对象管理器移除
        this.objects.delete(objectId);
        
        // 更新计数
        const currentCount = this.objectCounts.get(type) || 0;
        this.objectCounts.set(type, Math.max(0, currentCount - 1));
        
        console.log('✅ 对象已从管理器移除:', objectId);
        return true;
    }
    
    // 更新对象位置
    updateObjectPosition(objectId, newX, newY) {
        const objectInfo = this.objects.get(objectId);
        if (!objectInfo) {
            console.warn('⚠️ 对象不存在:', objectId);
            return false;
        }
        
        const { object } = objectInfo;
        const oldX = object.x;
        const oldY = object.y;
        
        // 更新对象位置
        object.x = newX;
        object.y = newY;
        
        // 更新空间索引
        if (this.spatialIndex && this.spatialIndex.updateSpatialIndex) {
            this.spatialIndex.updateSpatialIndex(object, oldX, oldY, newX, newY);
            console.log('✅ 对象位置已更新:', objectId, oldX + ',' + oldY, '->', newX + ',' + newY);
        }
        
        // 更新最后修改时间
        objectInfo.lastUpdated = Date.now();
        
        return true;
    }
    
    // 获取对象
    getObject(objectId) {
        const objectInfo = this.objects.get(objectId);
        return objectInfo ? objectInfo.object : null;
    }
    
    // 获取所有活跃对象
    getAllActiveObjects() {
        const activeObjects = [];
        for (const [id, info] of this.objects) {
            if (info.state === OBJECT_STATE.ACTIVE && info.object.isActive) {
                activeObjects.push(info.object);
            }
        }
        return activeObjects;
    }
    
    // 获取指定类型的对象
    getObjectsByType(type) {
        const typeObjects = [];
        for (const [id, info] of this.objects) {
            if (info.type === type && info.state === OBJECT_STATE.ACTIVE) {
                typeObjects.push(info.object);
            }
        }
        return typeObjects;
    }
    
    // 获取对象数量
    getObjectCount(type = null) {
        if (type) {
            return this.objectCounts.get(type) || 0;
        }
        
        let total = 0;
        for (const count of this.objectCounts.values()) {
            total += count;
        }
        return total;
    }
    
    // 清理无效对象
    cleanupInvalidObjects() {
        let cleanedCount = 0;
        
        for (const [id, info] of this.objects) {
            const object = info.object;
            
            // 检查对象是否应该被清理
            if (object.hp <= 0 || object.state === OBJECT_STATE.DEAD || !object.isActive) {
                console.log('🧹 清理无效对象:', info.type, id);
                this.destroyObject(id);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`✅ 清理完成，释放 ${cleanedCount} 个对象`);
        }
        
        return cleanedCount;
    }
    
    // 获取统计信息
    getStats() {
        const stats = {
            totalObjects: this.getObjectCount(),
            objectCounts: Object.fromEntries(this.objectCounts),
            activeObjects: this.getAllActiveObjects().length,
            lastCleanup: Date.now()
        };
        
        return stats;
    }
    
    // 重置管理器
    reset() {
        console.log('🔄 重置对象管理器...');
        
        // 清理所有对象
        for (const [id, info] of this.objects) {
            this.destroyObject(id);
        }
        
        // 重置计数
        Object.values(OBJECT_TYPE).forEach(type => {
            this.objectCounts.set(type, 0);
        });
        
        console.log('✅ 对象管理器重置完成');
    }
    
    // 销毁管理器
    destroy() {
        console.log('🗑️ 销毁对象管理器...');
        
        this.reset();
        this.objects.clear();
        this.spatialIndex = null;
        
        console.log('✅ 对象管理器销毁完成');
    }
}

// 创建全局对象管理器实例
const objectManager = new ObjectManager();

// 导出
export { ObjectManager, objectManager, OBJECT_TYPE, OBJECT_STATE };
export default objectManager;
