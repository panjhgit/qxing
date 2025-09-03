/**
 * 视觉系统主类模块 (view-system.js)
 *
 * 功能描述：
 * - 视觉系统主类：协调摄像机、渲染管理器等组件
 * - 渲染地图、角色、僵尸、伙伴等游戏对象
 * - 管理UI渲染和调试信息显示
 * - 🔴 优化：使用基于Y坐标的动态排序渲染，解决视觉遮挡问题
 */

import {Camera} from './camera.js';
import {RenderManager, ENTITY_TYPE} from './render-manager.js';

// 视觉系统主类
export class ViewSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.camera = new Camera(canvas);
        this.renderManager = new RenderManager(ctx, this.camera);

        // 渲染设置
        this.renderDistance = 1000; // 渲染距离
        this.showDebugInfo = false; // 不显示调试信息
        
        // 🔴 新增：排序渲染设置
        this.useSortingRendering = true; // 启用排序渲染
    }

    // 初始化视觉系统
    init(mapWidth, mapHeight) {
        this.camera.setMapBounds(mapWidth, mapHeight);
    }

    // 设置跟随目标
    setFollowTarget(targetX, targetY) {
        this.camera.followTarget(targetX, targetY);
    }

    // 更新视觉系统
    update() {
        this.camera.update();
    }

    // 🔴 优化：渲染地图（带摄像机变换）
    renderMap(mapSystem) {
        if (!mapSystem) return;

        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 应用摄像机变换
        this.renderManager.applyCameraTransform();

        // 检查是否是MapRenderer实例
        if (mapSystem.render && typeof mapSystem.render === 'function') {
            // 使用MapRenderer
            mapSystem.render(this.ctx);
        } else {
            // 使用MapManager数据，通过RenderManager渲染
            this.renderMapBackground(mapSystem);
            this.renderStreets(mapSystem);
            this.renderMapBoundaries(mapSystem);
            // 🔴 修复：移除建筑物渲染，避免重复渲染
        }

        // 恢复变换
        this.renderManager.restoreTransform();
    }

    // 渲染地图背景
    renderMapBackground(mapSystem) {
        if (!mapSystem) return;

        // 获取当前地图配置
        const currentMap = mapSystem.getCurrentMap();
        if (!currentMap || !currentMap.config) return;

        this.renderManager.renderMapBackground({
            width: currentMap.config.width, height: currentMap.config.height
        });
    }

    // 渲染街道（可通行区域）
    renderStreets(mapSystem) {
        if (!mapSystem) return;

        // 获取当前地图数据
        const currentMap = mapSystem.getCurrentMap();
        if (!currentMap || !currentMap.walkableAreas) return;

        this.renderManager.renderWalkableAreas(currentMap.walkableAreas);
    }

    // 🔴 优化：渲染建筑物（使用排序渲染）
    renderBuildings(mapSystem) {
        // 🔴 修复：此方法已废弃，建筑物现在在renderAllGameEntities中统一渲染
        console.warn('⚠️ renderBuildings方法已废弃，请使用renderAllGameEntities');
        return;
    }

    // 渲染地图边界
    renderMapBoundaries(mapSystem) {
        if (!mapSystem) return;

        // 获取当前地图配置
        const currentMap = mapSystem.getCurrentMap();
        if (!currentMap || !currentMap.config) return;

        this.renderManager.renderMapBoundaries({
            width: currentMap.config.width, height: currentMap.config.height
        });
    }

    // 🔴 优化：渲染角色（使用排序渲染）
    renderCharacters(characterManager) {
        // 🔴 修复：此方法主要用于向后兼容，建议使用renderAllGameEntities
        if (!characterManager) return;

        // 🔴 修复：使用对象管理器获取主人物
        var mainCharacter = characterManager.getMainCharacter();
        var characters = mainCharacter ? [mainCharacter] : [];

        // 应用摄像机变换
        this.renderManager.applyCameraTransform();

        // 🔴 修复：使用排序渲染管理器渲染角色
        if (this.useSortingRendering) {
            const layer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.ENTITY;
            this.renderManager.addEntitiesToRenderQueue(characters, ENTITY_TYPE.CHARACTER, layer);
            this.renderManager.renderSortedEntities(); // 🔴 修复：添加实际渲染调用
        } else {
            // 传统渲染方式（向后兼容）
            this.renderManager.renderEntityList(characters, ENTITY_TYPE.CHARACTER, false);
        }

        // 恢复变换
        this.renderManager.restoreTransform();
    }

    // 🔴 优化：渲染僵尸（使用排序渲染）
    renderZombies(zombieManager, characterManager) {
        // 🔴 修复：此方法主要用于向后兼容，建议使用renderAllGameEntities
        if (!zombieManager) return;

        // 🔴 修复：使用传入的characterManager获取主人物
        var mainCharacter = characterManager ? characterManager.getMainCharacter() : null;
        if (!mainCharacter) return;

        // 🔴 修复：获取所有僵尸，渲染所有有效的僵尸
        var allZombies = zombieManager.getAllZombies();
        var zombiesToRender = allZombies.filter(zombie => {
            // 只渲染血量大于0且不在死亡状态的僵尸
            return zombie && zombie.hp > 0 && zombie.state !== 'dead';
        });

        // 应用摄像机变换
        this.renderManager.applyCameraTransform();

        // 🔴 优化：使用排序渲染管理器渲染僵尸
        if (this.useSortingRendering) {
            const layer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.ENTITY;
            this.renderManager.addEntitiesToRenderQueue(zombiesToRender, ENTITY_TYPE.ZOMBIE, layer);
            this.renderManager.renderSortedEntities(); // 🔴 修复：添加实际渲染调用
        } else {
            // 传统渲染方式（向后兼容）
            this.renderManager.renderEntityList(zombiesToRender, ENTITY_TYPE.ZOMBIE, false);
        }

        // 恢复变换
        this.renderManager.restoreTransform();
    }

    // 🔴 优化：渲染伙伴（使用排序渲染）
    renderPartners(partnerManager) {
        // 🔴 修复：此方法主要用于向后兼容，建议使用renderAllGameEntities
        if (!partnerManager) return;

        // 应用摄像机变换
        this.renderManager.applyCameraTransform();

        // 获取所有伙伴
        var partners = partnerManager.getAllPartners();

        // 🔴 优化：使用排序渲染管理器渲染伙伴
        if (this.useSortingRendering) {
            const layer = RENDER_CONFIG.SORTING.LAYER_OFFSETS.ENTITY;
            this.renderManager.addEntitiesToRenderQueue(partners, ENTITY_TYPE.PARTNER, layer);
            this.renderManager.renderSortedEntities(); // 🔴 修复：添加实际渲染调用
        } else {
            // 传统渲染方式（向后兼容）
            this.renderManager.renderEntityList(partners, ENTITY_TYPE.PARTNER, false);
        }

        // 恢复变换
        this.renderManager.restoreTransform();
    }

    // 🔴 新增：统一渲染所有游戏实体（使用排序渲染）
    renderAllGameEntities(characterManager, zombieManager, partnerManager, mapSystem) {
        if (!this.useSortingRendering) {
            // 如果不使用排序渲染，回退到传统方式
            this.renderCharacters(characterManager);
            this.renderZombies(zombieManager, characterManager);
            this.renderPartners(partnerManager);
            return;
        }

        // 应用摄像机变换
        this.renderManager.applyCameraTransform();

        // 收集所有实体数据
        var characters = [];
        var zombies = [];
        var partners = [];
        var buildings = [];

        // 获取角色
        if (characterManager) {
            var mainCharacter = characterManager.getMainCharacter();
            if (mainCharacter) {
                characters = [mainCharacter];
            }
        }

        // 获取僵尸
        if (zombieManager) {
            var allZombies = zombieManager.getAllZombies();
            zombies = allZombies.filter(zombie => {
                return zombie && zombie.hp > 0 && zombie.state !== 'dead';
            });
        }

        // 获取伙伴
        if (partnerManager) {
            partners = partnerManager.getAllPartners();
        }

        // 获取建筑物
        if (mapSystem) {
            const currentMap = mapSystem.getCurrentMap();
            if (currentMap && currentMap.buildings) {
                buildings = currentMap.buildings;
            }
        }

        // 🔴 修复：直接调用排序渲染，不重复变换
        this.renderManager.renderAllGameEntities(characters, zombies, partners, buildings);

        // 恢复变换
        this.renderManager.restoreTransform();
    }

    // 渲染触摸摇杆（不受摄像机变换影响）
    renderJoystick(joystick) {
        if (joystick && joystick.isVisible) {
            this.renderManager.renderUI('joystick', joystick);
        }
    }

    // 渲染调试信息
    renderDebugInfo() {
        if (!this.showDebugInfo) return;

        // 使用统一渲染管理器渲染调试信息
        const debugData = {
            cameraPos: this.camera.getPosition(),
            renderStats: this.renderManager.getRenderStats(),
            canvas: this.canvas,
            camera: this.camera,
            renderDistance: this.renderDistance,
            sortingEnabled: this.useSortingRendering
        };

        this.renderManager.renderUI('debugInfo', debugData);
    }

    // 渲染时间信息（左上角）
    renderTimeInfo(gameEngine) {
        if (!gameEngine || !gameEngine.getTimeInfo) return;

        // 使用统一渲染管理器渲染时间信息
        const timeData = {
            timeInfo: gameEngine.getTimeInfo()
        };

        this.renderManager.renderUI('timeInfo', timeData);
    }

    // 获取渲染管理器（供外部使用）
    getRenderManager() {
        return this.renderManager;
    }

    // 🔴 新增：设置排序渲染开关
    setSortingRendering(enabled) {
        this.useSortingRendering = enabled;
    }

    // 🔴 新增：获取排序渲染状态
    isSortingRenderingEnabled() {
        return this.useSortingRendering;
    }
}

export default ViewSystem;
