/**
 * 实体渲染器模块 (view/entity-renderer.js)
 *
 * 功能描述：
 * - 专门负责游戏实体的渲染（角色、僵尸、伙伴、建筑物等）
 * - 提供统一的实体渲染接口
 * - 支持自定义渲染样式
 */

import {ENTITY_TYPE} from './render-manager.js';

/**
 * 实体渲染器类
 * 负责渲染所有游戏实体
 */
export class EntityRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * 渲染实体（统一入口）
     * @param {Object} entity - 实体对象
     * @param {string} entityType - 实体类型
     * @returns {boolean} 是否渲染成功
     */
    renderEntity(entity, entityType) {
        if (!entity || entity.hp <= 0) return false;

        switch (entityType) {
            case ENTITY_TYPE.CHARACTER:
                return this.renderCharacter(entity);
            case ENTITY_TYPE.ZOMBIE:
                return this.renderZombie(entity);
            case ENTITY_TYPE.PARTNER:
                return this.renderPartner(entity);
            case ENTITY_TYPE.BUILDING:
                return this.renderBuilding(entity);
            case ENTITY_TYPE.ITEM:
                return this.renderItem(entity);
            case ENTITY_TYPE.EFFECT:
                return this.renderEffect(entity);
            default:
                console.warn('未知实体类型:', entityType);
                return false;
        }
    }

    /**
     * 渲染角色
     * @param {Object} character - 角色对象
     * @returns {boolean} 是否渲染成功
     */
    renderCharacter(character) {
        const worldX = character.x;
        const worldY = character.y;


        // 绘制阴影
        this.renderShadow(worldX, worldY, character.width / 2, 4, 0.3);

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

    /**
     * 渲染僵尸
     * @param {Object} zombie - 僵尸对象
     * @returns {boolean} 是否渲染成功
     */
    renderZombie(zombie) {
        const worldX = zombie.x;
        const worldY = zombie.y;

        // 绘制阴影
        this.renderShadow(worldX, worldY, zombie.size / 2, 3, 0.4);

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

    /**
     * 渲染伙伴
     * @param {Object} partner - 伙伴对象
     * @returns {boolean} 是否渲染成功
     */
    renderPartner(partner) {
        const worldX = partner.x;
        const worldY = partner.y;

        // 绘制阴影
        this.renderShadow(worldX, worldY, partner.width / 2, 4, 0.3);

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

    /**
     * 渲染建筑物
     * @param {Object} building - 建筑物对象
     * @returns {boolean} 是否渲染成功
     */
    renderBuilding(building) {
        if (!building) {
            console.warn('❌ 建筑物对象为空');
            return false;
        }


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

    /**
     * 渲染物品（占位符）
     * @param {Object} item - 物品对象
     * @returns {boolean} 是否渲染成功
     */
    renderItem(item) {
        // 物品渲染逻辑
        return true;
    }

    /**
     * 渲染特效（占位符）
     * @param {Object} effect - 特效对象
     * @returns {boolean} 是否渲染成功
     */
    renderEffect(effect) {
        // 特效渲染逻辑
        return true;
    }

    /**
     * 统一血条渲染
     * @param {Object} entity - 实体对象
     * @param {number} worldX - 世界坐标X
     * @param {number} worldY - 世界坐标Y
     */
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

    /**
     * 渲染阴影
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} radius - 半径
     * @param {number} height - 高度
     * @param {number} opacity - 透明度
     */
    renderShadow(x, y, radius, height, opacity) {
        this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + radius + height, radius, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 渲染图标
     * @param {string} icon - 图标
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} fontSize - 字体大小
     */
    renderIcon(icon, x, y, fontSize) {
        this.ctx.font = fontSize + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(icon, x, y);
    }

    /**
     * 渲染状态指示器
     * @param {Object} entity - 实体对象
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
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

}

export default EntityRenderer;
