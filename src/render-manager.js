/**
 * 统一渲染管理器 (render-manager.js)
 *
 * 功能描述：
 * - 统一管理所有游戏对象的渲染
 * - 提供批量渲染和性能优化
 * - 支持渲染统计和调试信息
 * - 可扩展的渲染插件系统
 */

// 渲染配置
const RENDER_CONFIG = {
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
        MAX_RENDER_DISTANCE: 1000
    },
    
    // 调试设置
    DEBUG: {
        SHOW_BOUNDS: false,
        SHOW_STATS: true,
        SHOW_FPS: true
    }
};

// 实体类型枚举
const ENTITY_TYPE = {
    CHARACTER: 'character',
    ZOMBIE: 'zombie',
    PARTNER: 'partner',
    BUILDING: 'building',
    ITEM: 'item',
    EFFECT: 'effect'
};

// 渲染状态枚举
const RENDER_STATE = {
    IDLE: 'idle',
    RENDERING: 'rendering',
    PAUSED: 'paused'
};

// 统一渲染管理器类
class RenderManager {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        this.state = RENDER_STATE.IDLE;
        
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

        let success = false;
        switch (entityType) {
            case ENTITY_TYPE.CHARACTER:
                success = this.renderCharacter(entity);
                if (success) this.renderStats.charactersRendered++;
                break;
            case ENTITY_TYPE.ZOMBIE:
                success = this.renderZombie(entity);
                if (success) this.renderStats.zombiesRendered++;
                break;
            case ENTITY_TYPE.PARTNER:
                success = this.renderPartner(entity);
                if (success) this.renderStats.partnersRendered++;
                break;
            case ENTITY_TYPE.BUILDING:
                success = this.renderBuilding(entity);
                if (success) this.renderStats.buildingsRendered++;
                break;
            case ENTITY_TYPE.ITEM:
                success = this.renderItem(entity);
                if (success) this.renderStats.itemsRendered++;
                break;
            case ENTITY_TYPE.EFFECT:
                success = this.renderEffect(entity);
                if (success) this.renderStats.effectsRendered++;
                break;
            default:
                console.warn('未知实体类型:', entityType);
                return false;
        }

        if (success) {
            this.renderStats.totalRendered++;
        }

        return success;
    }

    // 渲染角色
    renderCharacter(character) {
        const worldX = character.x;
        const worldY = character.y;

        // 绘制阴影
        if (RENDER_CONFIG.QUALITY.SHADOW_ENABLED) {
            this.renderShadow(worldX, worldY, character.width / 2, 4, 0.3);
        }

        // 绘制人物主体（圆形设计）
        const bodyY = worldY - character.height / 2;

        // 身体
        this.ctx.fillStyle = character.getBodyColor ? character.getBodyColor() : '#87CEEB';
        this.ctx.beginPath();
        this.ctx.arc(worldX, bodyY + character.height / 2, character.width / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 头部
        this.ctx.fillStyle = character.getHeadColor ? character.getHeadColor() : '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(worldX, bodyY + character.height / 6, character.width / 3, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制图标
        this.renderIcon(character.icon || '👤', worldX, bodyY + character.height / 2, 16);

        // 绘制状态指示器
        this.renderStatusIndicator(character, worldX, bodyY);

        // 绘制血条
        this.renderHealthBar(character, worldX, worldY);

        return true;
    }

    // 渲染僵尸
    renderZombie(zombie) {
        const worldX = zombie.x;
        const worldY = zombie.y;

        // 绘制阴影
        if (RENDER_CONFIG.QUALITY.SHADOW_ENABLED) {
            this.renderShadow(worldX, worldY, zombie.size / 2, 3, 0.4);
        }

        // 绘制僵尸主体（圆形设计）
        const bodyY = worldY - zombie.size / 2;

        // 身体
        this.ctx.fillStyle = zombie.color || '#8B4513';
        this.ctx.beginPath();
        this.ctx.arc(worldX, bodyY + zombie.size / 2, zombie.size / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 头部
        this.ctx.fillStyle = '#654321';
        this.ctx.beginPath();
        this.ctx.arc(worldX, bodyY + zombie.size / 6, zombie.size / 3, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制图标
        this.renderIcon(zombie.icon || '🧟‍♂️', worldX, bodyY + zombie.size / 2, Math.floor(zombie.size / 2));

        // 绘制状态指示器
        if (zombie.state === 'chasing') {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(worldX, bodyY - 7.5, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 绘制血条
        this.renderHealthBar(zombie, worldX, worldY);

        return true;
    }

    // 渲染伙伴
    renderPartner(partner) {
        const worldX = partner.x;
        const worldY = partner.y;

        // 绘制阴影
        if (RENDER_CONFIG.QUALITY.SHADOW_ENABLED) {
            this.renderShadow(worldX, worldY, partner.width / 2, 4, 0.3);
        }

        // 绘制伙伴主体（圆形设计）
        const bodyY = worldY - partner.height / 2;

        // 身体
        this.ctx.fillStyle = partner.getBodyColor ? partner.getBodyColor() : '#98FB98';
        this.ctx.beginPath();
        this.ctx.arc(worldX, bodyY + partner.height / 2, partner.width / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 头部
        this.ctx.fillStyle = partner.getHeadColor ? partner.getHeadColor() : '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(worldX, bodyY + partner.height / 6, partner.width / 3, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制图标
        this.renderIcon(partner.icon || '👥', worldX, bodyY + partner.height / 2, 16);

        // 绘制状态指示器
        this.renderStatusIndicator(partner, worldX, bodyY);

        // 绘制血条
        this.renderHealthBar(partner, worldX, worldY);

        return true;
    }

    // 渲染建筑物
    renderBuilding(building) {
        if (!building) return false;

        // 使用中心点坐标系统
        const x = building.x - building.width / 2;
        const y = building.y - building.height / 2;

        // 绘制建筑物主体
        this.ctx.fillStyle = building.color || '#CD853F';
        this.ctx.fillRect(x, y, building.width, building.height);

        // 绘制建筑物边框
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, building.width, building.height);

        // 绘制建筑物图标
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(building.icon || '🏠', building.x, building.y);

        // 绘制建筑物名称
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(building.type || '建筑', building.x, y + 20);

        return true;
    }

    // 渲染物品（占位符）
    renderItem(item) {
        // 物品渲染逻辑
        return true;
    }

    // 渲染特效（占位符）
    renderEffect(effect) {
        // 特效渲染逻辑
        return true;
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

    // 渲染地图网格（调试用）
    renderMapGrid(mapConfig, cellSize = 200) {
        if (!mapConfig) return false;

        this.ctx.strokeStyle = '#CCCCCC';
        this.ctx.lineWidth = 1;

        // 绘制垂直线
        for (let x = 0; x <= mapConfig.width; x += cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, mapConfig.height);
            this.ctx.stroke();
        }

        // 绘制水平线
        for (let y = 0; y <= mapConfig.height; y += cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(mapConfig.width, y);
            this.ctx.stroke();
        }
        return true;
    }

    // 渲染UI元素（游戏结束界面等）
    renderUI(uiType, data) {
        switch (uiType) {
            case 'gameOver':
                return this.renderGameOverUI(data);
            case 'joystick':
                return this.renderJoystickUI(data);
            case 'debugInfo':
                return this.renderDebugInfoUI(data);
            case 'timeInfo':
                return this.renderTimeInfoUI(data);
            default:
                console.warn('未知UI类型:', uiType);
                return false;
        }
    }

    // 渲染游戏结束UI
    renderGameOverUI(data) {
        const {canvas, message = '游戏结束'} = data;
        if (!canvas) return false;

        // 半透明黑色背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 游戏结束文字
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);

        // 死亡原因
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('主人物已死亡', canvas.width / 2, canvas.height / 2);

        // 重新开始提示
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('点击屏幕重新开始', canvas.width / 2, canvas.height / 2 + 50);

        return true;
    }

    // 渲染摇杆UI
    renderJoystickUI(joystick) {
        if (!joystick || !joystick.isVisible) return false;

        // 绘制外圈
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(joystick.centerX, joystick.centerY, joystick.outerRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制外圈边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 计算内圈位置
        const innerX = joystick.centerX + joystick.joystickX * joystick.outerRadius;
        const innerY = joystick.centerY + joystick.joystickY * joystick.outerRadius;

        // 绘制内圈
        this.ctx.fillStyle = joystick.isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(innerX, innerY, joystick.innerRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制内圈边框
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 绘制中心点
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(joystick.centerX, joystick.centerY, 3, 0, Math.PI * 2);
        this.ctx.fill();

        return true;
    }

    // 渲染调试信息UI
    renderDebugInfoUI(data) {
        const {cameraPos, renderStats, canvas, camera, renderDistance} = data;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 300, 120);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';

        this.ctx.fillText('摄像机位置: ' + Math.round(cameraPos.x) + ', ' + Math.round(cameraPos.y), 15, 30);
        this.ctx.fillText('摄像机缩放: ' + camera.getZoom().toFixed(2), 15, 45);
        this.ctx.fillText('屏幕尺寸: ' + canvas.width + ' x ' + canvas.height, 15, 60);
        this.ctx.fillText('地图尺寸: ' + camera.mapWidth + ' x ' + camera.mapHeight, 15, 75);
        this.ctx.fillText('渲染距离: ' + renderDistance, 15, 90);
        this.ctx.fillText('渲染统计: 角色' + renderStats.charactersRendered + ' 僵尸' + renderStats.zombiesRendered + ' 伙伴' + renderStats.partnersRendered, 15, 105);

        return true;
    }

    // 渲染时间信息UI
    renderTimeInfoUI(data) {
        const {timeInfo} = data;

        // 绘制背景面板
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(10, 10, 180, 60);

        // 绘制边框
        this.ctx.strokeStyle = timeInfo.isDay ? '#FFD700' : '#4169E1';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(10, 10, 180, 60);

        // 设置文字样式
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';

        // 显示天数
        const dayText = '第 ' + timeInfo.day + ' 天';
        const timeText = timeInfo.isDay ? '☀️ 白天' : '🌙 夜晚';
        this.ctx.fillText(dayText, 20, 30);
        this.ctx.fillText(timeText, 20, 50);

        // 显示团队人数和食物数量
        const teamText = '👥 团队: ' + timeInfo.teamSize + ' 人';
        const foodText = '🍖 食物: ' + timeInfo.food;

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(teamText, 20, 70);

        this.ctx.fillStyle = timeInfo.food > 0 ? '#00FF00' : '#FF0000';
        this.ctx.fillText(foodText, 120, 70);

        return true;
    }

    // 统一血条渲染
    renderHealthBar(entity, worldX, worldY) {
        const barWidth = entity.width || entity.size || 32;
        const barHeight = 6;
        const barX = worldX - barWidth / 2;
        const barY = worldY - (entity.height || entity.size || 32) / 2 - 15;

        // 计算血量比例
        const healthRatio = entity.hp / entity.maxHp;

        // 绘制血条背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // 绘制血条边框
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        // 根据血量比例绘制血条填充
        const fillWidth = barWidth * healthRatio;
        if (fillWidth > 0) {
            // 根据血量选择颜色
            if (healthRatio > 0.6) {
                this.ctx.fillStyle = '#00FF00'; // 绿色
            } else if (healthRatio > 0.3) {
                this.ctx.fillStyle = '#FFFF00'; // 黄色
            } else {
                this.ctx.fillStyle = '#FF0000'; // 红色
            }

            this.ctx.fillRect(barX, barY, fillWidth, barHeight);
        }

        // 如果是主人物，显示具体血量数值
        if (entity.role === 1) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(entity.hp + '/' + entity.maxHp, worldX, barY - 5);
        }
    }

    // 渲染阴影
    renderShadow(x, y, radius, height, opacity) {
        this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + radius + height, radius, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // 渲染图标
    renderIcon(icon, x, y, fontSize) {
        this.ctx.font = fontSize + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(icon, x, y);
    }

    // 渲染状态指示器
    renderStatusIndicator(entity, x, y) {
        const bodyY = y - (entity.height || entity.size || 32) / 2;
        
        if (entity.status === 'FOLLOW') {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.beginPath();
            this.ctx.arc(x, bodyY - 6, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (entity.status === 'INIT') {
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.beginPath();
            this.ctx.arc(x, bodyY - 6, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
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
        return this.camera.isInView(entity.x, entity.y, size, size);
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

// 导出
export { RenderManager, ENTITY_TYPE, RENDER_STATE, RENDER_CONFIG };
export default RenderManager;
