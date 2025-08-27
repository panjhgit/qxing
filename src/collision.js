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

    return !(objBounds.right < bounds.x || objBounds.left > bounds.right || objBounds.bottom < bounds.y || objBounds.top > bounds.bottom);
};

// 获取对象边界（统一版本）
QuadTreeNode.prototype.getObjectBounds = function (object) {
    if (!object) {
        return {left: 0, right: 0, top: 0, bottom: 0};
    }

    if (object.bounds) {
        return object.bounds;
    }

    // 统一使用中心点计算边界，正确处理0值
    var x = (object.x !== undefined && object.x !== null) ? object.x : 0;
    var y = (object.y !== undefined && object.y !== null) ? object.y : 0;
    var width = (object.width !== undefined && object.width !== null) ? object.width : 32;
    var height = (object.height !== undefined && object.height !== null) ? object.height : 48;

    return {
        left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2
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

    this.children = [new QuadTreeNode(this.x, this.y, halfWidth, halfHeight, this.maxDepth, nextDepth),                    // 左上
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

    // 添加边界检查
    if (!range || range.left === undefined || range.top === undefined || range.right === undefined || range.bottom === undefined) {
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
QuadTreeNode.prototype.rectsIntersect = function (rect1, rect2) {
    return !(rect1.right <= rect2.left || rect1.left >= rect2.right || rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
};

// 检查查询范围是否与节点相交
QuadTreeNode.prototype.intersects = function (range) {
    // 修复边界计算逻辑
    return !(range.right <= this.x || range.left >= this.x + this.width || range.bottom <= this.y || range.top >= this.y + this.height);
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

// 四叉树碰撞检测系统
var CollisionSystem = {
    // 四叉树实例
    staticQuadTree: null,    // 静态四叉树（建筑物）
    dynamicQuadTree: null,   // 动态四叉树（人物、僵尸）

    // 当前地图配置
    currentMap: null,

    // 地图管理器引用
    mapManager: null,

    // 初始化碰撞检测系统
    init: function (mapId) {
        if (!mapId) {
            mapId = 'city'; // 默认使用城市地图
        }

        console.log('🗺️ 初始化碰撞检测系统，地图ID:', mapId);

        // 尝试获取地图管理器
        if (typeof window !== 'undefined' && window.MapManager) {
            this.mapManager = window.MapManager;
            console.log('✅ 找到地图管理器');
        } else {
            console.warn('⚠️ 未找到地图管理器，尝试动态导入');
            // 这里可以尝试动态导入，但为了简化，我们先使用默认配置
        }

        // 如果地图管理器可用，使用它来获取地图数据
        if (this.mapManager && this.mapManager.getMapConfig) {
            try {
                const mapConfig = this.mapManager.getMapConfig(mapId);
                if (mapConfig) {
                    this.currentMap = {
                        name: mapConfig.name,
                        type: 'matrix', // 新的矩阵地图类型
                        mapWidth: mapConfig.width,
                        mapHeight: mapConfig.height,
                        cellSize: mapConfig.cellSize,
                        gridCols: mapConfig.gridCols,
                        gridRows: mapConfig.gridRows
                    };
                    console.log('✅ 从地图管理器获取地图配置:', this.currentMap);
                } else {
                    console.warn('⚠️ 地图管理器未返回配置，使用默认配置');
                    this.useDefaultMapConfig(mapId);
                }
            } catch (error) {
                console.error('❌ 从地图管理器获取配置失败:', error);
                this.useDefaultMapConfig(mapId);
            }
        } else {
            console.warn('⚠️ 地图管理器不可用，使用默认配置');
            this.useDefaultMapConfig(mapId);
        }

        // 强制启用建筑物碰撞检测，禁用调试模式
        this.debugMode = false;
        this._collisionEnabled = true;
        console.log('✅ 建筑物碰撞检测已强制启用，调试模式已禁用');

        // 初始化静态四叉树（建筑物）
        this.initStaticQuadTree();

        // 初始化动态四叉树（人物、僵尸）
        this.initDynamicQuadTree();

        // 测试建筑物插入
        if (this.staticQuadTree) {
            var testRange = {left: 0, right: 2000, top: 0, bottom: 2000};
            var testBuildings = this.staticQuadTree.query(testRange);
            console.log('测试查询结果 - 前2000x2000区域建筑物数量:', testBuildings.length);
            if (testBuildings.length > 0) {
                console.log('第一个建筑物示例:', testBuildings[0]);
            }
        }

        console.log('=== 碰撞系统初始化完成 ===');

        return true;
    },

    // 使用默认地图配置（兼容性）
    useDefaultMapConfig: function (mapId) {
        console.log('使用默认地图配置:', mapId);

        // 保留原有的地图配置作为后备
        const defaultMaps = {
            'city': {
                name: '城市地图',
                type: 'matrix',
                mapWidth: 10000,
                mapHeight: 10000,
                cellSize: 100,
                gridCols: 100,
                gridRows: 100
            }, 'small-town': {
                name: '小镇地图', type: 'matrix', mapWidth: 4000, mapHeight: 4000, cellSize: 100, gridCols: 40, gridRows: 40
            }, 'main': {
                name: '主地图',
                type: 'grid',
                blockSize: 750,
                streetWidth: 500,
                gridSize: 1250,
                gridCols: 8,
                gridRows: 8,
                mapWidth: 10000,
                mapHeight: 10000,
                buildingTypes: ['民房', '别墅', '医院', '商店', '学校', '警察局']
            }
        };

        this.currentMap = defaultMaps[mapId] || defaultMaps['city'];
        console.log('使用默认配置:', this.currentMap);
    },

    // 初始化静态四叉树
    initStaticQuadTree: function () {
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
    initDynamicQuadTree: function () {
        var mapWidth = this.currentMap.mapWidth;
        var mapHeight = this.currentMap.mapHeight;

        // 动态四叉树：最大深度6层，每节点最多8个对象
        this.dynamicQuadTree = new QuadTreeNode(0, 0, mapWidth, mapHeight, 6, 0);
        this.dynamicQuadTree.maxObjects = 8;
    },

    // 将建筑物插入静态四叉树
    insertBuildingsToStaticTree: function () {
        if (this.currentMap.type === 'matrix') {
            this.insertMatrixBuildings();
        } else if (this.currentMap.type === 'grid') {
            this.insertGridBuildings();
        } else if (this.currentMap.type === 'irregular') {
            this.insertIrregularBuildings();
        }
    },

    // 插入矩阵地图建筑物（新方法）
    insertMatrixBuildings: function () {
        console.log('🗺️ 开始插入矩阵地图建筑物');

        // 尝试从地图管理器获取建筑物数据
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

        // 如果无法从地图管理器获取，尝试从全局变量获取
        if (window.mapSystem && window.mapSystem.buildings) {
            console.log('✅ 从全局mapSystem获取建筑物数据，数量:', window.mapSystem.buildings.length);
            this.insertBuildingsFromMapSystem(window.mapSystem.buildings);
            return;
        }

        // 如果都没有，生成默认建筑物
        console.log('⚠️ 无法获取建筑物数据，生成默认建筑物');
        this.generateDefaultMatrixBuildings();
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

            // 确保建筑物有正确的边界信息
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

        console.log('✅ 从地图管理器插入建筑物完成，成功插入:', insertedCount, '个');
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

            // 确保建筑物有正确的边界信息
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

        console.log('✅ 从mapSystem插入建筑物完成，成功插入:', insertedCount, '个');
    },

    // 生成默认矩阵建筑物（基于当前地图配置）
    generateDefaultMatrixBuildings: function () {
        console.log('生成默认矩阵建筑物，地图配置:', this.currentMap);

        const cellSize = this.currentMap.cellSize;
        const gridCols = this.currentMap.gridCols;
        const gridRows = this.currentMap.gridRows;

        // 生成一些示例建筑物（4x4单元格组成一个建筑物）
        let buildingCount = 0;

        for (let col = 0; col < gridCols - 3; col += 4) {
            for (let row = 0; row < gridRows - 3; row += 4) {
                // 每4x4个单元格组成一个建筑物
                const buildingX = (col + 2) * cellSize + cellSize / 2; // 建筑物中心X
                const buildingY = (row + 2) * cellSize + cellSize / 2; // 建筑物中心Y
                const buildingWidth = 4 * cellSize; // 4个单元格的宽度
                const buildingHeight = 4 * cellSize; // 4个单元格的高度

                const building = {
                    x: buildingX,
                    y: buildingY,
                    width: buildingWidth,
                    height: buildingHeight,
                    type: '默认建筑',
                    gridCol: col,
                    gridRow: row,
                    bounds: {
                        left: buildingX - buildingWidth / 2,
                        right: buildingX + buildingWidth / 2,
                        top: buildingY - buildingHeight / 2,
                        bottom: buildingY + buildingHeight / 2
                    }
                };

                if (this.staticQuadTree.insert(building)) {
                    buildingCount++;
                }
            }
        }

        console.log('✅ 生成默认建筑物完成，数量:', buildingCount);
    },

    // 插入网格建筑物
    insertGridBuildings: function () {
        var blockSize = this.currentMap.blockSize;
        var gridSize = this.currentMap.gridSize;
        var streetWidth = this.currentMap.streetWidth;
        var cols = this.currentMap.gridCols;
        var rows = this.currentMap.gridRows;

        console.log('开始插入网格建筑物，配置:', {
            blockSize: blockSize, gridSize: gridSize, streetWidth: streetWidth, cols: cols, rows: rows
        });

        for (var col = 0; col < cols; col++) {
            for (var row = 0; row < rows; row++) {
                // 建筑物位置：每个网格的中心放置建筑物
                var buildingX = col * gridSize + gridSize / 2;
                var buildingY = row * gridSize + gridSize / 2;

                var building = {
                    x: buildingX,
                    y: buildingY,
                    width: blockSize,
                    height: blockSize,
                    type: this.currentMap.buildingTypes[Math.floor(Math.random() * this.currentMap.buildingTypes.length)],
                    gridCol: col,
                    gridRow: row, // 统一使用中心点坐标系统
                    bounds: {
                        left: buildingX - blockSize / 2,
                        right: buildingX + blockSize / 2,
                        top: buildingY - blockSize / 2,
                        bottom: buildingY + blockSize / 2
                    }
                };

                this.staticQuadTree.insert(building);

                // 调试信息：显示第一个建筑物的位置和边界
                if (col === 0 && row === 0) {
                    console.log('第一个建筑物:', building);
                    console.log('建筑物边界:', building.bounds);
                    console.log('街道中心位置 (应该不在建筑物内):', gridSize / 2, gridSize / 2);

                    // 验证街道位置是否真的不在建筑物内
                    var streetTestX = gridSize / 2;
                    var streetTestY = gridSize / 2;
                    var isStreetInBuilding = this.isPointInBuilding(streetTestX, streetTestY);
                    console.log('街道位置碰撞检测结果:', isStreetInBuilding, '应该为false');

                    // 验证建筑物位置是否真的在建筑物内
                    var buildingTestX = buildingX;
                    var buildingTestY = buildingY;
                    var isBuildingInBuilding = this.isPointInBuilding(buildingTestX, buildingTestY);
                    console.log('建筑物中心碰撞检测结果:', isBuildingInBuilding, '应该为true');
                }
            }
        }

        console.log('网格建筑物插入完成，建筑物尺寸:', blockSize, '街道宽度:', streetWidth, '网格大小:', gridSize);
    },

    // 插入不规则建筑物
    insertIrregularBuildings: function () {
        if (!this.currentMap.buildings) return;

        for (var i = 0; i < this.currentMap.buildings.length; i++) {
            var building = this.currentMap.buildings[i];
            // 统一使用中心点坐标系统
            var centerX = building.x + building.width / 2;
            var centerY = building.y + building.height / 2;

            building.bounds = {
                left: centerX - building.width / 2,
                right: centerX + building.width / 2,
                top: centerY - building.height / 2,
                bottom: centerY + building.height / 2
            };

            this.staticQuadTree.insert(building);
        }
    },


    // 添加动态对象到四叉树
    addDynamicObject: function (object) {
        // 添加错误处理
        if (!this.dynamicQuadTree) {
            console.error('动态四叉树未初始化');
            return false;
        }

        if (!object) {
            console.error('对象为空，无法添加到四叉树');
            return false;
        }

        if (object.x === undefined || object.y === undefined) {
            console.error('对象缺少位置信息', object);
            return false;
        }

        // 检查对象是否已经在四叉树中
        if (object._quadTreeId) {
            console.warn('对象已在四叉树中:', object._quadTreeId);
            return true;
        }

        var result = this.dynamicQuadTree.insert(object);
        if (result) {
            // 为对象添加四叉树标识和类型信息
            object._quadTreeId = 'obj_' + Date.now() + '_' + Math.random();
            object._quadTreeType = this.getObjectType(object);
            object._quadTreeAddedTime = Date.now();
            console.log('动态对象已添加到四叉树:', object._quadTreeId, object._quadTreeType, object);

            // 注册到生命周期管理器
            this.registerObject(object, object._quadTreeType);
        } else {
            console.warn('动态对象添加失败:', object);
        }

        return result;
    },

    // 从四叉树移除动态对象
    removeDynamicObject: function (object) {
        if (!this.dynamicQuadTree || !object) {
            console.warn('移除动态对象失败: 四叉树未初始化或对象无效');
            return false;
        }

        var result = this.dynamicQuadTree.remove(object);
        if (result) {
            // 清除四叉树标识
            var quadTreeId = object._quadTreeId;
            var objectId = object.id;

            delete object._quadTreeId;
            delete object._quadTreeType;
            delete object._quadTreeAddedTime;

            // 清理缓存 - 同时清理quadTreeId和objectId
            if (quadTreeId) {
                this.removeFromObjectIdCache(quadTreeId);
            }
            if (objectId) {
                this.removeFromObjectIdCache(objectId);
            }

            // 从生命周期管理器注销
            this.unregisterObject(object);

            console.log('动态对象已从四叉树移除:', quadTreeId, objectId, object);
        } else {
            console.warn('动态对象移除失败:', object);
        }

        return result;
    },


    // 获取对象类型
    getObjectType: function (object) {
        if (!object) return 'unknown';

        // 优先检查明确的类型标识
        if (object.type) {
            if (typeof object.type === 'string') {
                if (object.type.includes('zombie')) return 'zombie';
                if (object.type.includes('character') || object.type.includes('player')) return 'character';
                if (object.type.includes('item')) return 'item';
                if (object.type.includes('building')) return 'building';
            }
        }

        // 检查角色属性
        if (object.role !== undefined) {
            if (object.role === 'player' || object.role === 'character') return 'character';
            if (object.role === 'zombie') return 'zombie';
        }

        // 检查ID模式
        if (object.id) {
            if (typeof object.id === 'string') {
                if (object.id.includes('zombie')) return 'zombie';
                if (object.id.includes('character') || object.id.includes('player')) return 'character';
                if (object.id.includes('test')) return 'test';
            }
        }

        // 检查其他属性
        if (object.hp !== undefined && object.maxHp !== undefined) {
            // 有生命值系统的对象
            if (object.isZombie === true) return 'zombie';
            if (object.isPlayer === true || object.isCharacter === true) return 'character';
        }

        return 'unknown';
    },

    // 清理无效对象（从四叉树中移除已销毁或无效的对象）
    cleanupInvalidObjects: function () {
        if (!this.dynamicQuadTree) return 0;

        var removedCount = 0;
        var allObjects = this.getAllDynamicObjects();

        for (var i = 0; i < allObjects.length; i++) {
            var object = allObjects[i];

            // 检查对象是否有效
            if (!this.isObjectValid(object)) {
                this.removeDynamicObject(object);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log('清理无效对象完成，移除数量:', removedCount);
        }

        return removedCount;
    },

    // 检查对象是否有效
    isObjectValid: function (object) {
        if (!object) return false;

        // 检查基本属性
        if (object.x === undefined || object.y === undefined) return false;

        // 检查生命值（如果有的话）
        if (object.hp !== undefined && object.hp <= 0) return false;

        // 检查是否被标记为销毁
        if (object._destroyed === true) return false;

        return true;
    },

    // 获取所有动态对象
    getAllDynamicObjects: function () {
        if (!this.dynamicQuadTree) return [];

        var allObjects = [];
        this.collectObjectsFromNode(this.dynamicQuadTree, allObjects);
        return allObjects;
    },

    // 从四叉树节点收集所有对象
    collectObjectsFromNode: function (node, objects) {
        if (!node) return;

        // 添加当前节点的对象
        for (var i = 0; i < node.objects.length; i++) {
            objects.push(node.objects[i]);
        }

        // 递归收集子节点的对象
        if (node.isDivided) {
            for (var j = 0; j < node.children.length; j++) {
                this.collectObjectsFromNode(node.children[j], objects);
            }
        }
    },

    // 统一的对象生命周期管理
    objectLifecycleManager: {
        // 注册的对象
        registeredObjects: new Map(),

        // 对象类型统计
        typeStats: {
            character: 0, zombie: 0, other: 0
        },

        // 注册对象
        register: function (object, type) {
            if (!object || !object._quadTreeId) {
                console.warn('无法注册无效对象:', object);
                return false;
            }

            // 存储对象的引用信息而不是直接引用对象，避免内存泄漏
            this.registeredObjects.set(object._quadTreeId, {
                objectId: object.id || object._quadTreeId,
                type: type,
                registeredTime: Date.now(),
                lastUpdateTime: Date.now(),
                position: {x: object.x, y: object.y},
                isValid: true
            });

            // 更新统计
            if (this.typeStats[type] !== undefined) {
                this.typeStats[type]++;
            } else {
                this.typeStats.other++;
            }

            console.log('对象已注册:', object._quadTreeId, '类型:', type);
            return true;
        },

        // 注销对象
        unregister: function (object) {
            if (!object || !object._quadTreeId) {
                return false;
            }

            var record = this.registeredObjects.get(object._quadTreeId);
            if (record) {
                // 更新统计
                if (this.typeStats[record.type] !== undefined) {
                    this.typeStats[record.type] = Math.max(0, this.typeStats[record.type] - 1);
                } else {
                    this.typeStats.other = Math.max(0, this.typeStats.other - 1);
                }

                this.registeredObjects.delete(object._quadTreeId);
                console.log('对象已注销:', object._quadTreeId, '类型:', record.type);
                return true;
            }

            return false;
        },

        // 更新对象
        update: function (object) {
            if (!object || !object._quadTreeId) {
                return false;
            }

            var record = this.registeredObjects.get(object._quadTreeId);
            if (record) {
                record.lastUpdateTime = Date.now();
                return true;
            }

            return false;
        },

        // 获取统计信息
        getStats: function () {
            return {
                totalObjects: this.registeredObjects.size,
                typeStats: {...this.typeStats},
                registeredObjects: Array.from(this.registeredObjects.keys())
            };
        },

        // 清理无效对象
        cleanup: function () {
            var removedCount = 0;
            var currentTime = Date.now();
            var maxAge = 30000; // 30秒无更新则视为无效

            for (var [id, record] of this.registeredObjects) {
                if (currentTime - record.lastUpdateTime > maxAge) {
                    // 更新类型统计
                    if (this.typeStats[record.type] !== undefined) {
                        this.typeStats[record.type] = Math.max(0, this.typeStats[record.type] - 1);
                    } else {
                        this.typeStats.other = Math.max(0, this.typeStats.other - 1);
                    }

                    this.registeredObjects.delete(id);
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                console.log('清理了', removedCount, '个无效对象');
            }

            return removedCount;
        }
    },

    // 注册对象到生命周期管理器
    registerObject: function (object, type) {
        return this.objectLifecycleManager.register(object, type);
    },

    // 注销对象从生命周期管理器
    unregisterObject: function (object) {
        return this.objectLifecycleManager.unregister(object);
    },

    // 获取对象生命周期统计
    getObjectLifecycleStats: function () {
        return this.objectLifecycleManager.getStats();
    },

    // 更新动态对象位置（先移除旧位置，再插入新位置）
    updateDynamicObjectPosition: function (object, oldX, oldY, newX, newY) {
        if (!this.dynamicQuadTree || !object) {
            console.warn('更新动态对象位置失败: 四叉树未初始化或对象无效');
            return false;
        }

        // 验证新位置的有效性
        if (newX === undefined || newY === undefined) {
            console.warn('更新动态对象位置失败: 新位置无效', {oldX, oldY, newX, newY});
            return false;
        }

        // 先移除旧位置
        this.dynamicQuadTree.remove(object);

        // 更新对象位置
        object.x = newX;
        object.y = newY;

        // 插入新位置
        var result = this.dynamicQuadTree.insert(object);
        if (result) {
            console.log('动态对象位置已更新:', object._quadTreeId, '从', oldX, oldY, '到', newX, newY);
        } else {
            console.warn('动态对象位置更新失败:', object);
        }

        return result;
    },

    // 检测点是否在建筑物内
    isPointInBuilding: function (x, y) {
        // 检查碰撞检测是否启用
        if (!this._collisionEnabled) {
            console.warn('碰撞检测未启用，请检查系统状态');
            return false;
        }

        if (!this.staticQuadTree) {
            console.warn('静态四叉树未初始化');
            return false;
        }

        // 边界检查：超出地图边界视为在建筑物内
        var mapDimensions = this.getCurrentMapDimensions();
        if (x < 0 || y < 0 || x >= mapDimensions.width || y >= mapDimensions.height) {
            return true;
        }

        var point = {x: x, y: y};
        var range = {left: x, right: x, top: y, bottom: y};

        // 查询附近的建筑物
        var nearbyBuildings = this.staticQuadTree.query(range);

        // 检查点是否在任何建筑物内（统一使用bounds）
        for (var i = 0; i < nearbyBuildings.length; i++) {
            var building = nearbyBuildings[i];
            if (building && building.bounds) {
                if (x >= building.bounds.left && x < building.bounds.right && y >= building.bounds.top && y < building.bounds.bottom) {
                    return true;
                }
            }
        }

        return false;
    },


    // 简洁高效的碰撞检测和移动系统
    // 核心原则：不能重叠、不能穿墙、平滑移动

    // 检测两个矩形是否重叠
    isRectOverlapping: function (rect1, rect2) {
        return !(rect1.right <= rect2.left || rect1.left >= rect2.right || rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
    },

    // 检测对象是否与建筑物碰撞
    isObjectCollidingWithBuildings: function (x, y, width, height) {
        if (!this._collisionEnabled) return false;

        // 计算对象边界
        var objBounds = {
            left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2
        };

        // 获取地图信息
        var currentMap = this.getCurrentMap();
        if (!currentMap) return false;

        // 边界检查
        var mapWidth = currentMap.config ? currentMap.config.width : 4000;
        var mapHeight = currentMap.config ? currentMap.config.height : 4000;

        if (objBounds.left < 0 || objBounds.top < 0 || objBounds.right >= mapWidth || objBounds.bottom >= mapHeight) {
            return true; // 超出地图边界
        }

        // 检查建筑物碰撞
        if (currentMap.buildings) {
            for (var i = 0; i < currentMap.buildings.length; i++) {
                var building = currentMap.buildings[i];
                if (building && building.bounds && this.isRectOverlapping(objBounds, building.bounds)) {
                    return true;
                }
            }
        }

        return false;
    },


    // 墙体滑动：让角色贴着建筑物边缘平滑移动 - 优化版本，减少抽搐
    getWallSlidePosition: function (fromX, fromY, toX, toY, width, height, excludeObject) {
        // 计算移动向量
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance === 0) {
            return {x: fromX, y: fromY, safe: false, source: 'no_movement'};
        }

        // 尝试X轴滑动（水平移动）
        var slideX = this.tryAxisSlide(fromX, fromY, toX, toY, width, height, true, excludeObject);
        if (slideX.safe && slideX.distance > 0) {
            // 添加位置平滑，减少抽搐
            var smoothedX = this.smoothPosition(fromX, slideX.x, 0.8); // 80%的平滑度
            return {
                x: smoothedX,
                y: slideX.y,
                safe: true,
                source: 'wall_slide_smoothed',
                axis: 'x',
                distance: slideX.distance
            };
        }

        // 尝试Y轴滑动（垂直移动）
        var slideY = this.tryAxisSlide(fromX, fromY, toX, toY, width, height, false, excludeObject);
        if (slideY.safe && slideY.distance > 0) {
            // 添加位置平滑，减少抽搐
            var smoothedY = this.smoothPosition(fromY, slideY.y, 0.8); // 80%的平滑度
            return {
                x: slideY.x,
                y: smoothedY,
                safe: true,
                source: 'wall_slide_smoothed',
                axis: 'y',
                distance: slideY.distance
            };
        }

        // 如果都无法滑动，返回原位置
        return {x: fromX, y: fromY, safe: false, source: 'wall_slide_failed'};
    },

    // 位置平滑函数，减少抽搐
    smoothPosition: function (currentPos, targetPos, smoothFactor) {
        // smoothFactor: 0-1，0表示完全平滑，1表示无平滑
        return currentPos + (targetPos - currentPos) * smoothFactor;
    },

    // 尝试沿特定轴滑动 - 优化版本，减少抽搐
    tryAxisSlide: function (fromX, fromY, toX, toY, width, height, isXAxis, excludeObject) {
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance === 0) {
            return {x: fromX, y: fromY, safe: false, source: 'no_movement'};
        }

        // 计算这个轴上的移动距离
        var axisDistance = isXAxis ? Math.abs(deltaX) : Math.abs(deltaY);
        var axisDirection = isXAxis ? (deltaX > 0 ? 1 : -1) : (deltaY > 0 ? 1 : -1);

        // 使用更大的步长，减少检测频率，避免抽搐
        var stepSize = 8; // 增加到8像素，减少检测频率
        var currentDistance = 0;
        var lastSafeX = fromX;
        var lastSafeY = fromY;
        var consecutiveSafeSteps = 0; // 连续安全步数

        while (currentDistance <= axisDistance) {
            var testX = isXAxis ? fromX + axisDirection * currentDistance : fromX;
            var testY = isXAxis ? fromY : fromY + axisDirection * currentDistance;

            // 检测这个位置是否安全（只检查建筑物碰撞，动态对象碰撞由调用方处理）
            if (!this.isObjectCollidingWithBuildings(testX, testY, width, height)) {
                // 更新最后的安全位置
                lastSafeX = testX;
                lastSafeY = testY;
                currentDistance += stepSize;
                consecutiveSafeSteps++;

                // 如果连续多步都安全，可以提前停止，避免过度检测
                if (consecutiveSafeSteps >= 3) {
                    break;
                }
            } else {
                // 找到碰撞点，停止
                break;
            }
        }

        if (lastSafeX !== fromX || lastSafeY !== fromY) {
            var actualDistance = Math.sqrt(Math.pow(lastSafeX - fromX, 2) + Math.pow(lastSafeY - fromY, 2));
            return {
                x: lastSafeX,
                y: lastSafeY,
                safe: true,
                source: 'wall_slide',
                axis: isXAxis ? 'x' : 'y',
                distance: actualDistance
            };
        }

        return {x: fromX, y: fromY, safe: false, source: 'axis_slide_failed'};
    },


    // 获取当前地图
    getCurrentMap: function () {
        if (window.MapManager && window.MapManager.getCurrentMap) {
            return window.MapManager.getCurrentMap();
        } else if (window.mapSystem && window.mapSystem.currentMap) {
            return window.mapSystem.currentMap;
        }
        return null;
    },

    // 获取当前地图尺寸的辅助方法
    getCurrentMapDimensions: function () {
        var currentMap = null;
        if (window.MapManager && window.MapManager.getCurrentMap) {
            currentMap = window.MapManager.getCurrentMap();
        } else if (window.mapSystem && window.mapSystem.currentMap) {
            currentMap = window.mapSystem.currentMap;
        }

        if (!currentMap) {
            return {width: 4000, height: 4000};
        }

        var width = currentMap.config ? currentMap.config.width : currentMap.mapWidth || 4000;
        var height = currentMap.config ? currentMap.config.height : currentMap.mapHeight || 4000;

        return {width: width, height: height};
    },

    // 检测矩形是否与建筑物碰撞（基于矩阵，更精确）
    isRectCollidingWithBuildings: function (rectX, rectY, rectWidth, rectHeight) {
        if (!this._collisionEnabled) {
            return false;
        }

        // 计算矩形的边界
        var rectBounds = {
            left: rectX - rectWidth / 2,
            right: rectX + rectWidth / 2,
            top: rectY - rectHeight / 2,
            bottom: rectY + rectHeight / 2
        };

        // 获取当前地图信息
        var currentMap = null;
        if (window.MapManager && window.MapManager.getCurrentMap) {
            currentMap = window.MapManager.getCurrentMap();
        } else if (window.mapSystem && window.mapSystem.currentMap) {
            currentMap = window.mapSystem.currentMap;
        }

        if (!currentMap) {
            console.warn('无法获取地图信息，跳过碰撞检测');
            return false;
        }

        // 边界检查
        var mapDimensions = this.getCurrentMapDimensions();
        var mapWidth = mapDimensions.width;
        var mapHeight = mapDimensions.height;

        if (rectBounds.left < 0 || rectBounds.top < 0 || rectBounds.right >= mapWidth || rectBounds.bottom >= mapHeight) {
            return true; // 超出地图边界视为碰撞
        }

        // 检查是否与建筑物重叠
        if (currentMap.buildings && currentMap.buildings.length > 0) {
            for (var i = 0; i < currentMap.buildings.length; i++) {
                var building = currentMap.buildings[i];
                if (building && building.bounds) {
                    if (this.rectsIntersect(rectBounds, building.bounds)) {
                        return true;
                    }
                }
            }
        }

        // 如果使用四叉树，也检查四叉树中的建筑物
        if (this.staticQuadTree) {
            var nearbyBuildings = this.staticQuadTree.query(rectBounds);
            for (var i = 0; i < nearbyBuildings.length; i++) {
                var building = nearbyBuildings[i];
                if (building && building.bounds) {
                    if (this.rectsIntersect(rectBounds, building.bounds)) {
                        return true;
                    }
                }
            }
        }

        return false;
    },


    // 检测两个矩形是否相交
    rectsIntersect: function (rect1, rect2) {
        return !(rect1.right <= rect2.left || rect1.left >= rect2.right || rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
    },


    // 检测两个圆形对象是否重叠（用于人物和僵尸的动态碰撞检测）
    isCirclesOverlapping: function (obj1X, obj1Y, obj1Radius, obj2X, obj2Y, obj2Radius, safetyMargin = 0.1) {
        // 计算两个圆心之间的距离
        var deltaX = obj2X - obj1X;
        var deltaY = obj2Y - obj1Y;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // 计算安全距离：两个半径之和 + 10%的安全空间
        var safeDistance = (obj1Radius + obj2Radius) * (1 + safetyMargin);

        var isOverlapping = distance < safeDistance;

        if (isOverlapping) {
            console.log('圆形重叠检测详情:', {
                obj1: {x: obj1X.toFixed(2), y: obj1Y.toFixed(2), radius: obj1Radius.toFixed(2)},
                obj2: {x: obj2X.toFixed(2), y: obj2Y.toFixed(2), radius: obj2Radius.toFixed(2)},
                distance: distance.toFixed(2),
                safeDistance: safeDistance.toFixed(2),
                overlap: (safeDistance - distance).toFixed(2)
            });
        }

        return isOverlapping;
    },

    // 检测圆形对象与对象列表的碰撞（使用四叉树优化，预留10%半径空间）
    isCircleOverlappingWithList: function (objX, objY, objRadius, objectList, safetyMargin = 0.1) {
        if (!objectList || objectList.length === 0) {
            return false;
        }

        // 直接遍历对象列表进行检测（更准确）
        for (var i = 0; i < objectList.length; i++) {
            var otherObj = objectList[i];
            if (otherObj && otherObj.x !== undefined && otherObj.y !== undefined) {
                // 使用对象的radius属性，如果没有则使用宽度的一半作为默认值
                var otherRadius = otherObj.radius || (otherObj.width || 32) / 2;

                if (this.isCirclesOverlapping(objX, objY, objRadius, otherObj.x, otherObj.y, otherRadius, safetyMargin)) {
                    return true;
                }
            }
        }

        return false;
    },

    // 检测僵尸与僵尸列表的重叠（专门优化）
    isZombieOverlappingWithZombies: function (zombieX, zombieY, zombieRadius, zombieList, safetyMargin = 0.1) {
        if (!zombieList || zombieList.length === 0) {
            return false;
        }

        for (var i = 0; i < zombieList.length; i++) {
            var otherZombie = zombieList[i];
            if (otherZombie && otherZombie.x !== undefined && otherZombie.y !== undefined && otherZombie.hp > 0) {
                var otherRadius = otherZombie.radius || (otherZombie.width || 32) / 2;

                if (this.isCirclesOverlapping(zombieX, zombieY, zombieRadius, otherZombie.x, otherZombie.y, otherRadius, safetyMargin)) {
                    console.log('僵尸重叠检测: 位置(', zombieX.toFixed(2), zombieY.toFixed(2), ') 与僵尸', otherZombie.id, '重叠');
                    return true;
                }
            }
        }

        return false;
    },

    // 检测人物与僵尸列表的重叠（专门优化）
    isCharacterOverlappingWithZombies: function (characterX, characterY, characterRadius, zombieList, safetyMargin = 0.1) {
        if (!zombieList || zombieList.length === 0) {
            return false;
        }

        for (var i = 0; i < zombieList.length; i++) {
            var zombie = zombieList[i];
            if (zombie && zombie.x !== undefined && zombie.y !== undefined && zombie.hp > 0) {
                var zombieRadius = zombie.radius || (zombie.width || 32) / 2;

                if (this.isCirclesOverlapping(characterX, characterY, characterRadius, zombie.x, zombie.y, zombieRadius, safetyMargin)) {
                    console.log('人物僵尸重叠检测: 位置(', characterX.toFixed(2), characterY.toFixed(2), ') 与僵尸', zombie.id, '重叠');
                    return true;
                }
            }
        }

        return false;
    },

    // 获取避免重叠的移动位置（只支持圆形对象）
    getNonOverlappingPosition: function (fromX, fromY, toX, toY, objectWidth, objectHeight, avoidObjects, buildingCollision, isCircle = true) {
        // 只支持圆形对象，强制使用圆形碰撞检测
        var buildingCollisionCheck = (x, y) => !this.isCircleCollidingWithBuildings(x, y, objectWidth / 2);
        var dynamicCollisionCheck = (x, y) => !this.isCircleOverlappingWithList(x, y, objectWidth / 2, avoidObjects, 0.1);

        // 首先检查建筑物碰撞
        if (buildingCollision && !buildingCollisionCheck(toX, toY)) {
            var buildingSafePos = this.getCircleSafeMovePosition(fromX, fromY, toX, toY, objectWidth / 2);
            toX = buildingSafePos.x;
            toY = buildingSafePos.y;
        }

        // 检查是否与对象重叠
        if (dynamicCollisionCheck(toX, toY)) {
            return {x: toX, y: toY};
        }

        // 如果重叠，直接返回原位置（不寻找替代位置）
        console.log('目标位置与对象重叠，保持在原位置');
        return {x: fromX, y: fromY};
    },


    // 在街道上寻找安全位置（修复街道位置计算）
    findSafePositionInStreets: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle = false) {
        if (this.currentMap.type !== 'grid') return null;

        var gridSize = this.currentMap.gridSize;
        var blockSize = this.currentMap.blockSize;
        var streetWidth = this.currentMap.streetWidth;
        var cols = this.currentMap.gridCols;
        var rows = this.currentMap.gridRows;

        console.log('在街道上寻找安全位置，配置:', {
            gridSize: gridSize, blockSize: blockSize, streetWidth: streetWidth, cols: cols, rows: rows
        });

        // 尝试在街道区域寻找位置
        var streetPositions = [];

        // 方法1：在街道交叉点寻找（网格交叉点）
        for (var col = 0; col <= cols; col++) {
            for (var row = 0; row <= rows; row++) {
                // 街道位置：网格交叉点
                var streetX = col * gridSize;
                var streetY = row * gridSize;

                // 添加边界检查
                if (streetX >= 0 && streetX < this.currentMap.mapWidth && streetY >= 0 && streetY < this.currentMap.mapHeight) {

                    // 检查街道位置是否安全（根据对象类型选择碰撞检测方法）
                    var isSafe = isCircle ? !this.isCircleCollidingWithBuildings(streetX, streetY, objectWidth / 2) : !this.isRectCollidingWithBuildings(streetX, streetY, objectWidth, objectHeight);

                    if (isSafe) {
                        var distance = Math.sqrt(Math.pow(streetX - centerX, 2) + Math.pow(streetY - centerY, 2));
                        if (distance >= minDistance && distance <= maxDistance) {
                            streetPositions.push({
                                x: streetX, y: streetY, distance: distance, type: 'crossing'
                            });
                        }
                    }
                }
            }
        }

        // 方法2：在街道中间区域寻找（建筑物之间的空隙）
        for (var col = 0; col < cols; col++) {
            for (var row = 0; row < rows; row++) {
                // 计算建筑物边界
                var buildingX = col * gridSize + gridSize / 2;
                var buildingY = row * gridSize + gridSize / 2;
                var buildingLeft = buildingX - blockSize / 2;
                var buildingRight = buildingX + blockSize / 2;
                var buildingTop = buildingY - blockSize / 2;
                var buildingBottom = buildingY + blockSize / 2;

                // 街道区域：建筑物之间的空隙
                var streetLeft = buildingRight;
                var streetRight = buildingRight + streetWidth;
                var streetTop = buildingBottom;
                var streetBottom = buildingBottom + streetWidth;

                // 检查街道区域内的几个点
                var streetTestPoints = [{x: streetLeft + streetWidth / 2, y: streetTop + streetWidth / 2}, // 街道中心
                    {x: streetLeft + 50, y: streetTop + 50}, // 街道边缘
                    {x: streetRight - 50, y: streetBottom - 50} // 街道边缘
                ];

                for (var i = 0; i < streetTestPoints.length; i++) {
                    var testPoint = streetTestPoints[i];

                    // 确保测试点在地图范围内
                    if (testPoint.x >= 0 && testPoint.x < this.currentMap.mapWidth && testPoint.y >= 0 && testPoint.y < this.currentMap.mapHeight) {

                        // 检查街道位置是否安全
                        if (!this.isRectCollidingWithBuildings(testPoint.x, testPoint.y, objectWidth, objectHeight)) {
                            var distance = Math.sqrt(Math.pow(testPoint.x - centerX, 2) + Math.pow(testPoint.y - centerY, 2));
                            if (distance >= minDistance && distance <= maxDistance) {
                                streetPositions.push({
                                    x: testPoint.x, y: testPoint.y, distance: distance, type: 'street_area'
                                });
                            }
                        }
                    }
                }
            }
        }

        // 按距离排序，返回最近的安全位置
        if (streetPositions.length > 0) {
            streetPositions.sort(function (a, b) {
                return a.distance - b.distance;
            });

            console.log('找到街道安全位置:', streetPositions[0]);
            return {x: streetPositions[0].x, y: streetPositions[0].y};
        }

        console.log('未找到街道安全位置');
        return null;
    },

    // 强制验证生成位置（确保位置真的安全，支持圆形和矩形对象）
    validateAndFixSpawnPosition: function (x, y, objectWidth, objectHeight, isCircle = false) {
        console.log('强制验证生成位置:', x, y, '对象尺寸:', objectWidth, objectHeight, '是否圆形:', isCircle);

        // 根据对象类型选择碰撞检测方法
        var collisionCheck = isCircle ? (x, y) => !this.isCircleCollidingWithBuildings(x, y, objectWidth / 2) : (x, y) => !this.isRectCollidingWithBuildings(x, y, objectWidth, objectHeight);

        // 首先检查当前位置是否安全
        if (collisionCheck(x, y)) {
            console.log('当前位置安全，无需调整');
            return {x: x, y: y, adjusted: false};
        }

        console.log('当前位置不安全，寻找替代位置');

        // 尝试在附近寻找安全位置
        var searchSteps = 16;

        for (var step = 0; step < searchSteps; step++) {
            var angle = (step * Math.PI * 2) / searchSteps;
            var distance = 50 + (step * 10); // 从50像素开始，逐步增加

            var testX = x + Math.cos(angle) * distance;
            var testY = y + Math.sin(angle) * distance;

            // 确保测试位置在地图范围内
            if (testX >= 0 && testX < this.currentMap.mapWidth && testY >= 0 && testY < this.currentMap.mapHeight) {

                if (collisionCheck(testX, testY)) {
                    console.log('找到安全的替代位置:', testX, testY, '距离:', distance);
                    return {x: testX, y: testY, adjusted: true, distance: distance};
                }
            }
        }

        // 如果还是找不到，尝试街道位置
        if (this.currentMap.type === 'grid') {
            var streetPos = this.findSafePositionInStreets(x, y, 50, 500, objectWidth, objectHeight, isCircle);
            if (streetPos) {
                console.log('在街道上找到安全位置:', streetPos);
                return {x: streetPos.x, y: streetPos.y, adjusted: true, source: 'street'};
            }
        }

        // 最后尝试地图边缘
        var edgePositions = [{x: 100, y: 100}, {x: this.currentMap.mapWidth - 100, y: 100}, {
            x: 100, y: this.currentMap.mapHeight - 100
        }, {x: this.currentMap.mapWidth - 100, y: this.currentMap.mapHeight - 100}];

        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (collisionCheck(edgePos.x, edgePos.y)) {
                console.log('在地图边缘找到安全位置:', edgePos);
                return {x: edgePos.x, y: edgePos.y, adjusted: true, source: 'edge'};
            }
        }

        console.warn('无法找到安全位置，使用默认位置');
        return {x: 100, y: 100, adjusted: true, source: 'default'};
    },

    // 在矩阵的0值区域生成安全位置（确保只在街道上生成）
    generateMatrixSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight) {

        // 获取当前地图信息
        var currentMap = null;
        if (window.MapManager && window.MapManager.getCurrentMap) {
            currentMap = window.MapManager.getCurrentMap();
        } else if (window.mapSystem && window.mapSystem.currentMap) {
            currentMap = window.mapSystem.currentMap;
        }

        if (!currentMap || !currentMap.matrix || !currentMap.config) {
            console.warn('无法获取矩阵地图数据，使用传统方法');
            return this.generateGameSafePosition(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight);
        }

        var matrix = currentMap.matrix;
        var cellSize = currentMap.config.cellSize;
        var mapWidth = currentMap.config.width;
        var mapHeight = currentMap.config.height;

        // 寻找矩阵中值为0的区域（街道）
        var walkableCells = [];
        for (var row = 0; row < matrix.length; row++) {
            for (var col = 0; col < matrix[row].length; col++) {
                if (matrix[row][col] === 0) {
                    // 计算单元格中心坐标
                    var cellCenterX = (col + 0.5) * cellSize;
                    var cellCenterY = (row + 0.5) * cellSize;

                    // 检查这个位置是否在地图范围内
                    if (cellCenterX >= 0 && cellCenterX < mapWidth && cellCenterY >= 0 && cellCenterY < mapHeight) {
                        walkableCells.push({
                            x: cellCenterX, y: cellCenterY, row: row, col: col
                        });
                    }
                }
            }
        }

        console.log('找到可通行单元格数量:', walkableCells.length);

        if (walkableCells.length === 0) {
            console.warn('没有找到可通行的单元格，使用传统方法');
            return this.generateGameSafePosition(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight);
        }

        // 计算与中心点的距离，找到合适的生成位置
        var bestPositions = [];
        for (var i = 0; i < walkableCells.length; i++) {
            var cell = walkableCells[i];
            var distance = Math.sqrt(Math.pow(cell.x - centerX, 2) + Math.pow(cell.y - centerY, 2));

            if (distance >= minDistance && distance <= maxDistance) {
                bestPositions.push({
                    x: cell.x, y: cell.y, distance: distance, priority: 1
                });
            } else if (distance < minDistance) {
                // 距离太近，但优先级较低
                bestPositions.push({
                    x: cell.x, y: cell.y, distance: distance, priority: 2
                });
            } else {
                // 距离太远，优先级最低
                bestPositions.push({
                    x: cell.x, y: cell.y, distance: distance, priority: 3
                });
            }
        }

        // 按优先级和距离排序
        bestPositions.sort(function (a, b) {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return a.distance - b.distance;
        });

        // 选择最佳位置
        if (bestPositions.length > 0) {
            var bestPos = bestPositions[0];
            console.log('✅ 在矩阵0值区域找到最佳位置:', bestPos);
            return {x: bestPos.x, y: bestPos.y, adjusted: false, source: 'matrix'};
        }

        // 如果没有找到合适距离的位置，选择最近的0值区域
        walkableCells.sort(function (a, b) {
            var distA = Math.sqrt(Math.pow(a.x - centerX, 2) + Math.pow(a.y - centerY, 2));
            var distB = Math.sqrt(Math.pow(b.x - centerX, 2) + Math.pow(b.y - centerY, 2));
            return distA - distB;
        });

        if (walkableCells.length > 0) {
            var nearestPos = walkableCells[0];
            console.log('✅ 选择最近的0值区域:', nearestPos);
            return {x: nearestPos.x, y: nearestPos.y, adjusted: true, source: 'matrix_nearest'};
        }

        console.warn('矩阵方法失败，使用传统方法');
        return this.generateGameSafePosition(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight);
    },

    // 游戏中的安全位置生成（强制验证，确保不会生成在建筑物上，支持圆形和矩形对象）
    generateGameSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle = false) {
        console.log('=== 生成游戏安全位置 ===');
        console.log('参数:', {centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle});

        // 根据对象类型选择碰撞检测方法
        var collisionCheck = isCircle ? (x, y) => !this.isCircleCollidingWithBuildings(x, y, objectWidth / 2) : (x, y) => !this.isRectCollidingWithBuildings(x, y, objectWidth, objectHeight);

        // 优先尝试使用矩阵方法（确保只在0值区域生成）
        try {
            var matrixPos = this.generateMatrixSafePosition(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight);
            if (matrixPos && matrixPos.source && matrixPos.source.startsWith('matrix')) {
                console.log('✅ 矩阵方法成功，返回位置:', matrixPos);
                return matrixPos;
            }
        } catch (error) {
            console.warn('矩阵方法失败，使用传统方法:', error);
        }

        // 如果矩阵方法失败，使用传统方法
        console.log('使用传统方法寻找安全位置');
        var safePos = this.findSafePosition(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle);

        if (safePos) {
            // 强制验证找到的位置是否真的安全
            var isReallySafe = collisionCheck(safePos.x, safePos.y);

            if (isReallySafe) {
                console.log('✅ 找到安全位置:', safePos);
                return safePos;
            } else {
                console.log('❌ 找到的位置不安全，重新寻找');
            }
        }

        // 如果标准方法失败，使用强制验证方法
        console.log('使用强制验证方法寻找安全位置');
        var validatedPos = this.validateAndFixSpawnPosition(centerX, centerY, objectWidth, objectHeight, isCircle);

        if (validatedPos && !validatedPos.adjusted) {
            console.log('✅ 当前位置安全:', validatedPos);
            return validatedPos;
        } else if (validatedPos && validatedPos.adjusted) {
            console.log('✅ 找到替代安全位置:', validatedPos);
            return validatedPos;
        }

        // 最后的备选方案：在地图边缘寻找
        console.log('尝试在地图边缘寻找安全位置');
        var mapDimensions = this.getCurrentMapDimensions();
        var edgePositions = [{x: 100, y: 100}, {x: mapDimensions.width - 100, y: 100}, {
            x: 100, y: mapDimensions.height - 100
        }, {x: mapDimensions.width - 100, y: mapDimensions.height - 100}];

        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (collisionCheck(edgePos.x, edgePos.y)) {
                console.log('✅ 在地图边缘找到安全位置:', edgePos);
                return edgePos;
            }
        }

        // 如果还是找不到，使用默认位置并强制调整
        console.log('⚠️ 使用默认位置并强制调整');
        var defaultPos = {x: 100, y: 100};
        var adjustedPos = this.validateAndFixSpawnPosition(defaultPos.x, defaultPos.y, objectWidth, objectHeight, isCircle);

        console.log('最终安全位置:', adjustedPos);
        return adjustedPos;
    },

    // 获取树的深度
    getTreeDepth: function (node) {
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
    countTreeNodes: function (node) {
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

    // 定期重建动态四叉树（每帧调用，确保数据一致性）
    updateDynamicQuadTree: function (characters, zombies) {
        if (!this.dynamicQuadTree) {
            console.warn('动态四叉树未初始化');
            return false;
        }

        // 清理无效对象
        var cleanedCount = this.cleanupInvalidObjects();
        if (cleanedCount > 0) {
            console.log('清理了', cleanedCount, '个无效对象');
        }

        // 清理生命周期管理器中的无效对象
        this.objectLifecycleManager.cleanup();

        // 智能缓存清理：只在必要时清理
        if (this._shouldClearCache(characters, zombies)) {
            this.clearObjectIdCache();
            console.log('缓存已清理');
        }

        // 清空动态四叉树
        this.dynamicQuadTree.clear();

        var addedCount = 0;
        var skippedCount = 0;
        var invalidCount = 0;

        // 插入人物
        if (characters && characters.length > 0) {
            for (var i = 0; i < characters.length; i++) {
                var character = characters[i];
                if (this.isObjectValid(character)) {
                    if (this.dynamicQuadTree.insert(character)) {
                        addedCount++;
                        // 确保对象有四叉树标识，使用递增ID避免重复
                        if (!character._quadTreeId) {
                            character._quadTreeId = 'char_' + this._getNextObjectId();
                            character._quadTreeType = 'character';
                            character._quadTreeAddedTime = Date.now();
                        }
                        // 注册到生命周期管理器
                        this.registerObject(character, 'character');
                    }
                } else {
                    invalidCount++;
                }
            }
        }

        // 插入僵尸
        if (zombies && zombies.length > 0) {
            for (var j = 0; j < zombies.length; j++) {
                var zombie = zombies[j];
                if (this.isObjectValid(zombie)) {
                    if (this.dynamicQuadTree.insert(zombie)) {
                        addedCount++;
                        // 确保对象有四叉树标识，使用递增ID避免重复
                        if (!zombie._quadTreeId) {
                            zombie._quadTreeId = 'zombie_' + this._getNextObjectId();
                            zombie._quadTreeType = 'zombie';
                            zombie._quadTreeAddedTime = Date.now();
                        }
                        // 注册到生命周期管理器
                        this.registerObject(zombie, 'zombie');
                    }
                } else {
                    invalidCount++;
                }
            }
        }

        // 记录更新统计
        if (addedCount > 0 || skippedCount > 0 || invalidCount > 0) {
            console.log('动态四叉树更新完成 - 添加:', addedCount, '跳过:', skippedCount, '无效:', invalidCount);
        }

        return addedCount > 0;
    },

    // 智能更新动态四叉树（只更新变化的对象，提高性能）
    smartUpdateDynamicQuadTree: function (characters, zombies) {
        if (!this.dynamicQuadTree) {
            return this.updateDynamicQuadTree(characters, zombies);
        }

        var updatedCount = 0;
        var addedCount = 0;
        var removedCount = 0;
        var unchangedCount = 0;

        // 获取当前四叉树中的所有对象
        var currentObjects = this.getAllDynamicObjects();
        var currentObjectMap = new Map();

        // 建立当前对象映射
        for (var i = 0; i < currentObjects.length; i++) {
            var obj = currentObjects[i];
            if (obj._quadTreeId) {
                currentObjectMap.set(obj._quadTreeId, obj);
            }
        }

        // 处理所有对象
        var allObjects = [];
        if (characters) allObjects = allObjects.concat(characters);
        if (zombies) allObjects = allObjects.concat(zombies);

        var newObjectMap = new Map();
        for (var j = 0; j < allObjects.length; j++) {
            var obj = allObjects[j];
            if (this.isObjectValid(obj)) {
                var objId = obj._quadTreeId || obj.id;
                newObjectMap.set(objId, obj);

                // 检查对象是否已在四叉树中
                if (!obj._quadTreeId || !currentObjectMap.has(obj._quadTreeId)) {
                    // 新对象，需要添加
                    if (this.addDynamicObject(obj)) {
                        addedCount++;
                    }
                } else {
                    // 现有对象，检查位置是否变化
                    var currentObj = currentObjectMap.get(obj._quadTreeId);
                    if (currentObj.x !== obj.x || currentObj.y !== obj.y) {
                        // 位置变化，需要更新
                        this.updateDynamicObjectPosition(obj, currentObj.x, currentObj.y, obj.x, obj.y);
                        updatedCount++;
                        // 更新生命周期管理器
                        this.objectLifecycleManager.update(obj);
                    } else {
                        unchangedCount++;
                    }
                }
            }
        }

        // 移除不再存在的对象
        for (var [id, obj] of currentObjectMap) {
            if (!newObjectMap.has(id)) {
                this.removeDynamicObject(obj);
                this.unregisterObject(obj);
                removedCount++;
            }
        }

        if (addedCount > 0 || updatedCount > 0 || removedCount > 0) {
            console.log('智能四叉树更新完成 - 添加:', addedCount, '更新:', updatedCount, '移除:', removedCount, '未变:', unchangedCount);
        }

        return addedCount > 0 || updatedCount > 0 || removedCount > 0;
    },

    // 性能优化的四叉树更新（根据变化程度选择更新策略）
    optimizedUpdateDynamicQuadTree: function (characters, zombies) {
        // 计算变化程度
        var changeRatio = this.calculateChangeRatio(characters, zombies);

        if (changeRatio > 0.3) {
            // 变化较大，使用完全重建
            console.log('变化较大，使用完全重建策略');
            return this.updateDynamicQuadTree(characters, zombies);
        } else if (changeRatio > 0.1) {
            // 变化中等，使用智能更新
            console.log('变化中等，使用智能更新策略');
            return this.smartUpdateDynamicQuadTree(characters, zombies);
        } else {
            // 变化很小，只更新必要的对象
            console.log('变化很小，使用增量更新策略');
            return this.incrementalUpdateDynamicQuadTree(characters, zombies);
        }
    },

    // 计算变化比例
    calculateChangeRatio: function (characters, zombies) {
        var totalObjects = 0;
        var changedObjects = 0;

        var allObjects = [];
        if (characters) allObjects = allObjects.concat(characters);
        if (zombies) allObjects = allObjects.concat(zombies);

        for (var i = 0; i < allObjects.length; i++) {
            var obj = allObjects[i];
            if (this.isObjectValid(obj)) {
                totalObjects++;
                if (obj._quadTreeId) {
                    // 检查位置是否变化
                    var currentObj = this.getObjectById(obj._quadTreeId);
                    if (currentObj && (currentObj.x !== obj.x || currentObj.y !== obj.y)) {
                        changedObjects++;
                    }
                } else {
                    // 新对象
                    changedObjects++;
                }
            }
        }

        return totalObjects > 0 ? changedObjects / totalObjects : 0;
    },

    // 增量更新（只更新变化的对象）
    incrementalUpdateDynamicQuadTree: function (characters, zombies) {
        var updatedCount = 0;

        var allObjects = [];
        if (characters) allObjects = allObjects.concat(characters);
        if (zombies) allObjects = allObjects.concat(zombies);

        for (var i = 0; i < allObjects.length; i++) {
            var obj = allObjects[i];
            if (this.isObjectValid(obj)) {
                if (obj._quadTreeId) {
                    // 现有对象，检查是否需要更新
                    var currentObj = this.getObjectById(obj._quadTreeId);
                    if (currentObj && (currentObj.x !== obj.x || currentObj.y !== obj.y)) {
                        this.updateDynamicObjectPosition(obj, currentObj.x, currentObj.y, obj.x, obj.y);
                        updatedCount++;
                    }
                } else {
                    // 新对象，添加到四叉树
                    this.addDynamicObject(obj);
                    updatedCount++;
                }
            }
        }

        if (updatedCount > 0) {
            console.log('增量更新完成，更新对象数量:', updatedCount);
        }

        return updatedCount > 0;
    },

    // 根据ID获取对象（优化版本）
    getObjectById: function (id) {
        // 使用缓存提高性能
        if (!this._objectIdCache) {
            this._objectIdCache = new Map();
        }

        // 检查缓存
        if (this._objectIdCache.has(id)) {
            var cachedObj = this._objectIdCache.get(id);
            // 验证缓存的对象是否仍然有效
            if (cachedObj && cachedObj._quadTreeId === id) {
                return cachedObj;
            } else {
                // 缓存失效，移除
                this._objectIdCache.delete(id);
            }
        }

        // 从四叉树中查找
        var allObjects = this.getAllDynamicObjects();
        for (var i = 0; i < allObjects.length; i++) {
            var obj = allObjects[i];
            if (obj._quadTreeId === id) {
                // 更新缓存
                this._objectIdCache.set(id, obj);
                return obj;
            }
        }

        return null;
    },

    // 清理对象ID缓存
    clearObjectIdCache: function () {
        if (this._objectIdCache) {
            this._objectIdCache.clear();
        }
    },

    // 从缓存中移除对象
    removeFromObjectIdCache: function (id) {
        if (this._objectIdCache && this._objectIdCache.has(id)) {
            this._objectIdCache.delete(id);
        }
    },

    // 计算四叉树中的对象数量
    countTreeObjects: function (node) {
        if (!node) return 0;

        var count = node.objects.length;
        if (node.isDivided) {
            for (var i = 0; i < node.children.length; i++) {
                count += this.countTreeObjects(node.children[i]);
            }
        }
        return count;
    },

    // 智能缓存清理：只在必要时清理
    _shouldClearCache: function (characters, zombies) {
        // 缓存清理策略优化：减少不必要的计算
        var currentObjectCount = this._objectIdCache ? this._objectIdCache.size : 0;

        // 只在对象数量变化显著时才计算新数量
        if (currentObjectCount === 0) {
            return false; // 缓存为空时不需要清理
        }

        // 如果缓存过大，直接清理
        if (currentObjectCount > 1000) {
            return true;
        }

        // 计算对象数量变化
        var newObjectCount = (characters ? characters.length : 0) + (zombies ? zombies.length : 0);

        // 对象数量变化超过50%时清理缓存
        if (currentObjectCount > 0) {
            var changeRatio = Math.abs(newObjectCount - currentObjectCount) / currentObjectCount;
            if (changeRatio > 0.5) {
                return true;
            }
        }

        return false;
    },

    // 获取下一个对象ID
    _getNextObjectId: function () {
        // 使用递增计数器确保ID唯一性
        this._objectIdCounter = (this._objectIdCounter || 0) + 1;
        return this._objectIdCounter;
    },

    // 动态更新地图数据（用于地图切换）
    updateMapData: function (mapId) {
        console.log('🔄 更新碰撞检测系统地图数据:', mapId);

        if (!mapId) {
            console.warn('地图ID为空，无法更新');
            return false;
        }

        // 清理现有的静态四叉树
        if (this.staticQuadTree) {
            this.staticQuadTree.clear();
            console.log('已清理现有静态四叉树');
        }

        // 重新初始化地图配置
        this.init(mapId);

        return true;
    },

    // 获取当前地图信息
    getCurrentMapInfo: function () {
        if (!this.currentMap) {
            return null;
        }

        return {
            name: this.currentMap.name, type: this.currentMap.type, dimensions: {
                width: this.currentMap.mapWidth,
                height: this.currentMap.mapHeight,
                cellSize: this.currentMap.cellSize,
                gridCols: this.currentMap.gridCols,
                gridRows: this.currentMap.gridRows
            }, quadTreeInfo: {
                staticTreeExists: !!this.staticQuadTree,
                dynamicTreeExists: !!this.dynamicQuadTree,
                staticObjectCount: this.staticQuadTree ? this.countTreeObjects(this.staticQuadTree) : 0,
                dynamicObjectCount: this.dynamicQuadTree ? this.countTreeObjects(this.dynamicQuadTree) : 0
            }
        };
    },

    // 验证碰撞检测系统状态
    validateSystem: function () {
        const validation = {
            isValid: true, errors: [], warnings: []
        };

        // 检查地图配置
        if (!this.currentMap) {
            validation.isValid = false;
            validation.errors.push('地图配置未初始化');
        }

        // 检查四叉树
        if (!this.staticQuadTree) {
            validation.isValid = false;
            validation.errors.push('静态四叉树未初始化');
        }

        if (!this.dynamicQuadTree) {
            validation.isValid = false;
            validation.errors.push('动态四叉树未初始化');
        }

        // 检查碰撞检测状态
        if (!this._collisionEnabled) {
            validation.warnings.push('碰撞检测未启用');
        }

        // 检查地图管理器
        if (!this.mapManager) {
            validation.warnings.push('地图管理器未连接');
        }

        return validation;
    },

    // 检测圆形是否与建筑物碰撞（用于人物和僵尸的静态碰撞检测）
    isCircleCollidingWithBuildings: function (circleX, circleY, circleRadius) {
        if (!this._collisionEnabled) {
            return false;
        }

        // 使用1.1倍半径进行检测，让贴墙移动更平滑
        var detectionRadius = circleRadius * 1.1;

        // 获取当前地图信息
        var currentMap = null;
        if (window.MapManager && window.MapManager.getCurrentMap) {
            currentMap = window.MapManager.getCurrentMap();
        } else if (window.mapSystem && window.mapSystem.currentMap) {
            currentMap = window.mapSystem.currentMap;
        }

        if (!currentMap) {
            console.warn('无法获取地图信息，跳过碰撞检测');
            return false;
        }

        // 边界检查
        var mapDimensions = this.getCurrentMapDimensions();
        var mapWidth = mapDimensions.width;
        var mapHeight = mapDimensions.height;

        // 检查圆形是否超出地图边界
        if (circleX - detectionRadius < 0 || circleY - detectionRadius < 0 || circleX + detectionRadius >= mapWidth || circleY + detectionRadius >= mapHeight) {
            return true; // 超出地图边界视为碰撞
        }

        // 检查是否与建筑物重叠
        if (currentMap.buildings && currentMap.buildings.length > 0) {
            for (var i = 0; i < currentMap.buildings.length; i++) {
                var building = currentMap.buildings[i];
                if (building && building.bounds) {
                    if (this.circleRectIntersect(circleX, circleY, detectionRadius, building.bounds)) {
                        return true;
                    }
                }
            }
        }

        // 如果使用四叉树，也检查四叉树中的建筑物
        if (this.staticQuadTree) {
            var range = {
                left: circleX - detectionRadius,
                right: circleX + detectionRadius,
                top: circleY - detectionRadius,
                bottom: circleY + detectionRadius
            };
            var nearbyBuildings = this.staticQuadTree.query(range);
            for (var i = 0; i < nearbyBuildings.length; i++) {
                var building = nearbyBuildings[i];
                if (building && building.bounds) {
                    if (this.circleRectIntersect(circleX, circleY, detectionRadius, building.bounds)) {
                        return true;
                    }
                }
            }
        }

        return false;
    },

    // 检测圆形与矩形是否相交
    circleRectIntersect: function (circleX, circleY, circleRadius, rect) {
        // 找到矩形上距离圆心最近的点
        var closestX = Math.max(rect.left, Math.min(circleX, rect.right));
        var closestY = Math.max(rect.top, Math.min(circleY, rect.bottom));

        // 计算圆心到最近点的距离
        var distanceX = circleX - closestX;
        var distanceY = circleY - closestY;
        var distanceSquared = distanceX * distanceX + distanceY * distanceY;

        // 如果距离小于半径，则相交
        return distanceSquared < (circleRadius * circleRadius);
    },

    // 获取圆形对象的平滑移动位置（支持墙体滑动）
    getCircleSafeMovePosition: function (fromX, fromY, toX, toY, circleRadius) {
        // 检查目标位置是否安全
        if (!this.isCircleCollidingWithBuildings(toX, toY, circleRadius)) {
            return {x: toX, y: toY};
        }

        // 如果目标位置不安全，尝试墙体滑动
        var slideResult = this.getWallSlidePosition(fromX, fromY, toX, toY, circleRadius);
        if (slideResult) {
            return slideResult;
        }

        // 如果无法滑动，返回原位置
        return {x: fromX, y: fromY};
    },

    // 获取墙体滑动位置（优化版本）
    getWallSlidePosition: function (fromX, fromY, toX, toY, circleRadius) {
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance === 0) return null;

        // 计算移动方向
        var dirX = deltaX / distance;
        var dirY = deltaY / distance;

        // 优先尝试主要方向的滑动
        var primarySlide = this.tryPrimarySlide(fromX, fromY, deltaX, deltaY, circleRadius);
        if (primarySlide) return primarySlide;

        // 尝试对角线滑动
        var diagonalSlide = this.tryDiagonalSlide(fromX, fromY, dirX, dirY, distance, circleRadius);
        if (diagonalSlide) return diagonalSlide;

        return null;
    },

    // 尝试主要方向滑动
    tryPrimarySlide: function (fromX, fromY, deltaX, deltaY, circleRadius) {
        // 尝试X轴滑动（保持Y方向移动）
        var slideX = fromX + deltaX;
        var slideY = fromY;
        if (!this.isCircleCollidingWithBuildings(slideX, slideY, circleRadius)) {
            return {x: slideX, y: slideY, type: 'slide_x'};
        }

        // 尝试Y轴滑动（保持X方向移动）
        slideX = fromX;
        slideY = fromY + deltaY;
        if (!this.isCircleCollidingWithBuildings(slideX, slideY, circleRadius)) {
            return {x: slideX, y: slideY, type: 'slide_y'};
        }

        return null;
    },

    // 尝试对角线滑动
    tryDiagonalSlide: function (fromX, fromY, dirX, dirY, distance, circleRadius) {
        // 滑动距离限制，避免过度滑动
        var maxSlideDistance = Math.min(distance * 0.8, circleRadius * 0.6);

        // 测试多个滑动距离
        var testDistances = [maxSlideDistance, maxSlideDistance * 0.8, maxSlideDistance * 0.6, maxSlideDistance * 0.4];

        for (var i = 0; i < testDistances.length; i++) {
            var slideDistance = testDistances[i];

            // 测试X方向滑动
            var slideX = fromX + dirX * slideDistance;
            var slideY = fromY;
            if (!this.isCircleCollidingWithBuildings(slideX, slideY, circleRadius)) {
                return {x: slideX, y: slideY, type: 'slide_x_limited', distance: slideDistance};
            }

            // 测试Y方向滑动
            slideX = fromX;
            slideY = fromY + dirY * slideDistance;
            if (!this.isCircleCollidingWithBuildings(slideX, slideY, circleRadius)) {
                return {x: slideX, y: slideY, type: 'slide_y_limited', distance: slideDistance};
            }
        }

        return null;
    },

    // 寻找安全的生成位置（只支持圆形对象）
    findSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle = true) {
        console.log('寻找安全位置，中心:', centerX, centerY, '对象尺寸:', objectWidth, objectHeight, '是否圆形:', isCircle);

        // 只支持圆形对象，强制使用圆形碰撞检测
        var collisionCheck = (x, y) => !this.isCircleCollidingWithBuildings(x, y, objectWidth / 2);

        // 首先尝试在街道上寻找位置
        if (this.currentMap.type === 'grid') {
            var safePos = this.findSafePositionInStreets(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle);
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
            if (testX >= 0 && testX < this.currentMap.mapWidth && testY >= 0 && testY < this.currentMap.mapHeight) {

                if (collisionCheck(testX, testY)) {
                    console.log('找到随机安全位置:', testX, testY, '尝试次数:', attempt + 1);
                    return {x: testX, y: testY};
                }
            }
        }

        // 如果还是找不到，尝试在地图边缘寻找
        var edgePositions = [{x: 100, y: 100}, {x: this.currentMap.mapWidth - 100, y: 100}, {
            x: 100, y: this.currentMap.mapHeight - 100
        }, {x: this.currentMap.mapWidth - 100, y: this.currentMap.mapHeight - 100}];

        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (collisionCheck(edgePos.x, edgePos.y)) {
                console.log('在地图边缘找到安全位置:', edgePos);
                return edgePos;
            }
        }

        // 最后尝试在中心点附近寻找
        var centerPositions = [{x: centerX, y: centerY}, {x: centerX + 50, y: centerY}, {
            x: centerX - 50, y: centerY
        }, {x: centerX, y: centerY + 50}, {x: centerX, y: centerY - 50}];

        for (var j = 0; j < centerPositions.length; j++) {
            var centerPos = centerPositions[j];
            if (centerPos.x >= 0 && centerPos.x < this.currentMap.mapWidth && centerPos.y >= 0 && centerPos.y < this.currentMap.mapHeight) {
                if (collisionCheck(centerPos.x, centerPos.y)) {
                    console.log('在中心点附近找到安全位置:', centerPos);
                    return centerPos;
                }
            }
        }

        console.warn('无法找到安全位置，使用默认位置');
        return {x: 100, y: 100};
    },
};

// ==================== 动态障碍物管理系统 ====================
/**
 * 动态障碍物类 - 管理可移动的障碍物（如车辆、临时物体等）
 */
function DynamicObstacle(id, x, y, width, height, type) {
    this.id = id; // 唯一标识
    this.x = x; // 中心点X
    this.y = y; // 中心点Y
    this.width = width; // 碰撞盒宽度
    this.height = height; // 碰撞盒高度
    this.type = type; // 类型（如"car"、"tree"、"barrier"）
    this.isActive = true; // 是否激活
    this.lastUpdateTime = Date.now(); // 最后更新时间

    // 计算边界框（用于四叉树查询）
    this.bounds = {
        left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2
    };

    // 移动相关属性
    this.velocity = {x: 0, y: 0}; // 移动速度
    this.targetPosition = {x: x, y: y}; // 目标位置
    this.isMoving = false; // 是否在移动
}

/**
 * 更新动态障碍物位置
 * @param {number} newX - 新X坐标
 * @param {number} newY - 新Y坐标
 */
DynamicObstacle.prototype.updatePosition = function (newX, newY) {
    this.x = newX;
    this.y = newY;

    // 更新边界框
    this.bounds.left = newX - this.width / 2;
    this.bounds.right = newX + this.width / 2;
    this.bounds.top = newY - this.height / 2;
    this.bounds.bottom = newY + this.height / 2;

    this.lastUpdateTime = Date.now();
};


/**
 * 更新移动
 * @param {number} deltaTime - 时间增量
 * @param {number} moveSpeed - 移动速度
 */
DynamicObstacle.prototype.updateMovement = function (deltaTime, moveSpeed) {
    if (!this.isMoving) return;

    const deltaX = this.targetPosition.x - this.x;
    const deltaY = this.targetPosition.y - this.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < moveSpeed * deltaTime) {
        // 到达目标位置
        this.updatePosition(this.targetPosition.x, this.targetPosition.y);
        this.isMoving = false;
        this.velocity = {x: 0, y: 0};
    } else {
        // 继续移动
        const moveDistance = moveSpeed * deltaTime;
        const newX = this.x + this.velocity.x * moveDistance;
        const newY = this.y + this.velocity.y * moveDistance;
        this.updatePosition(newX, newY);
    }
};


/**
 * 动态障碍物管理器 - 结合四叉树管理动态障碍物
 */
function DynamicObstacleManager(mapWidth, mapHeight) {
    // 初始化根四叉树（覆盖整个地图）
    this.rootQuadTree = new QuadTreeNode(0, 0, mapWidth, mapHeight, 6, 0);
    this.rootQuadTree.maxObjects = 8;

    this.obstacles = new Map(); // 存储所有动态障碍物（id -> 实例）
    this.obstacleTypes = new Map(); // 按类型分组的障碍物

    // 性能统计
    this.stats = {
        totalObstacles: 0, activeObstacles: 0, lastUpdateTime: Date.now()
    };
}

/**
 * 添加动态障碍物
 * @param {DynamicObstacle} obstacle - 障碍物实例
 */
DynamicObstacleManager.prototype.addObstacle = function (obstacle) {
    if (!obstacle || !obstacle.id) {
        console.warn('[DynamicObstacleManager] 无效的障碍物:', obstacle);
        return false;
    }

    this.obstacles.set(obstacle.id, obstacle);
    this.rootQuadTree.insert(obstacle);

    // 按类型分组
    if (!this.obstacleTypes.has(obstacle.type)) {
        this.obstacleTypes.set(obstacle.type, []);
    }
    this.obstacleTypes.get(obstacle.type).push(obstacle);

    this.stats.totalObstacles++;
    this.stats.activeObstacles++;

    console.log(`[DynamicObstacleManager] 添加障碍物: ${obstacle.type} (${obstacle.id})`);
    return true;
};

/**
 * 移除动态障碍物
 * @param {string} id - 障碍物ID
 */
DynamicObstacleManager.prototype.removeObstacle = function (id) {
    const obstacle = this.obstacles.get(id);
    if (!obstacle) return false;

    // 从四叉树中移除
    this.rootQuadTree.remove(obstacle);

    // 从类型分组中移除
    const typeList = this.obstacleTypes.get(obstacle.type);
    if (typeList) {
        const index = typeList.indexOf(obstacle);
        if (index > -1) {
            typeList.splice(index, 1);
        }
    }

    // 从主映射中移除
    this.obstacles.delete(id);

    this.stats.totalObstacles--;
    if (obstacle.isActive) {
        this.stats.activeObstacles--;
    }

    console.log(`[DynamicObstacleManager] 移除障碍物: ${obstacle.type} (${id})`);
    return true;
};


/**
 * 更新所有动态障碍物
 * @param {number} deltaTime - 时间增量
 */
DynamicObstacleManager.prototype.updateAllObstacles = function (deltaTime) {
    let updatedCount = 0;

    this.obstacles.forEach(obstacle => {
        if (obstacle.isActive && obstacle.isMoving) {
            obstacle.updateMovement(deltaTime, 100); // 默认移动速度100像素/秒
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        this.stats.lastUpdateTime = Date.now();
    }

    return updatedCount;
};

/**
 * 清理无效的障碍物
 * @returns {number} 清理的数量
 */
DynamicObstacleManager.prototype.cleanupInvalidObstacles = function () {
    const currentTime = Date.now();
    const maxAge = 30000; // 30秒无更新则视为无效
    let cleanedCount = 0;

    for (const [id, obstacle] of this.obstacles) {
        if (currentTime - obstacle.lastUpdateTime > maxAge) {
            this.removeObstacle(id);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(`[DynamicObstacleManager] 清理了 ${cleanedCount} 个无效障碍物`);
    }

    return cleanedCount;
};

/**
 * 获取统计信息
 * @returns {Object} 统计信息
 */
DynamicObstacleManager.prototype.getStats = function () {
    return {
        ...this.stats, obstacleTypes: Array.from(this.obstacleTypes.keys()).map(type => ({
            type: type, count: this.obstacleTypes.get(type).length
        }))
    };
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollisionSystem;
} else if (typeof window !== 'undefined') {
    window.CollisionSystem = CollisionSystem;
    window.DynamicObstacle = DynamicObstacle;
    window.DynamicObstacleManager = DynamicObstacleManager;

    // 添加全局访问方法
    window.collisionSystem = CollisionSystem;

    // 提供便捷的全局方法
    window.initCollisionSystem = function (mapId) {
        return CollisionSystem.init(mapId);
    };

    window.updateCollisionMap = function (mapId) {
        return CollisionSystem.updateMapData(mapId);
    };

    window.getCollisionMapInfo = function () {
        return CollisionSystem.getCurrentMapInfo();
    };

    window.validateCollisionSystem = function () {
        return CollisionSystem.validateSystem();
    };

    console.log('✅ 碰撞检测系统已全局注册，可用方法:');

}


