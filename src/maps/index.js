/**
 * 地图模块统一导出文件
 * 提供所有地图定义和地图管理器的统一访问入口
 */

// 导出地图管理器
export { MapManager, default as MapManager } from './map-manager.js';

// 导出具体地图定义
export { CityMap } from './city-map.js';
export { SmallTownMap } from './small-town.js';

// 导出地图类型枚举
export const MapTypes = {
    CITY: 'city',
    SMALL_TOWN: 'small-town'
};

// 导出地图配置常量
export const MapConfigs = {
    CITY: {
        id: 'city',
        name: '城市地图',
        description: '10000x10000像素的大型城市地图',
        width: 10000,
        height: 10000,
        cellSize: 100,
        gridCols: 100,
        gridRows: 100
    },
    SMALL_TOWN: {
        id: 'small-town',
        name: '小镇地图',
        description: '4000x4000像素的小镇地图',
        width: 4000,
        height: 4000,
        cellSize: 100,
        gridCols: 40,
        gridRows: 40
    }
};

// 导出建筑类型常量
export const BuildingTypes = {
    ROAD: 0,
    RESIDENTIAL: 1,
    VILLA: 2,
    APARTMENT: 3,
    BUNGALOW: 4,
    SHOP: 5,
    OFFICE: 6,
    PARK: 7,
    FACTORY: 8
};

// 导出地图工具函数
export const MapUtils = {
    /**
     * 验证地图ID是否有效
     * @param {string} mapId - 地图ID
     * @returns {boolean} 是否有效
     */
    isValidMapId: function(mapId) {
        return Object.values(MapTypes).includes(mapId);
    },
    
    /**
     * 获取地图配置
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 地图配置
     */
    getMapConfig: function(mapId) {
        return MapConfigs[mapId.toUpperCase().replace('-', '_')] || null;
    },
    
    /**
     * 获取建筑类型名称
     * @param {number} typeId - 建筑类型ID
     * @returns {string} 建筑类型名称
     */
    getBuildingTypeName: function(typeId) {
        const typeNames = {
            [BuildingTypes.ROAD]: '道路',
            [BuildingTypes.RESIDENTIAL]: '民房',
            [BuildingTypes.VILLA]: '别墅',
            [BuildingTypes.APARTMENT]: '公寓',
            [BuildingTypes.BUNGALOW]: '平房',
            [BuildingTypes.SHOP]: '商店',
            [BuildingTypes.OFFICE]: '办公楼',
            [BuildingTypes.PARK]: '公园',
            [BuildingTypes.FACTORY]: '工厂'
        };
        return typeNames[typeId] || `未知类型(${typeId})`;
    },
    
    /**
     * 检查建筑类型是否可通行
     * @param {number} typeId - 建筑类型ID
     * @returns {boolean} 是否可通行
     */
    isBuildingTypeWalkable: function(typeId) {
        return typeId === BuildingTypes.ROAD || typeId === BuildingTypes.PARK;
    }
};

// 默认导出地图管理器
export default MapManager;
