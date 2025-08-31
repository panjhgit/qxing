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
    registerMapToObjectManager: function() {
        if (this.currentMap && window.objectManager) {
            window.objectManager.registerObject(this.currentMap, 'map', 'current_map');
    
        }
    },

    /**
     * 获取地图配置
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 地图配置
     */
    getMapConfig: function (mapId) {
        if (mapId === 'current' || !mapId) {
            return this.currentMap ? this.currentMap.config : null;
        }

        const map = this.availableMaps[mapId];
        return map ? map.config : null;
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
     */
    generateMapData: function() {
        if (!this.currentMap || !this.currentMap.matrix || !this.currentMap.buildingTypes) {
            console.warn('❌ 无法生成地图数据：缺少必要的地图信息');
            return;
        }


        
        const matrix = this.currentMap.matrix;
        const buildingTypes = this.currentMap.buildingTypes;
        const cellSize = this.currentMap.config.cellSize || 50;

        // 初始化建筑物和可通行区域数组
        this.currentMap.buildings = [];
        this.currentMap.walkableAreas = [];



        // 遍历矩阵，解析建筑物和可通行区域
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
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


    },

    /**
     * 添加可通行区域
     * @param {number} row - 矩阵行
     * @param {number} col - 矩阵列
     * @param {number} cellSize - 单元格大小
     */
    addWalkableArea: function(row, col, cellSize) {
        const worldX = col * cellSize + cellSize / 2;
        const worldY = row * cellSize + cellSize / 2;
        
        this.currentMap.walkableAreas.push({
            x: worldX,
            y: worldY,
            width: cellSize,
            height: cellSize,
            bounds: {
                left: worldX - cellSize / 2,
                top: worldY - cellSize / 2,
                right: worldX + cellSize / 2,
                bottom: worldY + cellSize / 2
            }
        });
    },

    /**
     * 添加建筑物
     * @param {number} row - 矩阵行
     * @param {number} col - 矩阵列
     * @param {number} buildingTypeId - 建筑类型ID
     * @param {Object} buildingType - 建筑类型配置
     * @param {number} cellSize - 单元格大小
     */
    addBuilding: function(row, col, buildingTypeId, buildingType, cellSize) {
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
};

export default MapManager;
