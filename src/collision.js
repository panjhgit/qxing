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

    // 地图配置集合
    maps: {
        // 主地图：8x8网格，建筑物750x750，街道500像素
        'main': {
            name: '主地图', type: 'grid', blockSize: 750, streetWidth: 500, gridSize: 1250,      // 750 + 500
            gridCols: 8, gridRows: 8, mapWidth: 10000,     // 8 * 1250
            mapHeight: 10000, buildingTypes: ['民房', '别墅', '医院', '商店', '学校', '警察局']
        },

        // 子地图配置保持不变...
        'submap1': {
            name: '子地图1',
            type: 'irregular',
            mapWidth: 6000,
            mapHeight: 6000,
            buildings: [{x: 500, y: 300, width: 800, height: 600, type: '工厂'}, {
                x: 1500,
                y: 200,
                width: 600,
                height: 500,
                type: '仓库'
            }, {x: 2500, y: 800, width: 700, height: 400, type: '宿舍'}, {
                x: 800,
                y: 1200,
                width: 500,
                height: 300,
                type: '食堂'
            }, {x: 2000, y: 1500, width: 900, height: 700, type: '办公楼'}, {
                x: 3500,
                y: 400,
                width: 400,
                height: 400,
                type: '小卖部'
            }, {x: 400, y: 1800, width: 600, height: 500, type: '健身房'}, {
                x: 3000,
                y: 1200,
                width: 800,
                height: 600,
                type: '会议室'
            }]
        },

        'submap2': {
            name: '子地图2',
            type: 'irregular',
            mapWidth: 4000,
            mapHeight: 4000,
            buildings: [{x: 200, y: 150, width: 600, height: 500, type: '商场'}, {
                x: 1000,
                y: 100,
                width: 800,
                height: 600,
                type: '电影院'
            }, {x: 2000, y: 300, width: 500, height: 400, type: '餐厅'}, {
                x: 300,
                y: 800,
                width: 700,
                height: 500,
                type: '银行'
            }, {x: 1200, y: 800, width: 600, height: 400, type: '咖啡厅'}, {
                x: 2000,
                y: 900,
                width: 900,
                height: 700,
                type: '购物中心'
            }, {x: 500, y: 1500, width: 400, height: 300, type: '书店'}, {
                x: 1500,
                y: 1400,
                width: 500,
                height: 600,
                type: '游戏厅'
            }]
        },

        'submap3': {
            name: '子地图3',
            type: 'irregular',
            mapWidth: 2400,
            mapHeight: 2400,
            buildings: [{x: 100, y: 100, width: 500, height: 400, type: '公园'}, {
                x: 700,
                y: 50,
                width: 600,
                height: 500,
                type: '游乐场'
            }, {x: 1400, y: 200, width: 400, height: 300, type: '图书馆'}, {
                x: 200,
                y: 600,
                width: 700,
                height: 500,
                type: '博物馆'
            }, {x: 1000, y: 700, width: 500, height: 400, type: '艺术馆'}, {
                x: 1600,
                y: 700,
                width: 600,
                height: 500,
                type: '科技馆'
            }, {x: 300, y: 1200, width: 400, height: 300, type: '休息区'}, {
                x: 800,
                y: 1300,
                width: 600,
                height: 400,
                type: '观景台'
            }]
        },

        'submap4': {
            name: '子地图4',
            type: 'irregular',
            mapWidth: 1500,
            mapHeight: 1500,
            buildings: [{x: 50, y: 50, width: 300, height: 250, type: '加油站'}, {
                x: 400,
                y: 100,
                width: 400,
                height: 300,
                type: '修理厂'
            }, {x: 900, y: 80, width: 350, height: 280, type: '停车场'}, {
                x: 150,
                y: 400,
                width: 500,
                height: 400,
                type: '服务站'
            }, {x: 700, y: 450, width: 300, height: 250, type: '洗车店'}, {
                x: 1100,
                y: 400,
                width: 250,
                height: 200,
                type: '便利店'
            }, {x: 200, y: 900, width: 400, height: 300, type: '休息室'}, {
                x: 700,
                y: 800,
                width: 350,
                height: 280,
                type: '工具间'
            }]
        }
    },

    // 初始化碰撞检测系统
    init: function (mapId) {
        if (!mapId) {
            mapId = 'main';
        }

        if (!this.maps[mapId]) {
            console.error('未知地图ID:', mapId);
            return false;
        }

        this.currentMap = this.maps[mapId];

        // 强制启用建筑物碰撞检测，禁用调试模式
        this.debugMode = false;
        this._collisionEnabled = true;
        console.log('✅ 建筑物碰撞检测已强制启用，调试模式已禁用');

        // 初始化静态四叉树（建筑物）
        this.initStaticQuadTree();

        // 初始化动态四叉树（人物、僵尸）
        this.initDynamicQuadTree();

        console.log('四叉树碰撞检测系统初始化完成');
        console.log('当前地图:', this.currentMap.name);
        console.log('地图类型:', this.currentMap.type);
        console.log('调试模式状态:', this.debugMode);
        console.log('碰撞检测状态:', this._collisionEnabled);

        // 添加详细的调试信息
        console.log('=== 碰撞系统详细状态 ===');
        console.log('静态四叉树状态:', {
            exists: !!this.staticQuadTree,
            bounds: this.staticQuadTree ? this.staticQuadTree.getBounds() : '未创建',
            maxDepth: this.staticQuadTree ? this.staticQuadTree.maxDepth : '未设置',
            maxObjects: this.staticQuadTree ? this.staticQuadTree.maxObjects : '未设置'
        });

        console.log('动态四叉树状态:', {
            exists: !!this.dynamicQuadTree,
            bounds: this.dynamicQuadTree ? this.dynamicQuadTree.getBounds() : '未创建',
            maxDepth: this.dynamicQuadTree ? this.dynamicQuadTree.maxDepth : '未设置',
            maxObjects: this.dynamicQuadTree ? this.dynamicQuadTree.maxObjects : '未设置'
        });

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
        if (this.currentMap.type === 'grid') {
            this.insertGridBuildings();
        } else if (this.currentMap.type === 'irregular') {
            this.insertIrregularBuildings();
        }
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
        if (x < 0 || y < 0 || x >= this.currentMap.mapWidth || y >= this.currentMap.mapHeight) {
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

    // 检测矩形是否与建筑物碰撞（基于矩阵，更精确）
    isRectCollidingWithBuildings: function (rectX, rectY, rectWidth, rectHeight) {
        if (!this._collisionEnabled || !this.staticQuadTree) {
            return false;
        }

        // 计算矩形的边界
        var rectBounds = {
            left: rectX - rectWidth / 2,
            right: rectX + rectWidth / 2,
            top: rectY - rectHeight / 2,
            bottom: rectY + rectHeight / 2
        };

        // 边界检查
        if (rectBounds.left < 0 || rectBounds.top < 0 || rectBounds.right >= this.currentMap.mapWidth || rectBounds.bottom >= this.currentMap.mapHeight) {
            return true; // 超出地图边界视为碰撞
        }

        // 查询范围内的建筑物
        var nearbyBuildings = this.staticQuadTree.query(rectBounds);

        // 检查矩形是否与任何建筑物重叠
        for (var i = 0; i < nearbyBuildings.length; i++) {
            var building = nearbyBuildings[i];
            if (building && building.bounds) {
                if (this.rectsIntersect(rectBounds, building.bounds)) {
                    return true;
                }
            }
        }

        return false;
    },


    // 检测两个矩形是否相交
    rectsIntersect: function (rect1, rect2) {
        return !(rect1.right <= rect2.left || rect1.left >= rect2.right || rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
    },

    // 获取平滑的移动位置（智能碰撞响应）
    getSmoothMovePosition: function (fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查目标位置是否安全
        if (!this.isRectCollidingWithBuildings(toX, toY, objectWidth, objectHeight)) {
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

            // 添加边界检查
            if (testX >= 0 && testX < this.currentMap.mapWidth && testY >= 0 && testY < this.currentMap.mapHeight) {

                if (!this.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight)) {
                    return {x: testX, y: testY};
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
    getValidMovePosition: function (fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查目标位置是否安全
        if (!this.isRectCollidingWithBuildings(toX, toY, objectWidth, objectHeight)) {
            return {x: toX, y: toY};
        }

        var newX = fromX;
        var newY = fromY;

        // 尝试只移动X轴
        var testX = toX;
        var testY = fromY;
        if (!this.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight)) {
            newX = testX;
        }

        // 尝试只移动Y轴
        var testX2 = fromX;
        var testY2 = toY;
        if (!this.isRectCollidingWithBuildings(testX2, testY2, objectWidth, objectHeight)) {
            newY = testY2;
        }

        // 如果X和Y都不能移动，尝试对角线移动（距离减半）
        if (newX === fromX && newY === fromY) {
            var halfDistanceX = (toX - fromX) * 0.5;
            var halfDistanceY = (toY - fromY) * 0.5;

            var testX3 = fromX + halfDistanceX;
            var testY3 = fromY + halfDistanceY;

            if (!this.isRectCollidingWithBuildings(testX3, testY3, objectWidth, objectHeight)) {
                newX = testX3;
                newY = testY3;
            }
        }

        return {x: newX, y: newY};
    },

    // 寻找最近的可行位置
    findNearestSafePosition: function (fromX, fromY, toX, toY, objectWidth, objectHeight) {
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance === 0) {
            return {x: fromX, y: fromY};
        }

        // 尝试8个方向的移动
        var directions = [{x: 1, y: 0},      // 右
            {x: -1, y: 0},     // 左
            {x: 0, y: 1},      // 下
            {x: 0, y: -1},     // 上
            {x: 0.7, y: 0.7},  // 右下
            {x: -0.7, y: 0.7}, // 左下
            {x: 0.7, y: -0.7}, // 右上
            {x: -0.7, y: -0.7} // 左上
        ];

        var moveDistance = Math.min(distance, 50);

        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var testX = fromX + dir.x * moveDistance;
            var testY = fromY + dir.y * moveDistance;

            // 添加边界检查
            if (testX >= 0 && testX < this.currentMap.mapWidth && testY >= 0 && testY < this.currentMap.mapHeight) {

                if (!this.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight)) {
                    return {x: testX, y: testY};
                }
            }
        }

        return {x: fromX, y: fromY};
    },

    // 检测对象与对象列表的碰撞（使用四叉树优化）
    isObjectOverlappingWithList: function (objX, objY, objWidth, objHeight, objectList) {
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

                if (this.isObjectsOverlapping(objX, objY, objWidth, objHeight, otherObj.x, otherObj.y, otherWidth, otherHeight)) {
                    return true;
                }
            }
        }

        return false;
    },

    // 检测两个对象是否重叠
    isObjectsOverlapping: function (obj1X, obj1Y, obj1Width, obj1Height, obj2X, obj2Y, obj2Width, obj2Height) {
        var obj1Left = obj1X - obj1Width / 2;
        var obj1Right = obj1X + obj1Width / 2;
        var obj1Top = obj1Y - obj1Height / 2;
        var obj1Bottom = obj1Y + obj1Height / 2;

        var obj2Left = obj2X - obj2Width / 2;
        var obj2Right = obj2X + obj2Width / 2;
        var obj2Top = obj2Y - obj2Height / 2;
        var obj2Bottom = obj2Y + obj2Height / 2;

        return !(obj1Right < obj2Left || obj1Left > obj2Right || obj1Bottom < obj2Top || obj1Top > obj2Bottom);
    },

    // 获取避免重叠的移动位置
    getNonOverlappingPosition: function (fromX, fromY, toX, toY, objectWidth, objectHeight, avoidObjects, buildingCollision) {
        // 首先检查建筑物碰撞
        if (buildingCollision && this.isRectCollidingWithBuildings(toX, toY, objectWidth, objectHeight)) {
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

            var buildingOk = !buildingCollision || !this.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight);
            var overlapOk = !this.isObjectOverlappingWithList(testX, testY, objectWidth, objectHeight, avoidObjects);

            if (buildingOk && overlapOk) {
                return {x: testX, y: testY};
            }
        }

        // 如果还是重叠，尝试8个方向寻找位置
        var directions = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}, {x: 0.7, y: 0.7}, {
            x: -0.7,
            y: 0.7
        }, {x: 0.7, y: -0.7}, {x: -0.7, y: -0.7}];

        var moveDistance = Math.min(distance, 30);

        for (var j = 0; j < directions.length; j++) {
            var dir = directions[j];
            var testX = fromX + dir.x * moveDistance;
            var testY = fromY + dir.y * moveDistance;

            var buildingOk = !buildingCollision || !this.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight);
            var overlapOk = !this.isObjectOverlappingWithList(testX, testY, objectWidth, objectHeight, avoidObjects);

            if (buildingOk && overlapOk) {
                return {x: testX, y: testY};
            }
        }

        return {x: fromX, y: fromY};
    },

    // 寻找安全的生成位置
    findSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight) {
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
            if (testX >= 0 && testX < this.currentMap.mapWidth && testY >= 0 && testY < this.currentMap.mapHeight) {

                if (!this.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight)) {
                    console.log('找到随机安全位置:', testX, testY, '尝试次数:', attempt + 1);
                    return {x: testX, y: testY};
                }
            }
        }

        // 如果还是找不到，尝试在地图边缘寻找
        var edgePositions = [{x: 100, y: 100}, {x: this.currentMap.mapWidth - 100, y: 100}, {
            x: 100,
            y: this.currentMap.mapHeight - 100
        }, {x: this.currentMap.mapWidth - 100, y: this.currentMap.mapHeight - 100}];

        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (!this.isRectCollidingWithBuildings(edgePos.x, edgePos.y, objectWidth, objectHeight)) {
                console.log('在地图边缘找到安全位置:', edgePos);
                return edgePos;
            }
        }

        // 最后尝试在中心点附近寻找
        var centerPositions = [{x: centerX, y: centerY}, {x: centerX + 50, y: centerY}, {
            x: centerX - 50,
            y: centerY
        }, {x: centerX, y: centerY + 50}, {x: centerX, y: centerY - 50}];

        for (var j = 0; j < centerPositions.length; j++) {
            var centerPos = centerPositions[j];
            if (centerPos.x >= 0 && centerPos.x < this.currentMap.mapWidth && centerPos.y >= 0 && centerPos.y < this.currentMap.mapHeight) {
                if (!this.isRectCollidingWithBuildings(centerPos.x, centerPos.y, objectWidth, objectHeight)) {
                    console.log('在中心点附近找到安全位置:', centerPos);
                    return centerPos;
                }
            }
        }

        console.warn('无法找到安全位置，使用默认位置');
        return {x: 100, y: 100};
    },

    // 在街道上寻找安全位置（修复街道位置计算）
    findSafePositionInStreets: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight) {
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

                    // 检查街道位置是否安全（使用矩形碰撞检测）
                    if (!this.isRectCollidingWithBuildings(streetX, streetY, objectWidth, objectHeight)) {
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

    // 强制验证生成位置（确保位置真的安全）
    validateAndFixSpawnPosition: function (x, y, objectWidth, objectHeight) {
        console.log('强制验证生成位置:', x, y, '对象尺寸:', objectWidth, objectHeight);

        // 首先检查当前位置是否安全
        if (!this.isRectCollidingWithBuildings(x, y, objectWidth, objectHeight)) {
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

                if (!this.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight)) {
                    console.log('找到安全的替代位置:', testX, testY, '距离:', distance);
                    return {x: testX, y: testY, adjusted: true, distance: distance};
                }
            }
        }

        // 如果还是找不到，尝试街道位置
        if (this.currentMap.type === 'grid') {
            var streetPos = this.findSafePositionInStreets(x, y, 50, 500, objectWidth, objectHeight);
            if (streetPos) {
                console.log('在街道上找到安全位置:', streetPos);
                return {x: streetPos.x, y: streetPos.y, adjusted: true, source: 'street'};
            }
        }

        // 最后尝试地图边缘
        var edgePositions = [{x: 100, y: 100}, {x: this.currentMap.mapWidth - 100, y: 100}, {
            x: 100,
            y: this.currentMap.mapHeight - 100
        }, {x: this.currentMap.mapWidth - 100, y: this.currentMap.mapHeight - 100}];

        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (!this.isRectCollidingWithBuildings(edgePos.x, edgePos.y, objectWidth, objectHeight)) {
                console.log('在地图边缘找到安全位置:', edgePos);
                return {x: edgePos.x, y: edgePos.y, adjusted: true, source: 'edge'};
            }
        }

        console.warn('无法找到安全位置，使用默认位置');
        return {x: 100, y: 100, adjusted: true, source: 'default'};
    },

    // 游戏中的安全位置生成（强制验证，确保不会生成在建筑物上）
    generateGameSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight) {
        console.log('=== 生成游戏安全位置 ===');
        console.log('参数:', {centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight});

        // 首先尝试使用标准方法
        var safePos = this.findSafePosition(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight);

        if (safePos) {
            // 强制验证找到的位置是否真的安全
            var isReallySafe = !this.isRectCollidingWithBuildings(safePos.x, safePos.y, objectWidth, objectHeight);

            if (isReallySafe) {
                console.log('✅ 找到安全位置:', safePos);
                return safePos;
            } else {
                console.log('❌ 找到的位置不安全，重新寻找');
            }
        }

        // 如果标准方法失败，使用强制验证方法
        console.log('使用强制验证方法寻找安全位置');
        var validatedPos = this.validateAndFixSpawnPosition(centerX, centerY, objectWidth, objectHeight);

        if (validatedPos && !validatedPos.adjusted) {
            console.log('✅ 当前位置安全:', validatedPos);
            return validatedPos;
        } else if (validatedPos && validatedPos.adjusted) {
            console.log('✅ 找到替代安全位置:', validatedPos);
            return validatedPos;
        }

        // 最后的备选方案：在地图边缘寻找
        console.log('尝试在地图边缘寻找安全位置');
        var edgePositions = [{x: 100, y: 100}, {x: this.currentMap.mapWidth - 100, y: 100}, {
            x: 100,
            y: this.currentMap.mapHeight - 100
        }, {x: this.currentMap.mapWidth - 100, y: this.currentMap.mapHeight - 100}];

        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (!this.isRectCollidingWithBuildings(edgePos.x, edgePos.y, objectWidth, objectHeight)) {
                console.log('✅ 在地图边缘找到安全位置:', edgePos);
                return edgePos;
            }
        }

        // 如果还是找不到，使用默认位置并强制调整
        console.log('⚠️ 使用默认位置并强制调整');
        var defaultPos = {x: 100, y: 100};
        var adjustedPos = this.validateAndFixSpawnPosition(defaultPos.x, defaultPos.y, objectWidth, objectHeight);

        console.log('最终安全位置:', adjustedPos);
        return adjustedPos;
    },


    // 测试碰撞检测系统
    testCollisionSystem: function () {
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
        var testBuilding = this.isRectCollidingWithBuildings(1000, 1000, 32, 32);
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

        // 测试街道安全位置寻找
        console.log('=== 测试街道安全位置寻找 ===');
        var streetSafePos = this.findSafePositionInStreets(8000, 7500, 100, 200, 32, 48);
        if (streetSafePos) {
            console.log('找到街道安全位置:', streetSafePos);
            // 验证找到的位置是否真的安全
            var isReallySafe = !this.isRectCollidingWithBuildings(streetSafePos.x, streetSafePos.y, 32, 48);
            console.log('位置是否真的安全:', isReallySafe);
        } else {
            console.log('未找到街道安全位置');
        }

        // 测试强制位置验证
        console.log('=== 测试强制位置验证 ===');
        var testPos1 = this.validateAndFixSpawnPosition(1125, 1125, 32, 48); // 建筑物内
        var testPos2 = this.validateAndFixSpawnPosition(625, 625, 32, 48);   // 街道上
        console.log('建筑物内位置验证:', testPos1);
        console.log('街道上位置验证:', testPos2);

        // 测试游戏安全位置生成
        console.log('=== 测试游戏安全位置生成 ===');
        var gameSafePos1 = this.generateGameSafePosition(8000, 7500, 100, 200, 32, 48);
        var gameSafePos2 = this.generateGameSafePosition(1125, 1125, 100, 200, 32, 48);
        console.log('游戏安全位置1:', gameSafePos1);
        console.log('游戏安全位置2:', gameSafePos2);

        console.log('=== 四叉树碰撞检测系统测试完成 ===');
    },

    // 性能统计
    getPerformanceStats: function () {
        if (!this.staticQuadTree || !this.dynamicQuadTree) {
            return {error: '四叉树未初始化'};
        }

        return {
            staticTreeDepth: this.getTreeDepth(this.staticQuadTree),
            dynamicTreeDepth: this.getTreeDepth(this.dynamicQuadTree),
            staticTreeNodes: this.countTreeNodes(this.staticQuadTree),
            dynamicTreeNodes: this.countTreeNodes(this.dynamicQuadTree)
        };
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

    // 僵尸紧急分离算法（防止僵尸重叠卡死）
    emergencySeparation: function (zombies, characters) {
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

                    var distance = Math.sqrt(Math.pow(zombie.x - otherObj.x, 2) + Math.pow(zombie.y - otherObj.y, 2));

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

                if (!this.isRectCollidingWithBuildings(newX, newY, zombie.width || 32, zombie.height || 32)) {
                    zombie.x = newX;
                    zombie.y = newY;
                }
            }
        }
    },

    // 获取僵尸的有效移动位置（避免与建筑物、其他僵尸和人物重叠）
    getZombieValidMovePosition: function (zombie, toX, toY, allZombies, allCharacters) {
        var zombieWidth = zombie.width || 32;
        var zombieHeight = zombie.height || 32;

        // 首先检查目标位置是否在建筑物内
        if (this.isRectCollidingWithBuildings(toX, toY, zombieWidth, zombieHeight)) {
            console.log('僵尸目标位置在建筑物内，寻找替代路径');

            // 尝试寻找绕行路径
            var alternativePath = this.findZombieAlternativePath(zombie, toX, toY, zombieWidth, zombieHeight);
            if (alternativePath) {
                toX = alternativePath.x;
                toY = alternativePath.y;
            } else {
                // 如果找不到替代路径，返回原位置
                return {x: zombie.x, y: zombie.y};
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
        return this.getNonOverlappingPosition(zombie.x, zombie.y, toX, toY, zombieWidth, zombieHeight, avoidObjects, true // 启用建筑物碰撞检测
        );
    },

    // 为僵尸寻找替代路径（绕行建筑物）
    findZombieAlternativePath: function (zombie, targetX, targetY, zombieWidth, zombieHeight) {
        var fromX = zombie.x;
        var fromY = zombie.y;
        var deltaX = targetX - fromX;
        var deltaY = targetY - fromY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance === 0) return null;

        // 尝试多个方向的绕行
        var directions = [{x: 1, y: 0},      // 右
            {x: -1, y: 0},     // 左
            {x: 0, y: 1},      // 下
            {x: 0, y: -1},     // 上
            {x: 0.7, y: 0.7},  // 右下
            {x: -0.7, y: 0.7}, // 左下
            {x: 0.7, y: -0.7}, // 右上
            {x: -0.7, y: -0.7} // 左上
        ];

        var moveDistance = Math.min(distance, 100); // 限制绕行距离

        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var testX = fromX + dir.x * moveDistance;
            var testY = fromY + dir.y * moveDistance;

            // 添加边界检查，确保绕行点在地图范围内
            if (testX >= 0 && testX < window.collisionSystem.currentMap.mapWidth && testY >= 0 && testY < window.collisionSystem.currentMap.mapHeight) {

                // 检查这个位置是否安全
                if (!this.isRectCollidingWithBuildings(testX, testY, zombieWidth, zombieHeight)) {
                    // 检查从当前位置到这个位置的路径是否安全
                    if (this.isMovePathValid(fromX, fromY, testX, testY, zombieWidth, zombieHeight)) {
                        console.log('僵尸找到替代路径:', testX, testY, '方向:', dir);
                        return {x: testX, y: testY};
                    }
                }
            }
        }

        return null;
    },


    // 检测移动路径是否有效（支持部分移动）
    isMovePathValid: function (fromX, fromY, toX, toY, objectWidth, objectHeight) {
        // 检查起点和终点
        if (this.isRectCollidingWithBuildings(fromX, fromY, objectWidth, objectHeight)) {
            console.log('起点在建筑物内:', fromX, fromY);
            return false;
        }

        if (this.isRectCollidingWithBuildings(toX, toY, objectWidth, objectHeight)) {
            console.log('终点在建筑物内:', toX, toY);
            return false;
        }

        // 检查路径中间点（更密集的检查，确保不会穿越建筑物）
        var steps = Math.max(5, Math.floor(Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2)) / 10));
        for (var i = 1; i < steps; i++) {
            var t = i / steps;
            var testX = fromX + (toX - fromX) * t;
            var testY = fromY + (toY - fromY) * t;

            if (this.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight)) {
                console.log('路径中间点在建筑物内:', testX, testY, '步骤:', i, '总步骤:', steps);
                return false;
            }
        }

        return true;
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

    // 统一的位置生成验证机制
    spawnPositionValidator: {
        // 获取对象配置
        getObjectConfig: function (objectType, customConfig) {
            var defaultConfigs = {
                character: {width: 32, height: 48, minDistance: 50, searchRadius: 200},
                zombie: {width: 32, height: 32, minDistance: 30, searchRadius: 150},
                item: {width: 16, height: 16, minDistance: 20, searchRadius: 100},
                building: {width: 64, height: 64, minDistance: 100, searchRadius: 300}
            };

            var config = defaultConfigs[objectType] || defaultConfigs.item;
            if (customConfig) {
                for (var key in customConfig) {
                    config[key] = customConfig[key];
                }
            }

            return config;
        },

        // 验证边界
        validateBoundaries: function (x, y, width, height) {
            var margin = 10; // 边界安全边距

            // 使用中心点坐标系统，与碰撞系统保持一致
            var halfWidth = width / 2;
            var halfHeight = height / 2;

            return (x - halfWidth) >= margin && (y - halfHeight) >= margin && (x + halfWidth) <= window.collisionSystem.currentMap.mapWidth - margin && (y + halfHeight) <= window.collisionSystem.currentMap.mapHeight - margin;
        },

        // 检查建筑物碰撞
        checkBuildingCollision: function (x, y, width, height) {
            if (!window.collisionSystem || !window.collisionSystem.isRectCollidingWithBuildings) {
                return false;
            }
            return window.collisionSystem.isRectCollidingWithBuildings(x, y, width, height);
        },

        // 检查对象重叠
        checkObjectOverlap: function (x, y, width, height, objectType) {
            if (!window.collisionSystem || !window.collisionSystem.isObjectOverlappingWithList) {
                return false;
            }

            // 获取需要避免的对象
            var avoidObjects = this.getAvoidObjects(objectType);
            return window.collisionSystem.isObjectOverlappingWithList(x, y, width, height, avoidObjects);
        },

        // 获取需要避免的对象
        getAvoidObjects: function (objectType) {
            var avoidObjects = [];

            // 添加所有僵尸
            if (window.zombieManager) {
                var allZombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
                avoidObjects = avoidObjects.concat(allZombies);
            }

            // 添加所有人物
            if (window.characterManager) {
                var allCharacters = window.characterManager.getAllCharacters();
                avoidObjects = avoidObjects.concat(allCharacters);
            }

            // 根据对象类型过滤
            if (objectType === 'zombie') {
                // 僵尸不需要避免其他僵尸
                avoidObjects = avoidObjects.filter(obj => !obj.type || !obj.type.includes('zombie'));
            }

            return avoidObjects;
        },

        // 寻找安全的生成位置
        findSafeSpawnPosition: function (centerX, centerY, objectType, config) {
            var searchRadius = config.searchRadius;
            var minDistance = config.minDistance;
            var maxAttempts = 100;

            for (var attempt = 0; attempt < maxAttempts; attempt++) {
                var angle = (attempt * Math.PI * 2) / maxAttempts;
                var distance = minDistance + (attempt % 10) * (searchRadius - minDistance) / 10;

                var testX = centerX + Math.cos(angle) * distance;
                var testY = centerY + Math.sin(angle) * distance;

                // 使用内部验证方法，避免递归调用
                if (this.isPositionSafeInternal(testX, testY, config.width, config.height, objectType)) {
                    return {x: testX, y: testY};
                }
            }

            return null;
        },

        // 内部验证方法，避免递归调用
        isPositionSafeInternal: function (x, y, width, height, objectType) {
            // 边界检查
            if (!this.validateBoundaries(x, y, width, height)) {
                return false;
            }

            // 建筑物碰撞检查
            if (this.checkBuildingCollision(x, y, width, height)) {
                return false;
            }

            // 对象重叠检查
            if (this.checkObjectOverlap(x, y, width, height, objectType)) {
                return false;
            }

            return true;
        }
    },


    // 改进的路径查找算法
    pathFinder: {

        // 检查路径是否畅通
        isPathClear: function (startX, startY, endX, endY, objectWidth, objectHeight, obstacles) {
            // 检查路径上的多个点
            var steps = 10;
            for (var i = 0; i <= steps; i++) {
                var t = i / steps;
                var testX = startX + (endX - startX) * t;
                var testY = startY + (endY - startY) * t;

                // 检查建筑物碰撞
                if (window.collisionSystem && window.collisionSystem.isRectCollidingWithBuildings) {
                    if (window.collisionSystem.isRectCollidingWithBuildings(testX, testY, objectWidth, objectHeight)) {
                        return false;
                    }
                }

                // 检查对象碰撞
                if (obstacles && obstacles.length > 0) {
                    for (var j = 0; j < obstacles.length; j++) {
                        var obstacle = obstacles[j];
                        if (this.isObjectColliding(testX, testY, objectWidth, objectHeight, obstacle)) {
                            return false;
                        }
                    }
                }
            }

            return true;
        },

        // 寻找简单绕行路径
        findSimpleDetour: function (startX, startY, endX, endY, objectWidth, objectHeight, obstacles) {
            var directions = [{dx: 1, dy: 0},   // 右
                {dx: -1, dy: 0},  // 左
                {dx: 0, dy: 1},   // 下
                {dx: 0, dy: -1}   // 上
            ];

            for (var i = 0; i < directions.length; i++) {
                var dir = directions[i];
                var detourDistance = Math.max(objectWidth, objectHeight) + 20; // 安全距离

                var detourX = startX + dir.dx * detourDistance;
                var detourY = startY + dir.dy * detourDistance;

                // 检查绕行点是否安全
                if (this.isPositionSafe(detourX, detourY, objectWidth, objectHeight, obstacles)) {
                    // 检查从绕行点到目标点的路径
                    if (this.isPathClear(detourX, detourY, endX, endY, objectWidth, objectHeight, obstacles)) {
                        return {
                            path: [{x: detourX, y: detourY}, {x: endX, y: endY}],
                            distance: Math.abs(detourDistance) + Math.sqrt(Math.pow(endX - detourX, 2) + Math.pow(endY - detourY, 2))
                        };
                    }
                }
            }

            return null;
        },

        // 检查位置是否安全
        isPositionSafe: function (x, y, width, height, obstacles) {
            // 检查建筑物碰撞（使用正确的引用）
            var collisionSystem = window.collisionSystem;
            if (!collisionSystem) {
                console.warn('碰撞系统未找到，跳过建筑物碰撞检查');
                return true; // 如果找不到碰撞系统，假设位置安全
            }

            if (collisionSystem.isRectCollidingWithBuildings) {
                if (collisionSystem.isRectCollidingWithBuildings(x, y, width, height)) {
                    return false;
                }
            }

            // 检查对象碰撞
            if (obstacles && obstacles.length > 0) {
                for (var i = 0; i < obstacles.length; i++) {
                    if (this.isObjectColliding(x, y, width, height, obstacles[i])) {
                        return false;
                    }
                }
            }

            return true;
        },

        // 检查对象碰撞
        isObjectColliding: function (x1, y1, width1, height1, obj2) {
            if (!obj2 || obj2.x === undefined || obj2.y === undefined) {
                return false;
            }

            var x2 = obj2.x;
            var y2 = obj2.y;
            var width2 = obj2.width || 32;
            var height2 = obj2.height || 32;

            // 计算边界
            var left1 = x1 - width1 / 2;
            var right1 = x1 + width1 / 2;
            var top1 = y1 - height1 / 2;
            var bottom1 = y1 + height1 / 2;

            var left2 = x2 - width2 / 2;
            var right2 = x2 + width2 / 2;
            var top2 = y2 - height2 / 2;
            var bottom2 = y2 + height2 / 2;

            // 检查是否重叠
            return !(right1 <= left2 || left1 >= right2 || bottom1 <= top2 || top1 >= bottom2);
        }
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
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollisionSystem;
} else if (typeof window !== 'undefined') {
    window.CollisionSystem = CollisionSystem;
}

/**
 * 碰撞检测系统使用说明
 *
 * 主要方法：
 *
 * 1. 矩形碰撞检测（推荐使用）：
 *    - isRectCollidingWithBuildings(x, y, width, height) - 检测矩形是否与建筑物碰撞
 *    - isObjectsColliding(obj1, obj2) - 检测两个对象是否碰撞
 *    - isObjectCollidingWithDynamicObjects(x, y, width, height, excludeObject) - 检测与动态对象碰撞
 *
 * 2. 综合碰撞检测：
 *    - isObjectCollidingWithAnyObstacle(x, y, width, height, excludeObject) - 检测与所有障碍物碰撞
 *
 * 3. 街道位置验证：
 *    - isPositionInStreet(x, y, width, height) - 验证位置是否在街道上
 *    - findSafePositionInStreets(centerX, centerY, minDist, maxDist, width, height) - 寻找街道安全位置
 *
 * 4. 移动验证：
 *    - isMovePathValid(fromX, fromY, toX, toY, width, height) - 验证移动路径
 *    - getSmoothMovePosition(fromX, fromY, toX, toY, width, height) - 获取平滑移动位置
 *
 * 5. 安全位置：
 *    - findSafePosition(centerX, centerY, minDist, maxDist, width, height) - 寻找安全生成位置
 *    - validateAndFixSpawnPosition(x, y, width, height) - 强制验证并修复生成位置
 *    - generateGameSafePosition(centerX, centerY, minDist, maxDist, width, height) - 游戏中的安全位置生成（推荐）
 *
 * 优势：
 * - 基于矩形矩阵的精确碰撞检测，避免点碰撞的重合问题
 * - 支持对象尺寸，更真实的碰撞效果
 * - 高性能的四叉树空间分区
 * - 智能的碰撞响应和路径寻找
 * - 专门的街道位置验证，确保人物不会生成在建筑物上
 * - 强制位置验证，确保生成位置的安全性
 *
 * 使用建议：
 * - 在游戏中生成人物、僵尸等对象时，使用 generateGameSafePosition() 方法
 * - 该方法会强制验证位置安全性，确保不会生成在建筑物上
 * - 如果位置不安全，会自动寻找替代的安全位置
 */

