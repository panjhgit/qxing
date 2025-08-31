/**
 * 统一渲染系统模块 (view.js)
 *
 * 功能描述：
 * - 摄像机系统：跟随主人物移动，保持主人物在屏幕中心
 * - 统一渲染管理器：管理所有游戏对象的渲染
 * - 视距裁剪：只渲染屏幕可见范围内的对象
 * - 屏幕坐标转换：世界坐标到屏幕坐标的转换
 * - 渲染优化：批量渲染和性能优化
 */

// 摄像机类
var Camera = function (canvas) {
    this.canvas = canvas;
    this.x = 0;           // 摄像机世界坐标X
    this.y = 0;           // 摄像机世界坐标Y
    this.targetX = 0;     // 目标X坐标
    this.targetY = 0;     // 目标Y坐标
    this.followSpeed = 0.1; // 跟随速度（0-1，1为立即跟随）

    // 屏幕尺寸
    this.screenWidth = canvas.width;
    this.screenHeight = canvas.height;

    // 地图边界（由外部设置）
    this.mapWidth = 0;
    this.mapHeight = 0;

    // 缩放和偏移
    this.zoom = 0.6;
    this.offsetX = 0;
    this.offsetY = 0;
};

// 设置地图边界
Camera.prototype.setMapBounds = function (width, height) {
    this.mapWidth = width;
    this.mapHeight = height;
    console.log('摄像机地图边界设置:', width, 'x', height);
};

// 设置摄像机位置
Camera.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y;
    this.constrainToMap();
    console.log('摄像机位置已设置为:', this.x, this.y);
};

// 跟随目标
Camera.prototype.followTarget = function (targetX, targetY) {
    console.log('摄像机跟随目标:', targetX, targetY);
    this.x = targetX;
    this.y = targetY;
    this.constrainToMap();
    console.log('摄像机位置已更新为:', this.x, this.y);
};

// 更新摄像机位置
Camera.prototype.update = function () {
    this.constrainToMap();
};

// 限制摄像机在地图边界内
Camera.prototype.constrainToMap = function () {
    var halfScreenWidth = (this.screenWidth / this.zoom) / 2;
    var halfScreenHeight = (this.screenHeight / this.zoom) / 2;

    // 限制X坐标
    if (this.x < halfScreenWidth) {
        this.x = halfScreenWidth;
    } else if (this.x > this.mapWidth - halfScreenWidth) {
        this.x = this.mapWidth - halfScreenWidth;
    }

    // 限制Y坐标
    if (this.y < halfScreenHeight) {
        this.y = halfScreenHeight;
    } else if (this.y > this.mapHeight - halfScreenHeight) {
        this.y = this.mapHeight - halfScreenHeight;
    }

    console.log('摄像机位置:', this.x, this.y, '地图边界:', this.mapWidth, this.mapHeight);
};

// 世界坐标转屏幕坐标
Camera.prototype.worldToScreen = function (worldX, worldY) {
    // 计算相对于摄像机中心的偏移
    var offsetX = worldX - this.x;
    var offsetY = worldY - this.y;

    // 转换为屏幕坐标，主人物应该在屏幕中心
    var screenX = this.screenWidth / 2 + offsetX * this.zoom;
    var screenY = this.screenHeight / 2 + offsetY * this.zoom;

    return {x: screenX, y: screenY};
};

// 检查对象是否在屏幕范围内
Camera.prototype.isInView = function (worldX, worldY, width, height) {
    var screenPos = this.worldToScreen(worldX, worldY);
    var screenWidth = width * this.zoom;
    var screenHeight = height * this.zoom;

    return screenPos.x + screenWidth >= 0 && screenPos.x <= this.screenWidth && screenPos.y + screenHeight >= 0 && screenPos.y <= this.screenHeight;
};

// 获取摄像机位置
Camera.prototype.getPosition = function () {
    return {x: this.x, y: this.y};
};

// 获取缩放
Camera.prototype.getZoom = function () {
    return this.zoom;
};

// 导入统一渲染管理器
import RenderManager from './render-manager.js';

// 视觉系统主类
var ViewSystem = function (canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.camera = new Camera(canvas);
    this.renderManager = new RenderManager(ctx, this.camera);

    // 渲染设置
    this.renderDistance = 1000; // 渲染距离
    this.showDebugInfo = false; // 不显示调试信息
};

// 初始化视觉系统
ViewSystem.prototype.init = function (mapWidth, mapHeight) {
    this.camera.setMapBounds(mapWidth, mapHeight);
    console.log('视觉系统初始化完成');
};

// 设置跟随目标
ViewSystem.prototype.setFollowTarget = function (targetX, targetY) {
    this.camera.followTarget(targetX, targetY);
};

// 更新视觉系统
ViewSystem.prototype.update = function () {
    this.camera.update();
};

// 渲染地图（带摄像机变换）
ViewSystem.prototype.renderMap = function (mapRenderer) {
    if (!mapRenderer) return;

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 应用摄像机变换
    this.renderManager.applyCameraTransform();

    // 使用新的地图渲染器
    if (mapRenderer.render) {
        mapRenderer.render(this.ctx);
    } else {
        // 兼容旧的mapSystem
        this.renderMapBackground(mapRenderer);
        this.renderStreets(mapRenderer);
        this.renderBuildings(mapRenderer);
        this.renderMapBoundaries(mapRenderer);
    }

    // 恢复变换
    this.renderManager.restoreTransform();

    // 渲染UI元素（不受摄像机变换影响）
    this.renderUI();
};

// 渲染UI元素
ViewSystem.prototype.renderUI = function () {
    // 这里可以渲染UI元素，如触摸摇杆、血条等
    // 这些元素不受摄像机变换影响
};

// 渲染地图背景
ViewSystem.prototype.renderMapBackground = function (mapSystem) {
    if (!mapSystem) return;
    this.renderManager.renderMapBackground({width: mapSystem.mapWidth, height: mapSystem.mapHeight});
};

// 渲染街道（可通行区域）
ViewSystem.prototype.renderStreets = function (mapSystem) {
    if (!mapSystem || !mapSystem.walkableAreas) return;
    console.log('渲染可通行区域，数量:', mapSystem.walkableAreas.length);
    this.renderManager.renderWalkableAreas(mapSystem.walkableAreas);
};

// 渲染建筑物
ViewSystem.prototype.renderBuildings = function (mapSystem) {
    if (!mapSystem || !mapSystem.buildings) return;

    console.log('渲染建筑物，数量:', mapSystem.buildings.length);

    // 应用摄像机变换
    this.renderManager.applyCameraTransform();

    // 使用统一渲染管理器渲染建筑物
    this.renderManager.renderEntityList(mapSystem.buildings, 'building');

    // 恢复变换
    this.renderManager.restoreTransform();
};

// 渲染地图边界
ViewSystem.prototype.renderMapBoundaries = function (mapSystem) {
    if (!mapSystem) return;
    this.renderManager.renderMapBoundaries({width: mapSystem.mapWidth, height: mapSystem.mapHeight});
};

// 渲染角色（使用统一渲染管理器）
ViewSystem.prototype.renderCharacters = function (characterManager) {
    if (!characterManager) return;

    // 应用摄像机变换
    this.renderManager.applyCameraTransform();

    // 获取主人物
    var characters = characterManager.mainCharacter ? [characterManager.mainCharacter] : [];
    
    // 使用统一渲染管理器渲染角色
    this.renderManager.renderEntityList(characters, 'character');

    // 恢复变换
    this.renderManager.restoreTransform();
};

// 渲染僵尸（使用统一渲染管理器）
ViewSystem.prototype.renderZombies = function (zombieManager) {
    if (!zombieManager) return;

    // 获取主人物位置，用于计算活跃僵尸
    var mainCharacter = window.characterManager ? window.characterManager.getMainCharacter() : null;
    if (!mainCharacter) return;

    // 获取活跃僵尸列表（在主人物周围1000px范围内）
    var activeZombies = zombieManager.getActiveZombies(mainCharacter.x, mainCharacter.y, 1000);
    console.log('renderZombies: 活跃僵尸数量:', activeZombies.length);

    // 应用摄像机变换
    this.renderManager.applyCameraTransform();

    // 使用统一渲染管理器渲染僵尸
    this.renderManager.renderEntityList(activeZombies, 'zombie');

    // 恢复变换
    this.renderManager.restoreTransform();
};

// 渲染伙伴（使用统一渲染管理器）
ViewSystem.prototype.renderPartners = function (partnerManager) {
    if (!partnerManager) return;

    // 应用摄像机变换
    this.renderManager.applyCameraTransform();

    // 获取所有伙伴
    var partners = partnerManager.getAllPartners();
    console.log('renderPartners: 伙伴数量:', partners.length);

    // 使用统一渲染管理器渲染伙伴
    this.renderManager.renderEntityList(partners, 'partner');

    // 恢复变换
    this.renderManager.restoreTransform();
};

// 渲染触摸摇杆（不受摄像机变换影响）
ViewSystem.prototype.renderJoystick = function (joystick) {
    if (joystick && joystick.isVisible) {
        this.renderManager.renderUI('joystick', joystick);
    }
};

// 渲染调试信息
ViewSystem.prototype.renderDebugInfo = function () {
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
};

// 渲染时间信息（左上角）
ViewSystem.prototype.renderTimeInfo = function (gameEngine) {
    if (!gameEngine || !gameEngine.getTimeInfo) return;

    // 使用统一渲染管理器渲染时间信息
    const timeData = {
        timeInfo: gameEngine.getTimeInfo()
    };
    
    this.renderManager.renderUI('timeInfo', timeData);
};

// 获取渲染管理器（供外部使用）
ViewSystem.prototype.getRenderManager = function() {
    return this.renderManager;
};

// 导出
export {Camera, ViewSystem, RenderManager};
export default ViewSystem;
