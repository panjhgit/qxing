/**
 * 对象管理器 (object-manager.js)
 *
 * 功能：
 * - 统一管理游戏对象的生命周期
 * - 与对象池协同工作，管理对象内存
 * - 与四叉树协同工作，管理空间索引
 * - 避免功能重叠，明确职责分工
 */

import {objectPoolManager} from './object-pool.js';

// 对象类型枚举
const OBJECT_TYPE = {
    CHARACTER: 'character', ZOMBIE: 'zombie', BUILDING: 'building', ITEM: 'item'
};

// 对象状态枚举
const OBJECT_STATE = {
    ACTIVE: 'active', INACTIVE: 'inactive', DEAD: 'dead', DESTROYED: 'destroyed'
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

    // 销毁对象
    destroyObject(objectId) {
        const objectInfo = this.objects.get(objectId);
        if (!objectInfo) {
            console.warn('⚠️ 对象不存在:', objectId);
            return false;
        }

        const {object, type} = objectInfo;
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
export {ObjectManager, objectManager, OBJECT_TYPE, OBJECT_STATE};
export default objectManager;
