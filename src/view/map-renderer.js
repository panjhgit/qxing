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

        // 解析地图数据
        if (this.currentMap.matrix && this.currentMap.buildingTypes) {

            this.parseMatrixMap();

        } else {
            console.warn('❌ 地图数据不完整:');
            console.warn('- matrix:', this.currentMap.matrix);
            console.warn('- buildingTypes:', this.currentMap.buildingTypes);
            throw new Error('地图数据不完整，缺少matrix或buildingTypes');
        }
    }

    /**
     * 解析矩阵地图数据
     * 将矩阵转换为建筑物和可通行区域
     */
    parseMatrixMap() {
        if (!this.currentMap.matrix || !this.currentMap.buildingTypes) {
            throw new Error('矩阵地图数据不完整');
            return;
        }

        // 检查矩阵数据
        const matrix = this.currentMap.matrix;

        // 初始化建筑物和可通行区域数组
        this.currentMap.buildings = [];
        this.currentMap.walkableAreas = [];

        const buildingTypes = this.currentMap.buildingTypes;
        const cellSize = this.currentMap.config.cellSize || 50;
        const matrixRows = matrix.length;
        const matrixCols = matrix[0].length;

        // 遍历矩阵，解析建筑物和可通行区域
        for (let row = 0; row < matrixRows; row++) {
            for (let col = 0; col < matrixCols; col++) {
                const cellValue = matrix[row][col];

                if (cellValue === 0) {
                    // 可通行区域
                    this.addWalkableArea(row, col, cellSize);
                } else if (buildingTypes[cellValue]) {
                    // 建筑物
                    this.addBuilding(row, col, cellValue, buildingTypes[cellValue], cellSize);
                }
            }
        }


    }

    /**
     * 添加可通行区域
     * @param {number} row - 矩阵行
     * @param {number} col - 矩阵列
     * @param {number} cellSize - 单元格大小
     */
    addWalkableArea(row, col, cellSize) {
        const worldX = col * cellSize + cellSize / 2;
        const worldY = row * cellSize + cellSize / 2;

        this.currentMap.walkableAreas.push({
            x: worldX, y: worldY, width: cellSize, height: cellSize, bounds: {
                left: worldX - cellSize / 2,
                top: worldY - cellSize / 2,
                right: worldX + cellSize / 2,
                bottom: worldY + cellSize / 2
            }
        });
    }

    /**
     * 添加建筑物
     * @param {number} row - 矩阵行
     * @param {number} col - 矩阵列
     * @param {number} buildingTypeId - 建筑类型ID
     * @param {Object} buildingType - 建筑类型配置
     * @param {number} cellSize - 单元格大小
     */
    addBuilding(row, col, buildingTypeId, buildingType, cellSize) {
        const worldX = col * cellSize + cellSize / 2;
        const worldY = row * cellSize + cellSize / 2;

        const buildingWidth = buildingType.width || cellSize;
        const buildingHeight = buildingType.height || cellSize;

        this.currentMap.buildings.push({
            x: worldX,
            y: worldY,
            width: buildingWidth,
            height: buildingHeight,
            type: buildingType.name || '未知建筑',
            color: buildingType.color || '#8B4513',
            icon: buildingType.icon || '🏠',
            bounds: {
                left: worldX - buildingWidth / 2,
                top: worldY - buildingHeight / 2,
                right: worldX + buildingWidth / 2,
                bottom: worldY + buildingHeight / 2
            }
        });
    }

    /**
     * 渲染地图（主要渲染方法）
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

        // 渲染建筑物
        this.renderBuildings(ctx);

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
     * @param {CanvasRenderingContext2D} ctx - 绘图上下文
     */
    renderBuildings(ctx) {
        if (!this.currentMap.buildings) return;

        for (const building of this.currentMap.buildings) {
            if (!building || !building.bounds) continue;

            this.renderBuilding(building, ctx);
        }
    }

    /**
     * 渲染单个建筑物
     * @param {Object} building - 建筑物对象
     * @param {CanvasRenderingContext2D} ctx - 绘图上下文
     */
    renderBuilding(building, ctx) {
        const {left, top, right, bottom} = building.bounds;
        const width = right - left;
        const height = bottom - top;

        // 建筑物主体
        ctx.fillStyle = building.color || '#8B4513';
        ctx.fillRect(left, top, width, height);

        // 建筑物边框
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);

        // 建筑物标签
        if (building.type) {
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(building.type, building.x, building.y);
        }
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
                return window.ConfigManager.get('PERFORMANCE.OPTIMIZATION.CAMERA.ZOOM');
            } catch (error) {
                console.warn('无法从配置获取ZOOM值，使用默认值:', error.message);
                return 0.7;
            }
        }
        return 0.7; // 默认值
    }
}

export default MapRenderer;
