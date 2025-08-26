/**
 * 地图模块 (map.js)
 *
 * 功能描述：
 * - 地图配置：集中管理所有地图配置和建筑类型
 * - 地图生成：程序化生成游戏世界地图
 * - 建筑系统：各种建筑的生成、管理和交互
 * - 地形渲染：地面、道路、障碍物等地形元素
 * - 区块管理：将大地图分割为区块以提高性能
 * - 地图导航：寻路、距离计算、可达性检测
 *
 * 主要类和方法：
 * - MapGenerator: 地图生成器
 * - BuildingManager: 建筑管理器
 * - TerrainRenderer: 地形渲染器
 * - NavigationSystem: 导航系统
 * - 建筑类型定义和生成逻辑
 */

// ==================== 建筑类型定义 ====================
const BUILDING_TYPES = {
    RESIDENTIAL: {
        HOUSES: ['民房', '别墅', '公寓', '平房'],
        FACILITIES: ['医院', '学校', '警察局', '消防站']
    },
    
    COMMERCIAL: {
        RETAIL: ['商店', '超市', '商场', '便利店'],
        ENTERTAINMENT: ['电影院', '游戏厅', 'KTV', '网吧'],
        FOOD: ['餐厅', '咖啡厅', '快餐店', '酒吧']
    },
    
    INDUSTRIAL: {
        FACTORY: ['工厂', '仓库', '车间', '实验室'],
        OFFICE: ['办公楼', '会议室', '接待室', '档案室']
    },
    
    CULTURAL: {
        EDUCATION: ['图书馆', '博物馆', '艺术馆', '科技馆'],
        RECREATION: ['公园', '游乐场', '体育馆', '休息区']
    },
    
    SERVICE: {
        TRANSPORT: ['加油站', '停车场', '修理厂', '洗车店'],
        UTILITIES: ['银行', '邮局', '服务站', '工具间']
    }
};

// ==================== 地图配置生成器 ====================
const MapConfigGenerator = {
    // 生成网格地图配置
    createGridMap: function(name, blockSize, streetWidth, gridCols, gridRows, buildingTypes) {
        var gridSize = blockSize + streetWidth;
        var mapWidth = gridCols * gridSize;
        var mapHeight = gridRows * gridSize;
        
        return {
            name: name,
            type: 'grid',
            blockSize: blockSize,
            streetWidth: streetWidth,
            gridSize: gridSize,
            gridCols: gridCols,
            gridRows: gridRows,
            mapWidth: mapWidth,
            mapHeight: mapHeight,
            buildingTypes: buildingTypes || BUILDING_TYPES.RESIDENTIAL.HOUSES.concat(BUILDING_TYPES.RESIDENTIAL.FACILITIES)
        };
    },
    
    // 生成不规则地图配置
    createIrregularMap: function(name, width, height, buildings) {
        return {
            name: name,
            type: 'irregular',
            mapWidth: width,
            mapHeight: height,
            buildings: buildings.map(function(building) {
                // 确保每个建筑都有完整的属性
                return {
                    x: building.x || 0,
                    y: building.y || 0,
                    width: building.width || 100,
                    height: building.height || 100,
                    type: building.type || '未知建筑',
                    // 添加额外的建筑属性
                    doorX: building.doorX || (building.x + building.width / 2 - 25),
                    doorY: building.doorY || (building.y + building.height - 40),
                    doorWidth: building.doorWidth || 50,
                    doorHeight: building.doorHeight || 40,
                    // 添加建筑功能属性
                    isEnterable: building.isEnterable !== false, // 默认可进入
                    hasCollision: building.hasCollision !== false, // 默认有碰撞
                    buildingLevel: building.buildingLevel || 1 // 建筑等级
                };
            })
        };
    },
    
    // 生成预设的不规则地图
    createPresetIrregularMap: function(presetName) {
        var presets = {
            'factory': {
                name: '工厂地图',
                width: 6000,
                height: 6000,
                buildings: [
                    {x: 500, y: 300, width: 800, height: 600, type: '工厂', buildingLevel: 3},
                    {x: 1500, y: 200, width: 600, height: 500, type: '仓库', buildingLevel: 2},
                    {x: 2500, y: 800, width: 700, height: 400, type: '宿舍', buildingLevel: 1},
                    {x: 800, y: 1200, width: 500, height: 300, type: '食堂', buildingLevel: 1},
                    {x: 2000, y: 1500, width: 900, height: 700, type: '办公楼', buildingLevel: 3},
                    {x: 3500, y: 400, width: 400, height: 400, type: '小卖部', buildingLevel: 1},
                    {x: 400, y: 1800, width: 600, height: 500, type: '健身房', buildingLevel: 2},
                    {x: 3000, y: 1200, width: 800, height: 600, type: '会议室', buildingLevel: 2}
                ]
            },
            
            'commercial': {
                name: '商业地图',
                width: 4000,
                height: 4000,
                buildings: [
                    {x: 200, y: 150, width: 600, height: 500, type: '商场', buildingLevel: 3},
                    {x: 1000, y: 100, width: 800, height: 600, type: '电影院', buildingLevel: 2},
                    {x: 2000, y: 300, width: 500, height: 400, type: '餐厅', buildingLevel: 1},
                    {x: 300, y: 800, width: 700, height: 500, type: '银行', buildingLevel: 3},
                    {x: 1200, y: 800, width: 600, height: 400, type: '咖啡厅', buildingLevel: 1},
                    {x: 2000, y: 900, width: 900, height: 700, type: '购物中心', buildingLevel: 3},
                    {x: 500, y: 1500, width: 400, height: 300, type: '书店', buildingLevel: 1},
                    {x: 1500, y: 1400, width: 500, height: 600, type: '游戏厅', buildingLevel: 2}
                ]
            },
            
            'cultural': {
                name: '文化地图',
                width: 2400,
                height: 2400,
                buildings: [
                    {x: 100, y: 100, width: 500, height: 400, type: '公园', buildingLevel: 1, isEnterable: false},
                    {x: 700, y: 50, width: 600, height: 500, type: '游乐场', buildingLevel: 2},
                    {x: 1400, y: 200, width: 400, height: 300, type: '图书馆', buildingLevel: 2},
                    {x: 200, y: 600, width: 700, height: 500, type: '博物馆', buildingLevel: 3},
                    {x: 1000, y: 700, width: 500, height: 400, type: '艺术馆', buildingLevel: 2},
                    {x: 1600, y: 700, width: 600, height: 500, type: '科技馆', buildingLevel: 3},
                    {x: 300, y: 1200, width: 400, height: 300, type: '休息区', buildingLevel: 1, isEnterable: false},
                    {x: 800, y: 1300, width: 600, height: 400, type: '观景台', buildingLevel: 1, isEnterable: false}
                ]
            },
            
            'service': {
                name: '服务地图',
                width: 1500,
                height: 1500,
                buildings: [
                    {x: 50, y: 50, width: 300, height: 250, type: '加油站', buildingLevel: 2},
                    {x: 400, y: 100, width: 400, height: 300, type: '修理厂', buildingLevel: 2},
                    {x: 900, y: 80, width: 350, height: 280, type: '停车场', buildingLevel: 1, isEnterable: false},
                    {x: 150, y: 400, width: 500, height: 400, type: '服务站', buildingLevel: 2},
                    {x: 700, y: 450, width: 300, height: 250, type: '洗车店', buildingLevel: 1},
                    {x: 1100, y: 400, width: 250, height: 200, type: '便利店', buildingLevel: 1},
                    {x: 200, y: 900, width: 400, height: 300, type: '休息室', buildingLevel: 1},
                    {x: 700, y: 800, width: 350, height: 280, type: '工具间', buildingLevel: 1}
                ]
            },
            
            'residential': {
                name: '住宅地图',
                width: 3000,
                height: 3000,
                buildings: [
                    {x: 200, y: 200, width: 400, height: 300, type: '民房', buildingLevel: 1},
                    {x: 800, y: 150, width: 500, height: 400, type: '别墅', buildingLevel: 2},
                    {x: 1400, y: 300, width: 600, height: 500, type: '公寓楼', buildingLevel: 2},
                    {x: 300, y: 800, width: 450, height: 350, type: '平房', buildingLevel: 1},
                    {x: 900, y: 700, width: 400, height: 300, type: '联排别墅', buildingLevel: 2},
                    {x: 1500, y: 900, width: 500, height: 400, type: '独栋别墅', buildingLevel: 3},
                    {x: 400, y: 1300, width: 350, height: 250, type: '小院', buildingLevel: 1},
                    {x: 1000, y: 1200, width: 600, height: 450, type: '豪宅', buildingLevel: 3}
                ]
            }
        };
        
        var preset = presets[presetName];
        if (preset) {
            return this.createIrregularMap(preset.name, preset.width, preset.height, preset.buildings);
        }
        
        console.warn('未知的预设地图:', presetName);
        return null;
    },
    
    // 动态生成随机地图
    generateRandomMap: function(name, width, height, buildingCount, buildingTypes, mapTheme) {
        var buildings = [];
        var minBuildingSize = 100;
        var maxBuildingSize = 400;
        
        // 根据主题选择建筑类型
        var availableTypes = buildingTypes || this.getBuildingTypesByTheme(mapTheme);
        
        for (var i = 0; i < buildingCount; i++) {
            var building = {
                x: Math.random() * (width - maxBuildingSize),
                y: Math.random() * (height - maxBuildingSize),
                width: minBuildingSize + Math.random() * (maxBuildingSize - minBuildingSize),
                height: minBuildingSize + Math.random() * (maxBuildingSize - minBuildingSize),
                type: availableTypes[Math.floor(Math.random() * availableTypes.length)],
                buildingLevel: Math.floor(Math.random() * 3) + 1
            };
            
            // 检查是否与其他建筑重叠
            var overlapping = false;
            for (var j = 0; j < buildings.length; j++) {
                var existing = buildings[j];
                if (this.buildingsOverlap(building, existing)) {
                    overlapping = true;
                    break;
                }
            }
            
            if (!overlapping) {
                buildings.push(building);
            }
        }
        
        return this.createIrregularMap(name, width, height, buildings);
    },
    
    // 根据主题获取建筑类型
    getBuildingTypesByTheme: function(theme) {
        switch (theme) {
            case 'residential':
                return BUILDING_TYPES.RESIDENTIAL.HOUSES.concat(BUILDING_TYPES.RESIDENTIAL.FACILITIES);
            case 'commercial':
                return BUILDING_TYPES.COMMERCIAL.RETAIL.concat(BUILDING_TYPES.COMMERCIAL.ENTERTAINMENT);
            case 'industrial':
                return BUILDING_TYPES.INDUSTRIAL.FACTORY.concat(BUILDING_TYPES.INDUSTRIAL.OFFICE);
            case 'cultural':
                return BUILDING_TYPES.CULTURAL.EDUCATION.concat(BUILDING_TYPES.CULTURAL.RECREATION);
            case 'service':
                return BUILDING_TYPES.SERVICE.TRANSPORT.concat(BUILDING_TYPES.SERVICE.UTILITIES);
            default:
                return Object.values(BUILDING_TYPES).flatMap(category => 
                    Object.values(category).flatMap(types => types)
                );
        }
    },
    
    // 检查两个建筑是否重叠
    buildingsOverlap: function(building1, building2) {
        var margin = 50; // 建筑间最小间距
        return !(building1.x + building1.width + margin < building2.x ||
                building2.x + building2.width + margin < building1.x ||
                building1.y + building1.height + margin < building2.y ||
                building2.y + building2.height + margin < building1.y);
    },
    
    // 生成主题地图
    createThemedMap: function(theme, name, width, height, buildingCount) {
        var buildingTypes = this.getBuildingTypesByTheme(theme);
        return this.generateRandomMap(name, width, height, buildingCount, buildingTypes, theme);
    }
};

// ==================== 预设地图配置 ====================
const PRESET_MAPS = {
    // 主地图：8x8网格，建筑物750x750，街道500像素
    'main': MapConfigGenerator.createGridMap(
        '主地图', 
        750,    // blockSize
        500,    // streetWidth
        8,      // gridCols
        8,      // gridRows
        BUILDING_TYPES.RESIDENTIAL.HOUSES.concat(BUILDING_TYPES.RESIDENTIAL.FACILITIES)
    ),

    // 子地图：使用预设配置生成器
    'submap1': MapConfigGenerator.createPresetIrregularMap('factory'),
    'submap2': MapConfigGenerator.createPresetIrregularMap('commercial'),
    'submap3': MapConfigGenerator.createPresetIrregularMap('cultural'),
    'submap4': MapConfigGenerator.createPresetIrregularMap('service'),
    'submap5': MapConfigGenerator.createPresetIrregularMap('residential'),
    
    // 动态生成的随机地图示例
    'random1': MapConfigGenerator.generateRandomMap('随机地图1', 3000, 3000, 12, null, 'commercial'),
    'random2': MapConfigGenerator.generateRandomMap('随机地图2', 2000, 2000, 8, null, 'residential'),
    'random3': MapConfigGenerator.generateRandomMap('随机地图3', 4000, 4000, 15, null, 'industrial')
};

// ==================== 地图管理器 ====================
const MapManager = {
    // 获取所有预设地图
    getPresetMaps: function() {
        return PRESET_MAPS;
    },
    
    // 获取特定地图
    getMap: function(mapId) {
        return PRESET_MAPS[mapId] || null;
    },
    
    // 添加新地图
    addMap: function(mapId, mapConfig) {
        if (PRESET_MAPS[mapId]) {
            console.warn('地图ID已存在，将被覆盖:', mapId);
        }
        
        PRESET_MAPS[mapId] = mapConfig;
        console.log('新地图已添加:', mapId, mapConfig.name);
        return true;
    },
    
    // 动态创建并添加地图
    createAndAddMap: function(mapId, mapType, config) {
        var mapConfig = null;
        
        switch (mapType) {
            case 'grid':
                mapConfig = MapConfigGenerator.createGridMap(
                    config.name,
                    config.blockSize,
                    config.streetWidth,
                    config.gridCols,
                    config.gridRows,
                    config.buildingTypes
                );
                break;
                
            case 'irregular':
                mapConfig = MapConfigGenerator.createIrregularMap(
                    config.name,
                    config.width,
                    config.height,
                    config.buildings
                );
                break;
                
            case 'random':
                mapConfig = MapConfigGenerator.generateRandomMap(
                    config.name,
                    config.width,
                    config.height,
                    config.buildingCount,
                    config.buildingTypes,
                    config.theme
                );
                break;
                
            case 'themed':
                mapConfig = MapConfigGenerator.createThemedMap(
                    config.theme,
                    config.name,
                    config.width,
                    config.height,
                    config.buildingCount
                );
                break;
                
            default:
                console.error('未知的地图类型:', mapType);
                return false;
        }
        
        if (mapConfig) {
            return this.addMap(mapId, mapConfig);
        }
        
        return false;
    },
    
    // 获取地图列表
    getMapList: function() {
        var mapList = [];
        for (var mapId in PRESET_MAPS) {
            var map = PRESET_MAPS[mapId];
            mapList.push({
                id: mapId,
                name: map.name,
                type: map.type,
                size: map.mapWidth + 'x' + map.mapHeight,
                buildingCount: map.buildings ? map.buildings.length : (map.gridCols * map.gridRows)
            });
        }
        return mapList;
    },
    
    // 验证地图配置
    validateMapConfig: function(mapConfig) {
        if (!mapConfig || !mapConfig.name || !mapConfig.type) {
            return false;
        }
        
        if (mapConfig.type === 'grid') {
            return mapConfig.blockSize > 0 && mapConfig.streetWidth >= 0 && 
                   mapConfig.gridCols > 0 && mapConfig.gridRows > 0;
        } else if (mapConfig.type === 'irregular') {
            return mapConfig.mapWidth > 0 && mapConfig.mapHeight > 0 && 
                   mapConfig.buildings && Array.isArray(mapConfig.buildings);
        }
        
        return false;
    }
};

// ==================== 地图渲染系统 ====================
var mapPrototype = {};

// 地图系统构造函数
mapPrototype.createMapSystem = function (canvas, ctx) {
    var mapSystem = Object.create(mapPrototype);

    // 从配置中获取建筑物和街道尺寸（使用主地图配置）
    var mainMapConfig = MapManager.getMap('main');
    mapSystem.blockSize = mainMapConfig.blockSize;      // 建筑物大小
    mapSystem.streetWidth = mainMapConfig.streetWidth;  // 街道宽度

    // 角色管理器引用（由外部设置）
    mapSystem.characterManager = null;

    // 使用配置中的地图尺寸
    mapSystem.mapWidth = mainMapConfig.mapWidth;
    mapSystem.mapHeight = mainMapConfig.mapHeight;

    // 地图偏移量（初始位置设为地图中心，让玩家看到中心区域）
    mapSystem.offsetX = (mapSystem.mapWidth - canvas.width) / 2;
    mapSystem.offsetY = (mapSystem.mapHeight - canvas.height) / 2;

    console.log('地图初始偏移量:', mapSystem.offsetX, mapSystem.offsetY);
    console.log('画布尺寸:', canvas.width, 'x', canvas.height);

    // 视角缩放 - 让玩家能看到更远的区域
    mapSystem.zoom = 0.6;  // 缩放比例，小于1表示放大（能看到更多内容）

    // 建筑物类型 - 从配置中获取
    mapSystem.buildingTypes = mainMapConfig.buildingTypes.map(function(typeName) {
        // 为每种建筑类型分配颜色和图标
        var colors = ['#CD853F', '#FFD700', '#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C', '#FFA07A'];
        var icons = ['🏠', '🏰', '🏥', '🏪', '🏫', '👮', '🏭', '🏢'];
        var doorColors = ['#8B4513', '#B8860B', '#DC143C', '#32CD32', '#4169E1', '#9932CC', '#BDB76B', '#CD853F'];
        
        var index = mainMapConfig.buildingTypes.indexOf(typeName) % colors.length;
        return {
            name: typeName,
            color: colors[index],
            icon: icons[index],
            doorColor: doorColors[index]
        };
    });

    // 地图网格 - 直接使用配置生成器创建
    mapSystem.mapGrid = [];

    // 保存canvas和ctx引用
    mapSystem.canvas = canvas;
    mapSystem.ctx = ctx;

    // 初始化地图
    mapSystem.initMap();

    return mapSystem;
};

// 初始化地图
mapPrototype.initMap = function () {
    // 直接使用配置生成器创建地图网格，避免重复计算
    var mainMapConfig = MapManager.getMap('main');
    
    console.log('=== 地图初始化 ===');
    console.log('地图尺寸:', this.mapWidth, 'x', this.mapHeight);
    console.log('建筑物大小:', this.blockSize, 'x', this.blockSize);
    console.log('街道宽度:', this.streetWidth);
    console.log('网格数:', mainMapConfig.gridCols, 'x', mainMapConfig.gridRows);
    console.log('总建筑物数量:', mainMapConfig.gridCols * mainMapConfig.gridRows);
    console.log('==================');

    this.generateMapGridFromConfig(mainMapConfig);
    console.log('地图初始化完成');
};

// 从配置生成地图网格（消除重复计算）
mapPrototype.generateMapGridFromConfig = function (mapConfig) {
    if (mapConfig.type !== 'grid') {
        console.error('不支持的地图类型:', mapConfig.type);
        return;
    }

    var gridCols = mapConfig.gridCols;
    var gridRows = mapConfig.gridRows;
    var blockSize = mapConfig.blockSize;
    var streetWidth = mapConfig.streetWidth;
    var gridSize = blockSize + streetWidth;

    console.log('从配置生成地图网格:', gridRows + '行 x ' + gridCols + '列');

    this.mapGrid = [];

    for (var row = 0; row < gridRows; row++) {
        this.mapGrid[row] = [];
        for (var col = 0; col < gridCols; col++) {
            // 随机选择建筑物类型
            var buildingType = this.buildingTypes[Math.floor(Math.random() * this.buildingTypes.length)];

            // 计算建筑物在世界坐标中的位置
            var worldX = col * gridSize;
            var worldY = row * gridSize;

            this.mapGrid[row][col] = {
                type: buildingType,
                x: worldX,
                y: worldY,
                width: blockSize,
                height: blockSize,
                isStreet: false,
                doorX: worldX + blockSize / 2 - 50,
                doorY: worldY + blockSize - 80,
                doorWidth: 100,
                doorHeight: 80
            };
        }
    }

    console.log('地图网格生成完成');
};

// 渲染地图
mapPrototype.render = function () {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 保存当前上下文状态
    this.ctx.save();

    // 应用缩放变换
    this.ctx.scale(this.zoom, this.zoom);

    // 调整偏移量以适应缩放
    var scaledOffsetX = this.offsetX / this.zoom;
    var scaledOffsetY = this.offsetY / this.zoom;

    // 绘制地图背景
    this.drawMapBackground(scaledOffsetX, scaledOffsetY);

    // 绘制街道
    this.drawStreets(scaledOffsetX, scaledOffsetY);

    // 绘制建筑物
    this.drawBuildings(scaledOffsetX, scaledOffsetY);

    // 绘制角色
    this.drawCharacters(scaledOffsetX, scaledOffsetY);

    // 绘制地图边界
    this.drawMapBoundaries(scaledOffsetX, scaledOffsetY);

    // 恢复上下文状态
    this.ctx.restore();

    // 绘制UI信息（不受缩放影响）
    this.drawUI();
};

// 渲染地图（无变换，供视觉系统使用）
mapPrototype.renderWithoutTransform = function () {
    // 这个方法现在由ViewSystem处理，保留空实现以兼容
    console.log('renderWithoutTransform已废弃，请使用ViewSystem.renderMap');
};

// 绘制地图背景
mapPrototype.drawMapBackground = function(offsetX, offsetY) {
    // 绘制地面背景
    this.ctx.fillStyle = '#90EE90'; // 浅绿色地面
    this.ctx.fillRect(offsetX, offsetY, this.canvas.width / this.zoom, this.canvas.height / this.zoom);
    
    // 绘制网格线（可选）
    if (this.showGrid) {
        this.ctx.strokeStyle = '#E0E0E0';
        this.ctx.lineWidth = 1;
        var gridSize = this.blockSize + this.streetWidth;
        
        for (var x = offsetX; x < offsetX + this.canvas.width / this.zoom; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, offsetY);
            this.ctx.lineTo(x, offsetY + this.canvas.height / this.zoom);
            this.ctx.stroke();
        }
        
        for (var y = offsetY; y < offsetY + this.canvas.height / this.zoom; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(offsetX, y);
            this.ctx.lineTo(offsetX + this.canvas.width / this.zoom, y);
            this.ctx.stroke();
        }
    }
};

// 绘制街道
mapPrototype.drawStreets = function(offsetX, offsetY) {
    this.ctx.fillStyle = '#696969'; // 深灰色街道
    this.ctx.lineWidth = 2;
    
    var gridSize = this.blockSize + this.streetWidth;
    var startX = Math.floor(offsetX / gridSize) * gridSize;
    var startY = Math.floor(offsetY / gridSize) * gridSize;
    var endX = startX + (this.canvas.width / this.zoom) + gridSize;
    var endY = startY + (this.canvas.height / this.zoom) + gridSize;
    
    // 绘制水平街道
    for (var y = startY; y < endY; y += gridSize) {
        this.ctx.fillRect(startX, y + this.blockSize, endX - startX, this.streetWidth);
    }
    
    // 绘制垂直街道
    for (var x = startX; x < endX; x += gridSize) {
        this.ctx.fillRect(x + this.blockSize, startY, this.streetWidth, endY - startY);
    }
};

// 绘制建筑物
mapPrototype.drawBuildings = function(offsetX, offsetY) {
    var gridSize = this.blockSize + this.streetWidth;
    var startRow = Math.floor(offsetY / gridSize);
    var endRow = Math.min(startRow + Math.ceil((this.canvas.height / this.zoom) / gridSize) + 1, this.mapGrid.length);
    var startCol = Math.floor(offsetX / gridSize);
    var endCol = Math.min(startCol + Math.ceil((this.canvas.width / this.zoom) / gridSize) + 1, this.mapGrid[0].length);
    
    for (var row = Math.max(0, startRow); row < endRow; row++) {
        for (var col = Math.max(0, startCol); col < endCol; col++) {
            if (this.mapGrid[row] && this.mapGrid[row][col]) {
                var building = this.mapGrid[row][col];
                this.drawBuilding(building);
            }
        }
    }
};

// 绘制单个建筑物
mapPrototype.drawBuilding = function(building) {
    var buildingType = building.type;
    
    // 绘制建筑物主体
    this.ctx.fillStyle = buildingType.color;
    this.ctx.fillRect(building.x, building.y, building.width, building.height);
    
    // 绘制建筑物边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(building.x, building.y, building.width, building.height);
    
    // 绘制建筑物图标
    this.ctx.font = '24px Arial';
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(buildingType.icon, building.x + building.width / 2, building.y + building.height / 2 + 8);
    
    // 绘制门
    this.ctx.fillStyle = buildingType.doorColor;
    this.ctx.fillRect(building.doorX, building.doorY, building.doorWidth, building.doorHeight);
    
    // 绘制门边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(building.doorX, building.doorY, building.doorWidth, building.doorHeight);
};

// 绘制角色
mapPrototype.drawCharacters = function(offsetX, offsetY) {
    if (!this.characterManager) return;
    
    var characters = this.characterManager.getAllCharacters();
    for (var i = 0; i < characters.length; i++) {
        var character = characters[i];
        if (character && character.isValid && character.x !== undefined && character.y !== undefined) {
            this.drawCharacter(character);
        }
    }
};

// 绘制单个角色
mapPrototype.drawCharacter = function(character) {
    // 绘制角色身体
    this.ctx.fillStyle = character.color || '#FF0000';
    this.ctx.fillRect(character.x - 15, character.y - 15, 30, 30);
    
    // 绘制角色边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(character.x - 15, character.y - 15, 30, 30);
    
    // 绘制角色图标
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(character.icon || '👤', character.x, character.y + 5);
    
    // 绘制角色名称
    if (character.name) {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(character.name, character.x, character.y - 25);
    }
};

// 绘制地图边界
mapPrototype.drawMapBoundaries = function(offsetX, offsetY) {
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 5;
    this.ctx.strokeRect(0, 0, this.mapWidth, this.mapHeight);
    
    // 绘制边界标签
    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#FF0000';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('地图边界', this.mapWidth / 2, 30);
    this.ctx.fillText('地图边界', this.mapWidth / 2, this.mapHeight - 10);
    this.ctx.save();
    this.ctx.translate(30, this.mapHeight / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillText('地图边界', 0, 0);
    this.ctx.restore();
    this.ctx.save();
    this.ctx.translate(this.mapWidth - 10, this.mapHeight / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillText('地图边界', 0, 0);
    this.ctx.restore();
};

// 绘制UI信息
mapPrototype.drawUI = function() {
    // 绘制地图信息面板
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 120);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    
    var info = [
        '地图尺寸: ' + this.mapWidth + ' x ' + this.mapHeight,
        '缩放: ' + this.zoom.toFixed(2),
        '偏移: (' + Math.round(this.offsetX) + ', ' + Math.round(this.offsetY) + ')',
        '建筑物: ' + (this.mapGrid.length > 0 ? this.mapGrid.length * this.mapGrid[0].length : 0),
        '角色: ' + (this.characterManager ? this.characterManager.getAllCharacters().length : 0)
    ];
    
    for (var i = 0; i < info.length; i++) {
        this.ctx.fillText(info[i], 20, 30 + i * 20);
    }
};

// 设置角色管理器
mapPrototype.setCharacterManager = function(characterManager) {
    this.characterManager = characterManager;
    console.log('角色管理器已设置');
};

// 切换网格显示
mapPrototype.toggleGrid = function() {
    this.showGrid = !this.showGrid;
    console.log('网格显示:', this.showGrid ? '开启' : '关闭');
};

// 设置缩放
mapPrototype.setZoom = function(zoom) {
    this.zoom = Math.max(0.1, Math.min(2.0, zoom));
    console.log('缩放设置为:', this.zoom);
};

// 移动视角
mapPrototype.moveView = function(deltaX, deltaY) {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
    
    // 限制视角范围
    this.offsetX = Math.max(0, Math.min(this.mapWidth - this.canvas.width, this.offsetX));
    this.offsetY = Math.max(0, Math.min(this.mapHeight - this.canvas.height, this.offsetY));
    
    console.log('视角已移动:', this.offsetX, this.offsetY);
};

// ES6模块导出
export { BUILDING_TYPES, MapConfigGenerator, PRESET_MAPS, MapManager };
export default mapPrototype;
