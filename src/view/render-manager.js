/**
 * 统一渲染管理器模块 (render-manager-new.js)
 *
 * 功能描述：
 * - 统一渲染管理器：协调各个子渲染器
 * - 性能监控和统计
 * - 渲染流程控制
 * - 插件系统支持
 * - 🔴 新增：基于Y坐标的动态渲染排序，解决视觉遮挡问题
 */

import { EntityRenderer } from './entity-renderer.js';
import { UIRenderer } from './ui-renderer.js';
import ConfigManager from '../config.js';

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
    },
    
    // 🔴 优化：从config.js获取渲染排序设置
    SORTING: {
        ENABLED: true, // 启用Y坐标排序
        LAYER_OFFSETS: {
            BACKGROUND: 0,    // 背景层
            BUILDING: 50,     // 🔴 修复：建筑物层（降低层级，确保在最底层）
            ENTITY: 200,      // 实体层（角色、僵尸、伙伴）
            EFFECT: 300,      // 特效层
            UI: 400          // UI层
        }
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

    // 🔴 新增：渲染实体数据结构
    class RenderEntity {
        constructor(entity, entityType, layer = 0) {
            this.entity = entity;
            this.entityType = entityType;
            this.layer = layer;
            this.renderY = entity.y || 0; // Y坐标用于排序
            this.renderPriority = 0; // 渲染优先级
            this.isVisible = true;
            this.isFixedLayer = entityType === ENTITY_TYPE.BUILDING; // 🔴 新增：标记固定层级实体
        }

        // 获取排序键（Y坐标 + 层级偏移）
        getSortKey() {
            // 🔴 修复：建筑物使用固定层级，不参与Y坐标排序
            if (this.isFixedLayer) {
                return this.layer; // 建筑物只按层级排序
            }
            return this.renderY + this.layer; // 其他实体按Y坐标+层级排序
        }

        // 更新渲染信息
        updateRenderInfo() {
            if (this.entity) {
                this.renderY = this.entity.y || 0;
                this.isVisible = this.entity.hp > 0 || this.entityType === ENTITY_TYPE.BUILDING;
            }
        }
    }

// 统一渲染管理器类
export class RenderManager {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        this.state = RENDER_STATE.IDLE;
        
        // 子渲染器
        this.entityRenderer = new EntityRenderer(ctx);
        this.uiRenderer = new UIRenderer(ctx);
        
        // 🔴 新增：渲染实体队列（用于排序）
        this.renderEntities = [];
        
        // 🔴 优化：从config.js获取渲染配置
        this.loadRenderConfig();
        
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
        
        // 统一渲染管理器初始化完成
    }

    // 🔴 新增：从config.js加载渲染配置
    loadRenderConfig() {
        try {
            const renderConfig = ConfigManager.get('PERFORMANCE.RENDERING');
            if (renderConfig) {
                // 更新性能配置
                if (renderConfig.MAX_RENDER_DISTANCE) {
                    RENDER_CONFIG.PERFORMANCE.MAX_RENDER_DISTANCE = renderConfig.MAX_RENDER_DISTANCE;
                }
                if (renderConfig.FRUSTUM_CULLING !== undefined) {
                    RENDER_CONFIG.PERFORMANCE.FRUSTUM_CULLING = renderConfig.FRUSTUM_CULLING;
                }
                if (renderConfig.BATCH_RENDERING !== undefined) {
                    RENDER_CONFIG.PERFORMANCE.BATCH_RENDERING = renderConfig.BATCH_RENDERING;
                }

                // 更新排序配置
                if (renderConfig.SORTING) {
                    RENDER_CONFIG.SORTING.ENABLED = renderConfig.SORTING.ENABLED !== undefined ? 
                        renderConfig.SORTING.ENABLED : RENDER_CONFIG.SORTING.ENABLED;
                    
                    if (renderConfig.SORTING.LAYER_OFFSETS) {
                        RENDER_CONFIG.SORTING.LAYER_OFFSETS = {
                            ...RENDER_CONFIG.SORTING.LAYER_OFFSETS,
                            ...renderConfig.SORTING.LAYER_OFFSETS
                        };
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ 无法从config.js加载渲染配置，使用默认配置:', error.message);
        }
    }

    // 🔴 新增：清空渲染实体队列
    clearRenderEntities() {
        this.renderEntities = [];
    }

    // 🔴 新增：添加实体到渲染队列
    addEntityToRenderQueue(entity, entityType, layer = 0) {
        if (!entity) return;

        const renderEntity = new RenderEntity(entity, entityType, layer);
        this.renderEntities.push(renderEntity);
    }

    // 🔴 新增：批量添加实体到渲染队列
    addEntitiesToRenderQueue(entities, entityType, layer = 0) {
        if (!entities || !Array.isArray(entities)) return;

        entities.forEach(entity => {
            this.addEntityToRenderQueue(entity, entityType, layer);
        });
    }

    // 🔴 新增：排序渲染实体（按Y坐标 + 层级）
    sortRenderEntities() {
        if (!RENDER_CONFIG.SORTING.ENABLED) return;

        // 更新所有实体的渲染信息
        this.renderEntities.forEach(renderEntity => {
            renderEntity.updateRenderInfo();
        });

        // 🔴 修复：分离固定层级实体和动态排序实体
        const fixedLayerEntities = this.renderEntities.filter(re => re.isFixedLayer);
        const dynamicEntities = this.renderEntities.filter(re => !re.isFixedLayer);

        // 固定层级实体按层级排序（建筑物等）
        fixedLayerEntities.sort((a, b) => a.getSortKey() - b.getSortKey());

        // 动态实体按Y坐标+层级排序（角色、僵尸、伙伴等）
        dynamicEntities.sort((a, b) => b.getSortKey() - a.getSortKey());

        // 合并结果：固定层级在前（底层），动态实体在后（上层）
        this.renderEntities = [...fixedLayerEntities, ...dynamicEntities];

    }

    // 🔴 新增：渲染排序后的实体队列
    renderSortedEntities() {
        if (!RENDER_CONFIG.SORTING.ENABLED) return;

        this.sortRenderEntities();

        let renderedCount = 0;
        this.renderEntities.forEach(renderEntity => {
            if (renderEntity.isVisible && this.renderEntity(renderEntity.entity, renderEntity.entityType)) {
                renderedCount++;
            }
        });

        return renderedCount;
    }

    // 应用摄像机变换
    applyCameraTransform() {
        this.ctx.save();
        this.ctx.translate(this.camera.canvas.width / 2, this.camera.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
    }

    // 恢复变换
    restoreTransform() {
        this.ctx.restore();
    }

    // 渲染实体（统一入口）
    renderEntity(entity, entityType) {
        if (!entity) return false;

        // 🔴 修复：建筑物没有hp属性，不应该检查hp
        if (entityType !== ENTITY_TYPE.BUILDING && entity.hp <= 0) return false;

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

    // 🔴 优化：批量渲染实体列表（支持排序）
    renderEntityList(entities, entityType, useSorting = true) {
        // 🔴 修复：此方法主要用于向后兼容，建议使用renderAllGameEntities
        if (useSorting && RENDER_CONFIG.SORTING.ENABLED) {
            // 使用排序渲染
            const layer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.ENTITY;
            this.addEntitiesToRenderQueue(entities, entityType, layer);
            return this.renderSortedEntities();
        } else {
            // 传统顺序渲染
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
    }

    // 🔴 新增：渲染建筑物（固定层级）
    renderBuildings(buildings) {
        // 🔴 修复：此方法主要用于单独渲染建筑物，建议使用renderAllGameEntities
        if (!buildings || !Array.isArray(buildings)) return 0;

        const layer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.BUILDING;
        this.addEntitiesToRenderQueue(buildings, ENTITY_TYPE.BUILDING, layer);
        return this.renderSortedEntities();
    }

    // 🔴 新增：渲染所有游戏实体（统一入口）
    renderAllGameEntities(characters, zombies, partners, buildings) {
        // 清空渲染队列
        this.clearRenderEntities();

        // 添加所有实体到渲染队列
        if (buildings && buildings.length > 0) {
            const buildingLayer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.BUILDING;
            this.addEntitiesToRenderQueue(buildings, ENTITY_TYPE.BUILDING, buildingLayer);
        }

        if (characters && characters.length > 0) {
            const entityLayer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.ENTITY;
            this.addEntitiesToRenderQueue(characters, ENTITY_TYPE.CHARACTER, entityLayer);
        }

        if (zombies && zombies.length > 0) {
            const entityLayer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.ENTITY;
            this.addEntitiesToRenderQueue(zombies, ENTITY_TYPE.ZOMBIE, entityLayer);
        }

        if (partners && partners.length > 0) {
            const entityLayer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.ENTITY;
            this.addEntitiesToRenderQueue(partners, ENTITY_TYPE.PARTNER, entityLayer);
        }

        // 🔴 修复：直接渲染排序后的实体，不重复变换
        return this.renderSortedEntities();
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
        return { 
            ...this.renderStats,
            // 🔴 新增：排序渲染统计
            sortingStats: {
                totalEntities: this.renderEntities.length,
                sortingEnabled: RENDER_CONFIG.SORTING.ENABLED,
                layerOffsets: RENDER_CONFIG.SORTING.LAYER_OFFSETS
            }
        };
    }
    // 暂停渲染
    pause() {
        this.state = RENDER_STATE.PAUSED;
    }
}

export default RenderManager;
