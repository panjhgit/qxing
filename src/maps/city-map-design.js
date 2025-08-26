/**
 * 城市地图设计 - 10000×10000像素
 * 使用200×200像素网格，即50×50矩阵
 * 支持不同大小的建筑和门的智能生成
 */

const CityMapDesign = {
    // 地图基础配置
    MAP_CONFIG: {
        name: '城市地图',
        width: 10000,
        height: 10000,
        cellSize: 200,        // 每个格子200×200像素
        gridCols: 50,         // 10000÷200 = 50列
        gridRows: 50,         // 10000÷200 = 50行
        description: '一个现代化的城市，包含商业区、住宅区、工业区和特殊设施'
    },

    // 建筑类型定义
    BUILDING_TYPES: {
        0: { name: '马路/空地', type: 'road', color: '#FFFFFF', icon: '🛣️', walkable: true, size: 200 },
        
        // 小型建筑 (200×200，1个格子)
        1: { name: '小型民房', type: 'residential', color: '#CD853F', icon: '🏠', walkable: false, size: 200, hasDoor: true },
        2: { name: '小型商店', type: 'commercial', color: '#32CD32', icon: '🏪', walkable: false, size: 200, hasDoor: true },
        3: { name: '小型餐厅', type: 'commercial', color: '#FFD700', icon: '🍽️', walkable: false, size: 200, hasDoor: true },
        4: { name: '小型诊所', type: 'facility', color: '#FFB6C1', icon: '🏥', walkable: false, size: 200, hasDoor: true },
        
        // 中型建筑 (400×400，2×2格子)
        5: { name: '中型公寓', type: 'residential', color: '#87CEEB', icon: '🏢', walkable: false, size: 400, hasDoor: true },
        6: { name: '中型办公楼', type: 'commercial', color: '#D3D3D3', icon: '🏢', walkable: false, size: 400, hasDoor: true },
        7: { name: '中型超市', type: 'commercial', color: '#98FB98', icon: '🛒', walkable: false, size: 400, hasDoor: true },
        8: { name: '中型医院', type: 'facility', color: '#FF6347', icon: '🏥', walkable: false, size: 400, hasDoor: true },
        
        // 大型建筑 (600×600，3×3格子)
        9: { name: '大型商场', type: 'commercial', color: '#20B2AA', icon: '🏬', walkable: false, size: 600, hasDoor: true },
        10: { name: '大型学校', type: 'facility', color: '#4169E1', icon: '🏫', walkable: false, size: 600, hasDoor: true },
        11: { name: '大型工厂', type: 'industrial', color: '#8B4513', icon: '🏭', walkable: false, size: 600, hasDoor: true },
        12: { name: '大型停车场', type: 'facility', color: '#696969', icon: '🅿️', walkable: true, size: 600, hasDoor: false },
        
        // 超大型建筑 (800×800，4×4格子)
        13: { name: '超大型购物中心', type: 'commercial', color: '#FF1493', icon: '🏢', walkable: false, size: 800, hasDoor: true },
        14: { name: '超大型医院', type: 'facility', color: '#DC143C', icon: '🏥', walkable: false, size: 800, hasDoor: true },
        15: { name: '超大型工业园', type: 'industrial', color: '#2F4F4F', icon: '🏭', walkable: false, size: 800, hasDoor: true },
        
        // 特殊建筑
        16: { name: '公园', type: 'recreation', color: '#90EE90', icon: '🌳', walkable: true, size: 400, hasDoor: false },
        17: { name: '警察局', type: 'facility', color: '#9932CC', icon: '👮', walkable: false, size: 400, hasDoor: true },
        18: { name: '消防站', type: 'facility', color: '#FF4500', icon: '🚒', walkable: false, size: 400, hasDoor: true },
        19: { name: '银行', type: 'commercial', color: '#FFD700', icon: '🏦', walkable: false, size: 200, hasDoor: true }
    },

    // 城市地图矩阵 (50×50)
    CITY_MAP_MATRIX: [
        // 第0行：边界马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第1-4行：北部住宅区 (小型民房)
        [0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0],
        [0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0],
        [0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0],
        [0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0],
        
        // 第5行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第6-9行：北部商业区 (小型商店和餐厅)
        [0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,0],
        [0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,0],
        [0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,0],
        [0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,2,2,2,2,0,0,3,3,3,3,0,0,0],
        
        // 第10行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第11-14行：北部中型建筑区 (公寓和办公楼)
        [0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,0],
        [0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,0],
        [0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,0],
        [0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,5,5,5,5,0,0,6,6,6,6,0,0,0],
        
        // 第15行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第16-19行：北部大型建筑区 (商场和学校)
        [0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,0],
        [0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,0],
        [0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,0],
        [0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,9,9,9,9,0,0,10,10,10,10,0,0,0],
        
        // 第20行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第21-24行：中心商业区 (超大型购物中心)
        [0,13,13,13,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,13,13,13,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,13,13,13,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,13,13,13,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第25行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第26-29行：中心医疗区 (超大型医院)
        [0,0,0,0,0,0,0,14,14,14,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,14,14,14,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,14,14,14,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,14,14,14,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第30行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第31-34行：南部住宅区 (中型公寓)
        [0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,0],
        [0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,0],
        [0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,0],
        [0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,5,5,5,5,0,0,0],
        
        // 第35行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第36-39行：南部工业区 (大型工厂)
        [0,0,0,0,0,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,11,11,11,11,0,0,0,0,0,0,0,0,0],
        
        // 第40行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第41-44行：南部特殊设施区 (警察局、消防站、银行)
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,17,17,17,0,0,18,18,18,18,0,0,19,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,17,17,17,0,0,18,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,17,17,17,0,0,18,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,17,17,17,0,0,18,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第45行：马路
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        
        // 第46-49行：南部公园和休闲区
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ],

    // 区域分布说明
    AREA_DESCRIPTION: {
        'north_residential': {
            name: '北部住宅区',
            location: '第1-4行',
            description: '密集的小型民房，适合普通居民居住',
            buildingTypes: ['小型民房'],
            density: '高密度',
            walkable: false
        },
        'north_commercial': {
            name: '北部商业区',
            location: '第6-9行',
            description: '小型商店和餐厅，为北部居民提供日常服务',
            buildingTypes: ['小型商店', '小型餐厅'],
            density: '中等密度',
            walkable: false
        },
        'north_medium': {
            name: '北部中型建筑区',
            location: '第11-14行',
            description: '中型公寓和办公楼，适合中产阶级和上班族',
            buildingTypes: ['中型公寓', '中型办公楼'],
            density: '中等密度',
            walkable: false
        },
        'north_large': {
            name: '北部大型建筑区',
            location: '第16-19行',
            description: '大型商场和学校，为整个北部区域提供服务',
            buildingTypes: ['大型商场', '大型学校'],
            density: '低密度',
            walkable: false
        },
        'center_commercial': {
            name: '中心商业区',
            location: '第21-24行',
            description: '超大型购物中心，城市的主要商业中心',
            buildingTypes: ['超大型购物中心'],
            density: '低密度',
            walkable: false
        },
        'center_medical': {
            name: '中心医疗区',
            location: '第26-29行',
            description: '超大型医院，城市的主要医疗中心',
            buildingTypes: ['超大型医院'],
            density: '低密度',
            walkable: false
        },
        'south_residential': {
            name: '南部住宅区',
            location: '第31-34行',
            description: '中型公寓，适合家庭居住',
            buildingTypes: ['中型公寓'],
            density: '中等密度',
            walkable: false
        },
        'south_industrial': {
            name: '南部工业区',
            location: '第36-39行',
            description: '大型工厂，城市的主要工业基地',
            buildingTypes: ['大型工厂'],
            density: '低密度',
            walkable: false
        },
        'south_facilities': {
            name: '南部特殊设施区',
            location: '第41-44行',
            description: '警察局、消防站、银行等公共服务设施',
            buildingTypes: ['警察局', '消防站', '银行'],
            density: '低密度',
            walkable: false
        },
        'south_park': {
            name: '南部公园区',
            location: '第46-49行',
            description: '公园和休闲区，提供绿色空间和娱乐设施',
            buildingTypes: ['公园'],
            density: '低密度',
            walkable: true
        }
    },

    // 门的智能生成规则
    DOOR_GENERATION_RULES: {
        // 小型建筑：在面向街道的边生成门
        'small': {
            doorSize: 40,
            doorOffset: 80, // 距离建筑边缘的偏移
            doorStyle: 'simple'
        },
        // 中型建筑：在面向街道的边生成门，可能有多个门
        'medium': {
            doorSize: 50,
            doorOffset: 75,
            doorStyle: 'modern',
            maxDoors: 2
        },
        // 大型建筑：在面向街道的边生成主门和侧门
        'large': {
            doorSize: 60,
            doorOffset: 70,
            doorStyle: 'grand',
            maxDoors: 3
        },
        // 超大型建筑：在面向街道的边生成多个门
        'xlarge': {
            doorSize: 70,
            doorOffset: 65,
            doorStyle: 'luxury',
            maxDoors: 4
        }
    },

    // 获取建筑的门信息
    getBuildingDoorInfo: function(buildingType, buildingBounds, streetDirection) {
        const buildingConfig = this.BUILDING_TYPES[buildingType];
        if (!buildingConfig || !buildingConfig.hasDoor) {
            return null;
        }

        // 根据建筑大小确定门配置
        let doorConfig;
        if (buildingConfig.size <= 200) {
            doorConfig = this.DOOR_GENERATION_RULES.small;
        } else if (buildingConfig.size <= 400) {
            doorConfig = this.DOOR_GENERATION_RULES.medium;
        } else if (buildingConfig.size <= 600) {
            doorConfig = this.DOOR_GENERATION_RULES.large;
        } else {
            doorConfig = this.DOOR_GENERATION_RULES.xlarge;
        }

        // 计算门的位置（面向街道）
        const doors = [];
        const doorCount = Math.min(doorConfig.maxDoors || 1, 
            Math.floor(buildingConfig.size / 200)); // 根据建筑大小决定门数量

        for (let i = 0; i < doorCount; i++) {
            const door = {
                x: buildingBounds.left + doorConfig.doorOffset + (i * (buildingConfig.size / doorCount)),
                y: buildingBounds.top + doorConfig.doorOffset,
                width: doorConfig.doorSize,
                height: doorConfig.doorSize,
                style: doorConfig.doorStyle,
                direction: 'south' // 默认朝南（面向街道）
            };
            doors.push(door);
        }

        return {
            buildingType: buildingConfig.name,
            doorCount: doors.length,
            doors: doors,
            doorConfig: doorConfig
        };
    },

    // 获取地图统计信息
    getMapStatistics: function() {
        const stats = {
            totalCells: 0,
            buildingCounts: {},
            walkableArea: 0,
            buildingArea: 0,
            roadArea: 0
        };

        for (let row = 0; row < this.CITY_MAP_MATRIX.length; row++) {
            for (let col = 0; col < this.CITY_MAP_MATRIX[row].length; col++) {
                const cellType = this.CITY_MAP_MATRIX[row][col];
                stats.totalCells++;
                
                if (cellType === 0) {
                    stats.roadArea++;
                } else {
                    const buildingType = this.BUILDING_TYPES[cellType];
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

        return stats;
    },

    // 打印地图概览
    printMapOverview: function() {
        console.log('=== 城市地图概览 ===');
        console.log('地图尺寸:', this.MAP_CONFIG.width, '×', this.MAP_CONFIG.height, '像素');
        console.log('网格尺寸:', this.MAP_CONFIG.gridCols, '×', this.MAP_CONFIG.gridRows);
        console.log('单元格大小:', this.MAP_CONFIG.cellSize, '×', this.MAP_CONFIG.cellSize, '像素');
        
        console.log('\n=== 区域分布 ===');
        for (const areaKey in this.AREA_DESCRIPTION) {
            const area = this.AREA_DESCRIPTION[areaKey];
            console.log(`${area.name}: ${area.location} - ${area.description}`);
        }
        
        console.log('\n=== 建筑类型 ===');
        for (const typeId in this.BUILDING_TYPES) {
            const building = this.BUILDING_TYPES[typeId];
            console.log(`${typeId}: ${building.name} (${building.size}×${building.size}像素, ${building.walkable ? '可通行' : '不可通行'})`);
        }
        
        console.log('\n=== 地图统计 ===');
        const stats = this.getMapStatistics();
        console.log('总格子数:', stats.totalCells);
        console.log('建筑区域:', stats.buildingArea, '格子');
        console.log('道路区域:', stats.roadArea, '格子');
        console.log('可通行区域:', stats.walkableArea, '格子');
        
        console.log('\n=== 建筑数量统计 ===');
        for (const buildingName in stats.buildingCounts) {
            console.log(`${buildingName}: ${stats.buildingCounts[buildingName]} 格子`);
        }
    }
};

// 导出城市地图设计
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CityMapDesign;
} else if (typeof window !== 'undefined') {
    window.CityMapDesign = CityMapDesign;
}

// 打印地图概览
CityMapDesign.printMapOverview();
