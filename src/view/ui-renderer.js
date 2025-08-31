/**
 * UI渲染器模块 (view/ui-renderer.js)
 *
 * 功能描述：
 * - 专门负责UI元素的渲染（摇杆、血条、调试信息、时间信息等）
 * - 提供统一的UI渲染接口
 * - 支持自定义UI样式
 */

/**
 * UI渲染器类
 * 负责渲染所有UI元素
 */
export class UIRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * 渲染UI元素（统一入口）
     * @param {string} uiType - UI类型
     * @param {Object} data - 渲染数据
     * @returns {boolean} 是否渲染成功
     */
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

    /**
     * 渲染游戏结束UI
     * @param {Object} data - 渲染数据
     * @returns {boolean} 是否渲染成功
     */
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

    /**
     * 渲染摇杆UI
     * @param {Object} joystick - 摇杆对象
     * @returns {boolean} 是否渲染成功
     */
    renderJoystickUI(joystick) {
        if (!joystick || !joystick.isVisible) {
            console.log('🔴 摇杆渲染失败: 摇杆不可见或不存在', {
                joystick: !!joystick,
                isVisible: joystick ? joystick.isVisible : false
            });
            return false;
        }

        console.log('🔴 开始渲染摇杆:', {
            centerX: joystick.centerX,
            centerY: joystick.centerY,
            outerRadius: joystick.outerRadius,
            innerRadius: joystick.innerRadius,
            joystickX: joystick.joystickX,
            joystickY: joystick.joystickY,
            isActive: joystick.isActive,
            isDragging: joystick.isDragging
        });

        // 绘制外圈
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(joystick.centerX, joystick.centerY, joystick.outerRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制外圈边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 🔴 修复：计算内圈位置（与原始摇杆渲染保持一致）
        const innerX = joystick.centerX + joystick.joystickX;
        const innerY = joystick.centerY + joystick.joystickY;

        console.log('🔴 摇杆内圈位置:', {
            innerX: innerX,
            innerY: innerY,
            centerX: joystick.centerX,
            centerY: joystick.centerY,
            joystickX: joystick.joystickX,
            joystickY: joystick.joystickY
        });

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

        // 🔴 新增：绘制方向指示器
        if (joystick.isActive && (joystick.joystickX !== 0 || joystick.joystickY !== 0)) {
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(joystick.centerX, joystick.centerY);
            this.ctx.lineTo(innerX, innerY);
            this.ctx.stroke();
            
            console.log('🔴 绘制方向指示器:', {
                from: {x: joystick.centerX, y: joystick.centerY},
                to: {x: innerX, y: innerY}
            });
        }

        console.log('🔴 摇杆渲染完成');
        return true;
    }

    /**
     * 渲染调试信息UI
     * @param {Object} data - 调试数据
     * @returns {boolean} 是否渲染成功
     */
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

    /**
     * 渲染时间信息UI
     * @param {Object} data - 时间数据
     * @returns {boolean} 是否渲染成功
     */
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

    /**
     * 渲染血条
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
     * 渲染按钮
     * @param {Object} button - 按钮配置
     * @returns {boolean} 是否渲染成功
     */
    renderButton(button) {
        const {x, y, width, height, text, color = '#4CAF50', textColor = '#FFFFFF'} = button;

        // 按钮背景
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.darkenColor(color, 0.2));
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, width, height);

        // 按钮边框
        this.ctx.strokeStyle = this.darkenColor(color, 0.3);
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // 按钮文字
        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x + width / 2, y + height / 2);

        return true;
    }

    /**
     * 渲染面板
     * @param {Object} panel - 面板配置
     * @returns {boolean} 是否渲染成功
     */
    renderPanel(panel) {
        const {x, y, width, height, title, backgroundColor = 'rgba(0, 0, 0, 0.8)', borderColor = '#FFFFFF'} = panel;

        // 面板背景
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(x, y, width, height);

        // 面板边框
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // 面板标题
        if (title) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, x + width / 2, y + 25);
        }

        return true;
    }

    /**
     * 渲染文本
     * @param {Object} textConfig - 文本配置
     * @returns {boolean} 是否渲染成功
     */
    renderText(textConfig) {
        const {x, y, text, fontSize = 16, color = '#FFFFFF', align = 'left', baseline = 'top'} = textConfig;

        this.ctx.fillStyle = color;
        this.ctx.font = fontSize + 'px Arial';
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);

        return true;
    }

    /**
     * 颜色变暗工具函数
     * @param {string} color - 原始颜色
     * @param {number} factor - 变暗因子
     * @returns {string} 变暗后的颜色
     */
    darkenColor(color, factor) {
        // 简单的颜色变暗实现
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            const newR = Math.floor(r * (1 - factor));
            const newG = Math.floor(g * (1 - factor));
            const newB = Math.floor(b * (1 - factor));
            
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        }
        return color;
    }
}

export default UIRenderer;
