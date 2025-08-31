/**
 * 游戏引擎模块 (game-engine.js)
 *
 * 功能描述：
 * - 触摸摇杆控制器：控制主人物移动
 * - 游戏状态管理：统一管理游戏状态
 * - 游戏循环控制：协调各个系统的更新和渲染
 * - 输入系统：处理触摸输入和游戏控制
 */

// 触摸摇杆控制器
var TouchJoystick = function(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.isActive = false;
    this.isVisible = false;
    
    // 摇杆位置和大小
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height - 120; // 屏幕下方
    this.outerRadius = 60;
    this.innerRadius = 25;
    
    // 触摸状态
    this.touchId = null;
    this.joystickX = 0;
    this.joystickY = 0;
    this.isDragging = false;
    
    // 移动控制
    this.moveDirection = { x: 0, y: 0 };
    this.moveSpeed = 0.1;
    
    // 绑定触摸事件
    this.bindEvents();
};

// 触摸摇杆事件绑定
TouchJoystick.prototype.bindEvents = function() {
    var self = this;
    
    // 触摸开始
    var touchStartHandler = function(e) {
        if (!self.isVisible) {
            return;
        }
        
        var touch = e.touches[0];
        // 抖音小游戏环境：触摸坐标通常是相对于画布的
        var x = touch.x || touch.clientX || touch.pageX || 0;
        var y = touch.y || touch.clientY || touch.pageY || 0;

        // 检查触摸是否在摇杆范围内
        var distance = Math.sqrt(Math.pow(x - self.centerX, 2) + Math.pow(y - self.centerY, 2));

        // 抖音小游戏环境：稍微放宽触摸检测范围，提升用户体验
        var touchThreshold = self.outerRadius + 20; // 增加20像素的容错范围
        
        // 只有在触摸范围内才激活摇杆
        if (distance <= touchThreshold) {
            self.touchId = touch.identifier;
            self.isDragging = true;
            self.isActive = true;
            self.updateJoystickPosition(x, y);
        }
    };
    
    // 触摸移动
    var touchMoveHandler = function(e) {
        if (!self.isVisible || !self.isDragging || !self.isActive) {
            return;
        }
        
        // 找到对应的触摸点
        var touch = null;
        for (var i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === self.touchId) {
                touch = e.touches[i];
                break;
            }
        }
        
        if (touch) {
            // 抖音小游戏环境：触摸坐标通常是相对于画布的
            var x = touch.x || touch.clientX || touch.pageX || 0;
            var y = touch.y || touch.clientY || touch.pageY || 0;
            
            // 限制摇杆移动范围
            var deltaX = x - self.centerX;
            var deltaY = y - self.centerY;
            var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > self.outerRadius) {
                // 如果超出外圈，限制在边界上
                deltaX = (deltaX / distance) * self.outerRadius;
                deltaY = (deltaY / distance) * self.outerRadius;
            }
            
            self.updateJoystickPosition(self.centerX + deltaX, self.centerY + deltaY);
        }
    };
    
    // 触摸结束
    var touchEndHandler = function(e) {
        if (!self.isVisible) return;
        
        // 检查触摸点是否结束
        var touchEnded = false;
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === self.touchId) {
                touchEnded = true;
                break;
            }
        }
        
        if (touchEnded) {
            self.resetJoystick();
        }
    };
    
    // 触摸取消
    var touchCancelHandler = function(e) {
        if (!self.isVisible) return;
        
        // 触摸被中断时重置摇杆
        self.resetJoystick();
    };
    
    // 绑定触摸事件（兼容不同环境）
    if (typeof tt !== 'undefined' && tt.onTouchStart) {
        // 抖音小游戏环境

        tt.onTouchStart(touchStartHandler);
        tt.onTouchMove(touchMoveHandler);
        tt.onTouchEnd(touchEndHandler);
        tt.onTouchCancel(touchCancelHandler); // 绑定触摸取消事件
        
        // 抖音小游戏环境：确保触摸事件正确绑定

    } else {
        // 标准Web环境

        self.canvas.addEventListener('touchstart', touchStartHandler, { passive: true });
        self.canvas.addEventListener('touchmove', touchMoveHandler, { passive: true });
        self.canvas.addEventListener('touchend', touchEndHandler, { passive: true });
        self.canvas.addEventListener('touchcancel', touchCancelHandler, { passive: true }); // 绑定触摸取消事件
    }
};

// 更新摇杆位置
TouchJoystick.prototype.updateJoystickPosition = function(x, y) {
    // 计算相对于中心点的偏移
    var deltaX = x - this.centerX;
    var deltaY = y - this.centerY;
    
    // 计算距离
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 如果距离超出外圈半径，限制在边界上
    if (distance > this.outerRadius) {
        deltaX = (deltaX / distance) * this.outerRadius;
        deltaY = (deltaY / distance) * this.outerRadius;
    }
    
    // 更新摇杆位置
    this.joystickX = deltaX;
    this.joystickY = deltaY;
    
    // 计算移动方向（归一化向量）
    if (distance > 0) {
        this.moveDirection.x = deltaX / this.outerRadius;
        this.moveDirection.y = deltaY / this.outerRadius;
    } else {
        this.moveDirection.x = 0;
        this.moveDirection.y = 0;
    }
    

};

// 重置摇杆
TouchJoystick.prototype.resetJoystick = function() {
    this.joystickX = 0;
    this.joystickY = 0;
    this.moveDirection.x = 0;
    this.moveDirection.y = 0;
    this.isDragging = false;
    this.isActive = false;
    this.touchId = null;
    

};

// 渲染摇杆
TouchJoystick.prototype.render = function(ctx) {
    if (!this.isVisible) return;
    
    // 使用传入的ctx
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
    
    // 绘制内圈（摇杆）
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

// 显示摇杆
TouchJoystick.prototype.show = function() {
    this.isVisible = true;
    
};

// 隐藏摇杆
TouchJoystick.prototype.hide = function() {
    this.isVisible = false;
    this.resetJoystick();
};

// 获取移动方向
TouchJoystick.prototype.getMoveDirection = function() {
    return this.moveDirection;
};

// 🔴 新增：测试摇杆渲染状态
TouchJoystick.prototype.testRenderStatus = function() {
    // 强制显示摇杆进行测试
    if (!this.isVisible) {
        this.show();
    }
    
    // 模拟摇杆移动进行测试
    this.joystickX = 30;
    this.joystickY = 20;
    this.isActive = true;
    this.moveDirection.x = 0.5;
    this.moveDirection.y = 0.3;
};

// 游戏引擎主类
var GameEngine = function(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameState = 'home'; // 'home', 'playing', 'menu'
    
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
    
    // NavMesh + 四叉树系统
    this.navigationSystem = null; // NavMesh导航系统
    this.dynamicObstacleManager = null; // 动态障碍物管理器
    
    // 计时系统 - 从配置文件读取
    this.timeSystem = {
        day: 1,              // 当前天数
        isDay: true,         // 是否为白天
        dayTime: 0,          // 当前时段计时器
        currentTime: 0,      // 当前时间（秒）
        dayDuration: 0,      // 一天的长度（秒）- 从配置文件读取
        food: 5              // 食物数量
    };
    
    // 帧计数器（用于定期执行某些操作）
    this.frameCount = 0;
    
    // 时间系统初始化
    this.lastUpdateTime = performance.now();
    
    // 性能监控和自动优化系统
    this.performanceMonitor = {
        frameCount: 0,
        lastFPS: 60,
        fpsHistory: [],
        lastOptimizationTime: 0,
        targetFPS: 60,
        minFPS: 30,
        
        // 监控帧率
        updateFPS: function(deltaTime) {
            this.frameCount++;
            if (this.frameCount % 60 === 0) { // 每60帧计算一次FPS
                var currentFPS = Math.round(60 / deltaTime);
                this.lastFPS = currentFPS;
                this.fpsHistory.push(currentFPS);
                
                // 保持最近100帧的历史
                if (this.fpsHistory.length > 100) {
                    this.fpsHistory.shift();
                }
                
                // 检查性能并自动优化
                this.checkPerformance();
            }
        },
        
        // 检查性能并自动优化
        checkPerformance: function() {
            var currentTime = Date.now();
            if (currentTime - this.lastOptimizationTime < 8000) return; // 8秒内不重复优化
            
            var avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
            
            if (avgFPS < this.minFPS) { // FPS过低，执行优化
    
                this.optimizePerformance();
                this.lastOptimizationTime = currentTime;
            } else if (avgFPS > this.targetFPS - 5) { // FPS良好，可以适当增加复杂度
                this.optimizeForQuality();
            }
        },
        
        // 自动性能优化
        optimizePerformance: function() {
            if (!window.zombieManager) return;
            
            // 🔴 修复：直接从僵尸管理器内部存储获取
        var zombies = window.zombieManager.getAllZombies();
            
            // 如果僵尸数量过多，减少一些
            if (zombies.length > 35) {
                var excessZombies = zombies.length - 28;

                
                // 移除最远的僵尸
                var mainChar = window.characterManager ? window.characterManager.getMainCharacter() : null;
                if (mainChar) {
                    zombies.sort((a, b) => {
                        var distA = Math.sqrt(Math.pow(a.x - mainChar.x, 2) + Math.pow(a.y - mainChar.y, 2));
                        var distB = Math.sqrt(Math.pow(b.x - mainChar.x, 2) + Math.pow(b.y - mainChar.y, 2));
                        return distB - distA; // 远的在前
                    });
                    
                    // 移除最远的僵尸
                    for (var i = 0; i < Math.min(excessZombies, 10); i++) {
                        if (zombies[i]) {
                            zombies[i].hp = 0; // 标记为死亡
                        }
                    }
                }
            }
            
            // 降低僵尸更新频率
            if (window.zombieManager && window.zombieManager.setUpdateInterval) {
                window.zombieManager.setUpdateInterval(2); // 每2帧更新一次
            }
            
            // 强制垃圾回收（如果可用）
            if (window.gc) {
                window.gc();
            }
        },
        
        // 质量优化（FPS良好时）
        optimizeForQuality: function() {
            if (!window.zombieManager) return;
            
            // 如果FPS良好，可以适当提高质量
            if (window.zombieManager.setUpdateInterval) {
                window.zombieManager.setUpdateInterval(1); // 每帧更新
            }
        },
        
        // 获取性能统计
        getStats: function() {
            var avgFPS = this.fpsHistory.length > 0 ? 
                this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length : 0;
            
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
GameEngine.prototype.init = function() {
    // 初始化触摸摇杆
    this.joystick = new TouchJoystick(this.canvas, this.ctx);
    
    // 初始化视觉系统
    if (typeof ViewSystem !== 'undefined') {
        this.viewSystem = new ViewSystem(this.canvas, this.ctx);
    }
    
    // 初始化时间系统配置
    this.initTimeSystemConfig();
    
    // 🔴 修复：确保ConfigManager可用
    if (typeof window !== 'undefined' && !window.ConfigManager && typeof ConfigManager !== 'undefined') {
        window.ConfigManager = ConfigManager;
    }
};

// 初始化时间系统配置
GameEngine.prototype.initTimeSystemConfig = function() {
    // 从配置文件读取时间设置
    if (window.ConfigManager) {
        var timeConfig = window.ConfigManager.get('TIME_SYSTEM');
        if (timeConfig) {
            this.timeSystem.dayDuration = timeConfig.DAY_DURATION;
        }
    } else {
        this.timeSystem.dayDuration = 10; // 默认10秒
    }
};

// 设置游戏状态
GameEngine.prototype.setGameState = function(newState) {
    this.gameState = newState;
    
    // 根据游戏状态控制触摸摇杆
    if (this.joystick) {
        if (newState === 'playing') {
            this.joystick.show();
        } else {
            this.joystick.hide();
        }
    }
    
    // 更新事件系统状态
    if (this.eventSystem) {
        this.eventSystem.gameState = newState;
    }
    
    // 重置帧计数器
    this.frameCount = 0;
    this.lastUpdateTime = performance.now();
};

// 设置系统引用
GameEngine.prototype.setSystems = function(mapSystem, characterManager, menuSystem, eventSystem, zombieManager, collisionSystem) {
    
    
    this.mapSystem = mapSystem;
    this.characterManager = characterManager;
    this.menuSystem = menuSystem;
    this.eventSystem = eventSystem;
    this.zombieManager = zombieManager;
    this.collisionSystem = collisionSystem;
    
    // 🔴 修复：设置对象管理器的空间索引
    if (window.objectManager && collisionSystem) {
        window.objectManager.setSpatialIndex(collisionSystem);
    }
    
    // 初始化对象池系统
    this.initObjectPools();
    
    
    
    // 延迟初始化NavMesh导航系统和动态障碍物管理器
    // 这些系统需要地图系统完全准备好，所以延迟到地图系统初始化完成后
    this.retryInitAdvancedSystems();
    
    // 初始化对象池系统
    this.initObjectPools();
    
    // 初始化触摸摇杆（确保所有系统都已加载）
    if (!this.joystick) {
        this.joystick = new TouchJoystick(this.canvas, this.ctx);

    }
    
    // 初始化视觉系统
    if (!this.viewSystem && typeof ViewSystem !== 'undefined') {
        this.viewSystem = new ViewSystem(this.canvas, this.ctx);
    }
    
    if (this.viewSystem && mapSystem) {
        // 获取地图尺寸
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
        
        // 设置初始摄像机位置为主人物位置
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

/**
 * 初始化NavMesh导航系统
 */
GameEngine.prototype.initNavigationSystem = function() {
    if (!this.mapSystem) {
        throw new Error('[GameEngine] 地图系统未初始化，无法构建NavMesh');
        return false;
    }
    
    // 同步检查地图系统是否完全初始化
    if (!this.mapSystem.buildings || this.mapSystem.buildings.length === 0) {
        return false;
    }
    
    // 创建导航系统实例
    if (typeof NavigationSystem !== 'undefined') {
        this.navigationSystem = new NavigationSystem();
        
        // 构建导航网格 - 使用新的数字矩阵系统
        const mapData = {
            type: 'matrix', // 新的矩阵类型
            mapWidth: this.mapSystem.mapWidth,
            mapHeight: this.mapSystem.mapHeight,
            cellSize: this.mapSystem.cellSize,
            gridCols: this.mapSystem.gridCols,
            gridRows: this.mapSystem.gridRows,
            buildings: this.mapSystem.buildings, // 从矩阵生成的建筑数据
            walkableAreas: this.mapSystem.walkableAreas, // 可通行区域
            mapMatrix: this.mapSystem.mapMatrix // 原始矩阵数据
        };
        
        this.navigationSystem.buildNavigationMesh(mapData);
        return true;
    } else {
        throw new Error('[GameEngine] NavigationSystem未定义，跳过NavMesh初始化');
        return false;
    }
};

/**
 * 初始化对象池系统
 */
GameEngine.prototype.initObjectPools = function() {
    if (typeof window !== 'undefined' && window.objectPoolManager) {
        return true;
    } else {
        throw new Error('[GameEngine] 对象池管理器不可用，跳过对象池初始化');
        return false;
    }
};

/**
 * 重试初始化高级系统（NavMesh和动态障碍物管理器）
 */
GameEngine.prototype.retryInitAdvancedSystems = function() {
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
            // 如果还有系统未初始化成功，继续重试
            setTimeout(attemptInit, 200); // 200ms后重试
        }
    }
    
    // 延迟100ms开始第一次尝试
    setTimeout(attemptInit, 100);
};

/**
 * 初始化动态障碍物管理器
 */
GameEngine.prototype.initDynamicObstacleManager = function() {
    if (!this.mapSystem) {
        throw new Error('[GameEngine] 地图系统未初始化，无法初始化动态障碍物管理器');
        return false;
    }
    
    // 同步检查地图系统是否完全初始化
    if (!this.mapSystem.mapWidth || !this.mapSystem.mapHeight) {
        return false;
    }
    
    // 创建动态障碍物管理器实例
    if (typeof DynamicObstacleManager !== 'undefined') {
        this.dynamicObstacleManager = new DynamicObstacleManager(
            this.mapSystem.mapWidth,
            this.mapSystem.mapHeight
        );
        
        // 添加一些示例动态障碍物（如车辆、路障等）
        this.addSampleDynamicObstacles();
        

        return true;
    } else {
        throw new Error('[GameEngine] DynamicObstacleManager未定义，跳过动态障碍物管理器初始化');
        return false;
    }
};

/**
 * 添加示例动态障碍物
 */
GameEngine.prototype.addSampleDynamicObstacles = function() {
    if (!this.dynamicObstacleManager) return;
    
    // 添加一些车辆
    const cars = [
        { id: 'car_1', x: 2000, y: 2000, width: 80, height: 120, type: 'car' },
        { id: 'car_2', x: 4000, y: 3000, width: 80, height: 120, type: 'car' },
        { id: 'car_3', x: 6000, y: 5000, width: 80, height: 120, type: 'car' }
    ];
    
    cars.forEach(carData => {
        const car = new DynamicObstacle(carData.id, carData.x, carData.y, carData.width, carData.height, carData.type);
        this.dynamicObstacleManager.addObstacle(car);
    });
    
    // 添加一些路障
    const barriers = [
        { id: 'barrier_1', x: 1500, y: 1500, width: 40, height: 40, type: 'barrier' },
        { id: 'barrier_2', x: 3500, y: 2500, width: 40, height: 40, type: 'barrier' }
    ];
    
    barriers.forEach(barrierData => {
        const barrier = new DynamicObstacle(barrierData.id, barrierData.x, barrierData.y, barrierData.width, barrierData.height, barrierData.type);
        this.dynamicObstacleManager.addObstacle(barrier);
    });
    
    
};




// 更新触摸摇杆控制的角色移动
GameEngine.prototype.updateJoystickMovement = function() {
    if (!this.joystick) {
        console.warn('摇杆未初始化');
        return;
    }
    
    if (!this.joystick.isActive) {
        return;
    }
    
    

    // 获取主人物
    var mainCharacter = null;
    if (window.characterManager && window.characterManager.getMainCharacter) {
        mainCharacter = window.characterManager.getMainCharacter();
        if (!mainCharacter) {
            console.warn('❌ updateJoystickMovement: 未找到主人物');
        }
    } else {
        throw new Error('updateJoystickMovement: 角色管理器不可用');
        return;
    }

    if (!mainCharacter) {
        throw new Error('updateJoystickMovement: 无法获取主人物，跳过摇杆更新');
        return;
    }
    
    if (!this.characterManager) {
        throw new Error('角色管理器未初始化');
        return;
    }
    
    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) {
        throw new Error('主人物未找到');
        return;
    }
    
    var direction = this.joystick.getMoveDirection();
    

    
    // 🔴 修复：摇杆移动由character.js统一处理，这里只设置状态，不直接移动位置
    if (Math.abs(direction.x) > 0.1 || Math.abs(direction.y) > 0.1) {
        // 触摸摇杆有输入，强制进入移动状态
        mainChar.isMoving = true;
        mainChar.status = 'MOVING';
        
        // 强制状态机进入移动状态，打断任何其他状态
        if (mainChar.stateMachine && mainChar.stateMachine.currentState !== 'MOVE') {
            mainChar.stateMachine.forceState('MOVE');
        }
        
        // 🔴 核心：不直接移动位置，让character.js的checkJoystickInput处理移动
        // 这里只设置状态，实际的移动由character.js的setMoveTarget和updateMovement处理
        
        // 记录触摸摇杆方向（用于调试）
        this.lastJoystickDirection = { x: direction.x, y: direction.y };
    } else {
        // 移动方向太小，停止移动
        if (mainChar.isMoving) {
            mainChar.isMoving = false;
            mainChar.status = 'IDLE';
        }
        
        // 清除触摸摇杆方向记录
        this.lastJoystickDirection = null;
    }
    
    // 更新视觉系统跟随目标
    if (this.viewSystem) {
        this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
    }
};

// 渲染触摸摇杆 - 已统一到ViewSystem
GameEngine.prototype.renderJoystick = function() {
    // 摇杆渲染已统一到ViewSystem.renderJoystick()
    // 此方法保留用于向后兼容
    if (this.joystick && this.viewSystem) {
        this.viewSystem.renderJoystick(this.joystick);
    }
};

// 🔴 新增：测试摇杆渲染
GameEngine.prototype.testJoystickRender = function() {
    if (!this.joystick) {
        console.warn('🔴 摇杆未初始化');
        return;
    }
    
    if (!this.viewSystem) {
        console.warn('🔴 视觉系统未初始化');
        return;
    }
    
    // 测试摇杆状态
    this.joystick.testRenderStatus();
    
    // 强制渲染摇杆
    this.viewSystem.renderJoystick(this.joystick);
};


// 更新计时系统
GameEngine.prototype.updateTimeSystem = function() {
    // 从配置文件获取时间设置
    var timeConfig = window.ConfigManager ? window.ConfigManager.get('TIME_SYSTEM') : null;
    var dayDuration = timeConfig ? timeConfig.DAY_DURATION : 10;
    var dayPhaseDuration = timeConfig ? timeConfig.DAY_PHASE_DURATION : 5;
    
    // 更新游戏时间
    this.timeSystem.currentTime += 1/60; // 每帧增加时间（假设60帧=1秒）
    
    // 检查是否过了一天
    if (this.timeSystem.currentTime >= dayDuration) {
        this.timeSystem.currentTime = 0;
        this.timeSystem.day++;
        
        // 每天开始时刷新僵尸
        this.spawnOneZombiePerDay();
    }
    
    // 更新白天/夜晚状态 - 使用配置文件中的阶段长度
    var dayProgress = this.timeSystem.currentTime / dayDuration;
    this.timeSystem.isDay = dayProgress < (dayPhaseDuration / dayDuration);
    

    
    // 帧数计数
    this.frameCount++;
};

// 获取团队人数
GameEngine.prototype.getTeamSize = function() {
    if (!this.characterManager) return 0;
    
    var characters = this.characterManager.getAllCharacters();
    return characters.length;
};

// 获取时间系统信息
GameEngine.prototype.getTimeInfo = function() {
    return {
        day: this.timeSystem.day,
        isDay: this.timeSystem.isDay,
        dayTime: this.timeSystem.dayTime,
        food: this.timeSystem.food,
        teamSize: this.getTeamSize()
    };
};

// 每天刷新僵尸
GameEngine.prototype.spawnOneZombiePerDay = function() {
    if (!this.zombieManager || !this.characterManager) {
        console.warn('GameEngine: 僵尸管理器或角色管理器未初始化，跳过僵尸刷新');
        return;
    }
    
    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) {
        console.warn('GameEngine: 主人物未找到，跳过僵尸刷新');
        return;
    }
    
    // 从配置文件获取僵尸生成设置
    var timeConfig = window.ConfigManager ? window.ConfigManager.get('TIME_SYSTEM') : null;
    var zombiesPerDay = timeConfig ? timeConfig.ZOMBIES_PER_DAY : 10;
    var minDistance = timeConfig ? timeConfig.SPAWN_RANGE.MIN_DISTANCE : 500;
    var maxDistance = timeConfig ? timeConfig.SPAWN_RANGE.MAX_DISTANCE : 700;
    
    // 创建僵尸批次
    this.createZombieBatchAroundPlayer(zombiesPerDay, mainChar, minDistance, maxDistance);
        
        // 🔴 新增：每天刷新伙伴
        this.spawnPartnersPerDay();
},

// 分批创建僵尸（性能优化）- 使用配置文件中的距离范围
GameEngine.prototype.createZombieBatchAroundPlayer = function(batchSize, mainChar, minDistance, maxDistance) {
    // 如果没有传入距离参数，使用默认值
    minDistance = minDistance || 500;
    maxDistance = maxDistance || 700;
    

    
    var createdZombies = [];
    var maxAttempts = 100; // 每个僵尸最多尝试100次找位置
    
    for (var i = 0; i < batchSize; i++) {
        var zombieCreated = false;
        var attempts = 0;
        
        while (!zombieCreated && attempts < maxAttempts) {
            attempts++;
            
            // 在距离主人物minDistance-maxDistance的位置随机生成
            var angle = Math.random() * Math.PI * 2; // 随机角度
            var distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            // 使用ZOMBIE_TYPE枚举，确保类型一致性
            var zombieTypes = ['skinny', 'fat', 'fast', 'tank', 'boss'];
            var randomType = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
            
            // 计算僵尸生成位置
            var zombieX = mainChar.x + Math.cos(angle) * distance;
            var zombieY = mainChar.y + Math.sin(angle) * distance;
            
            // 检查位置是否有效（不在建筑物上，在700px范围内）
            if (this.isValidZombieSpawnPosition(zombieX, zombieY, mainChar, createdZombies)) {

                
                // 创建僵尸（指定位置和类型）
                var createdZombie = this.zombieManager.createZombie(randomType, zombieX, zombieY);
                
                if (createdZombie) {
                    createdZombies.push(createdZombie);
                    zombieCreated = true;
                    

                    
                    // 🔴 重构：验证僵尸是否在空间索引中
                    if (!createdZombie._spatialIndexId) {
                        console.warn('GameEngine: 僵尸未添加到空间索引！');
                    }
                } else {
                    console.warn('GameEngine: 僵尸创建失败');
                }
            } else {
                // 如果位置无效，尝试在附近找新位置
                if (attempts % 20 === 0) {
                    // 每20次尝试，稍微调整角度和距离
                    angle += Math.PI / 6; // 旋转30度
                    distance += (Math.random() - 0.5) * 100; // 随机调整距离
                    
                    // 确保距离在合理范围内
                    distance = Math.max(400, Math.min(800, distance));
                }
            }
        }
        
        if (!zombieCreated) {
            console.warn('GameEngine: 僵尸' + (i + 1) + '无法找到有效位置，跳过创建');
        }
    }
    
            // 🔴 修复：直接从僵尸管理器内部存储获取
        var finalZombieCount = this.zombieManager.getAllZombies().length;
};

// 🔴 新增：每天刷新伙伴
GameEngine.prototype.spawnPartnersPerDay = function() {
    if (!window.partnerManager || !this.characterManager) {
        console.warn('GameEngine: 伙伴管理器或角色管理器未初始化，跳过伙伴刷新');
        return;
    }
    
    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) {
        console.warn('GameEngine: 主人物未找到，跳过伙伴刷新');
        return;
    }
    
    // 从配置文件获取伙伴生成设置
    var timeConfig = window.ConfigManager ? window.ConfigManager.get('TIME_SYSTEM') : null;
    var partnersPerDay = timeConfig ? timeConfig.PARTNERS_PER_DAY : 2;
    var minDistance = timeConfig ? timeConfig.PARTNER_SPAWN_RANGE.MIN_DISTANCE : 200;
    var maxDistance = timeConfig ? timeConfig.PARTNER_SPAWN_RANGE.MAX_DISTANCE : 400;
    
    // 创建伙伴批次
    this.createPartnerBatchAroundPlayer(partnersPerDay, mainChar, minDistance, maxDistance);
},

// 分批创建伙伴（性能优化）- 使用配置文件中的距离范围
GameEngine.prototype.createPartnerBatchAroundPlayer = function(batchSize, mainChar, minDistance, maxDistance) {
    if (!window.partnerManager) {
        console.warn('GameEngine: 伙伴管理器未初始化，无法创建伙伴批次');
        return;
    }

    if (!this.characterManager) {
        console.warn('GameEngine: 角色管理器未初始化，无法获取主人物');
        return;
    }

    if (!mainChar) {
        console.warn('GameEngine: 主人物未找到，无法创建伙伴批次');
        return;
    }

    var createdPartners = [];
    var maxAttempts = 100; // 每个伙伴最多尝试100次找位置

    for (var i = 0; i < batchSize; i++) {
        var partnerCreated = false;
        var attempts = 0;

        while (!partnerCreated && attempts < maxAttempts) {
            attempts++;

            // 在距离主人物minDistance-maxDistance的位置随机生成
            var angle = Math.random() * Math.PI * 2; // 随机角度
            var distance = minDistance + Math.random() * (maxDistance - minDistance);

            // 使用正确的伙伴职业类型
            var partnerTypes = ['police', 'civilian', 'doctor', 'nurse', 'chef'];
            var randomType = partnerTypes[Math.floor(Math.random() * partnerTypes.length)];

            // 计算伙伴生成位置
            var partnerX = mainChar.x + Math.cos(angle) * distance;
            var partnerY = mainChar.y + Math.sin(angle) * distance;

            // 检查位置是否有效（不在建筑物上，在400px范围内）
            if (this.isValidPartnerSpawnPosition(partnerX, partnerY, mainChar, createdPartners)) {


                // 创建伙伴（指定位置和类型）
                var createdPartner = window.partnerManager.createPartner(randomType, partnerX, partnerY);

                if (createdPartner) {
                    createdPartners.push(createdPartner);
                    partnerCreated = true;



                    // 🔴 重构：验证伙伴是否在空间索引中
                    if (!createdPartner._spatialIndexId) {
                        console.warn('GameEngine: 伙伴未添加到空间索引！');
                    }
                } else {
                    console.warn('GameEngine: 伙伴创建失败');
                }
            } else {
                // 如果位置无效，尝试在附近找新位置
                if (attempts % 20 === 0) {
                    // 每20次尝试，稍微调整角度和距离
                    angle += Math.PI / 6; // 旋转30度
                    distance += (Math.random() - 0.5) * 100; // 随机调整距离
                    
                    // 确保距离在合理范围内
                    distance = Math.max(200, Math.min(400, distance));
                }
            }
        }

        if (!partnerCreated) {
            console.warn('GameEngine: 伙伴' + (i + 1) + '无法找到有效位置，跳过创建');
        }
    }

    var finalPartnerCount = window.partnerManager.getAllPartners().length;
    
},

// 检查僵尸生成位置是否有效
GameEngine.prototype.isValidZombieSpawnPosition = function(x, y, mainChar, existingZombies) {
    // 从配置文件获取距离范围
    var timeConfig = window.ConfigManager ? window.ConfigManager.get('TIME_SYSTEM') : null;
    var minDistance = timeConfig ? timeConfig.SPAWN_RANGE.MIN_DISTANCE : 500;
    var maxDistance = timeConfig ? timeConfig.SPAWN_RANGE.MAX_DISTANCE : 700;
    
    // 1. 检查是否在有效范围内
    var distanceFromMain = Math.sqrt(Math.pow(x - mainChar.x, 2) + Math.pow(y - mainChar.y, 2));
    if (distanceFromMain < minDistance || distanceFromMain > maxDistance) {
        return false;
    }
    
    // 2. 检查是否与建筑物碰撞（确保不刷新在建筑物上）
            if (this.collisionSystem && this.collisionSystem.isPositionWalkable) {
            if (!this.collisionSystem.isPositionWalkable(x, y)) { // 检查是否不可行走
            return false;
        }
    }
    
    // 3. 检查是否与其他僵尸重叠（避免僵尸堆叠）
    if (existingZombies && existingZombies.length > 0) {
        for (var i = 0; i < existingZombies.length; i++) {
            var existingZombie = existingZombies[i];
            var distance = Math.sqrt(Math.pow(x - existingZombie.x, 2) + Math.pow(y - existingZombie.y, 2));
            if (distance < 50) { // 僵尸之间至少保持50px距离
                return false;
            }
        }
    }
    
    // 4. 检查是否在地图边界内
    if (this.mapSystem && this.mapSystem.currentMap && this.mapSystem.currentMap.config) {
        var mapConfig = this.mapSystem.currentMap.config;
        if (x < 100 || x > mapConfig.width - 100 || y < 100 || y > mapConfig.height - 100) {
            return false;
        }
    }
    
    // 5. 检查是否在可通行区域（街道）
    if (this.collisionSystem && this.collisionSystem.isPositionWalkable) {
        // 检查周围是否有可通行空间
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
},

// 🔴 新增：检查伙伴生成位置是否有效
GameEngine.prototype.isValidPartnerSpawnPosition = function(x, y, mainChar, existingPartners) {
    var timeConfig = window.ConfigManager ? window.ConfigManager.get('TIME_SYSTEM') : null;
    var minDistance = timeConfig ? timeConfig.PARTNER_SPAWN_RANGE.MIN_DISTANCE : 200;
    var maxDistance = timeConfig ? timeConfig.PARTNER_SPAWN_RANGE.MAX_DISTANCE : 400;
    
    // 检查距离
    var distance = Math.sqrt(Math.pow(x - mainChar.x, 2) + Math.pow(y - mainChar.y, 2));
    if (distance < minDistance || distance > maxDistance) {
        return false;
    }
    
    // 检查是否与现有伙伴重叠
    if (existingPartners && existingPartners.length > 0) {
        for (var i = 0; i < existingPartners.length; i++) {
            var existingPartner = existingPartners[i];
            var partnerDistance = Math.sqrt(Math.pow(x - existingPartner.x, 2) + Math.pow(y - existingPartner.y, 2));
            if (partnerDistance < 50) { // 最小间距50px
                return false;
            }
        }
    }
    
    // 检查是否在建筑物上
    if (window.collisionSystem && window.collisionSystem.isPositionWalkable) {
        return window.collisionSystem.isPositionWalkable(x, y);
    }
    
    return true;
},

// 游戏循环更新
GameEngine.prototype.update = function() {
    // 增加帧计数器
    this.frameCount++;
    
    // 性能监控更新
    if (this.performanceMonitor) {
        var currentTime = performance.now();
        var deltaTime = (currentTime - this.lastUpdateTime) / 1000;
        this.performanceMonitor.updateFPS(deltaTime);
    }
    
    // 🔴 修复：摇杆移动由character.js统一处理，但需要更新跟随目标
    // this.updateJoystickMovement();
    
    // 🔴 核心：确保视觉系统跟随主人物
    if (this.characterManager && this.viewSystem) {
        var mainChar = this.characterManager.getMainCharacter();
        if (mainChar) {
            this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
        }
    }
    
    // 更新角色移动
    if (this.characterManager) {
        // 计算真实的deltaTime，确保移动平滑
        var currentTime = performance.now();
        var deltaTime = (currentTime - this.lastUpdateTime) / 1000; // 转换为秒
        
        // 限制deltaTime，防止跳帧导致的瞬移
        deltaTime = Math.min(deltaTime, 1/30); // 最大30fps的deltaTime
        
        this.characterManager.updateAllCharacters(deltaTime);
    }
    
    // 更新计时系统
    this.updateTimeSystem();
    
    // 🔴 简化：简化版碰撞系统不需要空间索引更新
    if (this.collisionSystem) {

    }
    
            // 🔴 更新僵尸 - 使用高性能分帧更新策略
        if (this.zombieManager) {
            // 🔴 修复：使用对象管理器获取角色
            var characters = this.characterManager ? this.characterManager.getAllCharacters() : [];
            // 计算真实的deltaTime，确保移动平滑
            var currentTime = performance.now();
            var deltaTime = (currentTime - this.lastUpdateTime) / 1000; // 转换为秒
            this.lastUpdateTime = currentTime;
            
            // 限制deltaTime，防止跳帧导致的瞬移
            deltaTime = Math.min(deltaTime, 1/30); // 最大30fps的deltaTime
            
            // 🔴 传递当前帧数，启用分帧更新策略
            this.zombieManager.updateAllZombies(characters, deltaTime, this.frameCount);
        }
        
        // 更新伙伴
        if (window.partnerManager) {
            var currentTime = performance.now();
            var deltaTime = (currentTime - this.lastUpdateTime) / 1000;
            deltaTime = Math.min(deltaTime, 1/30);
            window.partnerManager.updateAllPartners(deltaTime);
            this.lastUpdateTime = currentTime; // 🔴 修复：更新lastUpdateTime
        }
    
    // 更新动态障碍物
    if (this.dynamicObstacleManager) {
        var currentTime = performance.now();
        var deltaTime = (currentTime - this.lastUpdateTime) / 1000;
        
        this.dynamicObstacleManager.updateAllObstacles(deltaTime);
        
        // 每120帧（2秒）清理一次无效障碍物
        if (this.frameCount % 120 === 0) {
            this.dynamicObstacleManager.cleanupInvalidObstacles();
        }
    }
    
    // 更新对象池管理器
    if (window.objectPoolManager) {
        window.objectPoolManager.update();
    }
    
    // 更新对象管理器
    if (window.objectManager) {
        // 定期清理死亡对象
        if (this.frameCount % 60 === 0) { // 每秒清理一次（恢复正常频率）
            const cleanedCount = window.objectManager.cleanupDeadObjects();
            if (cleanedCount > 0) {
        
            }
        }
    }
    
    // 更新内存监控器
    if (window.memoryMonitor) {
        window.memoryMonitor.checkMemoryUsage();
    }
    
    // 更新健康检查器
    if (window.objectHealthChecker) {
        const healthStatus = window.objectHealthChecker.checkHealth();
        if (healthStatus.overall === 'critical') {
            console.warn('🚨 对象管理系统健康状态严重:', healthStatus);
        }
    }
    
    // 更新视觉系统
    if (this.viewSystem) {
        this.viewSystem.update();
    }
    
    // 每300帧（5秒）输出一次系统状态
    if (this.frameCount % 300 === 0) {
        this.logSystemStatus();
        
        // 🔴 新增：僵尸行为调试
        if (this.zombieManager && this.zombieManager.debugZombieBehavior) {
            this.zombieManager.debugZombieBehavior();
        }
        
        // 🔴 简化：简化版碰撞系统不需要空间索引状态
        if (this.collisionSystem) {
    
        }
    }
},

// 记录系统状态
GameEngine.prototype.logSystemStatus = function() {
    
    
    // 🔴 新增：性能监控统计
    if (this.performanceMonitor && this.performanceMonitor.getStats) {
        var perfStats = this.performanceMonitor.getStats();

    }
    
    // 记录系统状态
    if (this.collisionSystem) {

    }
    
    if (this.characterManager) {
        // 🔴 修复：使用对象管理器获取角色
        var characters = this.characterManager.getAllCharacters();

    }
    
    if (this.zombieManager) {
        // 🔴 修复：使用僵尸管理器的方法获取僵尸列表
        var zombies = this.zombieManager.getAllZombies();
        var activeZombies = zombies.filter(z => z.hp > 0);

        
        // 🔴 新增：僵尸性能监控
        if (this.zombieManager.getBatchInfo && typeof this.zombieManager.getBatchInfo === 'function') {
            var batchInfo = this.zombieManager.getBatchInfo(this.frameCount);
    
        }
        
        // 🔴 新增：僵尸管理器性能统计
        if (this.zombieManager.logPerformanceReport) {
            this.zombieManager.logPerformanceReport(this.frameCount);
        }
    }
    
    if (this.navigationSystem) {

    }
    
    if (this.dynamicObstacleManager) {
        var obstacleStats = this.dynamicObstacleManager.getStats();

    }
    
    // 对象池性能统计
    if (window.objectPoolManager) {
        var poolStats = window.objectPoolManager.getPerformanceStats();

    }
    
    // 对象管理器统计
    if (window.objectManager) {
        var objectStats = window.objectManager.getStats();

    }
    
    // 健康检查报告
    if (window.objectHealthChecker) {
        var healthReport = window.objectHealthChecker.getHealthReport();

    }
    

},

// 停止游戏引擎更新
GameEngine.prototype.stopUpdate = function() {

    this.isUpdating = false;
    this.gameState = 'home';
    
    // 停止触摸摇杆
    if (this.joystick) {
        this.joystick.isActive = false;
        this.joystick.isVisible = false;
    }
    
    // 停止所有管理器更新
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
GameEngine.prototype.render = function() {
    // 如果引擎已停止，不进行渲染
    if (this.gameState === 'home' && !this.isUpdating) {
        // 只渲染菜单
        if (this.menuSystem && this.menuSystem.render) {
            this.menuSystem.render();
        }
        return;
    }
    
    if (this.gameState === 'home') {
        // 渲染首页
        if (this.menuSystem && this.menuSystem.renderHomePage) {
            this.menuSystem.renderHomePage();
        }
    } else if (this.gameState === 'playing') {
        // 使用视觉系统渲染游戏
        if (this.viewSystem) {
            // 渲染地图
            this.viewSystem.renderMap(this.mapSystem);
            
            // 渲染角色
            this.viewSystem.renderCharacters(this.characterManager);
            
            // 渲染僵尸
            if (this.zombieManager) {
                // 🔴 修复：使用僵尸管理器的方法获取僵尸列表
                var zombies = this.zombieManager.getAllZombies();
                
                this.viewSystem.renderZombies(this.zombieManager, this.characterManager);
            } else {
                throw new Error('GameEngine.render: zombieManager未初始化');
            }
            
            // 渲染伙伴
            if (window.partnerManager) {
                var partners = window.partnerManager.getAllPartners();
                this.viewSystem.renderPartners(window.partnerManager);
            } else {
                throw new Error('GameEngine.render: partnerManager未初始化');
            }
            
            // 渲染触摸摇杆
            this.viewSystem.renderJoystick(this.joystick);
            
            // 渲染时间信息（左上角）
            this.viewSystem.renderTimeInfo(this);
            
            // 渲染调试信息
            this.viewSystem.renderDebugInfo();
        } else {
            // 回退到原来的渲染方法
            console.warn('⚠️ viewSystem未初始化，使用回退渲染方法');
            this.renderJoystick();
        }
    } else if (this.gameState === 'menu') {
        // 渲染菜单
        if (this.menuSystem && this.menuSystem.renderGameMenu) {
            this.menuSystem.renderGameMenu();
        }
    }
};



// 导出
export { TouchJoystick, GameEngine };
export default GameEngine;
