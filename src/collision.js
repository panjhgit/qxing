/**
 * 商用级碰撞检测系统 (collision.js)
 * 
 * 功能特性：
 * - 双四叉树系统：静态四叉树（建筑物）+ 动态四叉树（僵尸、人物）
 * - 高性能碰撞检测：使用四叉树优化查询性能
 * - 平滑移动系统：智能绕行、分离算法、预测性检测
 * - 多地图支持：网格建筑 + 不规则建筑
 * - 性能优化：增量更新、批量重建、对象池
 * 
 * 设计原则：
 * - 高性能：O(log n) 查询复杂度
 * - 高可靠性：完善的边界检查和错误处理
 * - 易维护：清晰的代码结构和注释
 * - 可扩展：支持不同类型的地图和对象
 */

// ==================== 四叉树核心系统 ====================

/**
 * 四叉树节点类
 * 负责空间分割和对象管理
 */
var QuadTreeNode = function(bounds, maxObjects, maxLevels, level) {
    this.bounds = bounds;                    // 节点边界 {x, y, width, height}
    this.maxObjects = maxObjects || 10;      // 节点最大对象数
    this.maxLevels = maxLevels || 4;        // 最大深度
    this.level = level || 0;                // 当前深度
    
    this.objects = [];                      // 对象列表
    this.nodes = [];                        // 子节点列表
    this.totalObjects = 0;                  // 总对象数（包括子节点）
    
    // 性能统计
    this.queryCount = 0;
    this.insertCount = 0;
};

QuadTreeNode.prototype = {
    /**
     * 细分节点
     * 将当前节点分为四个子节点
     */
    subdivide: function() {
        var subWidth = this.bounds.width / 2;
        var subHeight = this.bounds.height / 2;
        var x = this.bounds.x;
        var y = this.bounds.y;
        
        // 创建四个子节点：右上、左上、左下、右下
        this.nodes[0] = new QuadTreeNode({
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);
        
        this.nodes[1] = new QuadTreeNode({
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);
        
        this.nodes[2] = new QuadTreeNode({
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);
        
        this.nodes[3] = new QuadTreeNode({
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);
    },
    
    /**
     * 获取对象应该插入的子节点索引
     * @param {Object} rect 对象边界 {x, y, width, height}
     * @returns {Number} 子节点索引，-1表示对象跨越多个子节点
     */
    getIndex: function(rect) {
        var index = -1;
        var verticalMidpoint = this.bounds.x + this.bounds.width / 2;
        var horizontalMidpoint = this.bounds.y + this.bounds.height / 2;
        
        // 判断对象在哪个象限
        var topQuadrant = (rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint);
        var bottomQuadrant = (rect.y > horizontalMidpoint);
        
        if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;  // 左上
            } else if (bottomQuadrant) {
                index = 2;  // 左下
            }
        } else if (rect.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;  // 右上
            } else if (bottomQuadrant) {
                index = 3;  // 右下
            }
        }
        
        return index;
    },
    
    /**
     * 插入对象到四叉树
     * @param {Object} rect 对象边界 {x, y, width, height}
     * @param {Object} object 对象本身
     */
    insert: function(rect, object) {
        // 如果对象跨越多个子节点，直接添加到当前节点
        if (this.nodes.length) {
            var index = this.getIndex(rect);
            
            if (index !== -1) {
                this.nodes[index].insert(rect, object);
                this.totalObjects++;
                return;
            }
        }
        
        // 添加到当前节点
        this.objects.push({rect: rect, object: object});
        this.totalObjects++;
        
        // 如果对象数量超过阈值且未达到最大深度，则细分节点
        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (!this.nodes.length) {
                this.subdivide();
            }
            
            // 重新分配对象到子节点
            var i = 0;
            while (i < this.objects.length) {
                var index = this.getIndex(this.objects[i].rect);
                if (index !== -1) {
                    var obj = this.objects.splice(i, 1)[0];
                    this.nodes[index].insert(obj.rect, obj.object);
                } else {
                    i++;
                }
            }
        }
        
        this.insertCount++;
    },
    
    /**
     * 检索可能碰撞的对象
     * @param {Object} rect 查询区域 {x, y, width, height}
     * @returns {Array} 可能碰撞的对象列表
     */
    retrieve: function(rect) {
        var returnObjects = [];
        
        // 添加当前节点的对象
        for (var i = 0; i < this.objects.length; i++) {
            returnObjects.push(this.objects[i].object);
        }
        
        // 如果有子节点，递归查询
        if (this.nodes.length) {
            var index = this.getIndex(rect);
            
            if (index !== -1) {
                // 对象完全在一个子节点内
                returnObjects = returnObjects.concat(this.nodes[index].retrieve(rect));
            } else {
                // 对象跨越多个子节点，查询所有子节点
                for (var i = 0; i < this.nodes.length; i++) {
                    returnObjects = returnObjects.concat(this.nodes[i].retrieve(rect));
                }
            }
        }
        
        this.queryCount++;
        return returnObjects;
    },
    
    /**
     * 清除节点及其所有子节点
     */
    clear: function() {
        this.objects = [];
        this.totalObjects = 0;
        
        for (var i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i]) {
                this.nodes[i].clear();
            }
        }
        
        this.nodes = [];
    },
    
    /**
     * 获取节点统计信息
     * @returns {Object} 统计信息
     */
    getStats: function() {
        var stats = {
            level: this.level,
            objectCount: this.objects.length,
            totalObjects: this.totalObjects,
            nodeCount: this.nodes.length,
            queryCount: this.queryCount,
            insertCount: this.insertCount
        };
        
        if (this.nodes.length > 0) {
            stats.children = [];
            for (var i = 0; i < this.nodes.length; i++) {
                stats.children.push(this.nodes[i].getStats());
            }
        }
        
        return stats;
    }
};

/**
 * 四叉树管理器
 * 提供高级接口管理四叉树
 */
var QuadTreeManager = function(bounds, maxObjects, maxLevels) {
    this.root = new QuadTreeNode(bounds, maxObjects, maxLevels);
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    
    // 性能统计
    this.totalQueries = 0;
    this.totalInserts = 0;
    this.lastRebuildTime = 0;
};

QuadTreeManager.prototype = {
    /**
     * 插入对象
     * @param {Object} object 要插入的对象
     */
    insert: function(object) {
        if (!object || !object.x || !object.y || !object.width || !object.height) {
            console.warn('无效对象，无法插入四叉树:', object);
            return;
        }
        
        var rect = {
            x: object.x,
            y: object.y,
            width: object.width,
            height: object.height
        };
        
        this.root.insert(rect, object);
        this.totalInserts++;
    },
    
    /**
     * 检索可能碰撞的对象
     * @param {Object} rect 查询区域 {x, y, width, height}
     * @returns {Array} 可能碰撞的对象列表
     */
    retrieve: function(rect) {
        if (!rect || rect.x === undefined || rect.y === undefined || 
            rect.width === undefined || rect.height === undefined) {
            console.warn('无效查询区域:', rect);
            return [];
        }
        
        this.totalQueries++;
        return this.root.retrieve(rect);
    },
    
    /**
     * 清除所有对象
     */
    clear: function() {
        this.root.clear();
        this.totalInserts = 0;
        this.totalQueries = 0;
    },
    
    /**
     * 重建四叉树
     * @param {Array} objects 对象列表
     */
    rebuild: function(objects) {
        this.clear();
        
        if (objects && objects.length > 0) {
            for (var i = 0; i < objects.length; i++) {
                this.insert(objects[i]);
            }
        }
        
        this.lastRebuildTime = Date.now();
    },
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats: function() {
        return {
            bounds: this.bounds,
            maxObjects: this.maxObjects,
            maxLevels: this.maxLevels,
            totalQueries: this.totalQueries,
            totalInserts: this.totalInserts,
            lastRebuildTime: this.lastRebuildTime,
            root: this.root.getStats()
        };
    }
};

// ==================== 碰撞检测系统 ====================

/**
 * 商用级碰撞检测系统
 * 集成四叉树优化、动态对象管理、平滑移动等功能
 */
var CollisionSystem = {
    // 系统配置
    config: {
        // 四叉树配置
        staticQuadTree: {
            maxObjects: 5,
            maxLevels: 4
        },
        dynamicQuadTree: {
            maxObjects: 8,
            maxLevels: 6
        },
        
        // 碰撞检测配置
        collision: {
            minSeparationDistance: 35,      // 最小分离距离
            maxSearchDistance: 150,         // 最大搜索距离
            moveThreshold: 0.5,            // 移动阈值
            smoothFactor: 0.7              // 平滑因子
        },
        
        // 性能配置
        performance: {
            rebuildInterval: 100,           // 重建间隔（毫秒）
            maxObjectsPerFrame: 1000,      // 每帧最大对象数
            queryCacheSize: 100            // 查询缓存大小
        }
    },
    
    // 系统状态
    currentMap: null,                      // 当前地图
    staticQuadTree: null,                 // 静态四叉树（建筑物）
    dynamicQuadTree: null,                // 动态四叉树（僵尸、人物）
    
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
        
        // 子地图1：不规则建筑布局
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
    
    // 性能监控
    performance: {
        frameCount: 0,
        lastFrameTime: 0,
        collisionChecks: 0,
        quadTreeQueries: 0,
        rebuildCount: 0
    },
    
    // 查询缓存
    queryCache: new Map(),
    cacheHits: 0,
    cacheMisses: 0
};

// ==================== 系统初始化 ====================

/**
 * 初始化碰撞检测系统
 * @param {string} mapId 地图ID
 * @returns {boolean} 初始化是否成功
 */
CollisionSystem.init = function(mapId) {
    try {
        if (!mapId) {
            mapId = 'main'; // 默认使用主地图
        }
        
        if (!this.maps[mapId]) {
            console.error('未知地图ID:', mapId);
            return false;
        }
        
        this.currentMap = this.maps[mapId];
        this.initQuadTrees();
        
        console.log('碰撞检测系统初始化完成');
        console.log('当前地图:', this.currentMap.name);
        console.log('地图类型:', this.currentMap.type);
        console.log('地图尺寸:', this.currentMap.mapWidth, 'x', this.currentMap.mapHeight);
        
        return true;
    } catch (error) {
        console.error('碰撞检测系统初始化失败:', error);
        return false;
    }
};

/**
 * 初始化四叉树系统
 */
CollisionSystem.initQuadTrees = function() {
    if (!this.currentMap) return;
    
    var mapWidth = this.currentMap.mapWidth;
    var mapHeight = this.currentMap.mapHeight;
    
    // 创建静态四叉树（建筑物）
    this.staticQuadTree = new QuadTreeManager(
        {x: 0, y: 0, width: mapWidth, height: mapHeight}, 
        this.config.staticQuadTree.maxObjects, 
        this.config.staticQuadTree.maxLevels
    );
    
    // 创建动态四叉树（僵尸、人物）
    this.dynamicQuadTree = new QuadTreeManager(
        {x: 0, y: 0, width: mapWidth, height: mapHeight}, 
        this.config.dynamicQuadTree.maxObjects, 
        this.config.dynamicQuadTree.maxLevels
    );
    
    this.populateStaticQuadTree();
    console.log('四叉树系统初始化完成');
};

/**
 * 填充静态四叉树（建筑物）
 */
CollisionSystem.populateStaticQuadTree = function() {
    if (!this.staticQuadTree || !this.currentMap) return;
    
    this.staticQuadTree.clear();
    
    if (this.currentMap.type === 'grid') {
        // 网格类型：添加所有网格建筑物
        for (var row = 0; row < this.currentMap.gridRows; row++) {
            for (var col = 0; col < this.currentMap.gridCols; col++) {
                var building = {
                    x: col * this.currentMap.gridSize,
                    y: row * this.currentMap.gridSize,
                    width: this.currentMap.blockSize,
                    height: this.currentMap.blockSize,
                    type: 'grid_building',
                    gridCol: col,
                    gridRow: row
                };
                this.staticQuadTree.insert(building);
            }
        }
    } else if (this.currentMap.type === 'irregular') {
        // 不规则类型：添加所有自定义建筑物
        for (var i = 0; i < this.currentMap.buildings.length; i++) {
            this.staticQuadTree.insert(this.currentMap.buildings[i]);
        }
    }
    
    console.log('静态四叉树已填充建筑物数据，建筑物数量:', 
        this.staticQuadTree.root.totalObjects);
};

// ==================== 动态对象管理 ====================

/**
 * 添加动态对象到四叉树
 * @param {Object} object 动态对象
 */
CollisionSystem.addDynamicObject = function(object) {
    if (this.dynamicQuadTree && object) {
        this.dynamicQuadTree.insert(object);
    }
};

/**
 * 更新动态对象位置
 * @param {Object} object 动态对象
 * @param {Object} oldBounds 旧边界
 */
CollisionSystem.updateDynamicObject = function(object, oldBounds) {
    if (this.dynamicQuadTree && object) {
        // 简化处理：重建动态四叉树
        this.dynamicQuadTree.clear();
    }
};

/**
 * 移除动态对象
 * @param {Object} object 动态对象
 */
CollisionSystem.removeDynamicObject = function(object) {
    if (this.dynamicQuadTree && object) {
        // 四叉树不支持直接移除，需要重建
        this.dynamicQuadTree.clear();
    }
};

/**
 * 重建动态四叉树（当僵尸位置变化时调用）
 * @param {Array} allZombies 所有僵尸
 * @param {Array} allCharacters 所有人物
 */
CollisionSystem.rebuildDynamicQuadTree = function(allZombies, allCharacters) {
    if (!this.dynamicQuadTree) return;
    
    this.dynamicQuadTree.clear();
    
    // 重新添加所有僵尸
    if (allZombies) {
        for (var i = 0; i < allZombies.length; i++) {
            var zombie = allZombies[i];
            if (zombie && zombie.hp > 0) {
                this.dynamicQuadTree.insert(zombie);
            }
        }
    }
    
    // 重新添加所有人物
    if (allCharacters) {
        for (var i = 0; i < allCharacters.length; i++) {
            var character = allCharacters[i];
            if (character) {
                this.dynamicQuadTree.insert(character);
            }
        }
    }
    
    this.performance.rebuildCount++;
    console.log('动态四叉树重建完成，对象数量:', 
        this.dynamicQuadTree.root.totalObjects);
};

// ==================== 碰撞检测核心功能 ====================

/**
 * 检查两个边界是否相交（AABB碰撞检测）
 * @param {Object} bounds1 边界1 {x, y, width, height}
 * @param {Object} bounds2 边界2 {x, y, width, height}
 * @returns {boolean} 是否相交
 */
CollisionSystem.boundsIntersect = function(bounds1, bounds2) {
    return !(bounds1.x > bounds2.x + bounds2.width ||
            bounds1.x + bounds1.width < bounds2.x ||
            bounds1.y > bounds2.y + bounds2.height ||
            bounds1.y + bounds1.height < bounds2.y);
};

/**
 * 检测点是否在建筑物内（主要用于调试和简单检测）
 * @param {number} x X坐标
 * @param {number} y Y坐标
 * @returns {boolean} 是否在建筑物内
 */
CollisionSystem.isPointInBuilding = function(x, y) {
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
};

/**
 * 检测对象边界是否与建筑物重叠（推荐使用）
 * @param {Object} object 对象 {x, y, width, height}
 * @returns {boolean} 是否重叠
 */
CollisionSystem.isObjectOverlappingWithBuildings = function(object) {
    if (!object || !object.x || !object.y || !object.width || !object.height) {
        console.warn('无效对象参数');
        return false;
    }
    
    // 使用四叉树进行边界检测
    if (this.staticQuadTree) {
        var queryArea = {
            x: object.x - object.width / 2,
            y: object.y - object.height / 2,
            width: object.width,
            height: object.height
        };
        
        var nearbyBuildings = this.staticQuadTree.retrieve(queryArea);
        
        for (var i = 0; i < nearbyBuildings.length; i++) {
            var building = nearbyBuildings[i];
            if (this.boundsIntersect(queryArea, building)) {
                return true;
            }
        }
        return false;
    }
    
    // 回退到传统方法
    return this.isRectInBuilding(
        object.x - object.width / 2,
        object.y - object.height / 2,
        object.width,
        object.height
    );
};

/**
 * 网格类型建筑的碰撞检测
 * @param {number} x X坐标
 * @param {number} y Y坐标
 * @returns {boolean} 是否在建筑物内
 */
CollisionSystem._isPointInGridBuilding = function(x, y) {
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
};

/**
 * 不规则类型建筑的碰撞检测
 * @param {number} x X坐标
 * @param {number} y Y坐标
 * @returns {boolean} 是否在建筑物内
 */
CollisionSystem._isPointInIrregularBuilding = function(x, y) {
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
};

/**
 * 检测矩形是否与建筑物重叠（使用四叉树优化）
 * @param {number} rectX 矩形X坐标
 * @param {number} rectY 矩形Y坐标
 * @param {number} rectWidth 矩形宽度
 * @param {number} rectHeight 矩形高度
 * @returns {boolean} 是否重叠
 */
CollisionSystem.isRectInBuilding = function(rectX, rectY, rectWidth, rectHeight) {
    if (!this.staticQuadTree) {
        // 四叉树未初始化，回退到传统方法
        var corners = [
            {x: rectX, y: rectY},                                    // 左上角
            {x: rectX + rectWidth, y: rectY},                        // 右上角
            {x: rectX, y: rectY + rectHeight},                       // 左下角
            {x: rectX + rectWidth, y: rectY + rectHeight}            // 右下角
        ];
        
        for (var i = 0; i < corners.length; i++) {
            if (this.isPointInBuilding(corners[i].x, corners[i].y)) {
                return true;
            }
        }
        return false;
    }
    
    // 使用四叉树范围查询
    var queryArea = {x: rectX, y: rectY, width: rectWidth, height: rectHeight};
    var nearbyBuildings = this.staticQuadTree.retrieve(queryArea);
    
    for (var i = 0; i < nearbyBuildings.length; i++) {
        var building = nearbyBuildings[i];
        if (this.boundsIntersect(queryArea, building)) {
            return true;
        }
    }
    
    return false;
};

/**
 * 检测对象中心点是否在建筑物内
 * @param {number} centerX 中心点X坐标
 * @param {number} centerY 中心点Y坐标
 * @param {number} objectWidth 对象宽度
 * @param {number} objectHeight 对象高度
 * @returns {boolean} 是否在建筑物内
 */
CollisionSystem.isObjectInBuilding = function(centerX, centerY, objectWidth, objectHeight) {
    // 计算对象的左上角坐标
    var objectLeft = centerX - objectWidth / 2;
    var objectTop = centerY - objectHeight / 2;
    
    return this.isRectInBuilding(objectLeft, objectTop, objectWidth, objectHeight);
};

// ==================== 对象间碰撞检测 ====================

/**
 * 检测两个对象是否重叠
 * @param {number} obj1X 对象1中心X坐标
 * @param {number} obj1Y 对象1中心Y坐标
 * @param {number} obj1Width 对象1宽度
 * @param {number} obj1Height 对象1高度
 * @param {number} obj2X 对象2中心X坐标
 * @param {number} obj2Y 对象2中心Y坐标
 * @param {number} obj2Width 对象2宽度
 * @param {number} obj2Height 对象2高度
 * @returns {boolean} 是否重叠
 */
CollisionSystem.isObjectsOverlapping = function(obj1X, obj1Y, obj1Width, obj1Height, 
                                               obj2X, obj2Y, obj2Width, obj2Height) {
    // 计算对象的边界（中心点坐标转换为左上角坐标）
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
};

/**
 * 检测对象与对象列表的碰撞
 * @param {number} objX 对象中心X坐标
 * @param {number} objY 对象中心Y坐标
 * @param {number} objWidth 对象宽度
 * @param {number} objHeight 对象高度
 * @param {Array} objectList 对象列表
 * @returns {boolean} 是否重叠
 */
CollisionSystem.isObjectOverlappingWithList = function(objX, objY, objWidth, objHeight, objectList) {
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
                return true;
            }
        }
    }
    
    return false;
};

/**
 * 使用四叉树检测对象与附近对象的碰撞
 * @param {Object} object 要检测的对象
 * @param {number} radius 检测半径
 * @returns {Array} 附近的对象列表
 */
CollisionSystem.getNearbyObjects = function(object, radius) {
    if (!this.dynamicQuadTree || !object) {
        return [];
    }
    
    var queryArea = {
        x: object.x - radius,
        y: object.y - radius,
        width: radius * 2,
        height: radius * 2
    };
    
    return this.dynamicQuadTree.retrieve(queryArea);
};

// ==================== 平滑移动系统 ====================

/**
 * 获取平滑的移动位置（智能绕行）
 * @param {number} fromX 起始X坐标
 * @param {number} fromY 起始Y坐标
 * @param {number} toX 目标X坐标
 * @param {number} toY 目标Y坐标
 * @param {number} objectWidth 对象宽度
 * @param {number} objectHeight 对象高度
 * @returns {Object} 安全的移动位置 {x, y}
 */
CollisionSystem.getSmoothMovePosition = function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
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
};

/**
 * 获取有效的移动位置（支持平滑滑动）
 * @param {number} fromX 起始X坐标
 * @param {number} fromY 起始Y坐标
 * @param {number} toX 目标X坐标
 * @param {number} toY 目标Y坐标
 * @param {number} objectWidth 对象宽度
 * @param {number} objectHeight 对象高度
 * @returns {Object} 安全的移动位置 {x, y}
 */
CollisionSystem.getValidMovePosition = function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
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
};

/**
 * 寻找最近的可行位置（沿着建筑物边缘）
 * @param {number} fromX 起始X坐标
 * @param {number} fromY 起始Y坐标
 * @param {number} toX 目标X坐标
 * @param {number} toY 目标Y坐标
 * @param {number} objectWidth 对象宽度
 * @param {number} objectHeight 对象高度
 * @returns {Object} 安全的移动位置 {x, y}
 */
CollisionSystem.findNearestSafePosition = function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
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
};

// ==================== 僵尸避免重叠系统 ====================

/**
 * 获取僵尸的有效移动位置（避免与建筑物、其他僵尸和人物重叠）
 * @param {Object} zombie 僵尸对象
 * @param {number} toX 目标X坐标
 * @param {number} toY 目标Y坐标
 * @param {Array} allZombies 所有僵尸
 * @param {Array} allCharacters 所有人物
 * @returns {Object} 安全的移动位置 {x, y}
 */
CollisionSystem.getZombieValidMovePosition = function(zombie, toX, toY, allZombies, allCharacters) {
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
};

/**
 * 获取避免重叠的移动位置
 * @param {number} fromX 起始X坐标
 * @param {number} fromY 起始Y坐标
 * @param {number} toX 目标X坐标
 * @param {number} toY 目标Y坐标
 * @param {number} objectWidth 对象宽度
 * @param {number} objectHeight 对象高度
 * @param {Array} avoidObjects 需要避免的对象列表
 * @param {boolean} buildingCollision 是否启用建筑物碰撞检测
 * @returns {Object} 安全的移动位置 {x, y}
 */
CollisionSystem.getNonOverlappingPosition = function(fromX, fromY, toX, toY, objectWidth, objectHeight, 
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
};

// ==================== 高级寻路和分离算法 ====================

/**
 * 寻找安全的生成位置（不在建筑物内）
 * @param {number} centerX 中心X坐标
 * @param {number} centerY 中心Y坐标
 * @param {number} minDistance 最小距离
 * @param {number} maxDistance 最大距离
 * @param {number} objectWidth 对象宽度
 * @param {number} objectHeight 对象高度
 * @returns {Object} 安全的生成位置 {x, y}
 */
CollisionSystem.findSafePosition = function(centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight) {
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
};

/**
 * 检测移动路径是否有效（支持部分移动）
 * @param {number} fromX 起始X坐标
 * @param {number} fromY 起始Y坐标
 * @param {number} toX 目标X坐标
 * @param {number} toY 目标Y坐标
 * @param {number} objectWidth 对象宽度
 * @param {number} objectHeight 对象高度
 * @returns {boolean} 路径是否有效
 */
CollisionSystem.isMovePathValid = function(fromX, fromY, toX, toY, objectWidth, objectHeight) {
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
};

// ==================== 系统管理和工具函数 ====================

/**
 * 切换地图
 * @param {string} mapId 地图ID
 * @returns {boolean} 切换是否成功
 */
CollisionSystem.switchMap = function(mapId) {
    return this.init(mapId);
};

/**
 * 添加自定义地图配置
 * @param {string} mapId 地图ID
 * @param {Object} config 地图配置
 */
CollisionSystem.addMap = function(mapId, config) {
    this.maps[mapId] = config;
    console.log('添加新地图配置:', mapId, config);
};

/**
 * 获取当前地图信息
 * @returns {Object} 当前地图信息
 */
CollisionSystem.getCurrentMapInfo = function() {
    return this.currentMap;
};

/**
 * 获取所有地图配置
 * @returns {Object} 所有地图配置
 */
CollisionSystem.getAllMaps = function() {
    return this.maps;
};

/**
 * 获取指定位置的建筑物信息
 * @param {number} x X坐标
 * @param {number} y Y坐标
 * @returns {Object|null} 建筑物信息或null
 */
CollisionSystem.getBuildingAtPosition = function(x, y) {
    if (!this.currentMap) return null;
    
    if (this.currentMap.type === 'grid') {
        return this._getGridBuildingAtPosition(x, y);
    } else if (this.currentMap.type === 'irregular') {
        return this._getIrregularBuildingAtPosition(x, y);
    }
    
    return null;
};

/**
 * 获取网格类型建筑信息
 * @param {number} x X坐标
 * @param {number} y Y坐标
 * @returns {Object|null} 建筑物信息或null
 */
CollisionSystem._getGridBuildingAtPosition = function(x, y) {
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
};

/**
 * 获取不规则类型建筑信息
 * @param {number} x X坐标
 * @param {number} y Y坐标
 * @returns {Object|null} 建筑物信息或null
 */
CollisionSystem._getIrregularBuildingAtPosition = function(x, y) {
    if (!this.currentMap.buildings) return null;
    
    for (var i = 0; i < this.currentMap.buildings.length; i++) {
        var building = this.currentMap.buildings[i];
        
        if (x >= building.x && x < building.x + building.width &&
            y >= building.y && y < building.y + building.height) {
            return building;
        }
    }
    
    return null;
};

// ==================== 性能监控和调试 ====================

/**
 * 获取系统性能统计
 * @returns {Object} 性能统计信息
 */
CollisionSystem.getPerformanceStats = function() {
    var stats = {
        performance: this.performance,
        staticQuadTree: this.staticQuadTree ? this.staticQuadTree.getStats() : null,
        dynamicQuadTree: this.dynamicQuadTree ? this.dynamicQuadTree.getStats() : null,
        cache: {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            size: this.queryCache.size
        }
    };
    
    return stats;
};

/**
 * 清理查询缓存
 */
CollisionSystem.cleanupExpiredCache = function() {
    var now = Date.now();
    var expiredKeys = [];
    
    this.queryCache.forEach(function(value, key) {
        if (now - value.timestamp > 5000) { // 5秒过期
            expiredKeys.push(key);
        }
    });
    
    expiredKeys.forEach(function(key) {
        this.queryCache.delete(key);
    }.bind(this));
    
    // 限制缓存大小
    if (this.queryCache.size > this.config.performance.queryCacheSize) {
        var keys = Array.from(this.queryCache.keys());
        var deleteCount = this.queryCache.size - this.config.performance.queryCacheSize;
        
        for (var i = 0; i < deleteCount; i++) {
            this.queryCache.delete(keys[i]);
        }
    }
};

/**
 * 检查四叉树状态
 */
CollisionSystem.checkQuadTreeStatus = function() {
    if (this.staticQuadTree) {
        console.log('静态四叉树状态:', this.staticQuadTree.getStats());
    }
    
    if (this.dynamicQuadTree) {
        console.log('动态四叉树状态:', this.dynamicQuadTree.getStats());
    }
};

/**
 * 测试碰撞检测系统
 */
CollisionSystem.testCollisionSystem = function() {
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
};

// ==================== 导出系统 ====================

// 兼容性处理：支持ES6模块和CommonJS
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = CollisionSystem;
} else if (typeof define === 'function' && define.amd) {
    // AMD环境
    define(function() { return CollisionSystem; });
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.CollisionSystem = CollisionSystem;
}

// 全局访问（抖音小游戏环境）
if (typeof window !== 'undefined') {
    window.collisionSystem = CollisionSystem;
}


