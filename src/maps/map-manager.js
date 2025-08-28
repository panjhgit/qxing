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
        console.log('🗺️ 地图管理器初始化中...');
        console.log('可用地图:', Object.keys(this.availableMaps));

        // 只使用city地图，如果不存在则抛出错误
        if (this.availableMaps[defaultMapId]) {
            this.switchMap(defaultMapId);
        } else {
            throw new Error(`地图 ${defaultMapId} 不存在，无法初始化地图管理器`);
        }

        console.log('✅ 地图管理器初始化完成');
        return this.currentMap;
    },

    /**
     * 切换到指定地图
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 地图对象或null
     */
    switchMap: function (mapId) {
        if (!this.availableMaps[mapId]) {
            console.error('❌ 地图不存在:', mapId);
            return null;
        }

        console.log(`🔄 切换到地图: ${mapId}`);

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

        // 标记为已加载
        this.currentMap.isLoaded = true;
        this.currentMap.loadTime = Date.now();

        // 缓存地图数据
        this.mapCache.set(mapId, this.currentMap);

        console.log(`✅ 地图切换成功: ${mapDefinition.config.name}`);
        console.log('地图配置:', this.currentMap.config);
        console.log('地图统计:', this.currentMap.stats);

        return this.currentMap;
    },

    /**
     * 获取当前地图
     * @returns {Object|null} 当前地图对象
     */
    getCurrentMap: function () {
        return this.currentMap;
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
    }
};

export default MapManager;
