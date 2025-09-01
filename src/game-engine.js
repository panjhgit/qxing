/**
 * 游戏引擎模块 (game-engine.js)
 */

// 触摸摇杆控制器
var TouchJoystick = function (canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.isActive = false;
    this.isVisible = false;

    // 从配置获取摇杆设置
    var joystickConfig = window.ConfigManager ? window.ConfigManager.get('GAMEPLAY.JOYSTICK') : {
        DYNAMIC_POSITION: true,
        AUTO_HIDE: false,
        OUTER_RADIUS: 60,
        INNER_RADIUS: 25,
        TOUCH_THRESHOLD: 20
    };

    // 摇杆位置和大小
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height - 120;
    this.defaultCenterX = canvas.width / 2;
    this.defaultCenterY = canvas.height - 120;
    this.outerRadius = joystickConfig.OUTER_RADIUS || 60;
    this.innerRadius = joystickConfig.INNER_RADIUS || 25;
    this.touchThreshold = joystickConfig.TOUCH_THRESHOLD || 20;

    // 摇杆行为设置
    this.isDynamicPosition = joystickConfig.DYNAMIC_POSITION !== false;
    this.autoHide = joystickConfig.AUTO_HIDE !== false;

    // 触摸状态
    this.touchId = null;
    this.joystickX = 0;
    this.joystickY = 0;
    this.isDragging = false;

    // 移动控制
    this.moveDirection = {x: 0, y: 0};
    this.moveSpeed = 0.1;

    // 绑定触摸事件
    this.bindEvents();
};

// 触摸摇杆事件绑定
TouchJoystick.prototype.bindEvents = function () {
    var self = this;

    // 触摸开始
    var touchStartHandler = function (e) {
        var touch = e.touches[0];
        var x = touch.x || touch.clientX || touch.pageX || 0;
        var y = touch.y || touch.clientY || touch.pageY || 0;

        // 如果摇杆不可见，根据配置决定是否以触摸点为中心显示摇杆
        if (!self.isVisible) {
            if (self.isDynamicPosition) {
                self.setCenterPosition(x, y);
            }
            self.show();
        } else {
            // 如果摇杆已经可见，检查是否触摸了摇杆区域
            var distance = Math.sqrt(Math.pow(x - self.centerX, 2) + Math.pow(y - self.centerY, 2));
            var touchThreshold = self.outerRadius + self.touchThreshold;
            
            if (distance <= touchThreshold && self.isDynamicPosition) {
                // 如果触摸了摇杆区域，移动到触摸点
                self.setCenterPosition(x, y);
            }
        }

        // 检查触摸点是否在摇杆范围内
        var distance = Math.sqrt(Math.pow(x - self.centerX, 2) + Math.pow(y - self.centerY, 2));
        var touchThreshold = self.outerRadius + self.touchThreshold;

        if (distance <= touchThreshold) {
            self.touchId = touch.identifier;
            self.isDragging = true;
            self.isActive = true;
            self.updateJoystickPosition(x, y);
        }
    };

    // 触摸移动
    var touchMoveHandler = function (e) {
        if (!self.isVisible || !self.isDragging || !self.isActive) {
            return;
        }

        var touch = null;
        for (var i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === self.touchId) {
                touch = e.touches[i];
                break;
            }
        }

        if (touch) {
            var x = touch.x || touch.clientX || touch.pageX || 0;
            var y = touch.y || touch.clientY || touch.pageY || 0;

            var deltaX = x - self.centerX;
            var deltaY = y - self.centerY;
            var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > self.outerRadius) {
                deltaX = (deltaX / distance) * self.outerRadius;
                deltaY = (deltaY / distance) * self.outerRadius;
            }

            self.updateJoystickPosition(self.centerX + deltaX, self.centerY + deltaY);
        }
    };

    // 触摸结束
    var touchEndHandler = function (e) {
        if (!self.isVisible) return;

        var touchEnded = false;
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === self.touchId) {
                touchEnded = true;
                break;
            }
        }

        if (touchEnded) {
            self.resetJoystick();
            // 触摸结束后，摇杆回到默认位置而不是隐藏
            self.returnToDefaultPosition();
        }
    };

    // 触摸取消
    var touchCancelHandler = function (e) {
        if (!self.isVisible) return;
        self.resetJoystick();
        // 触摸取消后，摇杆回到默认位置而不是隐藏
        self.returnToDefaultPosition();
    };

    // 绑定触摸事件
    if (typeof tt !== 'undefined' && tt.onTouchStart) {
        tt.onTouchStart(touchStartHandler);
        tt.onTouchMove(touchMoveHandler);
        tt.onTouchEnd(touchEndHandler);
        tt.onTouchCancel(touchCancelHandler);
    } else {
        self.canvas.addEventListener('touchstart', touchStartHandler, {passive: true});
        self.canvas.addEventListener('touchmove', touchMoveHandler, {passive: true});
        self.canvas.addEventListener('touchend', touchEndHandler, {passive: true});
        self.canvas.addEventListener('touchcancel', touchCancelHandler, {passive: true});
    }
};

// 设置摇杆中心位置
TouchJoystick.prototype.setCenterPosition = function (x, y) {
    // 确保摇杆不会超出屏幕边界
    var margin = this.outerRadius + 20;
    this.centerX = Math.max(margin, Math.min(this.canvas.width - margin, x));
    this.centerY = Math.max(margin, Math.min(this.canvas.height - margin, y));
};

// 更新摇杆位置
TouchJoystick.prototype.updateJoystickPosition = function (x, y) {
    var deltaX = x - this.centerX;
    var deltaY = y - this.centerY;
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.outerRadius) {
        deltaX = (deltaX / distance) * this.outerRadius;
        deltaY = (deltaY / distance) * this.outerRadius;
    }

    this.joystickX = deltaX;
    this.joystickY = deltaY;

    if (distance > 0) {
        this.moveDirection.x = deltaX / this.outerRadius;
        this.moveDirection.y = deltaY / this.outerRadius;
    } else {
        this.moveDirection.x = 0;
        this.moveDirection.y = 0;
    }
};

// 重置摇杆
TouchJoystick.prototype.resetJoystick = function () {
    this.joystickX = 0;
    this.joystickY = 0;
    this.moveDirection.x = 0;
    this.moveDirection.y = 0;
    this.isDragging = false;
    this.isActive = false;
    this.touchId = null;
};

// 渲染摇杆
TouchJoystick.prototype.render = function (ctx) {
    if (!this.isVisible) return;

    var renderCtx = ctx || this.ctx;
    if (!renderCtx) return;

    // 绘制外圈
    renderCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    renderCtx.beginPath();
    renderCtx.arc(this.centerX, this.centerY, this.outerRadius, 0, Math.PI * 2);
    renderCtx.fill();

    // 绘制外圈边框
    renderCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    renderCtx.lineWidth = 2;
    renderCtx.stroke();

    // 绘制内圈
    var innerX = this.centerX + this.joystickX;
    var innerY = this.centerY + this.joystickY;

    renderCtx.fillStyle = this.isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
    renderCtx.beginPath();
    renderCtx.arc(innerX, innerY, this.innerRadius, 0, Math.PI * 2);
    renderCtx.fill();

    // 绘制内圈边框
    renderCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    renderCtx.lineWidth = 1;
    renderCtx.stroke();

    // 绘制中心点
    renderCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    renderCtx.beginPath();
    renderCtx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
    renderCtx.fill();
};

// 显示默认摇杆
TouchJoystick.prototype.showDefault = function () {
    this.isVisible = true;
    this.isActive = false;
    this.resetJoystick();
    // 重置到默认位置
    this.centerX = this.defaultCenterX;
    this.centerY = this.defaultCenterY;
};

// 回到默认位置
TouchJoystick.prototype.returnToDefaultPosition = function () {
    // 如果配置了自动隐藏，则隐藏摇杆
    if (this.autoHide) {
        this.hide();
    } else {
        // 否则回到默认位置并确保可见
        this.centerX = this.defaultCenterX;
        this.centerY = this.defaultCenterY;
        this.isVisible = true;
    }
};

// 显示摇杆
TouchJoystick.prototype.show = function () {
    this.isVisible = true;
};

// 更新默认位置（当屏幕尺寸变化时调用）
TouchJoystick.prototype.updateDefaultPosition = function () {
    this.defaultCenterX = this.canvas.width / 2;
    this.defaultCenterY = this.canvas.height - 120;
    
    // 如果摇杆当前在默认位置，也更新当前位置
    if (this.centerX === this.defaultCenterX && this.centerY === this.defaultCenterY) {
        this.centerX = this.defaultCenterX;
        this.centerY = this.defaultCenterY;
    }
};

// 隐藏摇杆
TouchJoystick.prototype.hide = function () {
    this.isVisible = false;
    this.resetJoystick();
};

// 获取移动方向
TouchJoystick.prototype.getMoveDirection = function () {
    return this.moveDirection;
};

// 游戏引擎主类
var GameEngine = function (canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameState = 'home';

    // 触摸摇杆
    this.joystick = null;

    // 视觉系统
    this.viewSystem = null;

    // 系统引用
    this.mapSystem = null;
    this.characterManager = null;
    this.menuSystem = null;
    this.eventSystem = null;
    this.zombieManager = null;

    // 导航系统
    this.navigationSystem = null;
    this.dynamicObstacleManager = null;

    // 计时系统
    this.timeSystem = {
        day: 1,
        isDay: true,
        dayTime: 0,
        currentTime: 0,
        dayDuration: 0,
        food: 5
    };

    // 帧计数器
    this.frameCount = 0;
    this.lastUpdateTime = performance.now();

    // 性能监控
    this.performanceMonitor = {
        frameCount: 0,
        lastFPS: 60,
        fpsHistory: [],
        lastOptimizationTime: 0,
        targetFPS: 60,
        minFPS: 30,

        updateFPS: function (deltaTime) {
            this.frameCount++;
            if (this.frameCount % 60 === 0) {
                var currentFPS = Math.round(60 / deltaTime);
                this.lastFPS = currentFPS;
                this.fpsHistory.push(currentFPS);

                if (this.fpsHistory.length > 100) {
                    this.fpsHistory.shift();
                }

                this.checkPerformance();
            }
        },

        checkPerformance: function () {
            var currentTime = Date.now();
            if (currentTime - this.lastOptimizationTime < 8000) return;

            var avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

            if (avgFPS < this.minFPS) {
                this.optimizePerformance();
                this.lastOptimizationTime = currentTime;
            } else if (avgFPS > this.targetFPS - 5) {
                this.optimizeForQuality();
            }
        },

        optimizePerformance: function () {
            if (!window.zombieManager) return;

            var zombies = window.zombieManager.getAllZombies();

            if (zombies.length > 35) {
                var excessZombies = zombies.length - 28;
                var mainChar = window.characterManager ? window.characterManager.getMainCharacter() : null;
                
                if (mainChar) {
                    zombies.sort((a, b) => {
                        var distA = Math.sqrt(Math.pow(a.x - mainChar.x, 2) + Math.pow(a.y - mainChar.y, 2));
                        var distB = Math.sqrt(Math.pow(b.x - mainChar.x, 2) + Math.pow(b.y - mainChar.y, 2));
                        return distB - distA;
                    });

                    for (var i = 0; i < Math.min(excessZombies, 10); i++) {
                        if (zombies[i]) {
                            zombies[i].hp = 0;
                        }
                    }
                }
            }

            if (window.zombieManager && window.zombieManager.setUpdateInterval) {
                window.zombieManager.setUpdateInterval(2);
            }

            if (window.gc) {
                window.gc();
            }
        },

        optimizeForQuality: function () {
            if (!window.zombieManager) return;

            if (window.zombieManager.setUpdateInterval) {
                window.zombieManager.setUpdateInterval(1);
            }
        },

        getStats: function () {
            var avgFPS = this.fpsHistory.length > 0 ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length : 0;

            return {
                currentFPS: this.lastFPS,
                averageFPS: avgFPS.toFixed(1),
                frameCount: this.frameCount,
                optimizationCount: this.lastOptimizationTime > 0 ? '已启用' : '未启用'
            };
        }
    };

    // 初始化
    this.init();
};

// 初始化游戏引擎
GameEngine.prototype.init = function () {
    this.joystick = new TouchJoystick(this.canvas, this.ctx);

    if (typeof ViewSystem !== 'undefined') {
        this.viewSystem = new ViewSystem(this.canvas, this.ctx);
    }

    this.initTimeSystemConfig();

    if (typeof window !== 'undefined' && !window.ConfigManager && typeof ConfigManager !== 'undefined') {
        window.ConfigManager = ConfigManager;
    }
};

// 初始化时间系统配置
GameEngine.prototype.initTimeSystemConfig = function () {
    if (window.ConfigManager) {
        var timeConfig = window.ConfigManager.get('TIME_SYSTEM');
        if (timeConfig) {
            this.timeSystem.dayDuration = timeConfig.DAY_DURATION;
        }
    } else {
        this.timeSystem.dayDuration = 10;
    }
};

// 设置游戏状态
GameEngine.prototype.setGameState = function (newState) {
    this.gameState = newState;

    // 在游戏开始时显示默认摇杆
    if (this.joystick) {
        if (newState === 'playing') {
            this.joystick.showDefault();
        } else {
            this.joystick.hide();
        }
    }

    if (this.eventSystem) {
        this.eventSystem.gameState = newState;
    }

    this.frameCount = 0;
    this.lastUpdateTime = performance.now();
};

// 设置系统引用
GameEngine.prototype.setSystems = function (mapSystem, characterManager, menuSystem, eventSystem, zombieManager, collisionSystem) {
    this.mapSystem = mapSystem;
    this.characterManager = characterManager;
    this.menuSystem = menuSystem;
    this.eventSystem = eventSystem;
    this.zombieManager = zombieManager;
    this.collisionSystem = collisionSystem;

    if (window.objectManager && collisionSystem) {
        window.objectManager.setSpatialIndex(collisionSystem);
    }

    this.initObjectPools();
    this.retryInitAdvancedSystems();

    if (!this.joystick) {
        this.joystick = new TouchJoystick(this.canvas, this.ctx);
    }

    if (!this.viewSystem && typeof ViewSystem !== 'undefined') {
        this.viewSystem = new ViewSystem(this.canvas, this.ctx);
    }

    if (this.viewSystem && mapSystem) {
        var mapWidth = 0;
        var mapHeight = 0;

        if (mapSystem.currentMap && mapSystem.currentMap.config) {
            mapWidth = mapSystem.currentMap.config.width;
            mapHeight = mapSystem.currentMap.config.height;
        } else if (mapSystem.config) {
            mapWidth = mapSystem.config.width;
            mapHeight = mapSystem.config.height;
        } else {
            throw new Error('无法获取地图尺寸');
        }

        this.viewSystem.init(mapWidth, mapHeight);

        if (characterManager) {
            var mainChar = characterManager.getMainCharacter();
            if (mainChar) {
                this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
            }
        }
    } else {
        throw new Error('视觉系统或地图系统未准备好，无法初始化视觉系统');
    }
};

// 初始化导航系统
GameEngine.prototype.initNavigationSystem = function () {
    if (!this.mapSystem) {
        throw new Error('[GameEngine] 地图系统未初始化，无法构建NavMesh');
        return false;
    }

    if (!this.mapSystem.buildings || this.mapSystem.buildings.length === 0) {
        return false;
    }

    if (typeof NavigationSystem !== 'undefined') {
        this.navigationSystem = new NavigationSystem();

        const mapData = {
            type: 'matrix',
            mapWidth: this.mapSystem.mapWidth,
            mapHeight: this.mapSystem.mapHeight,
            cellSize: this.mapSystem.cellSize,
            gridCols: this.mapSystem.gridCols,
            gridRows: this.mapSystem.gridRows,
            buildings: this.mapSystem.buildings,
            walkableAreas: this.mapSystem.walkableAreas,
            mapMatrix: this.mapSystem.mapMatrix
        };

        this.navigationSystem.buildNavigationMesh(mapData);
        return true;
    } else {
        throw new Error('[GameEngine] NavigationSystem未定义，跳过NavMesh初始化');
        return false;
    }
};

// 初始化对象池系统
GameEngine.prototype.initObjectPools = function () {
    if (typeof window !== 'undefined' && window.objectPoolManager) {
        return true;
    } else {
        throw new Error('[GameEngine] 对象池管理器不可用，跳过对象池初始化');
        return false;
    }
};

// 重试初始化高级系统
GameEngine.prototype.retryInitAdvancedSystems = function () {
    var self = this;
    var retryCount = 0;
    var maxRetries = 10;

    function attemptInit() {
        if (retryCount >= maxRetries) {
            return;
        }

        retryCount++;

        var navResult = self.initNavigationSystem();
        var obstacleResult = self.initDynamicObstacleManager();

        if (!(navResult && obstacleResult)) {
            setTimeout(attemptInit, 200);
        }
    }

    setTimeout(attemptInit, 100);
};

// 初始化动态障碍物管理器
GameEngine.prototype.initDynamicObstacleManager = function () {
    if (!this.mapSystem) {
        throw new Error('[GameEngine] 地图系统未初始化，无法初始化动态障碍物管理器');
        return false;
    }

    if (!this.mapSystem.mapWidth || !this.mapSystem.mapHeight) {
        return false;
    }

    if (typeof DynamicObstacleManager !== 'undefined') {
        this.dynamicObstacleManager = new DynamicObstacleManager(this.mapSystem.mapWidth, this.mapSystem.mapHeight);
        this.addSampleDynamicObstacles();
        return true;
    } else {
        throw new Error('[GameEngine] DynamicObstacleManager未定义，跳过动态障碍物管理器初始化');
        return false;
    }
};

// 添加示例动态障碍物
GameEngine.prototype.addSampleDynamicObstacles = function () {
    if (!this.dynamicObstacleManager) return;

    const cars = [
        {id: 'car_1', x: 2000, y: 2000, width: 80, height: 120, type: 'car'},
        {id: 'car_2', x: 4000, y: 3000, width: 80, height: 120, type: 'car'},
        {id: 'car_3', x: 6000, y: 5000, width: 80, height: 120, type: 'car'}
    ];

    cars.forEach(carData => {
        const car = new DynamicObstacle(carData.id, carData.x, carData.y, carData.width, carData.height, carData.type);
        this.dynamicObstacleManager.addObstacle(car);
    });

    const barriers = [
        {id: 'barrier_1', x: 1500, y: 1500, width: 40, height: 40, type: 'barrier'},
        {id: 'barrier_2', x: 3500, y: 2500, width: 40, height: 40, type: 'barrier'}
    ];

    barriers.forEach(barrierData => {
        const barrier = new DynamicObstacle(barrierData.id, barrierData.x, barrierData.y, barrierData.width, barrierData.height, barrierData.type);
        this.dynamicObstacleManager.addObstacle(barrier);
    });
};

// 获取时间配置
GameEngine.prototype.getTimeConfig = function () {
    return window.ConfigManager ? window.ConfigManager.get('TIME_SYSTEM') : null;
};

// 计算两点间距离
GameEngine.prototype.calculateDistance = function (x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

// 获取增量时间
GameEngine.prototype.getDeltaTime = function () {
    var currentTime = performance.now();
    var deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;
    return Math.min(deltaTime, 1 / 30);
};

// 更新计时系统
GameEngine.prototype.updateTimeSystem = function () {
    var timeConfig = this.getTimeConfig();
    var dayDuration = timeConfig ? timeConfig.DAY_DURATION : 10;
    var dayPhaseDuration = timeConfig ? timeConfig.DAY_PHASE_DURATION : 5;

    this.timeSystem.currentTime += 1 / 60;

    if (this.timeSystem.currentTime >= dayDuration) {
        this.timeSystem.currentTime = 0;
        this.timeSystem.day++;
        this.spawnOneZombiePerDay();
    }

    var dayProgress = this.timeSystem.currentTime / dayDuration;
    this.timeSystem.isDay = dayProgress < (dayPhaseDuration / dayDuration);

    this.frameCount++;
};

// 获取团队人数
GameEngine.prototype.getTeamSize = function () {
    if (!this.characterManager) return 0;
    var characters = this.characterManager.getAllCharacters();
    return characters.length;
};

// 获取时间系统信息
GameEngine.prototype.getTimeInfo = function () {
    return {
        day: this.timeSystem.day,
        isDay: this.timeSystem.isDay,
        dayTime: this.timeSystem.dayTime,
        food: this.timeSystem.food,
        teamSize: this.getTeamSize()
    };
};

// 每天刷新僵尸
GameEngine.prototype.spawnOneZombiePerDay = function () {
    if (!this.zombieManager || !this.characterManager) {
        console.warn('GameEngine: 僵尸管理器或角色管理器未初始化，跳过僵尸刷新');
        return;
    }

    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) {
        console.warn('GameEngine: 主人物未找到，跳过僵尸刷新');
        return;
    }

    var timeConfig = this.getTimeConfig();
    var zombiesPerDay = timeConfig ? timeConfig.ZOMBIES_PER_DAY : 10;
    var minDistance = timeConfig ? timeConfig.SPAWN_RANGE.MIN_DISTANCE : 500;
    var maxDistance = timeConfig ? timeConfig.SPAWN_RANGE.MAX_DISTANCE : 700;

    this.createEntityBatchAroundPlayer('zombie', zombiesPerDay, mainChar, minDistance, maxDistance);
    this.spawnPartnersPerDay();
};

// 每天刷新伙伴
GameEngine.prototype.spawnPartnersPerDay = function () {
    if (!window.partnerManager || !this.characterManager) {
        console.warn('GameEngine: 伙伴管理器或角色管理器未初始化，跳过伙伴刷新');
        return;
    }

    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) {
        console.warn('GameEngine: 主人物未找到，跳过伙伴刷新');
        return;
    }

    var timeConfig = this.getTimeConfig();
    var partnersPerDay = timeConfig ? timeConfig.PARTNERS_PER_DAY : 2;
    var minDistance = timeConfig ? timeConfig.PARTNER_SPAWN_RANGE.MIN_DISTANCE : 200;
    var maxDistance = timeConfig ? timeConfig.PARTNER_SPAWN_RANGE.MAX_DISTANCE : 400;

    this.createEntityBatchAroundPlayer('partner', partnersPerDay, mainChar, minDistance, maxDistance);
};

// 通用实体批次创建方法
GameEngine.prototype.createEntityBatchAroundPlayer = function (entityType, batchSize, mainChar, minDistance, maxDistance) {
    var manager = entityType === 'zombie' ? this.zombieManager : window.partnerManager;
    var entityTypes = entityType === 'zombie' ? ['skinny', 'fat', 'fast', 'tank', 'boss'] : ['police', 'civilian', 'doctor', 'nurse', 'chef'];
    var managerName = entityType === 'zombie' ? '僵尸管理器' : '伙伴管理器';
    var entityName = entityType === 'zombie' ? '僵尸' : '伙伴';

    if (!manager) {
        console.warn('GameEngine: ' + managerName + '未初始化，无法创建' + entityName + '批次');
        return;
    }

    var createdEntities = [];
    var maxAttempts = 100;

    for (var i = 0; i < batchSize; i++) {
        var entityCreated = false;
        var attempts = 0;

        while (!entityCreated && attempts < maxAttempts) {
            attempts++;

            var angle = Math.random() * Math.PI * 2;
            var distance = minDistance + Math.random() * (maxDistance - minDistance);
            var randomType = entityTypes[Math.floor(Math.random() * entityTypes.length)];

            var entityX = mainChar.x + Math.cos(angle) * distance;
            var entityY = mainChar.y + Math.sin(angle) * distance;

            if (this.isValidSpawnPosition(entityX, entityY, mainChar, createdEntities, entityType)) {
                var createMethod = entityType === 'zombie' ? 'createZombie' : 'createPartner';
                var createdEntity = manager[createMethod](randomType, entityX, entityY);

                if (createdEntity) {
                    createdEntities.push(createdEntity);
                    entityCreated = true;

                    if (!createdEntity._spatialIndexId) {
                        console.warn('GameEngine: ' + entityName + '未添加到空间索引！');
                    }
                } else {
                    console.warn('GameEngine: ' + entityName + '创建失败');
                }
            } else {
                if (attempts % 20 === 0) {
                    angle += Math.PI / 6;
                    distance += (Math.random() - 0.5) * 100;
                    distance = Math.max(minDistance - 100, Math.min(maxDistance + 100, distance));
                }
            }
        }

        if (!entityCreated) {
            console.warn('GameEngine: ' + entityName + (i + 1) + '无法找到有效位置，跳过创建');
        }
    }
};

// 通用位置验证方法
GameEngine.prototype.isValidSpawnPosition = function (x, y, mainChar, existingEntities, entityType) {
    var timeConfig = this.getTimeConfig();
    var configKey = entityType === 'zombie' ? 'SPAWN_RANGE' : 'PARTNER_SPAWN_RANGE';
    var minDistance = timeConfig ? timeConfig[configKey].MIN_DISTANCE : (entityType === 'zombie' ? 500 : 200);
    var maxDistance = timeConfig ? timeConfig[configKey].MAX_DISTANCE : (entityType === 'zombie' ? 700 : 400);

    var distanceFromMain = this.calculateDistance(x, y, mainChar.x, mainChar.y);
    if (distanceFromMain < minDistance || distanceFromMain > maxDistance) {
        return false;
    }

    if (this.collisionSystem && this.collisionSystem.isPositionWalkable) {
        if (!this.collisionSystem.isPositionWalkable(x, y)) {
            return false;
        }
    }

    if (existingEntities && existingEntities.length > 0) {
        for (var i = 0; i < existingEntities.length; i++) {
            var existingEntity = existingEntities[i];
            var distance = this.calculateDistance(x, y, existingEntity.x, existingEntity.y);
            if (distance < 50) {
                return false;
            }
        }
    }

    if (this.mapSystem && this.mapSystem.currentMap && this.mapSystem.currentMap.config) {
        var mapConfig = this.mapSystem.currentMap.config;
        if (x < 100 || x > mapConfig.width - 100 || y < 100 || y > mapConfig.height - 100) {
            return false;
        }
    }

    if (this.collisionSystem && this.collisionSystem.isPositionWalkable) {
        var hasWalkableSpace = false;
        for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            var testX = x + Math.cos(angle) * 30;
            var testY = y + Math.sin(angle) * 30;
            if (this.collisionSystem.isPositionWalkable(testX, testY)) {
                hasWalkableSpace = true;
                break;
            }
        }
        if (!hasWalkableSpace) {
            return false;
        }
    }

    return true;
};

// 游戏循环更新
GameEngine.prototype.update = function () {
    this.frameCount++;

    if (this.performanceMonitor) {
        var deltaTime = this.getDeltaTime();
        this.performanceMonitor.updateFPS(deltaTime);
    }

    if (this.characterManager && this.viewSystem) {
        var mainChar = this.characterManager.getMainCharacter();
        if (mainChar) {
            this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
        }
    }

    if (this.characterManager) {
        var deltaTime = this.getDeltaTime();
        this.characterManager.updateAllCharacters(deltaTime);
    }

    this.updateTimeSystem();

    if (this.zombieManager) {
        var characters = this.characterManager ? this.characterManager.getAllCharacters() : [];
        var deltaTime = this.getDeltaTime();
        this.zombieManager.updateAllZombies(characters, deltaTime, this.frameCount);
    }

    if (window.partnerManager) {
        var deltaTime = this.getDeltaTime();
        window.partnerManager.updateAllPartners(deltaTime);
    }

    if (this.dynamicObstacleManager) {
        var deltaTime = this.getDeltaTime();
        this.dynamicObstacleManager.updateAllObstacles(deltaTime);

        if (this.frameCount % 120 === 0) {
            this.dynamicObstacleManager.cleanupInvalidObstacles();
        }
    }

    if (window.objectPoolManager) {
        window.objectPoolManager.update();
    }

    if (window.objectManager) {
        if (this.frameCount % 60 === 0) {
            const cleanedCount = window.objectManager.cleanupDeadObjects();
        }
    }

    if (window.memoryMonitor) {
        window.memoryMonitor.checkMemoryUsage();
    }

    if (window.objectHealthChecker) {
        const healthStatus = window.objectHealthChecker.checkHealth();
        if (healthStatus.overall === 'critical') {
            console.warn('🚨 对象管理系统健康状态严重:', healthStatus);
        }
    }

    if (this.viewSystem) {
        this.viewSystem.update();
    }

    if (this.frameCount % 300 === 0) {
        this.logSystemStatus();
    }
};

// 记录系统状态
GameEngine.prototype.logSystemStatus = function () {
    if (this.performanceMonitor && this.performanceMonitor.getStats) {
        var perfStats = this.performanceMonitor.getStats();
    }

    if (this.characterManager) {
        var characters = this.characterManager.getAllCharacters();
    }

    if (this.zombieManager) {
        var zombies = this.zombieManager.getAllZombies();
        var activeZombies = zombies.filter(z => z.hp > 0);

        if (this.zombieManager.getBatchInfo && typeof this.zombieManager.getBatchInfo === 'function') {
            var batchInfo = this.zombieManager.getBatchInfo(this.frameCount);
        }

        if (this.zombieManager.logPerformanceReport) {
            this.zombieManager.logPerformanceReport(this.frameCount);
        }
    }

    if (this.navigationSystem) {
    }

    if (this.dynamicObstacleManager) {
        var obstacleStats = this.dynamicObstacleManager.getStats();
    }

    if (window.objectPoolManager) {
        var poolStats = window.objectPoolManager.getPerformanceStats();
    }

    if (window.objectManager) {
        var objectStats = window.objectManager.getStats();
    }

    if (window.objectHealthChecker) {
        var healthReport = window.objectHealthChecker.getHealthReport();
    }
};

// 停止游戏引擎更新
GameEngine.prototype.stopUpdate = function () {
    this.isUpdating = false;
    this.gameState = 'home';

    if (this.joystick) {
        this.joystick.isActive = false;
        this.joystick.isVisible = false;
    }

    if (this.characterManager && this.characterManager.stopUpdate) {
        this.characterManager.stopUpdate();
    }

    if (this.zombieManager && this.zombieManager.stopUpdate) {
        this.zombieManager.stopUpdate();
    }

    if (window.partnerManager && window.partnerManager.stopUpdate) {
        window.partnerManager.stopUpdate();
    }
};

// 游戏循环渲染
GameEngine.prototype.render = function () {
    if (this.gameState === 'home' && !this.isUpdating) {
        if (this.menuSystem && this.menuSystem.render) {
            this.menuSystem.render();
        }
        return;
    }

    if (this.gameState === 'home') {
        if (this.menuSystem && this.menuSystem.renderHomePage) {
            this.menuSystem.renderHomePage();
        }
    } else if (this.gameState === 'playing') {
        if (this.viewSystem) {
            this.viewSystem.renderMap(this.mapSystem);
            this.viewSystem.renderCharacters(this.characterManager);

            if (this.zombieManager) {
                var zombies = this.zombieManager.getAllZombies();
                this.viewSystem.renderZombies(this.zombieManager, this.characterManager);
            } else {
                throw new Error('GameEngine.render: zombieManager未初始化');
            }

            if (window.partnerManager) {
                var partners = window.partnerManager.getAllPartners();
                this.viewSystem.renderPartners(window.partnerManager);
            } else {
                throw new Error('GameEngine.render: partnerManager未初始化');
            }

            this.viewSystem.renderJoystick(this.joystick);
            this.viewSystem.renderTimeInfo(this);
            this.viewSystem.renderDebugInfo();
        } else {
            console.warn('⚠️ viewSystem未初始化，使用回退渲染方法');
            this.renderJoystick();
        }
    } else if (this.gameState === 'menu') {
        if (this.menuSystem && this.menuSystem.renderGameMenu) {
            this.menuSystem.renderGameMenu();
        }
    }
};

// 渲染触摸摇杆
GameEngine.prototype.renderJoystick = function () {
    if (this.joystick && this.viewSystem) {
        this.viewSystem.renderJoystick(this.joystick);
    }
};

// 导出
export {TouchJoystick, GameEngine};
export default GameEngine;
