/**
 * 摄像机系统模块 (camera.js)
 *
 * 功能描述：
 * - 摄像机跟随主人物移动，保持主人物在屏幕中心
 * - 世界坐标到屏幕坐标的转换
 * - 视距裁剪：只渲染屏幕可见范围内的对象
 * - 地图边界限制
 */

// 摄像机类
export class Camera {
    constructor(canvas) {
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
        this.zoom = this.getConfigZoom();
        this.offsetX = 0;
        this.offsetY = 0;
    }

    // 设置地图边界
    setMapBounds(width, height) {
        this.mapWidth = width;
        this.mapHeight = height;
        console.log('摄像机地图边界设置:', width, 'x', height);
    }

    // 设置摄像机位置
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.constrainToMap();
        console.log('摄像机位置已设置为:', this.x, this.y);
    }

    // 跟随目标
    followTarget(targetX, targetY) {
        console.log('摄像机跟随目标:', targetX, targetY);
        this.x = targetX;
        this.y = targetY;
        this.constrainToMap();
        console.log('摄像机位置已更新为:', this.x, this.y);
    }

    // 更新摄像机位置
    update() {
        this.constrainToMap();
    }

    // 限制摄像机在地图边界内
    constrainToMap() {
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
    }

    // 世界坐标转屏幕坐标
    worldToScreen(worldX, worldY) {
        // 计算相对于摄像机中心的偏移
        var offsetX = worldX - this.x;
        var offsetY = worldY - this.y;

        // 转换为屏幕坐标，主人物应该在屏幕中心
        var screenX = this.screenWidth / 2 + offsetX * this.zoom;
        var screenY = this.screenHeight / 2 + offsetY * this.zoom;

        return {x: screenX, y: screenY};
    }

    // 检查对象是否在屏幕范围内
    isInView(worldX, worldY, width, height) {
        var screenPos = this.worldToScreen(worldX, worldY);
        var screenWidth = width * this.zoom;
        var screenHeight = height * this.zoom;

        return screenPos.x + screenWidth >= 0 && screenPos.x <= this.screenWidth && screenPos.y + screenHeight >= 0 && screenPos.y <= this.screenHeight;
    }

    // 获取摄像机位置
    getPosition() {
        return {x: this.x, y: this.y};
    }

    // 获取缩放
    getZoom() {
        return this.zoom;
    }

    // 从配置获取zoom值
    getConfigZoom() {
        if (window.ConfigManager && window.ConfigManager.get) {
            try {
                return window.ConfigManager.get('PERFORMANCE.OPTIMIZATION.CAMERA.ZOOM');
            } catch (error) {
                console.warn('无法从配置获取ZOOM值，使用默认值:', error.message);
                return 0.7;
            }
        }
        return 0.7; // 默认值
    }

    // 设置缩放
    setZoom(zoom) {
        this.zoom = Math.max(0.3, Math.min(1.2, zoom)); // 限制在配置范围内
    }
}

export default Camera;
