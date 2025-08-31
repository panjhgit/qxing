/**
 * 统一渲染管理器模块 (render-manager-new.js)
 *
 * 功能描述：
 * - 统一渲染管理器：协调各个子渲染器
 * - 性能监控和统计
 * - 渲染流程控制
 * - 插件系统支持
 */

import { EntityRenderer } from './entity-renderer.js';
import { UIRenderer } from './ui-renderer.js';

// 渲染配置
export const RENDER_CONFIG = {
    // 渲染质量设置
    QUALITY: {
        SHADOW_ENABLED: true,
        ANTIALIASING: true,
        TEXTURE_FILTERING: true
    },
    
    // 性能设置
    PERFORMANCE: {
        BATCH_RENDERING: true,
        FRUSTUM_CULLING: true,
        LOD_ENABLED: true,
        MAX_RENDER_DISTANCE: 1500 // 使用config.js中的值
    },
    
    // 调试设置
    DEBUG: {
        SHOW_BOUNDS: false,
        SHOW_STATS: true,
        SHOW_FPS: true
    }
};

// 实体类型枚举
export const ENTITY_TYPE = {
    CHARACTER: 'character',
    ZOMBIE: 'zombie',
    PARTNER: 'partner',
    BUILDING: 'building',
    ITEM: 'item',
    EFFECT: 'effect'
};

// 渲染状态枚举
export const RENDER_STATE = {
    IDLE: 'idle',
    RENDERING: 'rendering',
    PAUSED: 'paused'
};

// 统一渲染管理器类
export class RenderManager {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        this.state = RENDER_STATE.IDLE;
        
        // 子渲染器
        this.entityRenderer = new EntityRenderer(ctx);
        this.uiRenderer = new UIRenderer(ctx);
        
        // 渲染统计
        this.renderStats = {
            charactersRendered: 0,
            zombiesRendered: 0,
            partnersRendered: 0,
            buildingsRendered: 0,
            itemsRendered: 0,
            effectsRendered: 0,
            totalRendered: 0,
            frameTime: 0,
            fps: 0
        };
        
        // 渲染队列
        this.renderQueue = new Map();
        
        // 渲染插件
        this.plugins = new Map();
        
        // 性能监控
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fpsUpdateInterval = 0;
        
        console.log('🎨 统一渲染管理器初始化完成');
    }

    // 应用摄像机变换
    applyCameraTransform() {
        console.log('🎨 应用相机变换:', {
            cameraX: this.camera.x,
            cameraY: this.camera.y,
            canvasWidth: this.camera.canvas.width,
            canvasHeight: this.camera.canvas.height,
            zoom: this.camera.zoom
        });
        
        this.ctx.save();
        this.ctx.translate(this.camera.canvas.width / 2, this.camera.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
    }

    // 恢复变换
    restoreTransform() {
        this.ctx.restore();
    }

    // 开始渲染帧
    beginFrame() {
        this.state = RENDER_STATE.RENDERING;
        this.lastFrameTime = performance.now();
        this.resetRenderStats();
    }

    // 结束渲染帧
    endFrame() {
        this.state = RENDER_STATE.IDLE;
        this.updatePerformanceStats();
    }

    // 渲染实体（统一入口）
    renderEntity(entity, entityType) {
        if (!entity || entity.hp <= 0) return false;

        // 检查是否在视野内
        if (RENDER_CONFIG.PERFORMANCE.FRUSTUM_CULLING) {
            if (!this.isEntityInView(entity)) {
                return false;
            }
        }

        // 检查渲染距离
        if (this.getDistanceToCamera(entity) > RENDER_CONFIG.PERFORMANCE.MAX_RENDER_DISTANCE) {
            return false;
        }

        // 使用实体渲染器
        const success = this.entityRenderer.renderEntity(entity, entityType);
        
        if (success) {
            this.renderStats.totalRendered++;
            // 更新统计
            switch (entityType) {
                case ENTITY_TYPE.CHARACTER:
                    this.renderStats.charactersRendered++;
                    break;
                case ENTITY_TYPE.ZOMBIE:
                    this.renderStats.zombiesRendered++;
                    break;
                case ENTITY_TYPE.PARTNER:
                    this.renderStats.partnersRendered++;
                    break;
                case ENTITY_TYPE.BUILDING:
                    this.renderStats.buildingsRendered++;
                    break;
                case ENTITY_TYPE.ITEM:
                    this.renderStats.itemsRendered++;
                    break;
                case ENTITY_TYPE.EFFECT:
                    this.renderStats.effectsRendered++;
                    break;
            }
        }

        return success;
    }

    // 渲染UI元素（游戏结束界面等）
    renderUI(uiType, data) {
        return this.uiRenderer.renderUI(uiType, data);
    }

    // 渲染地图背景
    renderMapBackground(mapConfig) {
        if (!mapConfig) return false;
        
        this.ctx.fillStyle = '#F0F8FF'; // 浅蓝色背景
        this.ctx.fillRect(0, 0, mapConfig.width, mapConfig.height);
        return true;
    }

    // 渲染可通行区域
    renderWalkableAreas(walkableAreas) {
        if (!walkableAreas || !Array.isArray(walkableAreas)) return false;

        this.ctx.fillStyle = '#FFFFFF'; // 白色街道
        this.ctx.strokeStyle = '#E0E0E0'; // 浅灰色边框
        this.ctx.lineWidth = 1;

        for (const area of walkableAreas) {
            if (!area || !area.bounds) continue;

            const {left, top, right, bottom} = area.bounds;
            const width = right - left;
            const height = bottom - top;

            // 填充街道
            this.ctx.fillRect(left, top, width, height);

            // 绘制边框
            this.ctx.strokeRect(left, top, width, height);
        }
        return true;
    }

    // 渲染地图边界
    renderMapBoundaries(mapConfig) {
        if (!mapConfig) return false;

        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(0, 0, mapConfig.width, mapConfig.height);
        return true;
    }

    // 批量渲染实体列表
    renderEntityList(entities, entityType) {
        let renderedCount = 0;
        
        if (RENDER_CONFIG.PERFORMANCE.BATCH_RENDERING) {
            // 批量渲染优化
            this.beginBatch(entityType);
        }
        
        entities.forEach(entity => {
            if (this.renderEntity(entity, entityType)) {
                renderedCount++;
            }
        });
        
        if (RENDER_CONFIG.PERFORMANCE.BATCH_RENDERING) {
            this.endBatch();
        }
        
        return renderedCount;
    }

    // 开始批量渲染
    beginBatch(entityType) {
        // 批量渲染优化逻辑
        this.ctx.save();
    }

    // 结束批量渲染
    endBatch() {
        this.ctx.restore();
    }

    // 检查实体是否在视野内
    isEntityInView(entity) {
        const size = entity.width || entity.size || 32;
        const bufferSize = 20; // 增加20px缓冲区域，避免边缘闪烁
        
        // 🔴 修复：增加缓冲区域，避免僵尸在视野边缘反复进入退出
        return this.camera.isInView(entity.x, entity.y, size + bufferSize, size + bufferSize);
    }

    // 获取实体到摄像机的距离
    getDistanceToCamera(entity) {
        const dx = entity.x - this.camera.x;
        const dy = entity.y - this.camera.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 更新性能统计
    updatePerformanceStats() {
        const currentTime = performance.now();
        this.renderStats.frameTime = currentTime - this.lastFrameTime;
        this.frameCount++;
        this.fpsUpdateInterval += this.renderStats.frameTime;

        // 每秒更新一次FPS
        if (this.fpsUpdateInterval >= 1000) {
            this.renderStats.fps = Math.round(this.frameCount * 1000 / this.fpsUpdateInterval);
            this.frameCount = 0;
            this.fpsUpdateInterval = 0;
        }
    }

    // 重置渲染统计
    resetRenderStats() {
        this.renderStats.charactersRendered = 0;
        this.renderStats.zombiesRendered = 0;
        this.renderStats.partnersRendered = 0;
        this.renderStats.buildingsRendered = 0;
        this.renderStats.itemsRendered = 0;
        this.renderStats.effectsRendered = 0;
        this.renderStats.totalRendered = 0;
    }

    // 获取渲染统计
    getRenderStats() {
        return { ...this.renderStats };
    }

    // 添加渲染插件
    addPlugin(name, plugin) {
        this.plugins.set(name, plugin);
        console.log('🔌 渲染插件已添加:', name);
    }

    // 移除渲染插件
    removePlugin(name) {
        this.plugins.delete(name);
        console.log('🔌 渲染插件已移除:', name);
    }

    // 执行渲染插件
    executePlugin(name, ...args) {
        const plugin = this.plugins.get(name);
        if (plugin && typeof plugin.execute === 'function') {
            return plugin.execute(this.ctx, this.camera, ...args);
        }
        return false;
    }

    // 设置渲染配置
    setConfig(config) {
        Object.assign(RENDER_CONFIG, config);
        console.log('⚙️ 渲染配置已更新');
    }

    // 获取渲染配置
    getConfig() {
        return { ...RENDER_CONFIG };
    }

    // 暂停渲染
    pause() {
        this.state = RENDER_STATE.PAUSED;
        console.log('⏸️ 渲染已暂停');
    }

    // 恢复渲染
    resume() {
        this.state = RENDER_STATE.IDLE;
        console.log('▶️ 渲染已恢复');
    }

    // 清理资源
    cleanup() {
        this.renderQueue.clear();
        this.plugins.clear();
        console.log('🧹 渲染管理器资源已清理');
    }
}

export default RenderManager;
