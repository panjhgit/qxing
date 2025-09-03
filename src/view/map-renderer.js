/**
 * 地图渲染器模块 (view/map-renderer.js)
 *
 * 功能描述：
 * - 地图渲染器：负责渲染地图、建筑物、可通行区域等
 * - 适配新的模块化地图系统
 * - 专门处理统一格式的地图（包含config、buildingTypes、matrix等属性）
 */

/**
 * 地图渲染器类
 * 负责渲染地图、建筑物、可通行区域等
 */
export class MapRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.currentMap = null;
        this.mapId = 'city'; // 默认地图

        // 渲染配置
        this.showGrid = false;
        this.showDebug = false;
        this.zoom = this.getConfigZoom();

        // 初始化
        this.init();
    }

    /**
     * 初始化地图渲染器
     * 🔴 优化：移除重复的地图解析，直接使用MapManager的数据
     * @param {string} mapId - 地图ID
     */
    init(mapId) {
        // 获取地图数据
        if (window.MapManager && window.MapManager.getCurrentMap) {
            this.currentMap = window.MapManager.getCurrentMap();
        } else {
            throw new Error('地图管理器未初始化');
        }

        if (!this.currentMap) {
            throw new Error('无法获取地图数据');
        }

        // 🔴 修复：不再重复解析地图矩阵，直接使用MapManager已解析的数据
        if (this.currentMap.buildings && this.currentMap.walkableAreas) {
            console.log('✅ MapRenderer: 使用MapManager已解析的地图数据');
            console.log(`- 可通行区域: ${this.currentMap.walkableAreas.length}个`);
            console.log(`- 建筑区域: ${this.currentMap.buildings.length}个`);
        } else {
            console.warn('❌ 地图数据不完整:');
            console.warn('- buildings:', this.currentMap.buildings);
            console.warn('- walkableAreas:', this.currentMap.walkableAreas);
            throw new Error('地图数据不完整，缺少buildings或walkableAreas');
        }
    }


    /**
     * 渲染地图（主要渲染方法）
     * 🔴 优化：只渲染地图背景和可通行区域，建筑物由renderAllGameEntities统一处理
     * @param {CanvasRenderingContext2D} externalCtx - 外部传入的绘图上下文（可选）
     */
    render(externalCtx = null) {
        if (!this.currentMap) {
            throw new Error('没有可渲染的地图');
            return;
        }

        // 使用外部上下文或内部上下文
        const ctx = externalCtx || this.ctx;

        // 渲染地图背景
        this.renderBackground(ctx);

        // 渲染可通行区域
        this.renderWalkableAreas(ctx);

        // 渲染地图边界
        this.renderBoundaries(ctx);

        // 渲染网格（可选）
        if (this.showGrid) {
            this.renderGrid(ctx);
        }

        // 渲染调试信息
        if (this.showDebug) {
            this.renderDebugInfo(ctx);
        }
    }

    /**
     * 渲染地图背景
     * @param {CanvasRenderingContext2D} ctx - 绘图上下文
     */
    renderBackground(ctx) {
        ctx.fillStyle = '#F0F8FF'; // 浅蓝色背景
        ctx.fillRect(0, 0, this.currentMap.config.width, this.currentMap.config.height);
    }

    /**
     * 渲染可通行区域（街道）
     * @param {CanvasRenderingContext2D} ctx - 绘图上下文
     */
    renderWalkableAreas(ctx) {
        if (!this.currentMap.walkableAreas) return;

        ctx.fillStyle = '#FFFFFF'; // 白色街道
        ctx.strokeStyle = '#E0E0E0'; // 浅灰色边框
        ctx.lineWidth = 1;

        for (const area of this.currentMap.walkableAreas) {
            if (!area || !area.bounds) continue;

            const {left, top, right, bottom} = area.bounds;
            const width = right - left;
            const height = bottom - top;

            // 填充街道
            ctx.fillRect(left, top, width, height);

            // 绘制边框
            ctx.strokeRect(left, top, width, height);
        }
    }

    /**
     * 渲染建筑物
     * 🔴 修复：此方法已废弃，建筑物现在由RenderManager统一处理
     * @param {CanvasRenderingContext2D} ctx - 绘图上下文
     */
    renderBuildings(ctx) {
        // 🔴 修复：建筑物现在由RenderManager统一处理，避免重复渲染
        console.warn('⚠️ MapRenderer.renderBuildings已废弃，建筑物由RenderManager统一处理');
        return;
    }

    /**
     * 渲染地图边界
     * @param {CanvasRenderingContext2D} ctx - 绘图上下文
     */
    renderBoundaries(ctx) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, this.currentMap.config.width, this.currentMap.config.height);
    }

    /**
     * 渲染网格
     * @param {CanvasRenderingContext2D} ctx - 绘图上下文
     */
    renderGrid(ctx) {
        const cellSize = this.currentMap.config.cellSize || 50;

        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;

        // 绘制垂直线
        for (let x = 0; x <= this.currentMap.config.width; x += cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.currentMap.config.height);
            ctx.stroke();
        }

        // 绘制水平线
        for (let y = 0; y <= this.currentMap.config.height; y += cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.currentMap.config.width, y);
            ctx.stroke();
        }
    }

    /**
     * 渲染调试信息
     * @param {CanvasRenderingContext2D} ctx - 绘图上下文
     */
    renderDebugInfo(ctx) {
        // 调试信息渲染已统一到RenderManager中处理

    }


    /**
     * 获取当前地图数据
     * @returns {Object} 当前地图数据
     */
    getCurrentMap() {
        return this.currentMap;
    }

    /**
     * 从配置获取zoom值
     * @returns {number} zoom值
     */
    getConfigZoom() {
        if (window.ConfigManager && window.ConfigManager.get) {
            try {
                return window.ConfigManager.get('PERFORMANCE.CAMERA.ZOOM');
            } catch (error) {
                console.warn('无法从配置获取ZOOM值，使用默认值:', error.message);
                return 0.7;
            }
        }
        return 0.7; // 默认值
    }
}

export default MapRenderer;
