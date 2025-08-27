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
            console.log('触摸摇杆不可见，忽略触摸开始');
            return;
        }
        
        var touch = e.touches[0];
        // 抖音小游戏环境：触摸坐标通常是相对于画布的
        var x = touch.x || touch.clientX || touch.pageX || 0;
        var y = touch.y || touch.clientY || touch.pageY || 0;
        

        // 检查触摸是否在摇杆范围内
        var distance = Math.sqrt(Math.pow(x - self.centerX, 2) + Math.pow(y - self.centerY, 2));

        // 抖音小游戏环境：稍微放宽触摸检测范围
        var touchThreshold = self.outerRadius + 10; // 增加10像素的容错范围
        
        // 临时：强制激活触摸摇杆进行测试
        self.touchId = touch.identifier;
        self.isDragging = true;
        self.isActive = true;
        self.updateJoystickPosition(x, y);

    };
    
    // 触摸移动
    var touchMoveHandler = function(e) {

        if (!self.isVisible || !self.isDragging) {
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
            
            self.updateJoystickPosition(x, y);
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
            
            // 额外保护：确保角色停止移动
            if (window.gameEngine && window.gameEngine.characterManager) {
                var mainChar = window.gameEngine.characterManager.getMainCharacter();
                if (mainChar && mainChar.stopMovement) {
                    mainChar.stopMovement();
                }
            }
        } else {
            console.log('触摸结束但触摸ID不匹配');
        }
    };
    
    // 绑定触摸事件（兼容不同环境）
    if (typeof tt !== 'undefined' && tt.onTouchStart) {
        // 抖音小游戏环境
        console.log('使用抖音小游戏触摸事件');
        tt.onTouchStart(touchStartHandler);
        tt.onTouchMove(touchMoveHandler);
        tt.onTouchEnd(touchEndHandler);
        
        // 抖音小游戏环境：确保触摸事件正确绑定
        console.log('抖音小游戏触摸事件绑定状态:', {
            onTouchStart: typeof tt.onTouchStart,
            onTouchMove: typeof tt.onTouchMove,
            onTouchEnd: typeof tt.onTouchEnd
        });
    } else {
        // 标准Web环境
        console.log('使用标准Web触摸事件');
        self.canvas.addEventListener('touchstart', touchStartHandler);
        self.canvas.addEventListener('touchmove', touchMoveHandler);
        self.canvas.addEventListener('touchend', touchEndHandler);
    }
};

// 更新摇杆位置 - 8方向控制
TouchJoystick.prototype.updateJoystickPosition = function(x, y) {
    var deltaX = x - this.centerX;
    var deltaY = y - this.centerY;
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 限制摇杆移动范围
    if (distance > this.outerRadius) {
        deltaX = (deltaX / distance) * this.outerRadius;
        deltaY = (deltaY / distance) * this.outerRadius;
    }
    
    this.joystickX = deltaX;
    this.joystickY = deltaY;
    
    // 16方向控制：竖屏游戏方向修正
    console.log('触摸摇杆16方向控制调试:');
    console.log('- 触摸位置:', x, y);
    console.log('- 摇杆中心:', this.centerX, this.centerY);
    console.log('- 触摸偏移:', deltaX, deltaY);
    
    // 360度连续方向控制：竖屏游戏方向修正
    // 修复角度计算，确保方向完全正确
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > 0) {
        // 直接计算单位向量，确保方向完全正确
        var unitX = deltaX / distance;
        var unitY = deltaY / distance;
        
        // 应用触摸摇杆的移动范围限制
        var maxDistance = this.outerRadius;
        var clampedDistance = Math.min(distance, maxDistance);
        
        // 计算最终的移动向量
        this.moveDirection = {
            x: (unitX * clampedDistance) / maxDistance,
            y: (unitY * clampedDistance) / maxDistance,
            name: '360度连续方向'
        };
        
    } else {
        // 触摸点在中心，不移动
        this.moveDirection = { x: 0, y: 0, name: '中心' };
        console.log('触摸点在中心，不移动');
    }
};

// 重置摇杆
TouchJoystick.prototype.resetJoystick = function() {
    this.isDragging = false;
    this.isActive = false;
    this.touchId = null;
    this.joystickX = 0;
    this.joystickY = 0;
    this.moveDirection.x = 0;
    this.moveDirection.y = 0;
    
    // 停止角色移动，防止滑行
    if (window.gameEngine && window.gameEngine.characterManager) {
        var mainChar = window.gameEngine.characterManager.getMainCharacter();
        if (mainChar) {
            mainChar.stopMovement();
        }
    }
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
        food: 5              // 食物数量
    };
    
    // 帧计数器（用于定期执行某些操作）
    this.frameCount = 0;
    
    // 时间系统初始化
    this.lastUpdateTime = performance.now();
    
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
    this.gameState = newState;
    
    // 根据状态显示/隐藏摇杆
    if (newState === 'playing') {
        this.joystick.show();
        
        // 游戏开始时刷新初始僵尸
        if (this.zombieManager && this.characterManager) {
            this.spawnZombiesForDay();
        }
    } else {
        this.joystick.hide();
    }
};

// 设置系统引用
GameEngine.prototype.setSystems = function(mapSystem, characterManager, menuSystem, eventSystem, zombieManager, collisionSystem) {
    this.mapSystem = mapSystem;
    this.characterManager = characterManager;
    this.menuSystem = menuSystem;
    this.eventSystem = eventSystem;
    this.zombieManager = zombieManager;
    this.collisionSystem = collisionSystem;
    
    // 初始化NavMesh导航系统（延迟初始化，确保地图系统完全就绪）
    setTimeout(() => {
        this.initNavigationSystem();
        this.initDynamicObstacleManager();
    }, 100);
    
    // 初始化触摸摇杆（确保所有系统都已加载）
    if (!this.joystick) {
        this.joystick = new TouchJoystick(this.canvas, this.ctx);
        console.log('触摸摇杆初始化完成');
    }
    
    // 初始化视觉系统
    if (this.viewSystem && mapSystem) {
        this.viewSystem.init(mapSystem.mapWidth, mapSystem.mapHeight);
        
        // 设置初始摄像机位置为主人物位置
        if (characterManager) {
            var mainChar = characterManager.getMainCharacter();
            if (mainChar) {
                this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
            }
        }
    }
};

/**
 * 初始化NavMesh导航系统
 */
GameEngine.prototype.initNavigationSystem = function() {
    if (!this.mapSystem) {
        console.warn('[GameEngine] 地图系统未初始化，无法构建NavMesh');
        return;
    }
    
    console.log('[GameEngine] 开始初始化NavMesh导航系统...');
    
    // 检查地图系统是否完全初始化
    if (!this.mapSystem.buildings || this.mapSystem.buildings.length === 0) {
        console.warn('[GameEngine] 建筑物数据未生成，等待地图系统完全初始化...');
        // 延迟重试
        setTimeout(() => this.initNavigationSystem(), 200);
        return;
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
    } else {
        console.warn('[GameEngine] NavigationSystem未定义，跳过NavMesh初始化');
    }
};

/**
 * 初始化动态障碍物管理器
 */
GameEngine.prototype.initDynamicObstacleManager = function() {
    if (!this.mapSystem) {
        console.warn('[GameEngine] 地图系统未初始化，无法初始化动态障碍物管理器');
        return;
    }
    
    // 检查地图系统是否完全初始化
    if (!this.mapSystem.mapWidth || !this.mapSystem.mapHeight) {
        console.warn('[GameEngine] 地图尺寸未设置，等待地图系统完全初始化...');
        // 延迟重试
        setTimeout(() => this.initDynamicObstacleManager(), 200);
        return;
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
    } else {
        console.warn('[GameEngine] DynamicObstacleManager未定义，跳过动态障碍物管理器初始化');
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
    
    // 简化移动逻辑：直接计算目标位置并设置移动目标
    if (Math.abs(direction.x) > 0.1 || Math.abs(direction.y) > 0.1) {
        var newX = mainChar.x + direction.x * moveSpeed;
        var newY = mainChar.y + direction.y * moveSpeed;
        
        console.log('设置移动目标:', '从', mainChar.x, mainChar.y, '到', newX, newY);
        console.log('移动计算详情:', '方向X:', direction.x, '方向Y:', direction.y, '移动速度:', moveSpeed);
        
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
    if (this.gameState !== 'playing') return;
    
    // 每帧增加时间（假设60帧=1秒）
    this.timeSystem.dayTime += 1/60;
    
    // 每30秒切换一次
    if (this.timeSystem.dayTime >= 30) {
        this.timeSystem.dayTime = 0;
        
        if (this.timeSystem.isDay) {
            // 白天变夜晚
            this.timeSystem.isDay = false;
        } else {
            // 夜晚变白天，天数+1
            this.timeSystem.isDay = true;
            this.timeSystem.day++;
            
            // 减少食物（每人消耗1个）
            var teamSize = this.getTeamSize();
            this.timeSystem.food = Math.max(0, this.timeSystem.food - teamSize);
            
            // 白天刷新僵尸（确保系统已初始化）
            if (this.zombieManager && this.characterManager) {
                this.spawnZombiesForDay();
            }
        }
    }
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

// 白天刷新僵尸
GameEngine.prototype.spawnZombiesForDay = function() {
    if (!this.zombieManager || !this.characterManager) return;
    
    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) return;
    
    // 计算僵尸数量：10 * 天数
    var zombieCount = 10 * this.timeSystem.day;
    
    // 不清除现有僵尸，只添加新的僵尸
    
    // 生成僵尸
    for (var i = 0; i < zombieCount; i++) {
        // 在距离主人物700px的位置随机生成
        var angle = (Math.PI * 2 * i) / zombieCount; // 均匀分布
        var distance = 700 + Math.random() * 100; // 700-800px之间
        
        var zombieTypes = ['skinny', 'fat', 'fast', 'tank', 'boss'];
        var randomType = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
        
        // 计算僵尸生成位置
        var zombieX = mainChar.x + Math.cos(angle) * distance;
        var zombieY = mainChar.y + Math.sin(angle) * distance;
        
        // 检查僵尸生成位置是否安全
        if (this.collisionSystem && this.collisionSystem.isCircleCollidingWithBuildings) {
            if (this.collisionSystem.isCircleCollidingWithBuildings(zombieX, zombieY, 16)) { // 16 = 32/2
                console.log('僵尸生成位置不安全，跳过');
                continue;
            }
        }
        
        // 检查是否与现有僵尸重叠
        if (this.collisionSystem && this.collisionSystem.isZombieOverlappingWithZombies) {
            var existingZombies = this.zombieManager.getAllZombies().filter(z => z.hp > 0);
            
            if (this.collisionSystem.isZombieOverlappingWithZombies(zombieX, zombieY, 16, existingZombies, 0.1)) {
                // 如果与现有僵尸重叠，寻找不重叠的位置
                var nonOverlapPos = this.collisionSystem.getNonOverlappingPosition(
                    mainChar.x, mainChar.y, zombieX, zombieY, 32, 32, 
                    existingZombies, true, true
                );
                zombieX = nonOverlapPos.x;
                zombieY = nonOverlapPos.y;
                console.log('僵尸刷新位置调整，避免重叠:', zombieX, zombieY);
            }
        }
        
        // 创建僵尸
        this.zombieManager.createZombie(randomType, zombieX, zombieY);
    }
};

// 游戏循环更新
GameEngine.prototype.update = function() {
    // 增加帧计数器
    this.frameCount++;
    
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
                this.viewSystem.renderZombies(this.zombieManager);
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
