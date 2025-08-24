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
    mapSystem.buildingTypes = [
        {name: '民房', color: '#CD853F', icon: '🏠', doorColor: '#8B4513'},      // 棕色民房
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
                isStreet: false,
                // 门的位置（在建筑物底部中央）- 门改大一点
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
    // 绘制地图背景
    this.drawMapBackground(0, 0);

    // 绘制街道
    this.drawStreets(0, 0);

    // 绘制建筑物
    this.drawBuildings(0, 0);

    // 绘制地图边界
    this.drawMapBoundaries(0, 0);
};

// 绘制地图背景
mapPrototype.drawMapBackground = function (offsetX, offsetY) {
    // 平面俯视图背景 - 简单的浅色背景
    this.ctx.fillStyle = '#F0F8FF';  // 浅蓝色背景，像城市规划图
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
};

// 绘制街道
mapPrototype.drawStreets = function (offsetX, offsetY) {
    this.ctx.fillStyle = '#808080';  // 灰色街道

    // 计算网格尺寸
    var gridSize = this.blockSize + this.streetWidth;

    // 绘制水平街道 - 在每行建筑物之间
    for (var row = 1; row < this.mapGrid.length; row++) {
        var y = row * gridSize - this.streetWidth;
        this.ctx.fillRect(
            -offsetX,
            y - offsetY,
            this.mapWidth,
            this.streetWidth
        );
    }

    // 绘制垂直街道 - 在每列建筑物之间
    for (var col = 1; col < this.mapGrid[0].length; col++) {
        var x = col * gridSize - this.streetWidth;
        this.ctx.fillRect(
            x - offsetX,
            -offsetY,
            this.streetWidth,
            this.mapHeight
        );
    }

    // 绘制街道中心线（虚线）
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 8]);

    // 水平中心线
    for (var row = 1; row < this.mapGrid.length; row++) {
        var y = row * gridSize - this.streetWidth + this.streetWidth / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-offsetX, y - offsetY);
        this.ctx.lineTo(this.mapWidth - offsetX, y - offsetY);
        this.ctx.stroke();
    }

    // 垂直中心线
    for (var col = 1; col < this.mapGrid[0].length; col++) {
        var x = col * gridSize - this.streetWidth + this.streetWidth / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - offsetX, -offsetY);
        this.ctx.lineTo(x - offsetX, this.mapHeight - offsetY);
        this.ctx.stroke();
    }

    this.ctx.setLineDash([]); // 重置虚线样式
};

// 绘制角色
mapPrototype.drawCharacters = function (offsetX, offsetY) {
    if (this.characterManager) {
        // 获取地图中心位置作为摄像机位置
        var cameraX = offsetX;
        var cameraY = offsetY;
        
        // 调试信息
        console.log('绘制角色 - 角色数量:', this.characterManager.getAllCharacters().length);
        
        // 渲染所有角色
        this.characterManager.renderAllCharacters(this.ctx, cameraX, cameraY);
    } else {
        console.log('角色管理器未设置');
    }
};



// 绘制建筑物
mapPrototype.drawBuildings = function (offsetX, offsetY) {
    for (var row = 0; row < this.mapGrid.length; row++) {
        for (var col = 0; col < this.mapGrid[row].length; col++) {
            var building = this.mapGrid[row][col];
            this.drawBuilding(building, offsetX, offsetY);
        }
    }
};

// 绘制单个建筑物
mapPrototype.drawBuilding = function (building, offsetX, offsetY) {
    var x = building.x - offsetX;
    var y = building.y - offsetY;

    // 检查建筑物是否在可视区域内
    if (x + building.width < 0 || x > this.canvas.width ||
        y + building.height < 0 || y > this.canvas.height) {
        return; // 跳过不可见的建筑物
    }

    // 绘制建筑物主体 - 平面俯视图方块
    this.ctx.fillStyle = building.type.color;
    this.ctx.fillRect(x, y, building.width, building.height);

    // 绘制建筑物边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, building.width, building.height);

    // 绘制门 - 在建筑物底部中央（平面俯视图中的门）
    var doorX = building.doorX - offsetX;
    var doorY = building.doorY - offsetY;

    // 绘制门（深色矩形）
    this.ctx.fillStyle = building.type.doorColor;
    this.ctx.fillRect(doorX, doorY, building.doorWidth, building.doorHeight);

    // 绘制门边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(doorX, doorY, building.doorWidth, building.doorHeight);

    // 绘制建筑物图标（在建筑物中央）
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
        building.type.icon,
        x + building.width / 2,
        y + building.height / 2 + 8
    );

    // 绘制建筑物名称（在建筑物顶部）
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
        building.type.name,
        x + building.width / 2,
        y + 16
    );
};

// 绘制地图边界
mapPrototype.drawMapBoundaries = function (offsetX, offsetY) {
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 5;
    this.ctx.strokeRect(
        -offsetX,
        -offsetY,
        this.mapWidth,
        this.mapHeight
    );
};

// 绘制UI信息
mapPrototype.drawUI = function () {
    // 只绘制控制提示面板
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(this.canvas.width - 260, 10, 250, 100);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText('🎮 控制提示:', this.canvas.width - 250, 30);
    this.ctx.fillText('触摸移动: 拖动地图', this.canvas.width - 250, 50);
    this.ctx.fillText('点击建筑物: 查看信息', this.canvas.width - 250, 70);
    this.ctx.fillText('返回首页: 左上角按钮', this.canvas.width - 250, 90);
};

// 移动地图
mapPrototype.moveMap = function (deltaX, deltaY) {
    this.offsetX += deltaX;
    this.offsetY += deltaY;

    // 限制地图移动范围
    this.offsetX = Math.max(0, Math.min(this.offsetX, this.mapWidth - this.canvas.width / this.zoom));
    this.offsetY = Math.max(0, Math.min(this.offsetY, this.mapHeight - this.canvas.height / this.zoom));
};

// 设置地图位置
mapPrototype.setMapPosition = function (x, y) {
    this.offsetX = Math.max(0, Math.min(x, this.mapWidth - this.canvas.width / this.zoom));
    this.offsetY = Math.max(0, Math.min(y, this.mapHeight - this.canvas.height / this.zoom));
};

// 获取地图中心位置
mapPrototype.getMapCenter = function () {
    return {
        x: this.offsetX + (this.canvas.width / this.zoom) / 2,
        y: this.offsetY + (this.canvas.height / this.zoom) / 2
    };
};

// 缩放控制
mapPrototype.setZoom = function (newZoom) {
    // 限制缩放范围
    newZoom = Math.max(0.3, Math.min(2.0, newZoom));

    // 计算缩放前后的中心点
    var centerX = this.offsetX + (this.canvas.width / this.zoom) / 2;
    var centerY = this.offsetY + (this.canvas.height / this.zoom) / 2;

    // 更新缩放
    this.zoom = newZoom;

    // 调整偏移量以保持中心点不变
    this.offsetX = centerX - (this.canvas.width / this.zoom) / 2;
    this.offsetY = centerY - (this.canvas.height / this.zoom) / 2;

    // 确保偏移量在有效范围内
    this.offsetX = Math.max(0, Math.min(this.offsetX, this.mapWidth - this.canvas.width / this.zoom));
    this.offsetY = Math.max(0, Math.min(this.offsetY, this.mapHeight - this.canvas.height / this.zoom));

    console.log('缩放已调整为:', this.zoom);
};

// 动态调整地图配置
mapPrototype.adjustMapConfig = function (newStreetWidth) {
    // 保存当前中心点
    var centerX = this.offsetX + (this.canvas.width / this.zoom) / 2;
    var centerY = this.offsetY + (this.canvas.height / this.zoom) / 2;

    // 更新街道宽度
    this.streetWidth = newStreetWidth;

    // 重新计算网格尺寸和地图尺寸
    var gridSize = this.blockSize + this.streetWidth;
    var gridCols = 8;  // 改为8列
    var gridRows = 8;  // 改为8行
    this.mapWidth = gridCols * gridSize;
    this.mapHeight = gridRows * gridSize;

    // 重新生成地图网格
    this.generateMapGrid();

    // 调整偏移量以保持中心点不变
    this.offsetX = centerX - (this.canvas.width / this.zoom) / 2;
    this.offsetY = centerY - (this.canvas.height / this.zoom) / 2;

    // 确保偏移量在有效范围内
    this.offsetX = Math.max(0, Math.min(this.offsetX, this.mapWidth - this.canvas.width / this.zoom));
    this.offsetY = Math.max(0, Math.min(this.offsetY, this.mapHeight - this.canvas.height / this.zoom));

    console.log('地图配置已调整:');
    console.log('新街道宽度:', this.streetWidth);
    console.log('新地图尺寸:', this.mapWidth, 'x', this.mapHeight);
    console.log('新网格尺寸:', gridSize);
};

// 预设配置
mapPrototype.setPresetConfig = function (presetName) {
    var configs = {
        'narrow': {streetWidth: 350, name: '窄街道'},
        'normal': {streetWidth: 500, name: '标准街道'},
        'wide': {streetWidth: 700, name: '宽街道'},
        'extraWide': {streetWidth: 1000, name: '超宽街道'},
        'current': {streetWidth: 500, name: '当前配置'}  // 添加当前配置
    };

    if (configs[presetName]) {
        var config = configs[presetName];
        this.adjustMapConfig(config.streetWidth);
        console.log('已应用预设配置:', config.name);
        return true;
    } else {
        console.error('未知的预设配置:', presetName);
        return false;
    }
};

// 检查点击位置是否在建筑物上
mapPrototype.checkBuildingClick = function (x, y) {
    var worldX = x + this.offsetX;
    var worldY = y + this.offsetY;

    for (var row = 0; row < this.mapGrid.length; row++) {
        for (var col = 0; col < this.mapGrid[row].length; col++) {
            var building = this.mapGrid[row][col];

            if (worldX >= building.x && worldX <= building.x + building.width &&
                worldY >= building.y && worldY <= building.y + building.height) {
                return building;
            }
        }
    }

    return null;
};

// 获取建筑物信息
mapPrototype.getBuildingInfo = function (building) {
    return {
        type: building.type.name,
        icon: building.type.icon,
        position: {x: building.x, y: building.y},
        size: {width: building.width, height: building.height}
    };
};

// ES6模块导出
export default mapPrototype;
