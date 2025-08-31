/**
 * 简化版碰撞检测系统 (collision-simplified.js)
 *
 * 优化内容：
 * - 基于地图网格的简单可行走性检查
 * - 移除复杂的四叉树系统
 * - 直接检查目标位置是否在地图的可行走区域（值为0）
 * - 添加边缘检测，允许贴着建筑物移动
 * - 大幅简化代码，提高性能
 */

// 简化的碰撞检测系统
var CollisionSystem = {
    // 当前地图配置
    currentMap: null, mapManager: null,

    // 地图网格数据
    mapMatrix: null, cellSize: 200, gridCols: 50, gridRows: 50,

    isWithinMapBounds: function (x, y) {
        var mapDimensions = this.getCurrentMapDimensions();
        return x >= 0 && x < mapDimensions.width && y >= 0 && y < mapDimensions.height;
    },

    // 🔴 核心：简化的可行走性检查 - 直接检查地图网格值
    isPositionWalkable: function (x, y) {
        if (!this.mapMatrix) {
            throw new Error('地图矩阵未初始化');
            return true;
        }

        // 将像素坐标转换为网格坐标
        var gridX = Math.floor(x / this.cellSize);
        var gridY = Math.floor(y / this.cellSize);

        // 检查边界
        if (gridX < 0 || gridX >= this.gridCols || gridY < 0 || gridY >= this.gridRows) {
            return false;
        }

        // 检查网格值，只有0表示可行走
        var gridValue = this.mapMatrix[gridY][gridX];
        var isWalkable = gridValue === 0;

        return isWalkable;
    },

    // 🔴 新增：边缘检测 - 检查位置周围是否有可行走空间
    isPositionWalkableWithMargin: function (x, y, margin = 16) {
        if (!this.mapMatrix) {
            return true;
        }

        // 检查中心点
        if (!this.isPositionWalkable(x, y)) {
            return false;
        }

        // 检查周围8个方向是否有可行走空间
        var directions = [{dx: -margin, dy: -margin}, {dx: 0, dy: -margin}, {dx: margin, dy: -margin}, {
            dx: -margin,
            dy: 0
        }, {dx: margin, dy: 0}, {dx: -margin, dy: margin}, {dx: 0, dy: margin}, {dx: margin, dy: margin}];

        var hasWalkableSpace = false;
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var testX = x + dir.dx;
            var testY = y + dir.dy;

            if (this.isPositionWalkable(testX, testY)) {
                hasWalkableSpace = true;
                break;
            }
        }

        return hasWalkableSpace;
    },

    // 🔴 新增：智能移动检测 - 允许贴着建筑物移动
    getSmartMovePosition: function (fromX, fromY, toX, toY, radius) {
        // 如果目标位置完全可行走，直接返回
        if (this.isPositionWalkable(toX, toY)) {
            return {x: toX, y: toY};
        }

        // 尝试在路径上找可行走位置
        var dx = toX - fromX;
        var dy = toY - fromY;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return {x: fromX, y: fromY};
        }

        // 在路径上寻找可行走位置，允许贴着建筑物
        var stepSize = Math.max(radius / 2, 8); // 步长
        var steps = Math.ceil(distance / stepSize);

        for (var i = 1; i <= steps; i++) {
            var ratio = i / steps;
            var testX = fromX + dx * ratio;
            var testY = fromY + dy * ratio;

            // 检查是否有足够的可行走空间
            if (this.isPositionWalkableWithMargin(testX, testY, radius)) {
                return {x: testX, y: testY};
            }
        }

        // 如果找不到合适位置，尝试在起始位置周围找可行走位置
        var nearbyPositions = [{dx: -radius, dy: 0}, {dx: radius, dy: 0}, {dx: 0, dy: -radius}, {
            dx: 0,
            dy: radius
        }, {dx: -radius, dy: -radius}, {dx: radius, dy: -radius}, {dx: -radius, dy: radius}, {dx: radius, dy: radius}];

        for (var j = 0; j < nearbyPositions.length; j++) {
            var pos = nearbyPositions[j];
            var testX = fromX + pos.dx;
            var testY = fromY + pos.dy;

            if (this.isPositionWalkableWithMargin(testX, testY, radius)) {
                return {x: testX, y: testY};
            }
        }

        // 最后返回起始位置
        return {x: fromX, y: fromY};
    },

    // 🔴 新增：贴着建筑物移动的位置计算
    getWallFollowingPosition: function (fromX, fromY, toX, toY, radius, moveSpeed) {
        if (!this.mapMatrix) {
            return {x: toX, y: toY};
        }

        // 获取配置参数
        var wallFollowingConfig = window.ConfigManager ? window.ConfigManager.get('MOVEMENT.WALL_FOLLOWING') : null;
        var diagonalFactor = wallFollowingConfig ? wallFollowingConfig.DIAGONAL_FACTOR : 0.7;
        var searchSteps = wallFollowingConfig ? wallFollowingConfig.SEARCH_STEPS : 8;
        var minStepSize = wallFollowingConfig ? wallFollowingConfig.MIN_STEP_SIZE : 4;
        var nearbyRadius = wallFollowingConfig ? wallFollowingConfig.NEARBY_SEARCH_RADIUS : 0.5;

        // 计算移动方向向量
        var dx = toX - fromX;
        var dy = toY - fromY;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return {x: fromX, y: fromY};
        }

        // 归一化方向向量
        var dirX = dx / distance;
        var dirY = dy / distance;

        // 尝试直接移动到目标位置
        if (this.isPositionWalkable(toX, toY)) {
            return {x: toX, y: toY};
        }

        // 🔴 核心算法：贴着建筑物移动
        // 1. 首先尝试水平移动（贴着垂直墙壁）
        var horizontalX = fromX + dirX * moveSpeed;
        var horizontalY = fromY;

        if (this.isPositionWalkable(horizontalX, horizontalY)) {
            // 水平移动可行，检查是否更接近目标
            var horizontalDistance = Math.sqrt(Math.pow(horizontalX - toX, 2) + Math.pow(horizontalY - toY, 2));
            if (horizontalDistance < distance) {
                return {x: horizontalX, y: horizontalY};
            }
        }

        // 2. 尝试垂直移动（贴着水平墙壁）
        var verticalX = fromX;
        var verticalY = fromY + dirY * moveSpeed;

        if (this.isPositionWalkable(verticalX, verticalY)) {
            // 垂直移动可行，检查是否更接近目标
            var verticalDistance = Math.sqrt(Math.pow(verticalX - toX, 2) + Math.pow(verticalY - toY, 2));
            if (verticalDistance < distance) {
                return {x: verticalX, y: verticalY};
            }
        }

        // 3. 尝试对角线移动（贴着墙角）- 保持匀速
        var diagonalX = fromX + dirX * moveSpeed; // 移除diagonalFactor，保持匀速
        var diagonalY = fromY + dirY * moveSpeed; // 移除diagonalFactor，保持匀速

        if (this.isPositionWalkable(diagonalX, diagonalY)) {
            var diagonalDistance = Math.sqrt(Math.pow(diagonalX - toX, 2) + Math.pow(diagonalY - toY, 2));
            if (diagonalDistance < distance) {
                return {x: diagonalX, y: diagonalY};
            }
        }

        // 4. 如果都不行，尝试在移动方向上找最近的可行走位置
        var stepSize = Math.max(radius / 2, minStepSize);
        var maxSteps = Math.ceil(moveSpeed / stepSize);

        for (var i = 1; i <= maxSteps; i++) {
            var testX = fromX + dirX * i * stepSize;
            var testY = fromY + dirY * i * stepSize;

            if (this.isPositionWalkable(testX, testY)) {
                return {x: testX, y: testY};
            }
        }

        // 5. 最后尝试在起始位置周围找可行走位置
        var nearbyPositions = [{dx: -radius * nearbyRadius, dy: 0}, {dx: radius * nearbyRadius, dy: 0}, {
            dx: 0,
            dy: -radius * nearbyRadius
        }, {dx: 0, dy: radius * nearbyRadius}];

        for (var j = 0; j < nearbyPositions.length; j++) {
            var pos = nearbyPositions[j];
            var testX = fromX + pos.dx;
            var testY = fromY + pos.dy;

            if (this.isPositionWalkable(testX, testY)) {
                return {x: testX, y: testY};
            }
        }

        // 无法移动，返回起始位置
        return {x: fromX, y: fromY};
    },

    // 🔴 核心：简化的移动碰撞检测 - 检查目标位置是否可行走
    getCircleSafeMovePosition: function (fromX, fromY, toX, toY, radius) {
        // 使用智能移动检测，允许贴着建筑物移动
        return this.getSmartMovePosition(fromX, fromY, toX, toY, radius);
    },

    // 🔴 核心：简化的圆形碰撞检测 - 检查中心点是否可行走
    isCircleCollidingWithBuildings: function (circleX, circleY, circleRadius) {
        // 简化：只检查中心点是否可行走
        return !this.isPositionWalkable(circleX, circleY);
    },

    // 🔴 核心：简化的矩形碰撞检测 - 检查中心点是否可行走
    isRectCollidingWithBuildings: function (rectX, rectY, rectWidth, rectHeight) {
        // 简化：只检查中心点是否可行走
        return !this.isPositionWalkable(rectX, rectY);
    },

    // 🔴 核心：简化的安全位置生成 - 在可行走区域找位置
    generateGameSafePosition: function (centerX, centerY, minDistance, maxDistance, objectWidth, objectHeight, isCircle = true) {
        var radius = isCircle ? objectWidth / 2 : Math.max(objectWidth, objectHeight) / 2;

        // 随机位置搜索
        for (var attempt = 0; attempt < 50; attempt++) {
            var angle = Math.random() * Math.PI * 2;
            var distance = minDistance + Math.random() * (maxDistance - minDistance);
            var testX = centerX + Math.cos(angle) * distance;
            var testY = centerY + Math.sin(angle) * distance;

            if (this.isWithinMapBounds(testX, testY) && this.isPositionWalkable(testX, testY)) {
                return {x: testX, y: testY, success: true};
            }
        }

        // 备用方案：返回边缘位置
        var edgePositions = [{x: 100, y: 100}, {x: this.currentMap.mapWidth - 100, y: 100}, {
            x: 100,
            y: this.currentMap.mapHeight - 100
        }, {x: this.currentMap.mapWidth - 100, y: this.currentMap.mapHeight - 100}];

        for (var i = 0; i < edgePositions.length; i++) {
            var edgePos = edgePositions[i];
            if (this.isPositionWalkable(edgePos.x, edgePos.y)) {
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

        console.log('🗺️ 初始化简化版碰撞检测系统，地图ID:', mapId);

        // 获取地图管理器
        if (typeof window !== 'undefined' && window.MapManager) {
            this.mapManager = window.MapManager;
        } else {
            throw new Error('地图管理器不可用');
        }

        // 获取地图配置
        if (this.mapManager && this.mapManager.getCurrentMap) {
            const mapConfig = this.mapManager.getCurrentMap();
            if (mapConfig) {
                this.currentMap = {
                    name: mapConfig.config.name,
                    type: 'matrix',
                    mapWidth: mapConfig.config.width,
                    mapHeight: mapConfig.config.height,
                    cellSize: mapConfig.config.cellSize,
                    gridCols: mapConfig.config.gridCols,
                    gridRows: mapConfig.config.gridRows
                };

                // 🔴 核心：获取地图矩阵数据
                this.mapMatrix = mapConfig.matrix;
                this.cellSize = mapConfig.config.cellSize;
                this.gridCols = mapConfig.config.gridCols;
                this.gridRows = mapConfig.config.gridRows;

                console.log('✅ 地图配置已加载:', this.currentMap);
                console.log('✅ 地图矩阵已加载，网格大小:', this.gridCols, 'x', this.gridRows);
            } else {
                throw new Error('地图配置获取失败');
            }
        } else {
            throw new Error('地图管理器不可用');
        }

        console.log('✅ 简化版碰撞系统初始化完成');
        return true;
    },

    // 获取当前地图
    getCurrentMap: function () {
        if (this.mapManager && this.mapManager.getCurrentMap) {
            return this.mapManager.getCurrentMap();
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

    // 🔴 简化：移除复杂的空间索引方法，只保留基本的碰撞检测
    addToSpatialIndex: function (object) {
        // 简化版本不需要空间索引
        return true;
    },

    removeFromSpatialIndex: function (object) {
        // 简化版本不需要空间索引
        return true;
    },

    // 🔴 简化：移除对象管理方法
    getAllCharacters: function () {
        // 简化版本返回空数组
        return [];
    },

    getMainCharacter: function () {
        // 简化版本返回null
        return null;
    },

    getAllZombies: function () {
        // 简化版本返回空数组
        return [];
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollisionSystem;
} else if (typeof window !== 'undefined') {
    window.CollisionSystem = CollisionSystem;
}
