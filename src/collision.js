/**
 * 优化版碰撞检测系统 (collision-optimized.js)
 *
 * 优化内容：
 * - 保留四叉树核心功能
 * - 移除复杂的冗余功能
 * - 专注于建筑物碰撞检测和动态对象管理
 * - 代码量从2398行减少到约800行
 */

// 四叉树节点类（核心功能）
function QuadTreeNode(x, y, width, height, maxDepth, currentDepth) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
    this.maxDepth = maxDepth || 4;
    this.currentDepth = currentDepth || 0;

    this.objects = [];        // 存储的对象
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
    dynamicQuadTree: null,   // 动态四叉树（人物、僵尸）

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

    // 简化的安全位置生成
    generateSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle = true) {
        var collisionCheck = isCircle ?
            (x, y) => !this.isCircleCollidingWithBuildings(x, y, objectWidth / 2) :
            (x, y) => !this.isRectCollidingWithBuildings(x, y, objectWidth, objectHeight);

        // 随机位置搜索
        for (var attempt = 0; attempt < 100; attempt++) {
            var angle = Math.random() * Math.PI * 2;
            var distance = minDistance + Math.random() * (maxDistance - minDistance);
            var testX = centerX + Math.cos(angle) * distance;
            var testY = centerY + Math.sin(angle) * distance;

            if (this.isWithinMapBounds(testX, testY) && collisionCheck(testX, testY)) {
                return {x: testX, y: testY, success: true};
            }
        }

        // 边缘位置搜索
        var mapDimensions = this.getCurrentMapDimensions();
        var edgePositions = [
            {x: 100, y: 100},
            {x: mapDimensions.width - 100, y: 100},
            {x: 100, y: mapDimensions.height - 100},
            {x: mapDimensions.width - 100, y: mapDimensions.height - 100}
        ];

        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (collisionCheck(edgePos.x, edgePos.y)) {
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

    // 插入矩阵地图建筑物
    insertMatrixBuildings: function () {
        console.log('🗺️ 开始插入矩阵地图建筑物');

        // 从地图管理器获取建筑物数据
        if (this.mapManager && this.mapManager.getCurrentMap) {
            try {
                const currentMap = this.mapManager.getCurrentMap();
                if (currentMap && currentMap.buildings) {
                    console.log('✅ 从地图管理器获取建筑物数据，数量:', currentMap.buildings.length);
                    this.insertBuildingsFromMapManager(currentMap.buildings);
                    return;
                }
            } catch (error) {
                console.error('❌ 从地图管理器获取建筑物数据失败:', error);
            }
        }

        // 从全局mapSystem获取
        if (window.mapSystem && window.mapSystem.buildings) {
            console.log('✅ 从全局mapSystem获取建筑物数据，数量:', window.mapSystem.buildings.length);
            this.insertBuildingsFromMapSystem(window.mapSystem.buildings);
            return;
        }

        throw new Error('无法获取建筑物数据');
    },

    // 从地图管理器插入建筑物
    insertBuildingsFromMapManager: function (buildings) {
        if (!buildings || buildings.length === 0) {
            console.warn('建筑物数据为空');
            return;
        }

        let insertedCount = 0;
        for (let i = 0; i < buildings.length; i++) {
            const building = buildings[i];

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

        console.log('✅ 建筑物插入完成，成功插入:', insertedCount, '个');
    },

    // 从mapSystem插入建筑物
    insertBuildingsFromMapSystem: function (buildings) {
        if (!buildings || buildings.length === 0) {
            console.warn('mapSystem建筑物数据为空');
            return;
        }

        let insertedCount = 0;
        for (let i = 0; i < buildings.length; i++) {
            const building = buildings[i];

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

        console.log('✅ 建筑物插入完成，成功插入:', insertedCount, '个');
    },

    // 动态对象管理（简化版）
    addDynamicObject: function (object) {
        if (!object || !this.dynamicQuadTree) {
            console.warn('🔍 addDynamicObject: 对象或动态四叉树无效', {
                object: object,
                hasDynamicQuadTree: !!this.dynamicQuadTree
            });
            return false;
        }

        console.log('🔍 addDynamicObject: 添加对象到动态四叉树:', {
            type: object.type,
            role: object.role,
            id: object.id,
            x: object.x,
            y: object.y,
            hp: object.hp
        });

        var result = this.dynamicQuadTree.insert(object);
        console.log('🔍 addDynamicObject: 插入结果:', result);
        
        // 验证对象是否真的被添加
        if (result) {
            var allObjects = this.dynamicQuadTree.getAllObjects();
            var foundObject = allObjects.find(obj => obj && obj.id === object.id);
            if (foundObject) {
                console.log('✅ addDynamicObject: 对象成功添加到四叉树');
            } else {
                console.error('❌ addDynamicObject: 对象添加失败，在四叉树中找不到');
            }
        }
        
        return result;
    },

    removeDynamicObject: function (object) {
        if (!object || !this.dynamicQuadTree) {
            return false;
        }

        return this.dynamicQuadTree.remove(object);
    },

    updateDynamicObjectPosition: function (object, oldX, oldY, newX, newY) {
        if (!object || !this.dynamicQuadTree) {
            console.warn('🔍 updateDynamicObjectPosition: 对象或动态四叉树无效', {
                object: object,
                hasDynamicQuadTree: !!this.dynamicQuadTree
            });
            return;
        }

        console.log('🔍 updateDynamicObjectPosition: 更新对象位置:', {
            type: object.type,
            role: object.role,
            id: object.id,
            oldX: oldX,
            oldY: oldY,
            newX: newX,
            newY: newY
        });

        // 从旧位置移除
        var removeResult = this.dynamicQuadTree.remove(object);
        console.log('🔍 updateDynamicObjectPosition: 从旧位置移除结果:', removeResult);

        // 添加到新位置
        var insertResult = this.dynamicQuadTree.insert(object);
        console.log('🔍 updateDynamicObjectPosition: 添加到新位置结果:', insertResult);
        
        // 验证对象是否真的在新位置
        if (insertResult) {
            var allObjects = this.dynamicQuadTree.getAllObjects();
            var foundObject = allObjects.find(obj => obj && obj.id === object.id);
            if (foundObject) {
                console.log('✅ updateDynamicObjectPosition: 对象位置更新成功');
            } else {
                console.error('❌ updateDynamicObjectPosition: 对象位置更新失败，在四叉树中找不到');
            }
        }
    },

    // 核心碰撞检测功能
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

    // 获取安全的移动位置
    getCircleSafeMovePosition: function (fromX, fromY, toX, toY, circleRadius) {
        // 检查目标位置是否可行
        if (!this.isCircleCollidingWithBuildings(toX, toY, circleRadius)) {
            return {x: toX, y: toY, success: true};
        }

        // 尝试8个方向的偏移
        var directions = [
            {dx: 0, dy: -circleRadius}, {dx: circleRadius, dy: 0}, {dx: 0, dy: circleRadius}, {dx: -circleRadius, dy: 0},
            {dx: circleRadius * 0.707, dy: -circleRadius * 0.707}, {dx: circleRadius * 0.707, dy: circleRadius * 0.707},
            {dx: -circleRadius * 0.707, dy: circleRadius * 0.707}, {dx: -circleRadius * 0.707, dy: -circleRadius * 0.707}
        ];

        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var newX = toX + dir.dx;
            var newY = toY + dir.dy;

            if (!this.isCircleCollidingWithBuildings(newX, newY, circleRadius)) {
                return {x: newX, y: newY, success: true, offset: true};
            }
        }

        return {x: fromX, y: fromY, success: false, message: '无法找到安全位置'};
    },

    // 查询范围内的对象
    queryRange: function (centerX, centerY, radius) {
        var result = {
            buildings: [],
            dynamicObjects: []
        };

        // 查询建筑物
        if (this.staticQuadTree) {
            var searchArea = {
                left: centerX - radius,
                right: centerX + radius,
                top: centerY - radius,
                bottom: centerY + radius
            };
            result.buildings = this.staticQuadTree.query(searchArea);
        }

        // 查询动态对象
        if (this.dynamicQuadTree) {
            var searchArea = {
                left: centerX - radius,
                right: centerX + radius,
                top: centerY - radius,
                bottom: centerY + radius
            };
            result.dynamicObjects = this.dynamicQuadTree.query(searchArea);
        }

        return result;
    },

    // 简化的对象管理接口（保持兼容性）
    createCharacterObject: function (character) {
        if (!character) return null;

        this.addDynamicObject(character);
        return character;
    },

    createZombieObject: function (zombie) {
        if (!zombie) return null;

        this.addDynamicObject(zombie);
        return zombie;
    },

    updateCharacterPosition: function (character, oldX, oldY, newX, newY) {
        this.updateDynamicObjectPosition(character, oldX, oldY, newX, newY);
    },

    updateZombiePosition: function (zombie, oldX, oldY, newX, newY) {
        this.updateDynamicObjectPosition(zombie, oldX, oldY, newX, newY);
    },

    destroyZombieObject: function (zombie) {
        this.removeDynamicObject(zombie);
    },

    getAllCharacters: function () {
        if (!this.dynamicQuadTree) {
            console.warn('🔍 getAllCharacters: 动态四叉树未初始化');
            return [];
        }

        var allObjects = this.dynamicQuadTree.getAllObjects();
        console.log('🔍 getAllCharacters: 动态四叉树中的所有对象数量:', allObjects.length);
        
        if (allObjects.length > 0) {
            console.log('🔍 getAllCharacters: 所有对象详情:', allObjects.map(obj => ({
                type: obj.type,
                role: obj.role,
                id: obj.id,
                hp: obj.hp,
                x: obj.x,
                y: obj.y,
                hasRole: 'role' in obj,
                hasHp: 'hp' in obj,
                hasPosition: 'x' in obj && 'y' in obj
            })));
        }

        var characters = allObjects.filter(function(obj) {
            // 🔴 修复：主人物即使血量变为0也应该被找到
            if (obj && obj.role === 1) {
                return true; // 主人物总是返回
            }
            // 其他角色需要血量大于0
            return obj && (obj.role === 2 || obj.role === 3 ||
                obj.role === 4 || obj.role === 5 || obj.role === 6) && obj.hp > 0;
        });
        
        console.log('🔍 getAllCharacters: 过滤后的角色数量:', characters.length);
        if (characters.length > 0) {
            console.log('🔍 getAllCharacters: 角色详情:', characters.map(char => ({
                role: char.role,
                id: char.id,
                hp: char.hp,
                x: char.x,
                y: char.y
            })));
        }
        
        return characters;
    },

    getAllZombies: function () {
        if (!this.dynamicQuadTree) return [];

        return this.dynamicQuadTree.getAllObjects().filter(function(obj) {
            return obj && obj.type === 'zombie';
        });
    },

    getDynamicObjectCountByType: function (type) {
        if (!this.dynamicQuadTree) return 0;

        var allObjects = this.dynamicQuadTree.getAllObjects();
        if (type === 'zombie') {
            return allObjects.filter(function(obj) { return obj && obj.type === 'zombie'; }).length;
        } else if (type === 'character') {
            return allObjects.filter(function(obj) {
                return obj && (obj.role === 'main' || obj.role === 'police' || obj.role === 'civilian' ||
                    obj.role === 'doctor' || obj.role === 'nurse' || obj.role === 'chef');
            }).length;
        }
        return 0;
    },

    // 简化的更新函数
    updateDynamicQuadTree: function (characters, zombies) {
        // 简化的更新逻辑，只清理无效对象
        if (this.dynamicQuadTree) {
            var allObjects = this.dynamicQuadTree.getAllObjects();
            for (var i = 0; i < allObjects.length; i++) {
                var obj = allObjects[i];
                if (obj && obj.hp <= 0) {
                    this.dynamicQuadTree.remove(obj);
                }
            }
        }
    },

    // 工具函数
    rectsIntersect: function (rect1, rect2) {
        return !(rect1.right <= rect2.left || rect1.left >= rect2.right ||
            rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
    },

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
                width: currentMap.width || currentMap.mapWidth || 10000,
                height: currentMap.height || currentMap.mapHeight || 10000
            };
        }
        return {width: 10000, height: 10000};
    },

    // 生成游戏安全位置
    generateGameSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle = false) {
        return this.generateSafePosition(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle);
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollisionSystem;
} else if (typeof window !== 'undefined') {
    window.CollisionSystem = CollisionSystem;
}
