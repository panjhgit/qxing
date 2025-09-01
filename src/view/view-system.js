/**
 * 视觉系统主类模块 (view-system.js)
 *
 * 功能描述：
 * - 视觉系统主类：协调摄像机、渲染管理器等组件
 * - 渲染地图、角色、僵尸、伙伴等游戏对象
 * - 管理UI渲染和调试信息显示
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

    // 渲染地图（带摄像机变换）
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
            this.renderBuildings(mapSystem);
            this.renderMapBoundaries(mapSystem);
        }

        // 恢复变换
        this.renderManager.restoreTransform();

        // 渲染UI元素（不受摄像机变换影响）
        this.renderUI();
    }

    // 渲染UI元素
    renderUI() {
        // 这里可以渲染UI元素，如触摸摇杆、血条等
        // 这些元素不受摄像机变换影响
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

    // 渲染建筑物
    renderBuildings(mapSystem) {
        if (!mapSystem) return;

        // 获取当前地图数据
        const currentMap = mapSystem.getCurrentMap();
        if (!currentMap || !currentMap.buildings) return;

        // 应用摄像机变换
        this.renderManager.applyCameraTransform();

        // 使用统一渲染管理器渲染建筑物
        this.renderManager.renderEntityList(currentMap.buildings, ENTITY_TYPE.BUILDING);

        // 恢复变换
        this.renderManager.restoreTransform();
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

    // 渲染角色（使用统一渲染管理器）
    renderCharacters(characterManager) {
        if (!characterManager) return;

        // 应用摄像机变换
        this.renderManager.applyCameraTransform();

        // 🔴 修复：使用对象管理器获取主人物
        var mainCharacter = characterManager.getMainCharacter();
        var characters = mainCharacter ? [mainCharacter] : [];

        // 使用统一渲染管理器渲染角色
        this.renderManager.renderEntityList(characters, ENTITY_TYPE.CHARACTER);

        // 恢复变换
        this.renderManager.restoreTransform();
    }

    // 渲染僵尸（使用统一渲染管理器）
    renderZombies(zombieManager, characterManager) {
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

        // 使用统一渲染管理器渲染僵尸
        this.renderManager.renderEntityList(zombiesToRender, ENTITY_TYPE.ZOMBIE);

        // 恢复变换
        this.renderManager.restoreTransform();
    }

    // 渲染伙伴（使用统一渲染管理器）
    renderPartners(partnerManager) {
        if (!partnerManager) return;

        // 应用摄像机变换
        this.renderManager.applyCameraTransform();

        // 获取所有伙伴
        var partners = partnerManager.getAllPartners();

        // 使用统一渲染管理器渲染伙伴
        this.renderManager.renderEntityList(partners, ENTITY_TYPE.PARTNER);

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
            renderDistance: this.renderDistance
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
}

export default ViewSystem;
