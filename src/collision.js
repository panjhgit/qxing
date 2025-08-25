/**
 * 四叉树碰撞检测系统 (collision.js)
 *
 * 高性能的碰撞检测系统，支持不规则建筑和动态对象管理
 * 使用双四叉树架构：静态四叉树管理建筑物，动态四叉树管理移动对象
 */

// 四叉树节点类
function QuadTreeNode(x, y, width, height, maxDepth, currentDepth) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
    this.maxDepth = maxDepth || 0;
    this.currentDepth = currentDepth || 0;
    
    this.objects = [];        // 存储的对象
    this.maxObjects = 8;      // 最大对象数量
    this.children = null;     // 子节点
    this.isDivided = false;   // 是否已分割
}

// 获取节点边界
QuadTreeNode.prototype.getBounds = function() {
    return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        right: this.x + this.width,
        bottom: this.y + this.height
    };
};

// 检查对象是否在节点范围内
QuadTreeNode.prototype.containsObject = function(object) {
    var bounds = this.getBounds();
    var objBounds = this.getObjectBounds(object);
    
    return !(objBounds.right < bounds.x || 
             objBounds.left > bounds.right || 
             objBounds.bottom < bounds.y || 
             objBounds.top > bounds.bottom);
};

// 获取对象边界
QuadTreeNode.prototype.getObjectBounds = function(object) {
    if (object.bounds) {
        return object.bounds;
    }
    
    // 根据对象类型计算边界
    if (object.width !== undefined && object.height !== undefined) {
        // 人物、僵尸等对象
        return {
            left: (object.x || 0) - (object.width || 0) / 2,
            right: (object.x || 0) + (object.width || 0) / 2,
            top: (object.y || 0) - (object.height || 0) / 2,
            bottom: (object.y || 0) + (object.height || 0) / 2
        };
    } else if (object.x !== undefined && object.y !== undefined) {
        // 点对象
        return {
            left: object.x,
            right: object.x,
            top: object.y,
            bottom: object.y
        };
    }
    
    // 默认边界
    return {
        left: object.x || 0,
        right: (object.x || 0) + (object.width || 0),
        top: object.y || 0,
        bottom: (object.y || 0) + (object.height || 0)
    };
};

// 分割节点
QuadTreeNode.prototype.subdivide = function() {
    if (this.isDivided || this.currentDepth >= this.maxDepth) {
        return;
    }
    
    var halfWidth = this.width / 2;
    var halfHeight = this.height / 2;
    var nextDepth = this.currentDepth + 1;
    
    this.children = [
        new QuadTreeNode(this.x, this.y, halfWidth, halfHeight, this.maxDepth, nextDepth),                    // 左上
        new QuadTreeNode(this.x + halfWidth, this.y, halfWidth, halfHeight, this.maxDepth, nextDepth),        // 右上
        new QuadTreeNode(this.x, this.y + halfHeight, halfWidth, halfHeight, this.maxDepth, nextDepth),       // 左下
        new QuadTreeNode(this.x + halfWidth, this.y + halfHeight, halfWidth, halfHeight, this.maxDepth, nextDepth) // 右下
    ];
    
    this.isDivided = true;
};

// 插入对象
QuadTreeNode.prototype.insert = function(object) {
    if (!this.containsObject(object)) {
        return false;
    }
    
    if (this.objects.length < this.maxObjects && !this.isDivided) {
        this.objects.push(object);
        return true;
    }
    
    if (!this.isDivided) {
        this.subdivide();
    }
    
    // 尝试插入到子节点
    for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        if (child.insert(object)) {
            return true;
        }
    }
    
    // 如果子节点都无法容纳，则放在当前节点
    this.objects.push(object);
    return true;
};

// 查询范围内的对象
QuadTreeNode.prototype.query = function(range, found) {
    if (!found) found = [];
    
    // 添加边界检查
    if (!range || range.left === undefined || range.top === undefined || 
        range.right === undefined || range.bottom === undefined) {
        return found;
    }
    
    if (!this.intersects(range)) {
        return found;
    }
    
    // 检查当前节点的对象
    for (var i = 0; i < this.objects.length; i++) {
        var object = this.objects[i];
        // 确保对象有有效边界
        if (object) {
            var objBounds = this.getObjectBounds(object);
            if (this.rectsIntersect(range, objBounds)) {
                found.push(object);
            }
        }
    }
    
    // 递归检查子节点
    if (this.isDivided) {
        for (var j = 0; j < this.children.length; j++) {
            var child = this.children[j];
            child.query(range, found);
        }
    }
    
    return found;
};

// 检查两个矩形是否相交
QuadTreeNode.prototype.rectsIntersect = function(rect1, rect2) {
    return !(rect1.right <= rect2.left || 
             rect1.left >= rect2.right || 
             rect1.bottom <= rect2.top || 
             rect1.top >= rect2.bottom);
};

// 检查查询范围是否与节点相交
QuadTreeNode.prototype.intersects = function(range) {
    return !(range.right <= this.x || 
             range.left >= this.x + this.width || 
             range.bottom <= this.y || 
             range.top >= this.y + this.height);
};

// 清空节点
QuadTreeNode.prototype.clear = function() {
    this.objects = [];
    this.children = null;
    this.isDivided = false;
};

// 移除对象
QuadTreeNode.prototype.remove = function(object) {
    var index = this.objects.indexOf(object);
    if (index > -1) {
        this.objects.splice(index, 1);
        return true;
    }
    
    if (this.isDivided) {
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            if (child.remove(object)) {
                return true;
            }
        }
    }
    
    return false;
};

// 四叉树碰撞检测系统
var CollisionSystem = {
    // 四叉树实例
    staticQuadTree: null,    // 静态四叉树（建筑物）
    dynamicQuadTree: null,   // 动态四叉树（人物、僵尸）
    
    // 当前地图配置
    currentMap: null,
    
    // 地图配置集合
    maps: {
        // 主地图：8x8网格，建筑物750x750，街道500像素
        'main': {
            name: '主地图',
            type: 'grid',
            blockSize: 750,
            streetWidth: 500,
            gridSize: 1250,      // 750 + 500
            gridCols: 8,
            gridRows: 8,
            mapWidth: 10000,     // 8 * 1250
            mapHeight: 10000,
            buildingTypes: ['民房', '别墅', '医院', '商店', '学校', '警察局']
        },
        
        // 子地图配置保持不变...
        'submap1': {
            name: '子地图1',
            type: 'irregular',
            mapWidth: 6000,
            mapHeight: 6000,
            buildings: [
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
            mapId = 'main';
        }
        
        if (!this.maps[mapId]) {
            console.error('未知地图ID:', mapId);
            return false;
        }
        
        this.currentMap = this.maps[mapId];
        
        // 临时启用调试模式，禁用建筑物碰撞检测
        this.debugMode = true;
        console.log('调试模式已启用，建筑物碰撞检测已禁用');
        
        // 初始化静态四叉树（建筑物）
        this.initStaticQuadTree();
        
        // 初始化动态四叉树（人物、僵尸）
        this.initDynamicQuadTree();
        
        console.log('四叉树碰撞检测系统初始化完成');
        console.log('当前地图:', this.currentMap.name);
        console.log('地图类型:', this.currentMap.type);
        
        return true;
    },
    
    // 初始化静态四叉树
    initStaticQuadTree: function() {
        var mapWidth = this.currentMap.mapWidth;
        var mapHeight = this.currentMap.mapHeight;
        
        // 静态四叉树：最大深度4层，每节点最多5个对象
        this.staticQuadTree = new QuadTreeNode(0, 0, mapWidth, mapHeight, 4, 0);
        this.staticQuadTree.maxObjects = 5;
        
        // 插入建筑物
        this.insertBuildingsToStaticTree();
        
        console.log('静态四叉树初始化完成，地图尺寸:', mapWidth, 'x', mapHeight);
    },
    
    // 初始化动态四叉树
    initDynamicQuadTree: function() {
        var mapWidth = this.currentMap.mapWidth;
        var mapHeight = this.currentMap.mapHeight;
        
        // 动态四叉树：最大深度6层，每节点最多8个对象
        this.dynamicQuadTree = new QuadTreeNode(0, 0, mapWidth, mapHeight, 6, 0);
        this.dynamicQuadTree.maxObjects = 8;
    },
    
    // 将建筑物插入静态四叉树
    insertBuildingsToStaticTree: function() {
        if (this.currentMap.type === 'grid') {
            this.insertGridBuildings();
        } else if (this.currentMap.type === 'irregular') {
            this.insertIrregularBuildings();
        }
    },
    
    // 插入网格建筑物
    insertGridBuildings: function() {
        var blockSize = this.currentMap.blockSize;
        var gridSize = this.currentMap.gridSize;
        var streetWidth = this.currentMap.streetWidth;
        var cols = this.currentMap.gridCols;
        var rows = this.currentMap.gridRows;
        
        console.log('开始插入网格建筑物，配置:', {
            blockSize: blockSize,
            gridSize: gridSize,
            streetWidth: streetWidth,
            cols: cols,
            rows: rows
        });
        
        for (var col = 0; col < cols; col++) {
            for (var row = 0; row < rows; row++) {
                // 建筑物位置：每个网格的中心放置建筑物
                var buildingX = col * gridSize + streetWidth / 2;
                var buildingY = row * gridSize + streetWidth / 2;
                
                var building = {
                    x: buildingX,
                    y: buildingY,
                    width: blockSize,
                    height: blockSize,
                    type: this.currentMap.buildingTypes[Math.floor(Math.random() * this.currentMap.buildingTypes.length)],
                    gridCol: col,
                    gridRow: row,
                    bounds: {
                        left: buildingX,
                        right: buildingX + blockSize,
                        top: buildingY,
                        bottom: buildingY + blockSize
                    }
                };
                
                this.staticQuadTree.insert(building);
                
                // 调试信息：显示第一个建筑物的位置
                if (col === 0 && row === 0) {
                    console.log('第一个建筑物:', building);
                    console.log('街道中心位置 (应该不在建筑物内):', 
                        buildingX - streetWidth/2, buildingY - streetWidth/2);
                }
            }
        }
        
        console.log('网格建筑物插入完成，建筑物尺寸:', blockSize, '街道宽度:', streetWidth, '网格大小:', gridSize);
    },
    
    // 插入不规则建筑物
    insertIrregularBuildings: function() {
        if (!this.currentMap.buildings) return;
        
        for (var i = 0; i < this.currentMap.buildings.length; i++) {
            var building = this.currentMap.buildings[i];
            // 为每个建筑物添加边界信息
            building.bounds = {
                left: building.x,
                right: building.x + building.width,
                top: building.y,
                bottom: building.y + building.height
            };
            
            this.staticQuadTree.insert(building);
        }
    },
    
    // 重建动态四叉树（每帧调用）
    rebuildDynamicQuadTree: function(characters, zombies) {
        if (!this.dynamicQuadTree) return;
        
        // 清空动态四叉树
        this.dynamicQuadTree.clear();
        
        // 插入人物
        if (characters) {
            for (var i = 0; i < characters.length; i++) {
                var character = characters[i];
                if (character && character.x !== undefined && character.y !== undefined) {
                    this.dynamicQuadTree.insert(character);
                }
            }
        }
        
        // 插入僵尸
        if (zombies) {
            for (var j = 0; j < zombies.length; j++) {
                var zombie = zombies[j];
                if (zombie && zombie.x !== undefined && zombie.y !== undefined) {
                    this.dynamicQuadTree.insert(zombie);
                }
            }
        }
    },
    
    // 检测点是否在建筑物内
    isPointInBuilding: function(x, y) {
        if (this.debugMode) {
            return false;
        }
        
        if (!this.staticQuadTree) {
            console.warn('静态四叉树未初始化');
            return false;
        }
        
        // 边界检查：超出地图边界视为在建筑物内
        if (x < 0 || y < 0 || x >= this.currentMap.mapWidth || y >= this.currentMap.mapHeight) {
            return true;
        }
        
        var point = { x: x, y: y };
        var range = { left: x, right: x, top: y, bottom: y };
        
        // 查询附近的建筑物
        var nearbyBuildings = this.staticQuadTree.query(range);
        
        // 检查点是否在任何建筑物内
        for (var i = 0; i < nearbyBuildings.length; i++) {
            var building = nearbyBuildings[i];
            if (x >= building.x && x < building.x + building.width &&
                y >= building.y && y < building.y + building.height) {
                return true;
            }
        }
        
        return false;
    },
    
    // 检测矩形是否与建筑物重叠
    isRectInBuilding: function(rectX, rectY, rectWidth, rectHeight) {
        if (this.debugMode) {
            return false;
        }
        
        if (!this.staticQuadTree) return false;
        
        var range = {
            left: rectX,
            right: rectX + rectWidth,
            top: rectY,
            bottom: rectY + rectHeight
        };
        
        // 查询附近的建筑物
        var nearbyBuildings = this.staticQuadTree.query(range);
        
        // 检查矩形是否与任何建筑物重叠
        for (var i = 0; i < nearbyBuildings.length; i++) {
            var building = nearbyBuildings[i];
            if (this.rectsIntersect(range, building.bounds || {
                left: building.x,
                right: building.x + building.width,
                top: building.y,
                bottom: building.y + building.height
            })) {
                return true;
            }
        }
        
        return false;
    },
    
    // 检测对象中心点是否在建筑物内
    isObjectInBuilding: function(centerX, centerY, objectWidth, objectHeight) {
        var objectLeft = centerX - objectWidth / 2;
        var objectTop = centerY - objectHeight / 2;
        
        return this.isRectInBuilding(objectLeft, objectTop, objectWidth, objectHeight);
    },
    
    // 检测两个矩形是否相交
    rectsIntersect: function(rect1, rect2) {
        return !(rect1.right <= rect2.left || 
                 rect1.left >= rect2.right || 
                 rect1.bottom <= rect2.top || 
                 rect1.top >= rect2.bottom);
    },
    
    // 获取平滑的移动位置（智能碰撞响应）
    getSmoothMovePosition: function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查目标位置是否安全
        if (!this.isObjectInBuilding(toX, toY, objectWidth, objectHeight)) {
            return { x: toX, y: toY };
        }
        
        // 计算移动向量
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance === 0) {
            return { x: fromX, y: fromY };
        }
        
        // 尝试多个距离的移动，找到最远的可行位置
        var testDistances = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
        
        for (var i = 0; i < testDistances.length; i++) {
            var testDistance = testDistances[i];
            var testX = fromX + deltaX * testDistance;
            var testY = fromY + deltaY * testDistance;
            
            // 添加边界检查
            if (testX >= 0 && testX < this.currentMap.mapWidth && 
                testY >= 0 && testY < this.currentMap.mapHeight) {
                
                if (!this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
                    return { x: testX, y: testY };
                }
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
    
    // 获取有效的移动位置
    getValidMovePosition: function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查目标位置是否安全
        if (!this.isObjectInBuilding(toX, toY, objectWidth, objectHeight)) {
            return { x: toX, y: toY };
        }
        
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
        
        return { x: newX, y: newY };
    },
    
    // 寻找最近的可行位置
    findNearestSafePosition: function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance === 0) {
            return { x: fromX, y: fromY };
        }
        
        // 尝试8个方向的移动
        var directions = [
            { x: 1, y: 0 },      // 右
            { x: -1, y: 0 },     // 左
            { x: 0, y: 1 },      // 下
            { x: 0, y: -1 },     // 上
            { x: 0.7, y: 0.7 },  // 右下
            { x: -0.7, y: 0.7 }, // 左下
            { x: 0.7, y: -0.7 }, // 右上
            { x: -0.7, y: -0.7 } // 左上
        ];
        
        var moveDistance = Math.min(distance, 50);
        
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var testX = fromX + dir.x * moveDistance;
            var testY = fromY + dir.y * moveDistance;
            
            // 添加边界检查
            if (testX >= 0 && testX < this.currentMap.mapWidth && 
                testY >= 0 && testY < this.currentMap.mapHeight) {
                
                if (!this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
                    return { x: testX, y: testY };
                }
            }
        }
        
        return { x: fromX, y: fromY };
    },
    
    // 检测对象与对象列表的碰撞（使用四叉树优化）
    isObjectOverlappingWithList: function(objX, objY, objWidth, objHeight, objectList) {
        if (!objectList || objectList.length === 0 || !this.dynamicQuadTree) {
            return false;
        }
        
        // 计算查询范围
        var range = {
            left: objX - objWidth / 2,
            right: objX + objWidth / 2,
            top: objY - objHeight / 2,
            bottom: objY + objHeight / 2
        };
        
        // 查询附近的动态对象
        var nearbyObjects = this.dynamicQuadTree.query(range);
        
        // 检查是否与任何对象重叠
        for (var i = 0; i < nearbyObjects.length; i++) {
            var otherObj = nearbyObjects[i];
            if (otherObj && otherObj.x !== undefined && otherObj.y !== undefined) {
                var otherWidth = otherObj.width || 32;
                var otherHeight = otherObj.height || 32;
                
                if (this.isObjectsOverlapping(objX, objY, objWidth, objHeight,
                                            otherObj.x, otherObj.y, otherWidth, otherHeight)) {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // 检测两个对象是否重叠
    isObjectsOverlapping: function(obj1X, obj1Y, obj1Width, obj1Height, 
                                   obj2X, obj2Y, obj2Width, obj2Height) {
        var obj1Left = obj1X - obj1Width / 2;
        var obj1Right = obj1X + obj1Width / 2;
        var obj1Top = obj1Y - obj1Height / 2;
        var obj1Bottom = obj1Y + obj1Height / 2;
        
        var obj2Left = obj2X - obj2Width / 2;
        var obj2Right = obj2X + obj2Width / 2;
        var obj2Top = obj2Y - obj2Height / 2;
        var obj2Bottom = obj2Y + obj2Height / 2;
        
        return !(obj1Right < obj2Left || obj1Left > obj2Right || 
                 obj1Bottom < obj2Top || obj1Top > obj2Bottom);
    },
    
    // 获取避免重叠的移动位置
    getNonOverlappingPosition: function(fromX, fromY, toX, toY, objectWidth, objectHeight, 
                                       avoidObjects, buildingCollision) {
        // 首先检查建筑物碰撞
        if (buildingCollision && this.isObjectInBuilding(toX, toY, objectWidth, objectHeight)) {
            var buildingSafePos = this.getSmoothMovePosition(fromX, fromY, toX, toY, objectWidth, objectHeight);
            toX = buildingSafePos.x;
            toY = buildingSafePos.y;
        }
        
        // 检查是否与对象重叠
        if (!this.isObjectOverlappingWithList(toX, toY, objectWidth, objectHeight, avoidObjects)) {
            return { x: toX, y: toY };
        }
        
        // 如果重叠，尝试寻找不重叠的位置
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance === 0) {
            return { x: fromX, y: fromY };
        }
        
        // 尝试多个距离的移动
        var testDistances = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
        
        for (var i = 0; i < testDistances.length; i++) {
            var testDistance = testDistances[i];
            var testX = fromX + deltaX * testDistance;
            var testY = fromY + deltaY * testDistance;
            
            var buildingOk = !buildingCollision || !this.isObjectInBuilding(testX, testY, objectWidth, objectHeight);
            var overlapOk = !this.isObjectOverlappingWithList(testX, testY, objectWidth, objectHeight, avoidObjects);
            
            if (buildingOk && overlapOk) {
                return { x: testX, y: testY };
            }
        }
        
        // 如果还是重叠，尝试8个方向寻找位置
        var directions = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 0.7, y: 0.7 }, { x: -0.7, y: 0.7 }, { x: 0.7, y: -0.7 }, { x: -0.7, y: -0.7 }
        ];
        
        var moveDistance = Math.min(distance, 30);
        
        for (var j = 0; j < directions.length; j++) {
            var dir = directions[j];
            var testX = fromX + dir.x * moveDistance;
            var testY = fromY + dir.y * moveDistance;
            
            var buildingOk = !buildingCollision || !this.isObjectInBuilding(testX, testY, objectWidth, objectHeight);
            var overlapOk = !this.isObjectOverlappingWithList(testX, testY, objectWidth, objectHeight, avoidObjects);
            
            if (buildingOk && overlapOk) {
                return { x: testX, y: testY };
            }
        }
        
        return { x: fromX, y: fromY };
    },
    
    // 寻找安全的生成位置
    findSafePosition: function(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight) {
        console.log('寻找安全位置，中心:', centerX, centerY, '对象尺寸:', objectWidth, objectHeight);
        
        // 首先尝试在街道上寻找位置
        if (this.currentMap.type === 'grid') {
            var safePos = this.findSafePositionInStreets(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight);
            if (safePos) {
                console.log('在街道上找到安全位置:', safePos);
                return safePos;
            }
        }
        
        // 如果街道上没有找到，尝试随机位置
        for (var attempt = 0; attempt < 200; attempt++) {
            var angle = Math.random() * Math.PI * 2;
            var distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            var testX = centerX + Math.cos(angle) * distance;
            var testY = centerY + Math.sin(angle) * distance;
            
            // 确保位置在地图范围内
            if (testX >= 0 && testX < this.currentMap.mapWidth && 
                testY >= 0 && testY < this.currentMap.mapHeight) {
                
                if (!this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
                    console.log('找到随机安全位置:', testX, testY, '尝试次数:', attempt + 1);
                    return { x: testX, y: testY };
                }
            }
        }
        
        // 如果还是找不到，尝试在地图边缘寻找
        var edgePositions = [
            { x: 100, y: 100 },
            { x: this.currentMap.mapWidth - 100, y: 100 },
            { x: 100, y: this.currentMap.mapHeight - 100 },
            { x: this.currentMap.mapWidth - 100, y: this.currentMap.mapHeight - 100 }
        ];
        
        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (!this.isObjectInBuilding(edgePos.x, edgePos.y, objectWidth, objectHeight)) {
                console.log('在地图边缘找到安全位置:', edgePos);
                return edgePos;
            }
        }
        
        console.warn('无法找到安全位置，使用默认位置');
        return { x: 100, y: 100 };
    },
    
    // 在街道上寻找安全位置
    findSafePositionInStreets: function(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight) {
        if (this.currentMap.type !== 'grid') return null;
        
        var gridSize = this.currentMap.gridSize;
        var streetWidth = this.currentMap.streetWidth;
        var cols = this.currentMap.gridCols;
        var rows = this.currentMap.gridRows;
        
        // 尝试在街道交叉点附近寻找位置
        var streetPositions = [];
        
        for (var col = 0; col <= cols; col++) {
            for (var row = 0; row <= rows; row++) {
                var streetX = col * gridSize;
                var streetY = row * gridSize;
                
                // 检查街道位置是否安全
                if (!this.isObjectInBuilding(streetX, streetY, objectWidth, objectHeight)) {
                    var distance = Math.sqrt(Math.pow(streetX - centerX, 2) + Math.pow(streetY - centerY, 2));
                    if (distance >= minDistance && distance <= maxDistance) {
                        streetPositions.push({
                            x: streetX,
                            y: streetY,
                            distance: distance
                        });
                    }
                }
            }
        }
        
        // 按距离排序，返回最近的安全位置
        if (streetPositions.length > 0) {
            streetPositions.sort(function(a, b) {
                return a.distance - b.distance;
            });
            
            return { x: streetPositions[0].x, y: streetPositions[0].y };
        }
        
        return null;
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
    
    // 获取当前地图信息
    getCurrentMapInfo: function() {
        return this.currentMap;
    },
    
    // 获取所有地图配置
    getAllMaps: function() {
        return this.maps;
    },
    
    // 获取指定位置的建筑物信息
    getBuildingAtPosition: function(x, y) {
        if (!this.staticQuadTree) return null;
        
        var range = { left: x, right: x, top: y, bottom: y };
        var nearbyBuildings = this.staticQuadTree.query(range);
        
        for (var i = 0; i < nearbyBuildings.length; i++) {
            var building = nearbyBuildings[i];
            if (x >= building.x && x < building.x + building.width &&
                y >= building.y && y < building.y + building.height) {
                return building;
            }
        }
        
        return null;
    },
    
    // 测试碰撞检测系统
    testCollisionSystem: function() {
        console.log('=== 测试四叉树碰撞检测系统 ===');
        
        // 测试地图布局
        console.log('当前地图配置:', this.currentMap);
        if (this.staticQuadTree) {
            console.log('静态四叉树已初始化');
            var stats = this.getPerformanceStats();
            console.log('四叉树统计:', stats);
        } else {
            console.log('静态四叉树未初始化');
        }
        
        // 测试街道位置（应该不在建筑物内）
        var streetTestX = 625; // 第一个网格中心，应该是街道
        var streetTestY = 625;
        var streetTest = this.isPointInBuilding(streetTestX, streetTestY);
        console.log('测试街道位置 (625, 625):', streetTest, '应该为false');
        
        // 测试建筑物位置（应该在建筑物内）
        var buildingTestX = 1125; // 第一个建筑物中心
        var buildingTestY = 1125;
        var buildingTest = this.isPointInBuilding(buildingTestX, buildingTestY);
        console.log('测试建筑物位置 (1125, 1125):', buildingTest, '应该为true');
        
        // 测试对象碰撞
        var testBuilding = this.isObjectInBuilding(1000, 1000, 32, 32);
        console.log('测试建筑物碰撞 (1000, 1000):', testBuilding);
        
        // 测试对象重叠
        var testOverlap = this.isObjectsOverlapping(100, 100, 32, 32, 120, 120, 32, 32);
        console.log('测试对象重叠:', testOverlap);
        
        // 测试移动路径验证
        if (this.isMovePathValid) {
            var pathTest1 = this.isMovePathValid(625, 625, 1875, 625, 32, 48); // 街道到街道
            var pathTest2 = this.isMovePathValid(625, 625, 1125, 1125, 32, 48); // 街道到建筑物
            console.log('移动路径测试 - 街道到街道:', pathTest1, '应该为true');
            console.log('移动路径测试 - 街道到建筑物:', pathTest2, '应该为false');
        }
        
        console.log('=== 四叉树碰撞检测系统测试完成 ===');
    },
    
    // 性能统计
    getPerformanceStats: function() {
        if (!this.staticQuadTree || !this.dynamicQuadTree) {
            return { error: '四叉树未初始化' };
        }
        
        return {
            staticTreeDepth: this.getTreeDepth(this.staticQuadTree),
            dynamicTreeDepth: this.getTreeDepth(this.dynamicQuadTree),
            staticTreeNodes: this.countTreeNodes(this.staticQuadTree),
            dynamicTreeNodes: this.countTreeNodes(this.dynamicQuadTree)
        };
    },
    
    // 获取树的深度
    getTreeDepth: function(node) {
        if (!node) return 0;
        if (!node.isDivided) return 1;
        
        var maxDepth = 1;
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            maxDepth = Math.max(maxDepth, this.getTreeDepth(child) + 1);
        }
        return maxDepth;
    },
    
    // 计算树的节点数量
    countTreeNodes: function(node) {
        if (!node) return 0;
        
        var count = 1;
        if (node.isDivided) {
            for (var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                count += this.countTreeNodes(child);
            }
        }
        return count;
    },
    
    // 僵尸紧急分离算法（防止僵尸重叠卡死）
    emergencySeparation: function(zombies, characters) {
        if (!zombies || zombies.length === 0) return;
        
        var separationForce = 2.0; // 分离力强度
        var separationRadius = 40;  // 分离检测半径
        
        for (var i = 0; i < zombies.length; i++) {
            var zombie = zombies[i];
            if (!zombie || zombie.hp <= 0) continue;
            
            var separationX = 0;
            var separationY = 0;
            var neighborCount = 0;
            
            // 检测附近的僵尸
            var range = {
                left: zombie.x - separationRadius,
                right: zombie.x + separationRadius,
                top: zombie.y - separationRadius,
                bottom: zombie.y + separationRadius
            };
            
            if (this.dynamicQuadTree) {
                var nearbyObjects = this.dynamicQuadTree.query(range);
                
                for (var j = 0; j < nearbyObjects.length; j++) {
                    var otherObj = nearbyObjects[j];
                    if (otherObj === zombie || !otherObj || otherObj.hp <= 0) continue;
                    
                    var distance = Math.sqrt(
                        Math.pow(zombie.x - otherObj.x, 2) + 
                        Math.pow(zombie.y - otherObj.y, 2)
                    );
                    
                    if (distance > 0 && distance < separationRadius) {
                        // 计算分离向量
                        var angle = Math.atan2(zombie.y - otherObj.y, zombie.x - otherObj.x);
                        var force = (separationRadius - distance) / separationRadius;
                        
                        separationX += Math.cos(angle) * force * separationForce;
                        separationY += Math.sin(angle) * force * separationForce;
                        neighborCount++;
                    }
                }
            }
            
            // 应用分离力
            if (neighborCount > 0) {
                separationX /= neighborCount;
                separationY /= neighborCount;
                
                // 检查分离后的位置是否安全
                var newX = zombie.x + separationX;
                var newY = zombie.y + separationY;
                
                if (!this.isObjectInBuilding(newX, newY, zombie.width || 32, zombie.height || 32)) {
                    zombie.x = newX;
                    zombie.y = newY;
                }
            }
        }
    },
    
    // 获取僵尸的有效移动位置（避免与建筑物、其他僵尸和人物重叠）
    getZombieValidMovePosition: function(zombie, toX, toY, allZombies, allCharacters) {
        var zombieWidth = zombie.width || 32;
        var zombieHeight = zombie.height || 32;
        
        // 首先检查目标位置是否在建筑物内
        if (this.isObjectInBuilding(toX, toY, zombieWidth, zombieHeight)) {
            console.log('僵尸目标位置在建筑物内，寻找替代路径');
            
            // 尝试寻找绕行路径
            var alternativePath = this.findZombieAlternativePath(zombie, toX, toY, zombieWidth, zombieHeight);
            if (alternativePath) {
                toX = alternativePath.x;
                toY = alternativePath.y;
            } else {
                // 如果找不到替代路径，返回原位置
                return { x: zombie.x, y: zombie.y };
            }
        }
        
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
    
    // 为僵尸寻找替代路径（绕行建筑物）
    findZombieAlternativePath: function(zombie, targetX, targetY, zombieWidth, zombieHeight) {
        var fromX = zombie.x;
        var fromY = zombie.y;
        var deltaX = targetX - fromX;
        var deltaY = targetY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance === 0) return null;
        
        // 尝试多个方向的绕行
        var directions = [
            { x: 1, y: 0 },      // 右
            { x: -1, y: 0 },     // 左
            { x: 0, y: 1 },      // 下
            { x: 0, y: -1 },     // 上
            { x: 0.7, y: 0.7 },  // 右下
            { x: -0.7, y: 0.7 }, // 左下
            { x: 0.7, y: -0.7 }, // 右上
            { x: -0.7, y: -0.7 } // 左上
        ];
        
        var moveDistance = Math.min(distance, 100); // 限制绕行距离
        
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var testX = fromX + dir.x * moveDistance;
            var testY = fromY + dir.y * moveDistance;
            
            // 检查这个位置是否安全
            if (!this.isObjectInBuilding(testX, testY, zombieWidth, zombieHeight)) {
                // 检查从当前位置到这个位置的路径是否安全
                if (this.isMovePathValid(fromX, fromY, testX, testY, zombieWidth, zombieHeight)) {
                    console.log('僵尸找到替代路径:', testX, testY, '方向:', dir);
                    return { x: testX, y: testY };
                }
            }
        }
        
        return null;
    },
    
    // 检测僵尸与僵尸之间的碰撞
    isZombieOverlappingWithZombies: function(zombieX, zombieY, zombieWidth, zombieHeight, allZombies, excludeZombieId) {
        if (!allZombies || allZombies.length === 0 || !this.dynamicQuadTree) {
            return false;
        }
        
        var range = {
            left: zombieX - zombieWidth / 2,
            right: zombieX + zombieWidth / 2,
            top: zombieY - zombieHeight / 2,
            bottom: zombieY + zombieHeight / 2
        };
        
        var nearbyObjects = this.dynamicQuadTree.query(range);
        
        for (var i = 0; i < nearbyObjects.length; i++) {
            var otherObj = nearbyObjects[i];
            if (otherObj && otherObj.id !== excludeZombieId && otherObj.type && otherObj.type.includes('zombie')) {
                var otherWidth = otherObj.width || 32;
                var otherHeight = otherObj.height || 32;
                
                if (this.isObjectsOverlapping(zombieX, zombieY, zombieWidth, zombieHeight,
                                            otherObj.x, otherObj.y, otherWidth, otherHeight)) {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // 检测僵尸与人物之间的碰撞
    isZombieOverlappingWithCharacters: function(zombieX, zombieY, zombieWidth, zombieHeight, allCharacters) {
        if (!allCharacters || allCharacters.length === 0 || !this.dynamicQuadTree) {
            return false;
        }
        
        var range = {
            left: zombieX - zombieWidth / 2,
            right: zombieX + zombieWidth / 2,
            top: zombieY - zombieHeight / 2,
            bottom: zombieY + zombieHeight / 2
        };
        
        var nearbyObjects = this.dynamicQuadTree.query(range);
        
        for (var i = 0; i < nearbyObjects.length; i++) {
            var otherObj = nearbyObjects[i];
            if (otherObj && otherObj.role && otherObj.role !== undefined) { // 人物对象有role属性
                var charWidth = otherObj.width || 32;
                var charHeight = otherObj.height || 48;
                
                if (this.isObjectsOverlapping(zombieX, zombieY, zombieWidth, zombieHeight,
                                            otherObj.x, otherObj.y, charWidth, charHeight)) {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // 检测移动路径是否有效（支持部分移动）
    isMovePathValid: function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查起点和终点
        if (this.isObjectInBuilding(fromX, fromY, objectWidth, objectHeight)) {
            console.log('起点在建筑物内:', fromX, fromY);
            return false;
        }
        
        if (this.isObjectInBuilding(toX, toY, objectWidth, objectHeight)) {
            console.log('终点在建筑物内:', toX, toY);
            return false;
        }
        
        // 检查路径中间点（更密集的检查，确保不会穿越建筑物）
        var steps = Math.max(5, Math.floor(Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2)) / 10));
        for (var i = 1; i < steps; i++) {
            var t = i / steps;
            var testX = fromX + (toX - fromX) * t;
            var testY = fromY + (toY - fromY) * t;
            
            if (this.isObjectInBuilding(testX, testY, objectWidth, objectHeight)) {
                console.log('路径中间点在建筑物内:', testX, testY, '步骤:', i, '总步骤:', steps);
                return false;
            }
        }
        
        return true;
    },
    
    // 获取碰撞检测性能统计
    getCollisionPerformanceStats: function() {
        var stats = this.getPerformanceStats();
        
        // 添加碰撞检测统计
        stats.collisionTests = this.collisionTestCount || 0;
        stats.quadTreeQueries = this.quadTreeQueryCount || 0;
        stats.averageQueryTime = this.averageQueryTime || 0;
        
        return stats;
    },
    
    // 重置性能统计
    resetPerformanceStats: function() {
        this.collisionTestCount = 0;
        this.quadTreeQueryCount = 0;
        this.queryTimeSum = 0;
        this.queryCount = 0;
        this.averageQueryTime = 0;
    },
    
    // 记录查询时间（用于性能监控）
    recordQueryTime: function(queryTime) {
        this.queryTimeSum += queryTime;
        this.queryCount++;
        this.averageQueryTime = this.queryTimeSum / this.queryCount;
    },
    
    // 切换调试模式
    toggleDebugMode: function() {
        this.debugMode = !this.debugMode;
        console.log('调试模式:', this.debugMode ? '已启用' : '已禁用');
        if (this.debugMode) {
            console.log('建筑物碰撞检测已禁用');
        } else {
            console.log('建筑物碰撞检测已启用');
        }
        return this.debugMode;
    },
    
    // 获取调试模式状态
    getDebugMode: function() {
        return this.debugMode || false;
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollisionSystem;
} else if (typeof window !== 'undefined') {
    window.CollisionSystem = CollisionSystem;
}

