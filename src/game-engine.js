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
        console.log('触摸开始事件触发:', e.touches.length, '个触摸点');
        
        if (!self.isVisible) {
            console.log('触摸摇杆不可见，忽略触摸开始');
            return;
        }
        
        var touch = e.touches[0];
        // 抖音小游戏环境：触摸坐标通常是相对于画布的
        var x = touch.x || touch.clientX || touch.pageX || 0;
        var y = touch.y || touch.clientY || touch.pageY || 0;
        
        console.log('触摸坐标:', x, y, '摇杆中心:', self.centerX, self.centerY);

        // 检查触摸是否在摇杆范围内
        var distance = Math.sqrt(Math.pow(x - self.centerX, 2) + Math.pow(y - self.centerY, 2));

        // 抖音小游戏环境：稍微放宽触摸检测范围
        var touchThreshold = self.outerRadius + 10; // 增加10像素的容错范围
        
        console.log('触摸距离:', distance, '触摸阈值:', touchThreshold, '触摸是否在范围内:', distance <= touchThreshold);
        
        // 只有在触摸范围内才激活摇杆
        if (distance <= touchThreshold) {
            self.touchId = touch.identifier;
            self.isDragging = true;
            self.isActive = true;
            self.updateJoystickPosition(x, y);
            
            console.log('触摸摇杆已激活:', '触摸ID:', self.touchId, '拖拽状态:', self.isDragging, '活跃状态:', self.isActive);
        } else {
            console.log('触摸超出摇杆范围，忽略触摸');
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
        } else {
            console.log('触摸移动未找到对应触摸点，触摸ID:', self.touchId);
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
            console.log('触摸摇杆触摸结束，重置状态');
        }
    };
    
    // 触摸取消
    var touchCancelHandler = function(e) {
        if (!self.isVisible) return;
        
        // 触摸被中断时重置摇杆
        self.resetJoystick();
        console.log('触摸摇杆触摸被中断，重置状态');
    };
    
    // 绑定触摸事件（兼容不同环境）
    if (typeof tt !== 'undefined' && tt.onTouchStart) {
        // 抖音小游戏环境
        console.log('使用抖音小游戏触摸事件');
        tt.onTouchStart(touchStartHandler);
        tt.onTouchMove(touchMoveHandler);
        tt.onTouchEnd(touchEndHandler);
        tt.onTouchCancel(touchCancelHandler); // 绑定触摸取消事件
        
        // 抖音小游戏环境：确保触摸事件正确绑定
        console.log('抖音小游戏触摸事件绑定状态:', {
            onTouchStart: typeof tt.onTouchStart,
            onTouchMove: typeof tt.onTouchMove,
            onTouchEnd: typeof tt.onTouchEnd,
            onTouchCancel: typeof tt.onTouchCancel
        });
    } else {
        // 标准Web环境
        console.log('使用标准Web触摸事件');
        self.canvas.addEventListener('touchstart', touchStartHandler);
        self.canvas.addEventListener('touchmove', touchMoveHandler);
        self.canvas.addEventListener('touchend', touchEndHandler);
        self.canvas.addEventListener('touchcancel', touchCancelHandler); // 绑定触摸取消事件
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
    
    console.log('摇杆位置更新:', '偏移:', deltaX.toFixed(2), deltaY.toFixed(2), '方向:', this.moveDirection.x.toFixed(2), this.moveDirection.y.toFixed(2));
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
    
    console.log('触摸摇杆已重置');
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
    console.log('触摸摇杆显示，位置:', this.centerX, this.centerY, '半径:', this.outerRadius, '画布尺寸:', this.canvas.width, this.canvas.height);
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
    
    // 计时系统
    this.timeSystem = {
        day: 1,              // 当前天数
        isDay: true,         // 是否为白天
        dayTime: 0,          // 当前时段计时器（0-30秒）
        currentTime: 0,      // 当前时间（秒）
        dayDuration: 30,     // 一天的长度（秒）
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
            if (currentTime - this.lastOptimizationTime < 5000) return; // 5秒内不重复优化
            
            var avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
            
            if (avgFPS < 30) { // FPS过低，执行优化
                console.log('性能监控：FPS过低(' + avgFPS + ')，执行自动优化');
                this.optimizePerformance();
                this.lastOptimizationTime = currentTime;
            }
        },
        
        // 自动性能优化
        optimizePerformance: function() {
            if (!window.zombieManager) return;
            
            var zombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
            
            // 如果僵尸数量过多，减少一些
            if (zombies.length > 40) {
                var excessZombies = zombies.length - 30;
                console.log('性能优化：移除', excessZombies, '个僵尸');
                
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
            
            // 强制垃圾回收（如果可用）
            if (window.gc) {
                window.gc();
                console.log('性能优化：执行垃圾回收');
            }
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
};

// 设置游戏状态
GameEngine.prototype.setGameState = function(newState) {
    console.log('游戏状态改变:', this.gameState, '->', newState);
    this.gameState = newState;
    
    // 根据游戏状态控制触摸摇杆
    if (this.joystick) {
        if (newState === 'playing') {
            this.joystick.show();
            console.log('触摸摇杆已显示');
        } else {
            this.joystick.hide();
            console.log('触摸摇杆已隐藏');
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
    console.log('GameEngine.setSystems: 开始设置系统引用');
    console.log('🔍 接收到的参数:');
    console.log('- mapSystem:', !!mapSystem);
    console.log('- characterManager:', !!characterManager, '类型:', typeof characterManager);
    console.log('- menuSystem:', !!menuSystem);
    console.log('- eventSystem:', !!eventSystem);
    console.log('- zombieManager:', !!zombieManager);
    console.log('- collisionSystem:', !!collisionSystem);
    
    this.mapSystem = mapSystem;
    this.characterManager = characterManager;
    this.menuSystem = menuSystem;
    this.eventSystem = eventSystem;
    this.zombieManager = zombieManager;
    this.collisionSystem = collisionSystem;
    
    console.log('✅ 系统引用设置完成');
    console.log('🔍 设置后的实例变量:');
    console.log('- this.characterManager:', !!this.characterManager);
    console.log('- this.zombieManager:', !!this.zombieManager);
    console.log('- this.collisionSystem:', !!this.collisionSystem);
    
    // 同步初始化NavMesh导航系统
    var navResult = this.initNavigationSystem();
    var obstacleResult = this.initDynamicObstacleManager();
    
    // 记录初始化结果
    if (navResult) {
        console.log('[GameEngine] NavMesh导航系统初始化成功');
    }
    if (obstacleResult) {
        console.log('[GameEngine] 动态障碍物管理器初始化成功');
    }
    
    // 初始化触摸摇杆（确保所有系统都已加载）
    if (!this.joystick) {
        this.joystick = new TouchJoystick(this.canvas, this.ctx);
        console.log('触摸摇杆初始化完成');
    }
    
    // 初始化视觉系统
    if (!this.viewSystem && typeof ViewSystem !== 'undefined') {
        console.log('创建视觉系统...');
        this.viewSystem = new ViewSystem(this.canvas, this.ctx);
        console.log('视觉系统创建完成');
    }
    
    if (this.viewSystem && mapSystem) {
        console.log('初始化视觉系统...');
        
        // 获取地图尺寸
        var mapWidth = 0;
        var mapHeight = 0;
        
        if (mapSystem.currentMap && mapSystem.currentMap.config) {
            mapWidth = mapSystem.currentMap.config.width;
            mapHeight = mapSystem.currentMap.config.height;
            console.log('从地图配置获取尺寸:', mapWidth, 'x', mapHeight);
        } else if (mapSystem.config) {
            mapWidth = mapSystem.config.width;
            mapHeight = mapSystem.config.height;
            console.log('从地图系统配置获取尺寸:', mapWidth, 'x', mapHeight);
        } else {
            console.warn('无法获取地图尺寸，使用默认值');
            mapWidth = 10000;
            mapHeight = 10000;
        }
        
        this.viewSystem.init(mapWidth, mapHeight);
        
        // 设置初始摄像机位置为主人物位置
        if (characterManager) {
            var mainChar = characterManager.getMainCharacter();
            if (mainChar) {
                this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
            }
        }
        console.log('视觉系统初始化完成');
    } else {
        console.warn('视觉系统或地图系统未准备好，无法初始化视觉系统');
    }
};

/**
 * 初始化NavMesh导航系统
 */
GameEngine.prototype.initNavigationSystem = function() {
    if (!this.mapSystem) {
        console.warn('[GameEngine] 地图系统未初始化，无法构建NavMesh');
        return false;
    }
    
    console.log('[GameEngine] 开始初始化NavMesh导航系统...');
    
    // 同步检查地图系统是否完全初始化
    if (!this.mapSystem.buildings || this.mapSystem.buildings.length === 0) {
        console.warn('[GameEngine] 建筑物数据未生成，地图系统未完全初始化');
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
        
        console.log('[GameEngine] 准备的地图数据:', mapData);
        this.navigationSystem.buildNavigationMesh(mapData);
        console.log('[GameEngine] NavMesh导航系统初始化完成');
        return true;
    } else {
        console.warn('[GameEngine] NavigationSystem未定义，跳过NavMesh初始化');
        return false;
    }
};

/**
 * 初始化动态障碍物管理器
 */
GameEngine.prototype.initDynamicObstacleManager = function() {
    if (!this.mapSystem) {
        console.warn('[GameEngine] 地图系统未初始化，无法初始化动态障碍物管理器');
        return false;
    }
    
    // 同步检查地图系统是否完全初始化
    if (!this.mapSystem.mapWidth || !this.mapSystem.mapHeight) {
        console.warn('[GameEngine] 地图尺寸未设置，地图系统未完全初始化');
        return false;
    }
    
    console.log('[GameEngine] 开始初始化动态障碍物管理器...');
    
    // 创建动态障碍物管理器实例
    if (typeof DynamicObstacleManager !== 'undefined') {
        this.dynamicObstacleManager = new DynamicObstacleManager(
            this.mapSystem.mapWidth,
            this.mapSystem.mapHeight
        );
        
        // 添加一些示例动态障碍物（如车辆、路障等）
        this.addSampleDynamicObstacles();
        
        console.log('[GameEngine] 动态障碍物管理器初始化完成');
        return true;
    } else {
        console.warn('[GameEngine] DynamicObstacleManager未定义，跳过动态障碍物管理器初始化');
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
    
    console.log('[GameEngine] 添加了示例动态障碍物');
};




// 更新触摸摇杆控制的角色移动
GameEngine.prototype.updateJoystickMovement = function() {
    if (!this.joystick) {
        console.warn('触摸摇杆未初始化');
        return;
    }
    
    if (!this.joystick.isActive) {
        // 摇杆不活跃时，确保角色停止移动
        if (this.characterManager) {
            var mainChar = this.characterManager.getMainCharacter();
            if (mainChar && mainChar.isMoving) {
                mainChar.stopMovement();
            }
        }
        console.log('触摸摇杆未激活，状态:', this.joystick.isVisible, this.joystick.isDragging);
        return;
    }
    
    if (!this.characterManager) {
        console.warn('角色管理器未初始化');
        return;
    }
    
    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) {
        console.warn('主人物未找到');
        return;
    }
    
    var direction = this.joystick.getMoveDirection();
    var moveSpeed = mainChar.moveSpeed;
    
    console.log('触摸摇杆移动:', '方向:', direction, '移动速度:', moveSpeed, '当前位置:', mainChar.x, mainChar.y);
    
    // 修复移动逻辑：使用触摸摇杆的实际移动距离，而不是配置的移动速度
    if (Math.abs(direction.x) > 0.1 || Math.abs(direction.y) > 0.1) {
        // 使用触摸摇杆的实际移动距离（60像素半径）
        var joystickRadius = 60;
        var moveDistance = joystickRadius * 0.5; // 使用摇杆半径的一半作为移动距离
        
        var newX = mainChar.x + direction.x * moveDistance;
        var newY = mainChar.y + direction.y * moveDistance;
        
        console.log('设置移动目标:', '从', mainChar.x, mainChar.y, '到', newX, newY);
        console.log('移动计算详情:', '方向X:', direction.x, '方向Y:', direction.y, '移动距离:', moveDistance);
        
        var result = mainChar.setMoveTarget(newX, newY);
        console.log('设置移动目标结果:', result);
    } else {
        // 移动方向太小，停止移动
        if (mainChar.isMoving) {
            mainChar.stopMovement();
        }
        console.log('移动方向太小，停止移动');
    }
    
    // 更新状态
    if (Math.abs(direction.x) > 0.1 || Math.abs(direction.y) > 0.1) {
        mainChar.status = 'MOVING'; // 使用正确的状态枚举
    } else {
        mainChar.status = 'IDLE';
    }
    
    // 更新视觉系统跟随目标
    if (this.viewSystem) {
        this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
    }
};

// 渲染触摸摇杆
GameEngine.prototype.renderJoystick = function() {
    if (this.joystick) {
        this.joystick.render();
    }
};



// 更新计时系统
GameEngine.prototype.updateTimeSystem = function() {
    // 更新游戏时间
    this.timeSystem.currentTime += 1/60; // 每帧增加时间（假设60帧=1秒）
    
    // 检查是否过了一天
    if (this.timeSystem.currentTime >= this.timeSystem.dayDuration) {
        this.timeSystem.currentTime = 0;
        this.timeSystem.day++;
        console.log('新的一天开始，当前天数:', this.timeSystem.day);
        
        // 每天开始时刷新僵尸
        this.spawnZombiesAroundPlayer();
    }
    
    // 每5秒刷新10个僵尸（性能优化版本）
    if (this.frameCount % 300 === 0) { // 300帧 = 5秒 (60fps)
        this.spawnZombiesAroundPlayer();
    }
    
    // 更新白天/夜晚状态
    var dayProgress = this.timeSystem.currentTime / this.timeSystem.dayDuration;
    this.timeSystem.isDay = dayProgress < 0.5;
    
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

// 定时刷新僵尸（每5秒调用一次）
GameEngine.prototype.spawnZombiesAroundPlayer = function() {
    if (!this.zombieManager || !this.characterManager) {
        console.log('GameEngine: 僵尸管理器或角色管理器未初始化，跳过僵尸刷新');
        return;
    }
    
    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) {
        console.log('GameEngine: 主人物未找到，跳过僵尸刷新');
        return;
    }
    
    console.log('GameEngine: 开始定时刷新僵尸，当前帧数:', this.frameCount, '主人物位置:', mainChar.x, mainChar.y);
    
    // 每5秒固定刷新10个僵尸
    var zombiesToCreate = 10;
    console.log('GameEngine: 需要创建', zombiesToCreate, '个僵尸，在人物700px范围内');
    
    // 创建僵尸批次
    this.createZombieBatchAroundPlayer(zombiesToCreate, mainChar);
    
    // 验证四叉树中的僵尸数量
    if (this.collisionSystem && this.collisionSystem.getDynamicObjectCountByType) {
        var quadTreeZombieCount = this.collisionSystem.getDynamicObjectCountByType('zombie');
        var currentZombies = this.zombieManager.getAllZombies().filter(z => z.hp > 0);
        console.log('GameEngine: 四叉树中的僵尸数量:', quadTreeZombieCount, '管理器中的僵尸数量:', currentZombies.length);
        
        if (quadTreeZombieCount !== currentZombies.length) {
            console.warn('GameEngine: 僵尸数量不匹配！管理器:', currentZombies.length, '四叉树:', quadTreeZombieCount);
        }
    }
},

// 分批创建僵尸（性能优化）- 在人物700px范围内生成
GameEngine.prototype.createZombieBatchAroundPlayer = function(batchSize, mainChar) {
    console.log('GameEngine: 创建僵尸批次，数量:', batchSize, '在人物位置:', mainChar.x, mainChar.y, '700px范围内');
    
    var createdZombies = [];
    var maxAttempts = 100; // 每个僵尸最多尝试100次找位置
    
    for (var i = 0; i < batchSize; i++) {
        var zombieCreated = false;
        var attempts = 0;
        
        while (!zombieCreated && attempts < maxAttempts) {
            attempts++;
            
            // 在距离主人物500-700px的位置随机生成（避免太近或太远）
            var angle = Math.random() * Math.PI * 2; // 随机角度
            var distance = 500 + Math.random() * 200; // 500-700px之间
            
            // 使用ZOMBIE_TYPE枚举，确保类型一致性
            var zombieTypes = ['skinny', 'fat', 'fast', 'tank', 'boss'];
            var randomType = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
            
            // 计算僵尸生成位置
            var zombieX = mainChar.x + Math.cos(angle) * distance;
            var zombieY = mainChar.y + Math.sin(angle) * distance;
            
            // 检查位置是否有效（不在建筑物上，在700px范围内）
            if (this.isValidZombieSpawnPosition(zombieX, zombieY, mainChar, createdZombies)) {
                console.log('GameEngine: 找到有效位置，生成僵尸', i + 1, '类型:', randomType, '位置:', zombieX, zombieY, '距离:', distance, '尝试次数:', attempts);
                
                // 创建僵尸（指定位置和类型）
                var createdZombie = this.zombieManager.createZombie(randomType, zombieX, zombieY);
                
                if (createdZombie) {
                    createdZombies.push(createdZombie);
                    zombieCreated = true;
                    
                    console.log('GameEngine: 僵尸创建成功:', {
                        id: createdZombie.id,
                        type: createdZombie.type,
                        zombieType: createdZombie.zombieType,
                        x: createdZombie.x,
                        y: createdZombie.y,
                        hp: createdZombie.hp,
                        hasQuadTreeId: !!createdZombie._quadTreeId,
                        quadTreeId: createdZombie._quadTreeId,
                        distanceFromMain: Math.sqrt(Math.pow(createdZombie.x - mainChar.x, 2) + Math.pow(createdZombie.y - mainChar.y, 2))
                    });
                    
                    // 验证僵尸是否在四叉树中
                    if (createdZombie._quadTreeId) {
                        console.log('GameEngine: 僵尸已正确添加到四叉树:', createdZombie._quadTreeId);
                    } else {
                        console.error('GameEngine: 僵尸未添加到四叉树！');
                    }
                } else {
                    console.error('GameEngine: 僵尸创建失败');
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
            console.warn('GameEngine: 僵尸', i + 1, '无法找到有效位置，跳过创建');
        }
    }
    
    var finalZombieCount = this.zombieManager.getAllZombies().filter(z => z.hp > 0).length;
    console.log('GameEngine: 批次创建完成，成功创建:', createdZombies.length, '个僵尸，当前总僵尸数:', finalZombieCount);
    
    // 验证新创建的僵尸是否都在700px范围内
    var allZombies = this.zombieManager.getAllZombies().filter(z => z.hp > 0);
    var zombiesInRange = allZombies.filter(z => {
        var distance = Math.sqrt(Math.pow(z.x - mainChar.x, 2) + Math.pow(z.y - mainChar.y, 2));
        return distance >= 400 && distance <= 800;
    });
    console.log('GameEngine: 400-800px范围内的僵尸数量:', zombiesInRange.length);
};

// 检查僵尸生成位置是否有效
GameEngine.prototype.isValidZombieSpawnPosition = function(x, y, mainChar, existingZombies) {
    // 1. 检查是否在有效范围内（500-700px）
    var distanceFromMain = Math.sqrt(Math.pow(x - mainChar.x, 2) + Math.pow(y - mainChar.y, 2));
    if (distanceFromMain < 500 || distanceFromMain > 700) {
        return false;
    }
    
    // 2. 检查是否与建筑物碰撞（确保不刷新在建筑物上）
    if (this.collisionSystem && this.collisionSystem.isCircleCollidingWithBuildings) {
        if (this.collisionSystem.isCircleCollidingWithBuildings(x, y, 25)) { // 25px半径，避免太靠近建筑物
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
    if (this.collisionSystem && this.collisionSystem.isCircleCollidingWithBuildings) {
        // 检查周围是否有可通行空间
        var hasWalkableSpace = false;
        for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            var testX = x + Math.cos(angle) * 30;
            var testY = y + Math.sin(angle) * 30;
            if (!this.collisionSystem.isCircleCollidingWithBuildings(testX, testY, 15)) {
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
    
    // 更新触摸摇杆控制的角色移动
    this.updateJoystickMovement();
    
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
    
    // 使用优化的四叉树更新策略
    if (this.collisionSystem && this.collisionSystem.optimizedUpdateDynamicQuadTree) {
        var characters = this.characterManager ? this.characterManager.getAllCharacters() : [];
        var zombies = this.zombieManager ? this.zombieManager.getAllZombies().filter(z => z.hp > 0) : [];
        this.collisionSystem.optimizedUpdateDynamicQuadTree(characters, zombies);
    } else if (this.collisionSystem && this.collisionSystem.updateDynamicQuadTree) {
        // 回退到原来的更新方法
        var characters = this.characterManager ? this.characterManager.getAllCharacters() : [];
        var zombies = this.zombieManager ? this.zombieManager.getAllZombies().filter(z => z.hp > 0) : [];
        this.collisionSystem.updateDynamicQuadTree(characters, zombies);
    }
    
    // 更新僵尸
    if (this.zombieManager) {
        var characters = this.characterManager ? this.characterManager.getAllCharacters() : [];
        // 计算真实的deltaTime，确保移动平滑
        var currentTime = performance.now();
        var deltaTime = (currentTime - this.lastUpdateTime) / 1000; // 转换为秒
        this.lastUpdateTime = currentTime;
        
        // 限制deltaTime，防止跳帧导致的瞬移
        deltaTime = Math.min(deltaTime, 1/30); // 最大30fps的deltaTime
        
        this.zombieManager.updateAllZombies(characters, deltaTime);
        

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
    
    // 更新视觉系统
    if (this.viewSystem) {
        this.viewSystem.update();
    }
    
    // 每300帧（5秒）输出一次系统状态
    if (this.frameCount % 300 === 0) {
        this.logSystemStatus();
    }
},

// 记录系统状态
GameEngine.prototype.logSystemStatus = function() {
    console.log('=== 系统状态报告 ===');
    console.log('帧数:', this.frameCount);
    console.log('游戏状态:', this.gameState);
    console.log('时间系统:', this.getTimeInfo());
    
    if (this.collisionSystem) {
        var lifecycleStats = this.collisionSystem.getObjectLifecycleStats();
        console.log('对象生命周期统计:', lifecycleStats);
    }
    
    if (this.characterManager) {
        var characters = this.characterManager.getAllCharacters();
        console.log('角色数量:', characters.length);
    }
    
    if (this.zombieManager) {
        var zombies = this.zombieManager.getAllZombies();
        var activeZombies = zombies.filter(z => z.hp > 0);
        console.log('僵尸总数:', zombies.length, '活跃僵尸:', activeZombies.length);
    }
    
    if (this.navigationSystem) {
        console.log('NavMesh统计:', this.navigationSystem.stats);
    }
    
    if (this.dynamicObstacleManager) {
        var obstacleStats = this.dynamicObstacleManager.getStats();
        console.log('动态障碍物统计:', obstacleStats);
    }
    
    console.log('==================');
},

// 游戏循环渲染
GameEngine.prototype.render = function() {
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
                console.log('GameEngine.render: 开始渲染僵尸');
                var zombies = this.zombieManager.getAllZombies();
                console.log('GameEngine.render: 获取到僵尸数量:', zombies.length);
                
                if (zombies.length > 0) {
                    zombies.forEach((zombie, index) => {
                        console.log(`GameEngine.render: 僵尸 ${index} 准备渲染:`, {
                            id: zombie.id,
                            type: zombie.type,
                            x: zombie.x,
                            y: zombie.y,
                            hp: zombie.hp,
                            state: zombie.state
                        });
                    });
                }
                
                this.viewSystem.renderZombies(this.zombieManager);
            } else {
                console.warn('GameEngine.render: zombieManager未初始化');
            }
            
            // 渲染触摸摇杆
            this.viewSystem.renderJoystick(this.joystick);
            
            // 渲染时间信息（左上角）
            this.viewSystem.renderTimeInfo(this);
            
            // 渲染调试信息
            this.viewSystem.renderDebugInfo();
        } else {
            // 回退到原来的渲染方法
            if (this.mapSystem && this.mapSystem.render) {
                this.mapSystem.render();
            }
            this.renderJoystick();
        }
    } else if (this.gameState === 'menu') {
        // 渲染菜单
        if (this.menuSystem && this.menuSystem.renderMenu) {
            this.menuSystem.renderMenu();
        }
    }
};



// 导出
export { TouchJoystick, GameEngine };
export default GameEngine;
