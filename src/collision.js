/**
 * 碰撞检测模块 (collision.js)
 * 
 * 支持多地图和不规则建筑的碰撞检测系统
 * 每个地图可以有自己的建筑物布局配置
 */

// 碰撞检测系统
var CollisionSystem = {
    // 当前地图配置
    currentMap: null,
    
    // 地图配置集合
    maps: {
        // 主地图：8x8网格，建筑物750x750，街道500像素
        'main': {
            name: '主地图',
            type: 'grid', // 网格类型
            blockSize: 750,
            streetWidth: 500,
            gridSize: 1250,      // 750 + 500
            gridCols: 8,
            gridRows: 8,
            mapWidth: 10000,     // 8 * 1250
            mapHeight: 10000,
            buildingTypes: ['民房', '别墅', '医院', '商店', '学校', '警察局']
        },
        
        // 子地图1：不规则建筑布局
        'submap1': {
            name: '子地图1',
            type: 'irregular', // 不规则类型
            mapWidth: 6000,
            mapHeight: 6000,
            buildings: [
                // 每个建筑独立定义位置和尺寸
                {x: 500, y: 300, width: 800, height: 600, type: '工厂'},
                {x: 1500, y: 200, width: 600, height: 500, type: '仓库'},
                {x: 2500, y: 800, width: 700, height: 400, type: '宿舍'},
                {x: 800, y: 1200, width: 500, height: 300, type: '食堂'},
                {x: 2000, y: 1500, width: 900, height: 700, type: '办公楼'},
                {x: 3500, y: 400, width: 400, height: 400, type: '小卖部'},
                {x: 400, y: 1800, width: 600, height: 500, type: '健身房'},
                {x: 3000, y: 1200, width: 800, height: 600, type: '会议室'}
            ]
        },
        
        // 子地图2：不规则建筑布局
        'submap2': {
            name: '子地图2',
            type: 'irregular',
            mapWidth: 4000,
            mapHeight: 4000,
            buildings: [
                {x: 200, y: 150, width: 600, height: 500, type: '商场'},
                {x: 1000, y: 100, width: 800, height: 600, type: '电影院'},
                {x: 2000, y: 300, width: 500, height: 400, type: '餐厅'},
                {x: 300, y: 800, width: 700, height: 500, type: '银行'},
                {x: 1200, y: 800, width: 600, height: 400, type: '咖啡厅'},
                {x: 2000, y: 900, width: 900, height: 700, type: '购物中心'},
                {x: 500, y: 1500, width: 400, height: 300, type: '书店'},
                {x: 1500, y: 1400, width: 500, height: 600, type: '游戏厅'}
            ]
        },
        
        // 子地图3：不规则建筑布局
        'submap3': {
            name: '子地图3',
            type: 'irregular',
            mapWidth: 2400,
            mapHeight: 2400,
            buildings: [
                {x: 100, y: 100, width: 500, height: 400, type: '公园'},
                {x: 700, y: 50, width: 600, height: 500, type: '游乐场'},
                {x: 1400, y: 200, width: 400, height: 300, type: '图书馆'},
                {x: 200, y: 600, width: 700, height: 500, type: '博物馆'},
                {x: 1000, y: 700, width: 500, height: 400, type: '艺术馆'},
                {x: 1600, y: 700, width: 600, height: 500, type: '科技馆'},
                {x: 300, y: 1200, width: 400, height: 300, type: '休息区'},
                {x: 800, y: 1300, width: 600, height: 400, type: '观景台'}
            ]
        },
        
        // 子地图4：不规则建筑布局
        'submap4': {
            name: '子地图4',
            type: 'irregular',
            mapWidth: 1500,
            mapHeight: 1500,
            buildings: [
                {x: 50, y: 50, width: 300, height: 250, type: '加油站'},
                {x: 400, y: 100, width: 400, height: 300, type: '修理厂'},
                {x: 900, y: 80, width: 350, height: 280, type: '停车场'},
                {x: 150, y: 400, width: 500, height: 400, type: '服务站'},
                {x: 700, y: 450, width: 300, height: 250, type: '洗车店'},
                {x: 1100, y: 400, width: 250, height: 200, type: '便利店'},
                {x: 200, y: 900, width: 400, height: 300, type: '休息室'},
                {x: 700, y: 800, width: 350, height: 280, type: '工具间'}
            ]
        }
    },
    
    // 初始化碰撞检测系统
    init: function(mapId) {
        if (!mapId) {
            mapId = 'main'; // 默认使用主地图
        }
        
        if (!this.maps[mapId]) {
            console.error('未知地图ID:', mapId);
            return false;
        }
        
        this.currentMap = this.maps[mapId];
        console.log('碰撞检测系统初始化完成');
        console.log('当前地图:', this.currentMap.name);
        console.log('地图类型:', this.currentMap.type);
        console.log('地图配置:', this.currentMap);
        
        return true;
    },
    
    // 切换地图
    switchMap: function(mapId) {
        return this.init(mapId);
    },
    
    // 添加自定义地图配置
    addMap: function(mapId, config) {
        this.maps[mapId] = config;
        console.log('添加新地图配置:', mapId, config);
    },
    
    // 检测点是否在建筑物内（支持网格和不规则两种类型）
    isPointInBuilding: function(x, y) {
        if (!this.currentMap) {
            console.warn('碰撞检测系统未初始化');
            return false;
        }
        
        if (this.currentMap.type === 'grid') {
            return this._isPointInGridBuilding(x, y);
        } else if (this.currentMap.type === 'irregular') {
            return this._isPointInIrregularBuilding(x, y);
        }
        
        return false;
    },
    
    // 网格类型建筑的碰撞检测
    _isPointInGridBuilding: function(x, y) {
        // 计算网格坐标
        var gridCol = Math.floor(x / this.currentMap.gridSize);
        var gridRow = Math.floor(y / this.currentMap.gridSize);
        
        // 检查是否在地图范围内
        if (gridCol < 0 || gridCol >= this.currentMap.gridCols || 
            gridRow < 0 || gridRow >= this.currentMap.gridRows) {
            return false;
        }
        
        // 计算建筑物在网格中的位置
        var buildingX = gridCol * this.currentMap.gridSize;
        var buildingY = gridRow * this.currentMap.gridSize;
        
        // 检查点是否在建筑物范围内
        if (x >= buildingX && x < buildingX + this.currentMap.blockSize &&
            y >= buildingY && y < buildingY + this.currentMap.blockSize) {
            return true;
        }
        
        return false;
    },
    
    // 不规则类型建筑的碰撞检测
    _isPointInIrregularBuilding: function(x, y) {
        if (!this.currentMap.buildings) {
            return false;
        }
        
        // 遍历所有建筑物，检查点是否在任何一个建筑物内
        for (var i = 0; i < this.currentMap.buildings.length; i++) {
            var building = this.currentMap.buildings[i];
            
            if (x >= building.x && x < building.x + building.width &&
                y >= building.y && y < building.y + building.height) {
                return true;
            }
        }
        
        return false;
    },
    
    // 检测矩形是否与建筑物重叠
    isRectInBuilding: function(rectX, rectY, rectWidth, rectHeight) {
        // 检查矩形的四个角点
        var corners = [
            {x: rectX, y: rectY},                                    // 左上角
            {x: rectX + rectWidth, y: rectY},                        // 右上角
            {x: rectX, y: rectY + rectHeight},                       // 左下角
            {x: rectX + rectWidth, y: rectY + rectHeight}            // 右下角
        ];
        
        // 如果任何一个角点在建筑物内，就认为重叠
        for (var i = 0; i < corners.length; i++) {
            if (this.isPointInBuilding(corners[i].x, corners[i].y)) {
                return true;
            }
        }
        
        return false;
    },
    
    // 检测对象中心点是否在建筑物内
    isObjectInBuilding: function(centerX, centerY, objectWidth, objectHeight) {
        // 计算对象的左上角坐标
        var objectLeft = centerX - objectWidth / 2;
        var objectTop = centerY - objectHeight / 2;
        
        return this.isRectInBuilding(objectLeft, objectTop, objectWidth, objectHeight);
    },
    
    // 寻找安全的生成位置（不在建筑物内）
    findSafePosition: function(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight) {
        // 尝试在指定范围内寻找安全位置
        for (var attempt = 0; attempt < 50; attempt++) {
            var angle = Math.random() * Math.PI * 2;
            var distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            var testX = centerX + Math.cos(angle) * distance;
            var testY = centerY + Math.sin(angle) * distance;
            
            // 检查位置是否安全
            if (!this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
                return {x: testX, y: testY};
            }
        }
        
        // 如果找不到安全位置，返回一个默认的安全位置（地图边缘）
        return {x: 100, y: 100};
    },
    
    // 获取有效的移动位置（改进版：支持平滑滑动）
    getValidMovePosition: function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查目标位置是否安全
        if (!this.isObjectInBuilding(toX, toY, objectWidth, objectHeight)) {
            return {x: toX, y: toY};
        }
        
        // 如果目标位置不安全，尝试分别移动X和Y轴
        var newX = fromX;
        var newY = fromY;
        
        // 尝试只移动X轴
        var testX = toX;
        var testY = fromY;
        if (!this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
            newX = testX;
        }
        
        // 尝试只移动Y轴
        var testX2 = fromX;
        var testY2 = toY;
        if (!this.isObjectInBuilding(testX2, testY2, objectWidth, objectHeight)) {
            newY = testY2;
        }
        
        // 如果X和Y都不能移动，尝试对角线移动（距离减半）
        if (newX === fromX && newY === fromY) {
            var halfDistanceX = (toX - fromX) * 0.5;
            var halfDistanceY = (toY - fromY) * 0.5;
            
            var testX3 = fromX + halfDistanceX;
            var testY3 = fromY + halfDistanceY;
            
            if (!this.isObjectInBuilding(testX3, testY3, objectWidth, objectHeight)) {
                newX = testX3;
                newY = testY3;
            }
        }
        
        return {x: newX, y: newY};
    },
    
    // 获取平滑的移动位置（更智能的碰撞响应）
    getSmoothMovePosition: function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查目标位置是否安全
        if (!this.isObjectInBuilding(toX, toY, objectWidth, objectHeight)) {
            return {x: toX, y: toY};
        }
        
        // 计算移动向量
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance === 0) {
            return {x: fromX, y: fromY};
        }
        
        // 尝试多个距离的移动，找到最远的可行位置
        var testDistances = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
        
        for (var i = 0; i < testDistances.length; i++) {
            var testDistance = testDistances[i];
            var testX = fromX + deltaX * testDistance;
            var testY = fromY + deltaY * testDistance;
            
            if (!this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
                return {x: testX, y: testY};
            }
        }
        
        // 如果都不能移动，尝试分别移动X和Y轴
        var result = this.getValidMovePosition(fromX, fromY, toX, toY, objectWidth, objectHeight);
        
        // 如果还是不能移动，尝试寻找附近的可行位置
        if (result.x === fromX && result.y === fromY) {
            result = this.findNearestSafePosition(fromX, fromY, toX, toY, objectWidth, objectHeight);
        }
        
        return result;
    },
    
    // 寻找最近的可行位置（沿着建筑物边缘）
    findNearestSafePosition: function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance === 0) {
            return {x: fromX, y: fromY};
        }
        
        // 尝试8个方向的移动
        var directions = [
            {x: 1, y: 0},   // 右
            {x: -1, y: 0},  // 左
            {x: 0, y: 1},   // 下
            {x: 0, y: -1},  // 上
            {x: 0.7, y: 0.7},   // 右下
            {x: -0.7, y: 0.7},  // 左下
            {x: 0.7, y: -0.7},  // 右上
            {x: -0.7, y: -0.7}  // 左上
        ];
        
        var moveDistance = Math.min(distance, 50); // 限制移动距离，避免跳跃太远
        
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var testX = fromX + dir.x * moveDistance;
            var testY = fromY + dir.y * moveDistance;
            
            if (!this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
                return {x: testX, y: testY};
            }
        }
        
        // 如果8个方向都不能移动，返回原位置
        return {x: fromX, y: fromY};
    },
    
    // 检测移动路径是否有效（改进版：支持部分移动）
    isMovePathValid: function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查起点和终点
        if (this.isObjectInBuilding(fromX, fromY, objectWidth, objectHeight)) {
            return false;
        }
        
        if (this.isObjectInBuilding(toX, toY, objectWidth, objectHeight)) {
            return false;
        }
        
        // 检查路径中间点（简单的线性插值检查）
        var steps = 5;
        for (var i = 1; i < steps; i++) {
            var t = i / steps;
            var testX = fromX + (toX - fromX) * t;
            var testY = fromY + (toY - fromY) * t;
            
            if (this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
                return false;
            }
        }
        
        return true;
    },
    
    // 检测两个对象是否重叠
    isObjectsOverlapping: function(obj1X, obj1Y, obj1Width, obj1Height, 
                                   obj2X, obj2Y, obj2Width, obj2Height) {
        // 计算对象的边界
        var obj1Left = obj1X - obj1Width / 2;
        var obj1Right = obj1X + obj1Width / 2;
        var obj1Top = obj1Y - obj1Height / 2;
        var obj1Bottom = obj1Y + obj1Height / 2;
        
        var obj2Left = obj2X - obj2Width / 2;
        var obj2Right = obj2X + obj2Width / 2;
        var obj2Top = obj2Y - obj2Height / 2;
        var obj2Bottom = obj2Y + obj2Height / 2;
        
        // 检查是否重叠
        return !(obj1Right < obj2Left || obj1Left > obj2Right || 
                 obj1Bottom < obj2Top || obj1Top > obj2Bottom);
    },
    
    // 检测对象与对象列表的碰撞
    isObjectOverlappingWithList: function(objX, objY, objWidth, objHeight, objectList) {
        if (!objectList || objectList.length === 0) {
            return false;
        }
        
        for (var i = 0; i < objectList.length; i++) {
            var otherObj = objectList[i];
            if (otherObj && otherObj.x !== undefined && otherObj.y !== undefined) {
                var otherWidth = otherObj.width || 32;
                var otherHeight = otherObj.height || 32;
                
                if (this.isObjectsOverlapping(objX, objY, objWidth, objHeight,
                                            otherObj.x, otherObj.y, otherWidth, otherHeight)) {
                    console.log('对象重叠检测:', '位置', objX, objY, '与', otherObj.type || '对象', '重叠');
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // 获取避免重叠的移动位置
    getNonOverlappingPosition: function(fromX, fromY, toX, toY, objectWidth, objectHeight, 
                                       avoidObjects, buildingCollision) {
        // 首先检查建筑物碰撞
        if (buildingCollision && this.isObjectInBuilding(toX, toY, objectWidth, objectHeight)) {
            // 如果目标位置在建筑物内，先处理建筑物碰撞
            var buildingSafePos = this.getSmoothMovePosition(fromX, fromY, toX, toY, objectWidth, objectHeight);
            toX = buildingSafePos.x;
            toY = buildingSafePos.y;
        }
        
        // 检查是否与对象重叠
        if (!this.isObjectOverlappingWithList(toX, toY, objectWidth, objectHeight, avoidObjects)) {
            return {x: toX, y: toY};
        }
        
        // 如果重叠，尝试寻找不重叠的位置
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance === 0) {
            return {x: fromX, y: fromY};
        }
        
        // 尝试多个距离的移动
        var testDistances = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
        
        for (var i = 0; i < testDistances.length; i++) {
            var testDistance = testDistances[i];
            var testX = fromX + deltaX * testDistance;
            var testY = fromY + deltaY * testDistance;
            
            // 检查建筑物碰撞和对象重叠
            var buildingOk = !buildingCollision || !this.isObjectInBuilding(testX, testY, objectWidth, objectHeight);
            var overlapOk = !this.isObjectOverlappingWithList(testX, testY, objectWidth, objectHeight, avoidObjects);
            
            if (buildingOk && overlapOk) {
                return {x: testX, y: testY};
            }
        }
        
        // 如果还是重叠，尝试8个方向寻找位置
        var directions = [
            {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1},
            {x: 0.7, y: 0.7}, {x: -0.7, y: 0.7}, {x: 0.7, y: -0.7}, {x: -0.7, y: -0.7}
        ];
        
        var moveDistance = Math.min(distance, 30); // 限制移动距离
        
        for (var j = 0; j < directions.length; j++) {
            var dir = directions[j];
            var testX = fromX + dir.x * moveDistance;
            var testY = fromY + dir.y * moveDistance;
            
            var buildingOk = !buildingCollision || !this.isObjectInBuilding(testX, testY, objectWidth, objectHeight);
            var overlapOk = !this.isObjectOverlappingWithList(testX, testY, objectWidth, objectHeight, avoidObjects);
            
            if (buildingOk && overlapOk) {
                return {x: testX, y: testY};
            }
        }
        
        // 如果找不到合适位置，返回原位置
        return {x: fromX, y: fromY};
    },
    
    // 检测僵尸与僵尸之间的碰撞
    isZombieOverlappingWithZombies: function(zombieX, zombieY, zombieWidth, zombieHeight, allZombies, excludeZombieId) {
        if (!allZombies || allZombies.length === 0) {
            return false;
        }
        
        for (var i = 0; i < allZombies.length; i++) {
            var otherZombie = allZombies[i];
            if (otherZombie && otherZombie.id !== excludeZombieId) {
                var otherWidth = otherZombie.width || 32;
                var otherHeight = otherZombie.height || 32;
                
                if (this.isObjectsOverlapping(zombieX, zombieY, zombieWidth, zombieHeight,
                                            otherZombie.x, otherZombie.y, otherWidth, otherHeight)) {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // 检测僵尸与人物之间的碰撞
    isZombieOverlappingWithCharacters: function(zombieX, zombieY, zombieWidth, zombieHeight, allCharacters) {
        if (!allCharacters || allCharacters.length === 0) {
            return false;
        }
        
        for (var i = 0; i < allCharacters.length; i++) {
            var character = allCharacters[i];
            if (character && character.x !== undefined && character.y !== undefined) {
                var charWidth = character.width || 32;
                var charHeight = character.height || 48;
                
                if (this.isObjectsOverlapping(zombieX, zombieY, zombieWidth, zombieHeight,
                                            character.x, character.y, charWidth, charHeight)) {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // 获取僵尸的有效移动位置（避免与建筑物、其他僵尸和人物重叠）
    getZombieValidMovePosition: function(zombie, toX, toY, allZombies, allCharacters) {
        var zombieWidth = zombie.width || 32;
        var zombieHeight = zombie.height || 32;
        
        // 创建需要避免的对象列表
        var avoidObjects = [];
        
        // 添加其他僵尸
        if (allZombies) {
            for (var i = 0; i < allZombies.length; i++) {
                var otherZombie = allZombies[i];
                if (otherZombie && otherZombie.id !== zombie.id) {
                    avoidObjects.push(otherZombie);
                }
            }
        }
        
        // 添加人物
        if (allCharacters) {
            avoidObjects = avoidObjects.concat(allCharacters);
        }
        
        // 获取不重叠的移动位置
        return this.getNonOverlappingPosition(
            zombie.x, zombie.y, toX, toY, zombieWidth, zombieHeight, 
            avoidObjects, true // 启用建筑物碰撞检测
        );
    },
    
    // 获取当前地图信息
    getCurrentMapInfo: function() {
        return this.currentMap;
    },
    
    // 获取所有地图配置
    getAllMaps: function() {
        return this.maps;
    },
    
    // 测试碰撞检测系统
    testCollisionSystem: function() {
        console.log('=== 测试碰撞检测系统 ===');
        
        // 测试建筑物碰撞
        var testBuilding = this.isObjectInBuilding(1000, 1000, 32, 32);
        console.log('测试建筑物碰撞 (1000, 1000):', testBuilding);
        
        // 测试对象重叠
        var obj1 = {x: 100, y: 100, width: 32, height: 32};
        var obj2 = {x: 120, y: 120, width: 32, height: 32};
        var testOverlap = this.isObjectsOverlapping(100, 100, 32, 32, 120, 120, 32, 32);
        console.log('测试对象重叠:', testOverlap);
        
        // 测试对象列表重叠
        var objectList = [obj1, obj2];
        var testListOverlap = this.isObjectOverlappingWithList(110, 110, 32, 32, objectList);
        console.log('测试对象列表重叠:', testListOverlap);
        
        console.log('=== 碰撞检测系统测试完成 ===');
    },
    
    // 获取指定位置的建筑物信息
    getBuildingAtPosition: function(x, y) {
        if (!this.currentMap) return null;
        
        if (this.currentMap.type === 'grid') {
            return this._getGridBuildingAtPosition(x, y);
        } else if (this.currentMap.type === 'irregular') {
            return this._getIrregularBuildingAtPosition(x, y);
        }
        
        return null;
    },
    
    // 获取网格类型建筑信息
    _getGridBuildingAtPosition: function(x, y) {
        var gridCol = Math.floor(x / this.currentMap.gridSize);
        var gridRow = Math.floor(y / this.currentMap.gridSize);
        
        if (gridCol < 0 || gridCol >= this.currentMap.gridCols || 
            gridRow < 0 || gridRow >= this.currentMap.gridRows) {
            return null;
        }
        
        var buildingX = gridCol * this.currentMap.gridSize;
        var buildingY = gridRow * this.currentMap.gridSize;
        
        return {
            x: buildingX,
            y: buildingY,
            width: this.currentMap.blockSize,
            height: this.currentMap.blockSize,
            type: this.currentMap.buildingTypes[Math.floor(Math.random() * this.currentMap.buildingTypes.length)],
            gridCol: gridCol,
            gridRow: gridRow
        };
    },
    
    // 获取不规则类型建筑信息
    _getIrregularBuildingAtPosition: function(x, y) {
        if (!this.currentMap.buildings) return null;
        
        for (var i = 0; i < this.currentMap.buildings.length; i++) {
            var building = this.currentMap.buildings[i];
            
            if (x >= building.x && x < building.x + building.width &&
                y >= building.y && y < building.y + building.height) {
                return building;
            }
        }
        
        return null;
    }
};

// 导出
export default CollisionSystem;
