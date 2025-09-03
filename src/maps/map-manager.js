/**
 * 地图管理器 - 统一管理所有地图定义
 * 支持地图切换、配置管理和动态加载
 */

import {CityMap} from './city-map.js';

export const MapManager = {
    // 当前激活的地图
    currentMap: null,

    // 所有可用的地图 - 只保留city地图
    availableMaps: {
        'city': CityMap
    },

    // 地图配置缓存
    mapCache: new Map(),

    /**
     * 初始化地图管理器
     * @param {string} defaultMapId - 默认地图ID
     */
    init: function (defaultMapId = 'city') {

        // 只使用city地图，如果不存在则抛出错误
        if (this.availableMaps[defaultMapId]) {
            this.switchMap(defaultMapId);
        } else {
            throw new Error(`地图 ${defaultMapId} 不存在，无法初始化地图管理器`);
        }
        return this.currentMap;
    },

    /**
     * 切换到指定地图
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 地图对象或null
     */
    switchMap: function (mapId) {
        if (!this.availableMaps[mapId]) {
            console.warn('❌ 地图不存在:', mapId);
            return null;
        }

        // 获取地图定义
        const mapDefinition = this.availableMaps[mapId];

        // 创建地图实例
        this.currentMap = {
            id: mapId,
            config: mapDefinition.config,
            buildingTypes: mapDefinition.buildingTypes,
            matrix: mapDefinition.matrix,
            areas: mapDefinition.areas,

            // 地图状态
            isLoaded: false,
            loadTime: null,

            // 地图统计
            stats: this.calculateMapStats(mapDefinition)
        };

        // 生成建筑物和可通行区域数据
        this.generateMapData();

        // 标记为已加载
        this.currentMap.isLoaded = true;
        this.currentMap.loadTime = Date.now();

        // 缓存地图数据
        this.mapCache.set(mapId, this.currentMap);


        return this.currentMap;
    },

    /**
     * 获取当前地图
     * @returns {Object|null} 当前地图对象
     */
    getCurrentMap: function () {
        return this.currentMap;
    },

    // 🔴 新增：注册地图到对象管理器
    registerMapToObjectManager: function () {
        if (this.currentMap && window.objectManager) {
            window.objectManager.registerObject(this.currentMap, 'map', 'current_map');

        }
    },

    /**
     * 计算地图统计信息
     * @param {Object} mapDefinition - 地图定义
     * @returns {Object} 统计信息
     */
    calculateMapStats: function (mapDefinition) {
        const stats = {
            totalCells: 0,
            buildingCounts: {},
            walkableArea: 0,
            buildingArea: 0,
            roadArea: 0,
            buildingTypes: 0,
            uniqueBuildings: 0
        };

        if (!mapDefinition.matrix) {
            return stats;
        }

        // 计算矩阵统计
        for (let row = 0; row < mapDefinition.matrix.length; row++) {
            for (let col = 0; col < mapDefinition.matrix[row].length; col++) {
                const cellType = mapDefinition.matrix[row][col];
                stats.totalCells++;

                if (cellType === 0) {
                    stats.roadArea++;
                } else {
                    const buildingType = mapDefinition.buildingTypes[cellType];
                    if (buildingType) {
                        if (!stats.buildingCounts[buildingType.name]) {
                            stats.buildingCounts[buildingType.name] = 0;
                        }
                        stats.buildingCounts[buildingType.name]++;

                        if (buildingType.walkable) {
                            stats.walkableArea++;
                        } else {
                            stats.buildingArea++;
                        }
                    }
                }
            }
        }

        // 计算建筑类型统计
        stats.buildingTypes = Object.keys(mapDefinition.buildingTypes).length;
        stats.uniqueBuildings = Object.keys(stats.buildingCounts).length;

        return stats;
    },

    /**
     * 生成地图数据（建筑物和可通行区域）
     * 🔴 优化：使用连续区域识别算法
     */
    generateMapData: function () {
        if (!this.currentMap || !this.currentMap.matrix || !this.currentMap.buildingTypes) {
            console.warn('❌ 无法生成地图数据：缺少必要的地图信息');
            return;
        }

        const matrix = this.currentMap.matrix;
        const buildingTypes = this.currentMap.buildingTypes;
        const cellSize = this.currentMap.config.cellSize || 50;
        const matrixRows = matrix.length;
        const matrixCols = matrix[0].length;

        // 初始化建筑物和可通行区域数组
        this.currentMap.buildings = [];
        this.currentMap.walkableAreas = [];

        // 🔴 新增：使用访问标记数组，避免重复处理
        const visited = Array(matrixRows).fill().map(() => Array(matrixCols).fill(false));

        console.log('🔍 开始解析地图矩阵，使用连续区域识别算法...');
        console.log(`矩阵大小: ${matrixRows}×${matrixCols}`);

        // 遍历矩阵，解析建筑物和可通行区域
        for (let row = 0; row < matrixRows; row++) {
            for (let col = 0; col < matrixCols; col++) {
                if (visited[row][col]) continue; // 跳过已访问的格子

                const cellValue = matrix[row][col];

                if (cellValue === 0) {
                    // 可通行区域
                    this.addWalkableArea(row, col, cellSize);
                    visited[row][col] = true;
                } else if (buildingTypes[cellValue]) {
                    // 🔴 优化：识别连续建筑区域
                    const connectedRegion = this.findConnectedRegion(matrix, visited, row, col, cellValue);
                    if (connectedRegion.length > 0) {
                        console.log(`🏠 发现连续建筑区域: ${buildingTypes[cellValue].name} (${connectedRegion.length}格)`);
                        this.addConnectedBuilding(connectedRegion, cellValue, buildingTypes[cellValue], cellSize);
                    }
                }
            }
        }

        console.log(`✅ 地图解析完成:`);
        console.log(`- 可通行区域: ${this.currentMap.walkableAreas.length}个`);
        console.log(`- 建筑区域: ${this.currentMap.buildings.length}个`);
        
        // 显示建筑统计
        const buildingStats = {};
        this.currentMap.buildings.forEach(building => {
            if (!buildingStats[building.type]) {
                buildingStats[building.type] = { count: 0, totalCells: 0 };
            }
            buildingStats[building.type].count++;
            buildingStats[building.type].totalCells += building.cellCount;
        });
        
        console.log('📊 建筑统计:');
        Object.entries(buildingStats).forEach(([type, stats]) => {
            console.log(`  ${type}: ${stats.count}个建筑，共${stats.totalCells}格`);
        });
    },

    /**
     * 🔴 新增：查找连续区域算法
     * 使用深度优先搜索找到所有相连的相同数字格子
     * @param {Array} matrix - 地图矩阵
     * @param {Array} visited - 访问标记数组
     * @param {number} startRow - 起始行
     * @param {number} startCol - 起始列
     * @param {number} targetValue - 目标值
     * @returns {Array} 连续区域的格子坐标数组
     */
    findConnectedRegion: function (matrix, visited, startRow, startCol, targetValue) {
        const region = [];
        const stack = [{row: startRow, col: startCol}];
        
        while (stack.length > 0) {
            const {row, col} = stack.pop();
            
            // 检查边界和访问状态
            if (row < 0 || row >= matrix.length || 
                col < 0 || col >= matrix[0].length || 
                visited[row][col] || 
                matrix[row][col] !== targetValue) {
                continue;
            }
            
            // 标记为已访问并添加到区域
            visited[row][col] = true;
            region.push({row, col});
            
            // 检查四个方向的相邻格子
            const directions = [
                {row: row - 1, col: col}, // 上
                {row: row + 1, col: col}, // 下
                {row: row, col: col - 1}, // 左
                {row: row, col: col + 1}  // 右
            ];
            
            for (const dir of directions) {
                stack.push(dir);
            }
        }
        
        return region;
    },

    /**
     * 🔴 新增：添加连续建筑
     * 将连续区域合并为一个建筑
     * @param {Array} region - 连续区域坐标数组
     * @param {number} buildingTypeId - 建筑类型ID
     * @param {Object} buildingType - 建筑类型配置
     * @param {number} cellSize - 单元格大小
     */
    addConnectedBuilding: function (region, buildingTypeId, buildingType, cellSize) {
        if (region.length === 0) return;

        // 计算连续区域的边界
        let minRow = region[0].row, maxRow = region[0].row;
        let minCol = region[0].col, maxCol = region[0].col;

        for (const {row, col} of region) {
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
        }

        // 计算建筑的世界坐标和尺寸
        const worldX = (minCol + (maxCol - minCol + 1) / 2) * cellSize;
        const worldY = (minRow + (maxRow - minRow + 1) / 2) * cellSize;
        const buildingWidth = (maxCol - minCol + 1) * cellSize;
        const buildingHeight = (maxRow - minRow + 1) * cellSize;

        // 创建建筑对象
        const building = {
            x: worldX,
            y: worldY,
            width: buildingWidth,
            height: buildingHeight,
            type: buildingType.name || '未知建筑',
            color: buildingType.color || '#8B4513',
            icon: buildingType.icon || '🏠',
            size: buildingType.size || cellSize,
            walkable: buildingType.walkable || false,
            hasDoor: buildingType.hasDoor || false,
            bounds: {
                left: worldX - buildingWidth / 2,
                top: worldY - buildingHeight / 2,
                right: worldX + buildingWidth / 2,
                bottom: worldY + buildingHeight / 2
            },
            // 🔴 新增：记录连续区域信息
            region: region,
            cellCount: region.length,
            gridBounds: {
                minRow, maxRow, minCol, maxCol
            }
        };

        this.currentMap.buildings.push(building);
    },

    /**
     * 添加可通行区域
     * @param {number} row - 矩阵行
     * @param {number} col - 矩阵列
     * @param {number} cellSize - 单元格大小
     */
    addWalkableArea: function (row, col, cellSize) {
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
    },


};

export default MapManager;
