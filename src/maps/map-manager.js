/**
 * 地图管理器 - 统一管理所有地图定义
 * 支持地图切换、配置管理和动态加载
 */

import { CityMap } from './city-map.js';
import { SmallTownMap } from './small-town.js';

export const MapManager = {
    // 当前激活的地图
    currentMap: null,
    
    // 所有可用的地图
    availableMaps: {
        'city': CityMap,
        'small-town': SmallTownMap
    },
    
    // 地图配置缓存
    mapCache: new Map(),
    
    /**
     * 初始化地图管理器
     * @param {string} defaultMapId - 默认地图ID
     */
    init: function(defaultMapId = 'city') {
        console.log('🗺️ 地图管理器初始化中...');
        console.log('可用地图:', Object.keys(this.availableMaps));
        
        // 设置默认地图
        if (this.availableMaps[defaultMapId]) {
            this.switchMap(defaultMapId);
        } else {
            console.warn('默认地图不存在，使用第一个可用地图');
            const firstMapId = Object.keys(this.availableMaps)[0];
            if (firstMapId) {
                this.switchMap(firstMapId);
            }
        }
        
        console.log('✅ 地图管理器初始化完成');
        return this.currentMap;
    },
    
    /**
     * 切换到指定地图
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 地图对象或null
     */
    switchMap: function(mapId) {
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
    getCurrentMap: function() {
        return this.currentMap;
    },
    
    /**
     * 获取地图配置
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 地图配置
     */
    getMapConfig: function(mapId) {
        if (mapId === 'current' || !mapId) {
            return this.currentMap ? this.currentMap.config : null;
        }
        
        const map = this.availableMaps[mapId];
        return map ? map.config : null;
    },
    
    /**
     * 获取地图矩阵
     * @param {string} mapId - 地图ID
     * @returns {Array|null} 地图矩阵
     */
    getMapMatrix: function(mapId) {
        if (mapId === 'current' || !mapId) {
            return this.currentMap ? this.currentMap.matrix : null;
        }
        
        const map = this.availableMaps[mapId];
        return map ? map.matrix : null;
    },
    
    /**
     * 获取建筑类型定义
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 建筑类型定义
     */
    getBuildingTypes: function(mapId) {
        if (mapId === 'current' || !mapId) {
            return this.currentMap ? this.currentMap.buildingTypes : null;
        }
        
        const map = this.availableMaps[mapId];
        return map ? map.buildingTypes : null;
    },
    
    /**
     * 计算地图统计信息
     * @param {Object} mapDefinition - 地图定义
     * @returns {Object} 统计信息
     */
    calculateMapStats: function(mapDefinition) {
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
     * 获取所有可用地图列表
     * @returns {Array} 地图信息数组
     */
    getAvailableMaps: function() {
        const maps = [];
        
        for (const [mapId, mapDefinition] of Object.entries(this.availableMaps)) {
            maps.push({
                id: mapId,
                name: mapDefinition.config.name,
                description: mapDefinition.config.description,
                width: mapDefinition.config.width,
                height: mapDefinition.config.height,
                cellSize: mapDefinition.config.cellSize,
                gridCols: mapDefinition.config.gridCols,
                gridRows: mapDefinition.config.gridRows,
                isCurrent: this.currentMap && this.currentMap.id === mapId
            });
        }
        
        return maps;
    },
    
    /**
     * 验证地图数据完整性
     * @param {string} mapId - 地图ID
     * @returns {Object} 验证结果
     */
    validateMap: function(mapId) {
        const map = this.availableMaps[mapId];
        if (!map) {
            return { valid: false, errors: ['地图不存在'] };
        }
        
        const errors = [];
        
        // 检查必要属性
        if (!map.config) errors.push('缺少地图配置');
        if (!map.buildingTypes) errors.push('缺少建筑类型定义');
        if (!map.matrix) errors.push('缺少地图矩阵');
        
        if (errors.length > 0) {
            return { valid: false, errors };
        }
        
        // 检查矩阵尺寸
        const expectedRows = map.config.gridRows;
        const expectedCols = map.config.gridCols;
        
        if (map.matrix.length !== expectedRows) {
            errors.push(`矩阵行数不匹配: 期望${expectedRows}, 实际${map.matrix.length}`);
        }
        
        for (let i = 0; i < map.matrix.length; i++) {
            if (map.matrix[i].length !== expectedCols) {
                errors.push(`矩阵第${i}行列数不匹配: 期望${expectedCols}, 实际${map.matrix[i].length}`);
                break;
            }
        }
        
        // 检查建筑类型引用
        const matrixTypes = new Set();
        for (const row of map.matrix) {
            for (const cellType of row) {
                matrixTypes.add(cellType);
            }
        }
        
        for (const cellType of matrixTypes) {
            if (!map.buildingTypes[cellType]) {
                errors.push(`矩阵中引用了未定义的建筑类型: ${cellType}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            matrixSize: { rows: map.matrix.length, cols: map.matrix[0]?.length || 0 },
            uniqueTypes: matrixTypes.size,
            buildingTypesCount: Object.keys(map.buildingTypes).length
        };
    },
    
    /**
     * 获取地图概览信息
     * @returns {Object} 概览信息
     */
    getMapOverview: function() {
        if (!this.currentMap) {
            return { error: '没有激活的地图' };
        }
        
        return {
            currentMap: {
                id: this.currentMap.id,
                name: this.currentMap.config.name,
                description: this.currentMap.config.description,
                dimensions: {
                    width: this.currentMap.config.width,
                    height: this.currentMap.config.height,
                    cellSize: this.currentMap.config.cellSize,
                    gridCols: this.currentMap.config.gridCols,
                    gridRows: this.currentMap.config.gridRows
                },
                stats: this.currentMap.stats,
                loadTime: this.currentMap.loadTime,
                isLoaded: this.currentMap.isLoaded
            },
            availableMaps: this.getAvailableMaps(),
            cacheInfo: {
                cachedMaps: this.mapCache.size,
                cacheKeys: Array.from(this.mapCache.keys())
            }
        };
    },
    
    /**
     * 清理地图缓存
     * @param {string} mapId - 要清理的地图ID，不传则清理所有
     */
    clearCache: function(mapId = null) {
        if (mapId) {
            this.mapCache.delete(mapId);
            console.log(`🗑️ 已清理地图缓存: ${mapId}`);
        } else {
            this.mapCache.clear();
            console.log('🗑️ 已清理所有地图缓存');
        }
    },
    
    /**
     * 重新加载地图
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 重新加载的地图对象
     */
    reloadMap: function(mapId) {
        console.log(`🔄 重新加载地图: ${mapId}`);
        
        // 清理缓存
        this.mapCache.delete(mapId);
        
        // 重新切换地图
        return this.switchMap(mapId);
    }
};

export default MapManager;
