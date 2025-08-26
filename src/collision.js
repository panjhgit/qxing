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
        
        console.log('四叉树碰撞检测系统初始化完成');
        console.log('当前地图:', this.currentMap.name);
        console.log('地图类型:', this.currentMap.type);
        console.log('地图尺寸:', this.currentMap.mapWidth, 'x', this.currentMap.mapHeight);
        console.log('网格尺寸:', this.currentMap.gridCols, 'x', this.currentMap.gridRows);
        console.log('单元格尺寸:', this.currentMap.cellSize);
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
    
    // 使用默认地图配置（兼容性）
    useDefaultMapConfig: function(mapId) {
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
            },
            'small-town': {
                name: '小镇地图',
                type: 'matrix',
                mapWidth: 4000,
                mapHeight: 4000,
                cellSize: 100,
                gridCols: 40,
                gridRows: 40
            },
            'main': {
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
    insertBuildingsFromMapManager: function(buildings) {
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
    insertBuildingsFromMapSystem: function(buildings) {
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
    generateDefaultMatrixBuildings: function() {
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
            x: -0.7, y: 0.7
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
            x: 100, y: this.currentMap.mapHeight - 100
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
            x: centerX - 50, y: centerY
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
            x: 100, y: this.currentMap.mapHeight - 100
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
            x: 100, y: this.currentMap.mapHeight - 100
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
    updateMapData: function(mapId) {
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
    getCurrentMapInfo: function() {
        if (!this.currentMap) {
            return null;
        }
        
        return {
            name: this.currentMap.name,
            type: this.currentMap.type,
            dimensions: {
                width: this.currentMap.mapWidth,
                height: this.currentMap.mapHeight,
                cellSize: this.currentMap.cellSize,
                gridCols: this.currentMap.gridCols,
                gridRows: this.currentMap.gridRows
            },
            quadTreeInfo: {
                staticTreeExists: !!this.staticQuadTree,
                dynamicTreeExists: !!this.dynamicQuadTree,
                staticObjectCount: this.staticQuadTree ? this.countTreeObjects(this.staticQuadTree) : 0,
                dynamicObjectCount: this.dynamicQuadTree ? this.countTreeObjects(this.dynamicQuadTree) : 0
            }
        };
    },
    
    // 验证碰撞检测系统状态
    validateSystem: function() {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
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
    }
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
        left: x - width / 2,
        right: x + width / 2,
        top: y - height / 2,
        bottom: y + height / 2
    };
    
    // 移动相关属性
    this.velocity = { x: 0, y: 0 }; // 移动速度
    this.targetPosition = { x: x, y: y }; // 目标位置
    this.isMoving = false; // 是否在移动
}

/**
 * 更新动态障碍物位置
 * @param {number} newX - 新X坐标
 * @param {number} newY - 新Y坐标
 */
DynamicObstacle.prototype.updatePosition = function(newX, newY) {
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
 * 设置移动目标
 * @param {number} targetX - 目标X坐标
 * @param {number} targetY - 目标Y坐标
 */
DynamicObstacle.prototype.setTarget = function(targetX, targetY) {
    this.targetPosition.x = targetX;
    this.targetPosition.y = targetY;
    this.isMoving = true;
    
    // 计算移动方向
    const deltaX = targetX - this.x;
    const deltaY = targetY - this.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > 0) {
        this.velocity.x = deltaX / distance;
        this.velocity.y = deltaY / distance;
    }
};

/**
 * 更新移动
 * @param {number} deltaTime - 时间增量
 * @param {number} moveSpeed - 移动速度
 */
DynamicObstacle.prototype.updateMovement = function(deltaTime, moveSpeed) {
    if (!this.isMoving) return;
    
    const deltaX = this.targetPosition.x - this.x;
    const deltaY = this.targetPosition.y - this.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < moveSpeed * deltaTime) {
        // 到达目标位置
        this.updatePosition(this.targetPosition.x, this.targetPosition.y);
        this.isMoving = false;
        this.velocity = { x: 0, y: 0 };
    } else {
        // 继续移动
        const moveDistance = moveSpeed * deltaTime;
        const newX = this.x + this.velocity.x * moveDistance;
        const newY = this.y + this.velocity.y * moveDistance;
        this.updatePosition(newX, newY);
    }
};

/**
 * 检查是否与另一个对象重叠
 * @param {Object} other - 另一个对象
 * @returns {boolean} 是否重叠
 */
DynamicObstacle.prototype.overlapsWith = function(other) {
    if (!other || !other.bounds) return false;
    
    return !(this.bounds.right <= other.bounds.left || 
             this.bounds.left >= other.bounds.right || 
             this.bounds.bottom <= other.bounds.top || 
             this.bounds.top >= other.bounds.bottom);
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
        totalObstacles: 0,
        activeObstacles: 0,
        lastUpdateTime: Date.now()
    };
}

/**
 * 添加动态障碍物
 * @param {DynamicObstacle} obstacle - 障碍物实例
 */
DynamicObstacleManager.prototype.addObstacle = function(obstacle) {
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
DynamicObstacleManager.prototype.removeObstacle = function(id) {
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
 * 更新障碍物位置（如车辆移动）
 * @param {string} id - 障碍物ID
 * @param {number} x - 新X坐标
 * @param {number} y - 新Y坐标
 */
DynamicObstacleManager.prototype.updateObstaclePosition = function(id, x, y) {
    const obstacle = this.obstacles.get(id);
    if (!obstacle) return false;
    
    // 从四叉树中移除旧位置
    this.rootQuadTree.remove(obstacle);
    
    // 更新位置
    obstacle.updatePosition(x, y);
    
    // 重新插入四叉树
    this.rootQuadTree.insert(obstacle);
    
    return true;
};

/**
 * 批量更新障碍物位置（性能优化）
 * @param {Array} updates - 更新数组 [{id, x, y}, ...]
 */
DynamicObstacleManager.prototype.batchUpdatePositions = function(updates) {
    if (!updates || updates.length === 0) return;
    
    // 批量移除
    updates.forEach(update => {
        const obstacle = this.obstacles.get(update.id);
        if (obstacle) {
            this.rootQuadTree.remove(obstacle);
        }
    });
    
    // 批量更新位置
    updates.forEach(update => {
        const obstacle = this.obstacles.get(update.id);
        if (obstacle) {
            obstacle.updatePosition(update.x, update.y);
        }
    });
    
    // 批量重新插入
    updates.forEach(update => {
        const obstacle = this.obstacles.get(update.id);
        if (obstacle) {
            this.rootQuadTree.insert(obstacle);
        }
    });
    
    console.log(`[DynamicObstacleManager] 批量更新 ${updates.length} 个障碍物位置`);
};

/**
 * 检查点是否被动态障碍物阻挡（动态合法性）
 * @param {Object} point - {x, y}
 * @param {number} objectWidth - 对象宽度（用于扩展检测）
 * @param {number} objectHeight - 对象高度
 * @returns {boolean} 是否被阻挡
 */
DynamicObstacleManager.prototype.isPointBlockedByDynamic = function(point, objectWidth, objectHeight) {
    objectWidth = objectWidth || 1;
    objectHeight = objectHeight || 1;
    
    // 创建一个包含该点的边界框
    const queryBounds = {
        left: point.x - objectWidth / 2,
        right: point.x + objectWidth / 2,
        top: point.y - objectHeight / 2,
        bottom: point.y + objectHeight / 2
    };
    
    // 从四叉树查询该区域内的所有障碍物
    const candidates = this.rootQuadTree.query(queryBounds);
    
    // 检查点是否在任何障碍物的碰撞盒内
    for (const obstacle of candidates) {
        if (obstacle.isActive && obstacle.overlapsWith({ bounds: queryBounds })) {
            return true; // 被动态障碍物阻挡
        }
    }
    
    return false;
};

/**
 * 获取指定区域内的动态障碍物
 * @param {Object} area - 查询区域 {left, right, top, bottom}
 * @returns {Array} 障碍物数组
 */
DynamicObstacleManager.prototype.getObstaclesInArea = function(area) {
    if (!area) return [];
    
    const candidates = this.rootQuadTree.query(area);
    return candidates.filter(obstacle => obstacle.isActive);
};

/**
 * 检查移动路径是否被动态障碍物阻挡
 * @param {Object} from - 起点 {x, y}
 * @param {Object} to - 终点 {x, y}
 * @param {number} objectWidth - 对象宽度
 * @param {number} objectHeight - 对象高度
 * @returns {boolean} 路径是否被阻挡
 */
DynamicObstacleManager.prototype.isPathBlockedByDynamic = function(from, to, objectWidth, objectHeight) {
    // 简化的路径检测：检查起点、终点和中间点
    const points = this.generatePathPoints(from, to, objectWidth, objectHeight);
    
    for (const point of points) {
        if (this.isPointBlockedByDynamic(point, objectWidth, objectHeight)) {
            return true;
        }
    }
    
    return false;
};

/**
 * 生成路径检测点
 * @param {Object} from - 起点
 * @param {Object} to - 终点
 * @param {number} objectWidth - 对象宽度
 * @param {number} objectHeight - 对象高度
 * @returns {Array} 检测点数组
 */
DynamicObstacleManager.prototype.generatePathPoints = function(from, to, objectWidth, objectHeight) {
    const points = [from];
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance === 0) return points;
    
    // 根据对象尺寸确定检测密度
    const maxStep = Math.max(objectWidth, objectHeight) / 2;
    const steps = Math.ceil(distance / maxStep);
    
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        points.push({
            x: from.x + deltaX * t,
            y: from.y + deltaY * t
        });
    }
    
    points.push(to);
    return points;
};

/**
 * 更新所有动态障碍物
 * @param {number} deltaTime - 时间增量
 */
DynamicObstacleManager.prototype.updateAllObstacles = function(deltaTime) {
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
DynamicObstacleManager.prototype.cleanupInvalidObstacles = function() {
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
DynamicObstacleManager.prototype.getStats = function() {
    return {
        ...this.stats,
        obstacleTypes: Array.from(this.obstacleTypes.keys()).map(type => ({
            type: type,
            count: this.obstacleTypes.get(type).length
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
    window.initCollisionSystem = function(mapId) {
        return CollisionSystem.init(mapId);
    };
    
    window.updateCollisionMap = function(mapId) {
        return CollisionSystem.updateMapData(mapId);
    };
    
    window.getCollisionMapInfo = function() {
        return CollisionSystem.getCurrentMapInfo();
    };
    
    window.validateCollisionSystem = function() {
        return CollisionSystem.validateSystem();
    };
    
    console.log('✅ 碰撞检测系统已全局注册，可用方法:');
    console.log('  - window.initCollisionSystem(mapId)');
    console.log('  - window.updateCollisionMap(mapId)');
    console.log('  - window.getCollisionMapInfo()');
    console.log('  - window.validateCollisionSystem()');
    console.log('  - window.collisionSystem (完整系统对象)');
}


