/**
 * 地图模块 (map.js)
 *
 * 功能描述：
 * - 地图生成：程序化生成游戏世界地图
 * - 建筑系统：各种建筑的生成、管理和交互
 * - 地形渲染：地面、道路、障碍物等地形元素
 * - 区块管理：将大地图分割为区块以提高性能
 * - 建筑类型：医院、超市、警察局、学校等不同功能建筑
 * - 地图导航：寻路、距离计算、可达性检测
 *
 * 主要类和方法：
 * - MapGenerator: 地图生成器
 * - BuildingManager: 建筑管理器
 * - TerrainRenderer: 地形渲染器
 * - NavigationSystem: 导航系统
 * - 建筑类型定义和生成逻辑
 */

// 地图系统
var mapPrototype = {};

// 地图系统构造函数
mapPrototype.createMapSystem = function (canvas, ctx) {
    var mapSystem = Object.create(mapPrototype);

    // 建筑物和街道尺寸
    mapSystem.blockSize = 750;      // 建筑物大小
    mapSystem.streetWidth = 500;    // 街道宽度（改为500像素）

    // 角色管理器引用（由外部设置）
    mapSystem.characterManager = null;

    // 动态计算地图尺寸以容纳64个建筑物（8x8网格）
    var gridSize = mapSystem.blockSize + mapSystem.streetWidth; // 750 + 500 = 1250
    var gridCols = 8;  // 改为8列
    var gridRows = 8;  // 改为8行
    mapSystem.mapWidth = gridCols * gridSize;   // 8 * 1250 = 10000
    mapSystem.mapHeight = gridRows * gridSize;  // 8 * 1250 = 10000

    // 地图偏移量（初始位置设为地图中心，让玩家看到中心区域）
    mapSystem.offsetX = (mapSystem.mapWidth - canvas.width) / 2;
    mapSystem.offsetY = (mapSystem.mapHeight - canvas.height) / 2;

    console.log('地图初始偏移量:', mapSystem.offsetX, mapSystem.offsetY);
    console.log('画布尺寸:', canvas.width, 'x', canvas.height);

    // 视角缩放 - 让玩家能看到更远的区域
    mapSystem.zoom = 0.6;  // 缩放比例，小于1表示放大（能看到更多内容）

    // 建筑物类型 - 按照要求设置，使用适合平面俯视图的颜色
    mapSystem.buildingTypes = [{name: '民房', color: '#CD853F', icon: '🏠', doorColor: '#8B4513'},      // 棕色民房
        {name: '别墅', color: '#FFD700', icon: '🏰', doorColor: '#B8860B'},      // 金色别墅
        {name: '医院', color: '#FFB6C1', icon: '🏥', doorColor: '#DC143C'},      // 浅粉红医院
        {name: '商店', color: '#98FB98', icon: '🏪', doorColor: '#32CD32'},      // 浅绿商店
        {name: '学校', color: '#87CEEB', icon: '🏫', doorColor: '#4169E1'},      // 浅蓝学校
        {name: '警察局', color: '#DDA0DD', icon: '👮', doorColor: '#9932CC'}     // 浅紫警察局
    ];

    // 地图网格
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
    // 验证地图尺寸计算
    var gridSize = this.blockSize + this.streetWidth; // 750 + 500 = 1250
    var gridCols = Math.floor(this.mapWidth / gridSize);  // 10000 / 1250 = 8
    var gridRows = Math.floor(this.mapHeight / gridSize); // 10000 / 1250 = 8

    console.log('=== 地图网格计算验证 ===');
    console.log('地图尺寸:', this.mapWidth, 'x', this.mapHeight);
    console.log('建筑物大小:', this.blockSize, 'x', this.blockSize);
    console.log('街道宽度:', this.streetWidth);
    console.log('网格尺寸:', gridSize, '像素');
    console.log('理论网格数:', this.mapWidth / gridSize, 'x', this.mapHeight / gridSize);
    console.log('实际网格数:', gridCols, 'x', gridRows);
    console.log('总建筑物数量:', gridCols * gridRows);
    console.log('========================');

    this.generateMapGrid();
    console.log('地图初始化完成');
};

// 生成地图网格
mapPrototype.generateMapGrid = function () {
    // 计算网格数量：每个网格包含一个建筑物和一条街道
    var gridCols = Math.floor(this.mapWidth / (this.blockSize + this.streetWidth));
    var gridRows = Math.floor(this.mapHeight / (this.blockSize + this.streetWidth));

    console.log('地图网格计算:');
    console.log('地图宽度:', this.mapWidth, '建筑物大小:', this.blockSize, '街道宽度:', this.streetWidth);
    console.log('网格列数:', gridCols, '网格行数:', gridRows);

    this.mapGrid = [];

    for (var row = 0; row < gridRows; row++) {
        this.mapGrid[row] = [];
        for (var col = 0; col < gridCols; col++) {
            // 随机选择建筑物类型
            var buildingType = this.buildingTypes[Math.floor(Math.random() * this.buildingTypes.length)];

            // 计算建筑物在世界坐标中的位置
            var worldX = col * (this.blockSize + this.streetWidth);
            var worldY = row * (this.blockSize + this.streetWidth);

            this.mapGrid[row][col] = {
                type: buildingType,
                x: worldX,
                y: worldY,
                width: this.blockSize,
                height: this.blockSize,
                isStreet: false, // 门的位置（在建筑物底部中央）- 门改大一点
                doorX: worldX + this.blockSize / 2 - 50, // 门宽度100像素（改大）
                doorY: worldY + this.blockSize - 80,     // 门高度80像素（改大）
                doorWidth: 100,  // 门宽度改为100像素
                doorHeight: 80   // 门高度改为80像素
            };
        }
    }

    console.log('地图网格生成完成: ' + gridRows + '行 x ' + gridCols + '列');
    console.log('总建筑物数量:', gridRows * gridCols);
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

// ES6模块导出
export default mapPrototype;
