/**
 * 优化版碰撞检测系统 (collision-optimized.js)
 *
 * 优化内容：
 * - 四叉树只负责空间索引和碰撞检测
 * - 移除对象管理职责，避免与对象池重叠
 * - 专注于建筑物碰撞检测和空间查询
 * - 简化代码结构，提高性能
 */

// 四叉树节点类（核心功能）
function QuadTreeNode(x, y, width, height, maxDepth, currentDepth) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
    this.maxDepth = maxDepth || 4;
    this.currentDepth = currentDepth || 0;

    this.objects = [];        // 存储的对象引用（不管理生命周期）
    this.maxObjects = 8;      // 最大对象数量
    this.children = null;     // 子节点
    this.isDivided = false;   // 是否已分割
}

// 获取节点边界
QuadTreeNode.prototype.getBounds = function () {
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
QuadTreeNode.prototype.containsObject = function (object) {
    var bounds = this.getBounds();
    var objBounds = this.getObjectBounds(object);

    return !(objBounds.right < bounds.x || objBounds.left > bounds.right ||
        objBounds.bottom < bounds.y || objBounds.top > bounds.bottom);
};

// 获取对象边界
QuadTreeNode.prototype.getObjectBounds = function (object) {
    if (!object) {
        return {left: 0, right: 0, top: 0, bottom: 0};
    }

    if (object.bounds) {
        return object.bounds;
    }

    // 统一使用中心点计算边界
    var x = (object.x !== undefined && object.x !== null) ? object.x : 0;
    var y = (object.y !== undefined && object.y !== null) ? object.y : 0;
    var width = (object.width !== undefined && object.width !== null) ? object.width : 32;
    var height = (object.height !== undefined && object.height !== null) ? object.height : 48;

    return {
        left: x - width / 2,
        right: x + width / 2,
        top: y - height / 2,
        bottom: y + height / 2
    };
};

// 分割节点
QuadTreeNode.prototype.subdivide = function () {
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
QuadTreeNode.prototype.insert = function (object) {
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
QuadTreeNode.prototype.query = function (range, found) {
    if (!found) found = [];

    if (!range || !this.intersects(range)) {
        return found;
    }

    // 检查当前节点的对象
    for (var i = 0; i < this.objects.length; i++) {
        var object = this.objects[i];
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
QuadTreeNode.prototype.rectsIntersect = function (rect1, rect2) {
    return !(rect1.right <= rect2.left || rect1.left >= rect2.right ||
        rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
};

// 检查查询范围是否与节点相交
QuadTreeNode.prototype.intersects = function (range) {
    return !(range.right <= this.x || range.left >= this.x + this.width ||
        range.bottom <= this.y || range.top >= this.y + this.height);
};

// 清空节点
QuadTreeNode.prototype.clear = function () {
    this.objects = [];
    this.children = null;
    this.isDivided = false;
};

// 移除对象
QuadTreeNode.prototype.remove = function (object) {
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

// 获取所有对象
QuadTreeNode.prototype.getAllObjects = function () {
    var allObjects = [];
    allObjects = allObjects.concat(this.objects);

    if (this.isDivided) {
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            var childObjects = child.getAllObjects();
            allObjects = allObjects.concat(childObjects);
        }
    }

    return allObjects;
};

// 优化的碰撞检测系统
var CollisionSystem = {
    // 四叉树实例
    staticQuadTree: null,    // 静态四叉树（建筑物）
    // 🔴 重构：四叉树只存储ID和位置，不存储对象引用
    // 动态对象四叉树（只存储ID和位置信息）
    dynamicQuadTree: null,
    
    // 🔴 新增：对象ID到位置的映射表
    objectPositions: new Map(), // Map<objectId, {x, y, width, height}>
    
    // 🔴 新增：对象ID到类型的映射表
    objectTypes: new Map(), // Map<objectId, objectType>
    
    // 当前地图配置
    currentMap: null,
    mapManager: null,

    // 简化的工具函数
    calculateDistance: function (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    isWithinMapBounds: function (x, y) {
        var mapDimensions = this.getCurrentMapDimensions();
        return x >= 0 && x < mapDimensions.width && y >= 0 && y < mapDimensions.height;
    },

    // 🔴 重构：添加对象到空间索引（只存储ID和位置）
    addToSpatialIndex: function(object) {
        if (!object || !object.id) {
            console.warn('addToSpatialIndex: 对象无效或缺少ID');
            return false;
        }
        
        // 存储对象位置信息
        this.objectPositions.set(object.id, {
            x: object.x,
            y: object.y,
            width: object.width || 32,
            height: object.height || 32
        });
        
        // 存储对象类型
        this.objectTypes.set(object.id, object.type || object.constructor.name);
        
        // 添加到四叉树（如果可用）
        if (this.dynamicQuadTree) {
            this.dynamicQuadTree.insert({
                id: object.id,
                x: object.x,
                y: object.y,
                width: object.width || 32,
                height: object.height || 32
            });
        }
        
        console.log('✅ 对象已添加到空间索引:', object.id, '位置:', object.x, object.y);
        return true;
    },
    
    // 🔴 重构：从空间索引移除对象
    removeFromSpatialIndex: function(object) {
        if (!object || !object.id) {
            console.warn('removeFromSpatialIndex: 对象无效或缺少ID');
            return false;
        }
        
        // 从映射表移除
        this.objectPositions.delete(object.id);
        this.objectTypes.delete(object.id);
        
        // 从四叉树移除（如果可用）
        if (this.dynamicQuadTree) {
            this.dynamicQuadTree.remove({
                id: object.id,
                x: object.x,
                y: object.y,
                width: object.width || 32,
                height: object.height || 32
            });
        }
        
        console.log('✅ 对象已从空间索引移除:', object.id);
        return true;
    },
    
    // 🔴 重构：更新对象位置
    updateObjectPosition: function(object) {
        if (!object || !object.id) {
            console.warn('updateObjectPosition: 对象无效或缺少ID');
            return false;
        }
        
        // 更新位置信息
        this.objectPositions.set(object.id, {
            x: object.x,
            y: object.y,
            width: object.width || 32,
            height: object.height || 32
        });
        
        // 更新四叉树（如果可用）
        if (this.dynamicQuadTree) {
            this.dynamicQuadTree.update({
                id: object.id,
                x: object.x,
                y: object.y,
                width: object.width || 32,
                height: object.height || 32
            });
        }
        
        return true;
    },
    
    // 🔴 重构：获取指定范围内的对象ID
    getObjectsInRange: function(x, y, radius) {
        if (!this.dynamicQuadTree) {
            return [];
        }
        
        var bounds = {
            x: x - radius,
            y: y - radius,
            width: radius * 2,
            height: radius * 2
        };
        
        var objectsInRange = this.dynamicQuadTree.retrieve(bounds);
        return objectsInRange.map(obj => obj.id);
    },
    
    // 🔴 重构：简单的移动碰撞检测方法
    getCircleSafeMovePosition: function (fromX, fromY, toX, toY, radius) {
        if (!this.staticQuadTree) {
            return {x: toX, y: toY};
        }
        
        // 简单的直线移动碰撞检测
        var dx = toX - fromX;
        var dy = toY - fromY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return {x: fromX, y: fromY};
        }
        
        // 检查目标位置是否与建筑物碰撞
        if (this.isCircleCollidingWithBuildings(toX, toY, radius)) {
            // 如果目标位置有碰撞，尝试在路径上找安全位置
            var stepSize = radius / 2;
            var steps = Math.ceil(distance / stepSize);
            
            for (var i = 1; i <= steps; i++) {
                var ratio = i / steps;
                var testX = fromX + dx * ratio;
                var testY = fromY + dy * ratio;
                
                if (!this.isCircleCollidingWithBuildings(testX, testY, radius)) {
                    return {x: testX, y: testY};
                }
            }
            
            // 如果找不到安全位置，返回起始位置
            return {x: fromX, y: fromY};
        }
        
        return {x: toX, y: toY};
    },

    // 🔴 重构：生成游戏安全位置（简化版本）
    generateGameSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle = true) {
        var radius = isCircle ? objectWidth / 2 : Math.max(objectWidth, objectHeight) / 2;
        
        // 随机位置搜索
        for (var attempt = 0; attempt < 50; attempt++) {
            var angle = Math.random() * Math.PI * 2;
            var distance = minDistance + Math.random() * (maxDistance - minDistance);
            var testX = centerX + Math.cos(angle) * distance;
            var testY = centerY + Math.sin(angle) * distance;
            
            if (this.isWithinMapBounds(testX, testY) && !this.isCircleCollidingWithBuildings(testX, testY, radius)) {
                return {x: testX, y: testY, success: true};
            }
        }
        
        // 备用方案：返回边缘位置
        var edgePositions = [
            {x: 100, y: 100},
            {x: this.currentMap.mapWidth - 100, y: 100},
            {x: 100, y: this.currentMap.mapHeight - 100},
            {x: this.currentMap.mapWidth - 100, y: this.currentMap.mapHeight - 100}
        ];
        
        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (!this.isCircleCollidingWithBuildings(edgePos.x, edgePos.y, radius)) {
                return {x: edgePos.x, y: edgePos.y, success: true};
            }
        }
        
        return {x: centerX, y: centerY, success: false, message: '无法找到安全位置'};
    },

    // 初始化碰撞检测系统
    init: function (mapId) {
        if (!mapId) {
            mapId = 'city';
        }

        console.log('🗺️ 初始化优化版碰撞检测系统，地图ID:', mapId);

        // 🔴 新增：初始化性能优化属性
        this.collisionCache = new Map();
        this.cacheExpiryTime = 100;
        this.lastCacheCleanup = 0;
        this.performanceMode = 'balanced';
        this.performanceStats = {
            totalCollisionChecks: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageCheckTime: 0
        };

        // 获取地图管理器
        if (typeof window !== 'undefined' && window.MapManager) {
            this.mapManager = window.MapManager;
        } else {
            throw new Error('地图管理器不可用');
        }

        // 获取地图配置
        if (this.mapManager && this.mapManager.getMapConfig) {
            try {
                const mapConfig = this.mapManager.getMapConfig(mapId);
                if (mapConfig) {
                    this.currentMap = {
                        name: mapConfig.name,
                        type: 'matrix',
                        mapWidth: mapConfig.width,
                        mapHeight: mapConfig.height,
                        cellSize: mapConfig.cellSize,
                        gridCols: mapConfig.gridCols,
                        gridRows: mapConfig.gridRows
                    };
                    console.log('✅ 地图配置已加载:', this.currentMap);
                } else {
                    throw new Error('地图配置获取失败');
                }
            } catch (error) {
                console.error('❌ 地图配置获取失败:', error);
                throw error;
            }
        } else {
            throw new Error('地图管理器不可用');
        }

        // 初始化四叉树
        this.initStaticQuadTree();
        this.initDynamicQuadTree();

        console.log('✅ 优化版碰撞系统初始化完成');
        return true;
    },

    // 初始化静态四叉树
    initStaticQuadTree: function () {
        var mapWidth = this.currentMap.mapWidth;
        var mapHeight = this.currentMap.mapHeight;

        this.staticQuadTree = new QuadTreeNode(0, 0, mapWidth, mapHeight, 4, 0);
        this.staticQuadTree.maxObjects = 5;

        this.insertBuildingsToStaticTree();
        console.log('✅ 静态四叉树初始化完成');
    },

    // 初始化动态四叉树
    initDynamicQuadTree: function () {
        var mapWidth = this.currentMap.mapWidth;
        var mapHeight = this.currentMap.mapHeight;

        this.dynamicQuadTree = new QuadTreeNode(0, 0, mapWidth, mapHeight, 6, 0);
        this.dynamicQuadTree.maxObjects = 8;
        console.log('✅ 动态四叉树初始化完成');
    },

    // 插入建筑物到静态四叉树
    insertBuildingsToStaticTree: function () {
        if (this.currentMap.type === 'matrix') {
            this.insertMatrixBuildings();
        } else {
            throw new Error('不支持的地图类型');
        }
    },

    // 插入矩阵建筑物
    insertMatrixBuildings: function () {
        if (!this.mapManager || !this.mapManager.getCurrentMap) {
            console.warn('⚠️ 地图管理器不可用，跳过建筑物插入');
            return;
        }

        var currentMap = this.mapManager.getCurrentMap();
        if (!currentMap || !currentMap.buildings) {
            console.warn('⚠️ 当前地图没有建筑物数据');
            return;
        }

        var insertedCount = 0;
        var buildings = currentMap.buildings;

        for (var i = 0; i < buildings.length; i++) {
            var building = buildings[i];
            if (building && building.x !== undefined && building.y !== undefined) {
                // 设置建筑物边界
                if (!building.bounds) {
                    building.bounds = {
                        left: building.x - building.width / 2,
                        right: building.x + building.width / 2,
                        top: building.y - building.height / 2,
                        bottom: building.y + building.height / 2
                    };
                }

                if (this.staticQuadTree.insert(building)) {
                    insertedCount++;
                }
            }
        }

        console.log('✅ 建筑物插入完成，成功插入:', insertedCount, '个');
    },

    // 🔴 重构：移除对象管理方法，只保留空间查询
    // 空间查询方法（不管理对象）
    querySpatialArea: function (searchArea) {
        if (!this.dynamicQuadTree) return [];
        return this.dynamicQuadTree.query(searchArea);
    },

    // 获取空间索引中的所有对象（只读，不管理）
    getSpatialIndexObjects: function () {
        if (!this.dynamicQuadTree) return [];
        return this.dynamicQuadTree.getAllObjects();
    },

    // 获取空间索引中指定类型的对象数量（只读，不管理）
    getSpatialIndexCountByType: function (type) {
        if (!this.dynamicQuadTree) {
            console.warn('getSpatialIndexCountByType: 动态四叉树未初始化');
            return 0;
        }
        
        var allObjects = this.dynamicQuadTree.getAllObjects();
        console.log('🔍 getSpatialIndexCountByType: 查询类型', type, '，四叉树总对象数:', allObjects.length);
        
        var filteredObjects = allObjects.filter(function(obj) { 
            return obj && obj.type === type; 
        });
        
        console.log('🔍 getSpatialIndexCountByType: 类型', type, '的对象数量:', filteredObjects.length);
        console.log('🔍 所有对象的类型:', allObjects.map(obj => obj ? obj.type : 'null'));
        
        return filteredObjects.length;
    },

    // 🔴 重构：移除对象创建/销毁方法，这些应该由对象池负责
    // 保留原有的碰撞检测方法
    isCircleCollidingWithBuildings: function (circleX, circleY, circleRadius) {
        if (!this.staticQuadTree) {
            return false;
        }

        // 查询圆形周围的区域
        var searchArea = {
            left: circleX - circleRadius,
            right: circleX + circleRadius,
            top: circleY - circleRadius,
            bottom: circleY + circleRadius
        };

        var nearbyBuildings = this.staticQuadTree.query(searchArea);

        for (var i = 0; i < nearbyBuildings.length; i++) {
            var building = nearbyBuildings[i];
            if (this.circleRectIntersect(circleX, circleY, circleRadius, building)) {
                return true;
            }
        }

        return false;
    },

    // 圆形与矩形碰撞检测
    circleRectIntersect: function (circleX, circleY, circleRadius, rect) {
        var bounds = rect.bounds || this.getObjectBounds(rect);

        // 找到矩形上最近的点
        var closestX = Math.max(bounds.left, Math.min(circleX, bounds.right));
        var closestY = Math.max(bounds.top, Math.min(circleY, bounds.bottom));

        // 计算圆心到最近点的距离
        var distanceX = circleX - closestX;
        var distanceY = circleY - closestY;
        var distanceSquared = distanceX * distanceX + distanceY * distanceY;

        return distanceSquared <= circleRadius * circleRadius;
    },

    // 矩形与建筑物碰撞检测
    isRectCollidingWithBuildings: function (rectX, rectY, rectWidth, rectHeight) {
        var rect = {
            bounds: {
                left: rectX - rectWidth / 2,
                right: rectX + rectWidth / 2,
                top: rectY - rectHeight / 2,
                bottom: rectY + rectHeight / 2
            }
        };

        var searchArea = {
            left: rect.bounds.left,
            right: rect.bounds.right,
            top: rect.bounds.top,
            bottom: rect.bounds.bottom
        };

        var nearbyBuildings = this.staticQuadTree.query(searchArea);

        for (var i = 0; i < nearbyBuildings.length; i++) {
            var building = nearbyBuildings[i];
            if (this.rectsIntersect(rect.bounds, building.bounds || this.getObjectBounds(building))) {
                return true;
            }
        }

        return false;
    },

    // 检查两个矩形是否相交
    rectsIntersect: function (rect1, rect2) {
        return !(rect1.right <= rect2.left || rect1.left >= rect2.right ||
            rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
    },

    // 获取对象边界（工具方法）
    getObjectBounds: function (object) {
        if (!object) return {left: 0, right: 0, top: 0, bottom: 0};

        if (object.bounds) return object.bounds;

        var x = object.x || 0;
        var y = object.y || 0;
        var width = object.width || 32;
        var height = object.height || 48;

        return {
            left: x - width / 2,
            right: x + width / 2,
            top: y - height / 2,
            bottom: y + height / 2
        };
    },

    // 🔴 重构：移除对象管理方法，这些应该由对象池负责
    // 保留空间索引的清理方法（不管理对象生命周期）
    clearSpatialIndex: function () {
        if (this.dynamicQuadTree) {
            this.dynamicQuadTree.clear();
        }
    },

    // 获取当前地图
    getCurrentMap: function () {
        if (this.mapManager && this.mapManager.getCurrentMap) {
            return this.mapManager.getCurrentMap();
        } else if (window.mapSystem && window.mapSystem.currentMap) {
            return window.mapSystem.currentMap;
        }
        return this.currentMap;
    },

    getCurrentMapDimensions: function () {
        var currentMap = this.getCurrentMap();
        if (currentMap) {
            return {
                width: currentMap.mapWidth || currentMap.width || 10000,
                height: currentMap.mapHeight || currentMap.height || 10000
            };
        }
        return {width: 10000, height: 10000};
    },

    // 🔴 新增：支持角色管理器的getAllCharacters方法
    getAllCharacters: function() {
        if (!this.dynamicQuadTree) {
            console.warn('CollisionSystem.getAllCharacters: 动态四叉树未初始化');
            return [];
        }
        
        try {
            var allObjects = this.dynamicQuadTree.getAllObjects();
            // 过滤出角色对象（type为'character'或role属性存在的对象）
            var characters = allObjects.filter(obj => 
                obj && (obj.type === 'character' || obj.role !== undefined)
            );
            
            console.log('CollisionSystem.getAllCharacters: 从四叉树获取到角色数量:', characters.length);
            return characters;
        } catch (error) {
            console.error('CollisionSystem.getAllCharacters: 获取角色失败:', error);
            return [];
        }
    },

    // 🔴 新增：支持角色管理器的getMainCharacter方法
    getMainCharacter: function() {
        var allCharacters = this.getAllCharacters();
        if (allCharacters.length === 0) {
            return null;
        }
        
        // 查找主人物（role为1或ROLE.MAIN）
        var mainChar = allCharacters.find(char => 
            char && (char.role === 1 || char.role === 'main')
        );
        
        if (mainChar) {
            console.log('CollisionSystem.getMainCharacter: 找到主人物:', {
                id: mainChar.id,
                role: mainChar.role,
                x: mainChar.x,
                y: mainChar.y
            });
        }
        
        return mainChar;
    },

    // 🔴 新增：支持僵尸管理器的getAllZombies方法
    getAllZombies: function() {
        if (!this.dynamicQuadTree) {
            console.warn('CollisionSystem.getAllZombies: 动态四叉树未初始化');
            return [];
        }
        
        try {
            var allObjects = this.dynamicQuadTree.getAllObjects();
            // 过滤出僵尸对象（type为'zombie'的对象）
            var zombies = allObjects.filter(obj => 
                obj && obj.type === 'zombie'
            );
            
            console.log('CollisionSystem.getAllZombies: 从四叉树获取到僵尸数量:', zombies.length);
            return zombies;
        } catch (error) {
            console.error('CollisionSystem.getAllZombies: 获取僵尸失败:', error);
            return [];
        }
    },

    // 🔴 新增：支持空间索引计数
    getSpatialIndexCountByType: function(type) {
        if (!this.dynamicQuadTree) {
            return 0;
        }
        
        try {
            var allObjects = this.dynamicQuadTree.getAllObjects();
            var count = allObjects.filter(obj => obj && obj.type === type).length;
            return count;
        } catch (error) {
            console.error('CollisionSystem.getSpatialIndexCountByType: 获取计数失败:', error);
            return 0;
        }
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollisionSystem;
} else if (typeof window !== 'undefined') {
    window.CollisionSystem = CollisionSystem;
}
