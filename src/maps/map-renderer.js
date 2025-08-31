/**
 * 地图渲染器 - 适配新的模块化地图系统
 * 专门处理统一格式的地图（包含config、buildingTypes、matrix等属性）
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
        this.zoom = 0.6;

        // 初始化
        this.init();
    }

    /**
     * 初始化地图渲染器
     * @param {string} mapId - 地图ID
     */
    init(mapId) {
        try {
            console.log('🗺️ 地图渲染器初始化中...');
            
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
                console.log('✅ 地图数据完整，开始解析矩阵...');
                console.log('矩阵数据:', {
                    matrix: this.currentMap.matrix,
                    matrixLength: this.currentMap.matrix.length,
                    buildingTypes: this.currentMap.buildingTypes,
                    buildingTypesCount: Object.keys(this.currentMap.buildingTypes).length
                });
                
                this.parseMatrixMap();
                
                // 检查解析结果
                console.log('解析完成后的状态:', {
                    buildings: this.currentMap.buildings,
                    buildingsLength: this.currentMap.buildings ? this.currentMap.buildings.length : 'undefined',
                    walkableAreas: this.currentMap.walkableAreas,
                    walkableAreasLength: this.currentMap.walkableAreas ? this.currentMap.walkableAreas.length : 'undefined'
                });
            } else {
                console.error('❌ 地图数据不完整:');
                console.error('- matrix:', this.currentMap.matrix);
                console.error('- buildingTypes:', this.currentMap.buildingTypes);
                throw new Error('地图数据不完整，缺少matrix或buildingTypes');
            }
            
            console.log('✅ 地图渲染器初始化完成');
            
        } catch (error) {
            console.error('❌ 地图渲染器初始化失败:', error);
            throw error; // 抛出错误而不是使用兜底
        }
    }

    /**
     * 解析矩阵地图数据
     * 将矩阵转换为建筑物和可通行区域
     */
    parseMatrixMap() {
        console.log('🚀 ===== 开始解析矩阵地图 =====');
        
        if (!this.currentMap.matrix || !this.currentMap.buildingTypes) {
            console.warn('矩阵地图数据不完整');
            return;
        }

        console.log('开始解析矩阵地图...');
        console.log('矩阵尺寸:', this.currentMap.matrix.length, 'x', this.currentMap.matrix[0].length);
        console.log('建筑类型数量:', Object.keys(this.currentMap.buildingTypes).length);
        console.log('建筑类型详情:', this.currentMap.buildingTypes);
        
        // 检查矩阵数据
        const matrix = this.currentMap.matrix;
        const sampleRows = Math.min(5, matrix.length);
        const sampleCols = Math.min(5, matrix[0].length);
        console.log('矩阵数据样本 (前5x5):');
        for (let row = 0; row < sampleRows; row++) {
            let rowStr = '';
            for (let col = 0; col < sampleCols; col++) {
                rowStr += matrix[row][col] + ' ';
            }
            console.log(`行 ${row}: ${rowStr}`);
        }

        const buildings = [];
        const walkableAreas = [];
        const buildingTypes = this.currentMap.buildingTypes;
        const cellSize = this.currentMap.config.cellSize;

        // 统计矩阵中的值分布
        const valueCounts = {};
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                const cellType = matrix[row][col];
                valueCounts[cellType] = (valueCounts[cellType] || 0) + 1;
            }
        }
        console.log('矩阵值分布:', valueCounts);

        // 遍历矩阵，识别连续的建筑块
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                const cellType = matrix[row][col];

                if (cellType === 0) {
                    // 马路/空地 - 添加到可通行区域
                    const areaX = col * cellSize;
                    const areaY = row * cellSize;
                    walkableAreas.push({
                        x: areaX, y: areaY, width: cellSize, height: cellSize, type: 'road', bounds: {
                            left: areaX, right: areaX + cellSize, top: areaY, bottom: areaY + cellSize
                        }
                    });
                } else {
                    // 建筑物 - 查找连续的建筑块
                    const buildingInfo = buildingTypes[cellType];
                    if (buildingInfo) {
                        const buildingBlock = this.findBuildingBlock(matrix, row, col, cellType);
                        if (buildingBlock) {
                            const building = this.createBuildingFromBlock(buildingBlock, buildingInfo, cellSize);
                            buildings.push(building);
                            
                            console.log(`✅ 创建建筑物: 类型=${buildingInfo.name}, 位置=(${building.x}, ${building.y}), 尺寸=${building.width}x${building.height}`);

                            // 跳过已处理的建筑块（修复跳过逻辑）
                            if (buildingBlock.width > 1) {
                                col += buildingBlock.width - 1;
                            }
                        }
                    } else {
                        console.warn(`未找到建筑类型 ${cellType} 的定义`);
                    }
                }
            }
        }

        // 更新地图数据
        this.currentMap.buildings = buildings;
        this.currentMap.walkableAreas = walkableAreas;

        console.log('✅ 矩阵地图解析完成');
        console.log('生成的建筑物数量:', buildings.length);
        console.log('生成的可通行区域数量:', walkableAreas.length);
        
        // 输出第一个建筑物的详细信息（如果存在）
        if (buildings.length > 0) {
            console.log('第一个建筑物详情:', buildings[0]);
        }
        console.log('🚀 ===== 矩阵地图解析完成 =====');
    }

    /**
     * 查找连续的建筑块
     */
    findBuildingBlock(matrix, startRow, startCol, cellType) {
        const maxRows = matrix.length;
        const maxCols = matrix[0].length;

        // 计算建筑块的宽度
        let width = 1;
        while (startCol + width < maxCols && matrix[startRow][startCol + width] === cellType) {
            width++;
        }

        // 计算建筑块的高度
        let height = 1;
        while (startRow + height < maxRows && matrix[startRow + height][startCol] === cellType) {
            height++;
        }

        // 验证整个建筑块是否都是相同的类型
        let isValidBlock = true;
        for (let r = startRow; r < startRow + height && isValidBlock; r++) {
            for (let c = startCol; c < startCol + width && isValidBlock; c++) {
                if (matrix[r][c] !== cellType) {
                    isValidBlock = false;
                }
            }
        }

        if (!isValidBlock) {
            console.warn(`建筑块验证失败: 位置(${startRow}, ${startCol}), 类型${cellType}, 尺寸${width}x${height}`);
            return null;
        }

        const result = {
            startRow: startRow,
            startCol: startCol,
            width: width,
            height: height,
            cellType: cellType
        };

        console.log(`🔍 找到建筑块: 位置(${startRow}, ${startCol}), 类型${cellType}, 尺寸${width}x${height}`);
        return result;
    }

    /**
     * 从建筑块创建建筑物对象
     */
    createBuildingFromBlock(block, buildingInfo, cellSize) {
        const buildingX = (block.startCol + block.width / 2) * cellSize;
        const buildingY = (block.startRow + block.height / 2) * cellSize;
        const buildingWidth = block.width * cellSize;
        const buildingHeight = block.height * cellSize;

        return {
            x: buildingX,
            y: buildingY,
            width: buildingWidth,
            height: buildingHeight,
            type: buildingInfo.name,
            color: buildingInfo.color,
            icon: buildingInfo.icon,
            walkable: buildingInfo.walkable,
            hasDoor: buildingInfo.hasDoor,
            bounds: {
                left: buildingX - buildingWidth / 2,
                right: buildingX + buildingWidth / 2,
                top: buildingY - buildingHeight / 2,
                bottom: buildingY + buildingHeight / 2
            }
        };
    }

    /**
     * 渲染地图（主要渲染方法）
     * @param {CanvasRenderingContext2D} externalCtx - 外部传入的绘图上下文（可选）
     */
    render(externalCtx = null) {
        if (!this.currentMap) {
            console.warn('没有可渲染的地图');
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
        if (!this.currentMap.config.cellSize) return;

        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;

        const cellSize = this.currentMap.config.cellSize;
        const gridCols = this.currentMap.config.gridCols;
        const gridRows = this.currentMap.config.gridRows;

        // 绘制垂直线
        for (let col = 0; col <= gridCols; col++) {
            const x = col * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.currentMap.config.height);
            ctx.stroke();
        }

        // 绘制水平线
        for (let row = 0; row <= gridRows; row++) {
            const y = row * cellSize;
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 300, 150);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';

        let y = 30;
        ctx.fillText(`地图: ${this.currentMap.config.name}`, 15, y);
        y += 15;
        ctx.fillText(`类型: ${this.currentMap.config.type || 'matrix'}`, 15, y);
        y += 15;
        ctx.fillText(`尺寸: ${this.currentMap.config.width} x ${this.currentMap.config.height}`, 15, y);
        y += 15;
        ctx.fillText(`网格: ${this.currentMap.config.gridCols} x ${this.currentMap.config.gridRows}`, 15, y);
        y += 15;
        ctx.fillText(`单元格: ${this.currentMap.config.cellSize}px`, 15, y);
        y += 15;
        ctx.fillText(`建筑物: ${this.currentMap.buildings?.length || 0}`, 15, y);
        y += 15;
        ctx.fillText(`可通行区域: ${this.currentMap.walkableAreas?.length || 0}`, 15, y);
    }
}

// 导出
export default MapRenderer;
