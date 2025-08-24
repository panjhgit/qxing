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
mapPrototype.createMapSystem = function(canvas, ctx) {
    var mapSystem = Object.create(mapPrototype);
    
    // 地图尺寸
    mapSystem.mapWidth = 6000;
    mapSystem.mapHeight = 6000;
    
    // 建筑物和街道尺寸
    mapSystem.blockSize = 750;
    mapSystem.streetWidth = 500;
    
    // 地图偏移量（用于实现地图移动）
    mapSystem.offsetX = 0;
    mapSystem.offsetY = 0;
    
    // 建筑物类型
    mapSystem.buildingTypes = [
        { name: '民房', color: '#8B4513', icon: '🏠' },
        { name: '别墅', color: '#FFD700', icon: '🏰' },
        { name: '医院', color: '#FF6B6B', icon: '🏥' },
        { name: '商店', color: '#4ECDC4', icon: '🏪' },
        { name: '学校', color: '#45B7D1', icon: '🏫' },
        { name: '警察局', color: '#96CEB4', icon: '👮' }
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
mapPrototype.initMap = function() {
    this.generateMapGrid();
    console.log('地图初始化完成，尺寸:', this.mapWidth, 'x', this.mapHeight);
};

// 生成地图网格
mapPrototype.generateMapGrid = function() {
    var gridCols = Math.floor(this.mapWidth / (this.blockSize + this.streetWidth));
    var gridRows = Math.floor(this.mapHeight / (this.blockSize + this.streetWidth));
    
    this.mapGrid = [];
    
    for (var row = 0; row < gridRows; row++) {
        this.mapGrid[row] = [];
        for (var col = 0; col < gridCols; col++) {
            // 随机选择建筑物类型
            var buildingType = this.buildingTypes[Math.floor(Math.random() * this.buildingTypes.length)];
            
            this.mapGrid[row][col] = {
                type: buildingType,
                x: col * (this.blockSize + this.streetWidth),
                y: row * (this.blockSize + this.streetWidth),
                width: this.blockSize,
                height: this.blockSize,
                isStreet: false
            };
        }
    }
    
    console.log('地图网格生成完成: ' + gridRows + '行 x ' + gridCols + '列');
};

// 渲染地图
mapPrototype.render = function() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制地图背景
    this.drawMapBackground();
    
    // 绘制街道
    this.drawStreets();
    
    // 绘制建筑物
    this.drawBuildings();
    
    // 绘制地图边界
    this.drawMapBoundaries();
    
    // 绘制UI信息
    this.drawUI();
};

// 绘制地图背景
mapPrototype.drawMapBackground = function() {
    // 创建渐变背景
    var gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#87CEEB');  // 天空蓝
    gradient.addColorStop(0.7, '#90EE90'); // 浅绿色
    gradient.addColorStop(1, '#8FBC8F');   // 深绿色
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
};

// 绘制街道
mapPrototype.drawStreets = function() {
    this.ctx.fillStyle = '#696969';  // 深灰色街道
    
    // 绘制水平街道
    for (var row = 0; row < this.mapGrid.length; row++) {
        var y = row * (this.blockSize + this.streetWidth) + this.blockSize;
        this.ctx.fillRect(
            -this.offsetX, 
            y - this.offsetY, 
            this.mapWidth, 
            this.streetWidth
        );
    }
    
    // 绘制垂直街道
    for (var col = 0; col < this.mapGrid[0].length; col++) {
        var x = col * (this.blockSize + this.streetWidth) + this.blockSize;
        this.ctx.fillRect(
            x - this.offsetX, 
            -this.offsetY, 
            this.streetWidth, 
            this.mapHeight
        );
    }
    
    // 绘制街道中心线
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    
    // 水平中心线
    for (var row = 0; row < this.mapGrid.length; row++) {
        var y = row * (this.blockSize + this.streetWidth) + this.blockSize + this.streetWidth / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-this.offsetX, y - this.offsetY);
        this.ctx.lineTo(this.mapWidth - this.offsetX, y - this.offsetY);
        this.ctx.stroke();
    }
    
    // 垂直中心线
    for (var col = 0; col < this.mapGrid[0].length; col++) {
        var x = col * (this.blockSize + this.streetWidth) + this.blockSize + this.streetWidth / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - this.offsetX, -this.offsetY);
        this.ctx.lineTo(x - this.offsetX, this.mapHeight - this.offsetY);
        this.ctx.stroke();
    }
    
    this.ctx.setLineDash([]); // 重置虚线样式
};

// 绘制建筑物
mapPrototype.drawBuildings = function() {
    for (var row = 0; row < this.mapGrid.length; row++) {
        for (var col = 0; col < this.mapGrid[row].length; col++) {
            var building = this.mapGrid[row][col];
            this.drawBuilding(building);
        }
    }
};

// 绘制单个建筑物
mapPrototype.drawBuilding = function(building) {
    var x = building.x - this.offsetX;
    var y = building.y - this.offsetY;
    
    // 检查建筑物是否在可视区域内
    if (x + building.width < 0 || x > this.canvas.width || 
        y + building.height < 0 || y > this.canvas.height) {
        return; // 跳过不可见的建筑物
    }
    
    // 绘制建筑物主体
    this.ctx.fillStyle = building.type.color;
    this.ctx.fillRect(x, y, building.width, building.height);
    
    // 绘制建筑物边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, building.width, building.height);
    
    // 绘制建筑物图标
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
        building.type.icon, 
        x + building.width / 2, 
        y + building.height / 2 + 15
    );
    
    // 绘制建筑物名称
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
        building.type.name, 
        x + building.width / 2, 
        y + building.height - 10
    );
};

// 绘制地图边界
mapPrototype.drawMapBoundaries = function() {
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 5;
    this.ctx.strokeRect(
        -this.offsetX, 
        -this.offsetY, 
        this.mapWidth, 
        this.mapHeight
    );
};

// 绘制UI信息
mapPrototype.drawUI = function() {
    // 绘制地图信息
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 100);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('地图信息:', 20, 30);
    this.ctx.fillText('尺寸: ' + this.mapWidth + 'x' + this.mapHeight, 20, 50);
    this.ctx.fillText('建筑物: ' + this.blockSize + 'x' + this.blockSize, 20, 70);
    this.ctx.fillText('街道: ' + this.streetWidth + 'px', 20, 90);
    
    // 绘制控制提示
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(this.canvas.width - 250, 10, 240, 80);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('控制提示:', this.canvas.width - 240, 30);
    this.ctx.fillText('触摸移动: 拖动地图', this.canvas.width - 240, 50);
    this.ctx.fillText('双击: 返回首页', this.canvas.width - 240, 70);
};

// 移动地图
mapPrototype.moveMap = function(deltaX, deltaY) {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
    
    // 限制地图移动范围
    this.offsetX = Math.max(0, Math.min(this.offsetX, this.mapWidth - this.canvas.width));
    this.offsetY = Math.max(0, Math.min(this.offsetY, this.mapHeight - this.canvas.height));
};

// 设置地图位置
mapPrototype.setMapPosition = function(x, y) {
    this.offsetX = Math.max(0, Math.min(x, this.mapWidth - this.canvas.width));
    this.offsetY = Math.max(0, Math.min(y, this.mapHeight - this.canvas.height));
};

// 获取地图中心位置
mapPrototype.getMapCenter = function() {
    return {
        x: this.offsetX + this.canvas.width / 2,
        y: this.offsetY + this.canvas.height / 2
    };
};

// 检查点击位置是否在建筑物上
mapPrototype.checkBuildingClick = function(x, y) {
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
mapPrototype.getBuildingInfo = function(building) {
    return {
        type: building.type.name,
        icon: building.type.icon,
        position: { x: building.x, y: building.y },
        size: { width: building.width, height: building.height }
    };
};

// ES6模块导出
export default mapPrototype;
