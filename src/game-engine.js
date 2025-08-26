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
    
    // 抖音小游戏环境下的触摸区域调试
    console.log('触摸摇杆触摸区域:', '中心:', this.centerX, this.centerY, '半径:', this.outerRadius);
    console.log('触摸区域范围:', 'X:', this.centerX - this.outerRadius, '到', this.centerX + this.outerRadius, 'Y:', this.centerY - this.outerRadius, '到', this.centerY + this.outerRadius);
    
    // 触摸摇杆位置验证
    console.log('触摸摇杆位置验证:');
    console.log('- 画布尺寸:', canvas.width, 'x', canvas.height);
    console.log('- 摇杆中心:', this.centerX, this.centerY);
    console.log('- 摇杆半径:', this.outerRadius);
    console.log('- 触摸区域:', '左:', this.centerX - this.outerRadius, '右:', this.centerX + this.outerRadius, '上:', this.centerY - this.outerRadius, '下:', this.centerY + this.outerRadius);
    
    console.log('触摸摇杆初始化，画布尺寸:', canvas.width, canvas.height, '中心位置:', this.centerX, this.centerY);
    
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
        
        console.log('触摸开始，原始触摸坐标:', touch.x, touch.y, 'clientX/Y:', touch.clientX, touch.clientY, 'pageX/Y:', touch.pageX, touch.pageY);
        console.log('触摸开始，处理后位置:', x, y, '摇杆中心:', self.centerX, self.centerY, '摇杆可见:', self.isVisible);
        
        // 检查触摸是否在摇杆范围内
        var distance = Math.sqrt(Math.pow(x - self.centerX, 2) + Math.pow(y - self.centerY, 2));
        console.log('触摸距离:', distance, '摇杆半径:', self.outerRadius, '触摸是否在范围内:', distance <= self.outerRadius);
        
        // 抖音小游戏环境：稍微放宽触摸检测范围
        var touchThreshold = self.outerRadius + 10; // 增加10像素的容错范围
        
        // 临时：强制激活触摸摇杆进行测试
        console.log('强制激活触摸摇杆进行测试');
        self.touchId = touch.identifier;
        self.isDragging = true;
        self.isActive = true;
        self.updateJoystickPosition(x, y);
        console.log('触摸摇杆激活，ID:', self.touchId, '状态:', self.isActive, self.isDragging, '触摸阈值:', touchThreshold);
        
        /*
        if (distance <= touchThreshold) {
            self.touchId = touch.identifier;
            self.isDragging = true;
            self.isActive = true;
            self.updateJoystickPosition(x, y);
            console.log('触摸摇杆激活，ID:', self.touchId, '状态:', self.isActive, self.isDragging, '触摸阈值:', touchThreshold);
        } else {
            console.log('触摸位置超出摇杆范围，距离:', distance, '阈值:', touchThreshold);
        }
        */
    };
    
    // 触摸移动
    var touchMoveHandler = function(e) {
        console.log('触摸移动事件触发，触摸点数量:', e.touches.length, '当前触摸ID:', self.touchId);
        
        if (!self.isVisible || !self.isDragging) {
            console.log('触摸移动被忽略，可见:', self.isVisible, '拖拽:', self.isDragging);
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
            
            console.log('触摸移动，原始触摸坐标:', touch.x, touch.y, '处理后坐标:', x, y);
            self.updateJoystickPosition(x, y);
            console.log('触摸移动更新，位置:', x, y, '移动方向:', self.moveDirection);
        } else {
            console.log('触摸移动未找到对应触摸点，触摸ID:', self.touchId);
        }
    };
    
    // 触摸结束
    var touchEndHandler = function(e) {
        if (!self.isVisible) return;
        
        console.log('触摸结束事件触发，触摸点数量:', e.changedTouches.length, '当前触摸ID:', self.touchId);
        
        // 检查触摸点是否结束
        var touchEnded = false;
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === self.touchId) {
                touchEnded = true;
                break;
            }
        }
        
        if (touchEnded) {
            console.log('触摸摇杆重置，触摸ID:', self.touchId);
            self.resetJoystick();
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
        
        // 调试信息
        console.log('触摸偏移:', deltaX, deltaY);
        console.log('触摸距离:', distance.toFixed(1));
        console.log('单位向量:', unitX.toFixed(3), unitY.toFixed(3));
        console.log('最终移动向量:', this.moveDirection.x.toFixed(3), this.moveDirection.y.toFixed(3));
    } else {
        // 触摸点在中心，不移动
        this.moveDirection = { x: 0, y: 0, name: '中心' };
        console.log('触摸点在中心，不移动');
    }
};

// 重置摇杆
TouchJoystick.prototype.resetJoystick = function() {
    console.log('触摸摇杆重置前状态:', this.isDragging, this.isActive, this.touchId);
    
    this.isDragging = false;
    this.isActive = false;
    this.touchId = null;
    this.joystickX = 0;
    this.joystickY = 0;
    this.moveDirection.x = 0;
    this.moveDirection.y = 0;
    
    console.log('触摸摇杆重置后状态:', this.isDragging, this.isActive, this.touchId);
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

// 更新触摸摇杆控制的角色移动
GameEngine.prototype.updateJoystickMovement = function() {
    if (!this.joystick) {
        console.warn('触摸摇杆未初始化');
        return;
    }
    
    if (!this.joystick.isActive) {
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
        console.log('移动方向太小，忽略移动');
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

// 获取触摸摇杆
GameEngine.prototype.getJoystick = function() {
    return this.joystick;
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
        
        var zombieX = mainChar.x + Math.cos(angle) * distance;
        var zombieY = mainChar.y + Math.sin(angle) * distance;
        
        // 随机选择僵尸类型
        var zombieTypes = ['skinny', 'fat', 'fast', 'tank', 'boss'];
        var randomType = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
        
        // 检查僵尸生成位置是否在建筑物内
        var zombieX = mainChar.x + Math.cos(angle) * distance;
        var zombieY = mainChar.y + Math.sin(angle) * distance;
        
        if (this.collisionSystem && this.collisionSystem.isRectCollidingWithBuildings) {
            if (this.collisionSystem.isRectCollidingWithBuildings(zombieX, zombieY, 32, 32)) {
                // 如果位置在建筑物内，寻找安全位置
                var safePos = this.collisionSystem.generateGameSafePosition(mainChar.x, mainChar.y, 700, 800, 32, 32);
                zombieX = safePos.x;
                zombieY = safePos.y;
            }
        }
        
        // 检查是否与现有僵尸重叠
        if (this.collisionSystem && this.collisionSystem.isObjectOverlappingWithList) {
            var existingZombies = this.zombieManager.getAllZombies().filter(z => z.hp > 0);
            
            if (this.collisionSystem.isObjectOverlappingWithList(zombieX, zombieY, 32, 32, existingZombies)) {
                // 如果与现有僵尸重叠，寻找不重叠的位置
                var nonOverlapPos = this.collisionSystem.getNonOverlappingPosition(
                    mainChar.x, mainChar.y, zombieX, zombieY, 32, 32, 
                    existingZombies, true
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
        this.characterManager.updateAllCharacters();
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
        
        // 每60帧（1秒）执行一次紧急分离，防止僵尸重叠卡死
        if (this.frameCount % 60 === 0) {
            var allZombies = this.zombieManager.getAllZombies().filter(z => z.hp > 0);
            if (this.collisionSystem && this.collisionSystem.emergencySeparation) {
                this.collisionSystem.emergencySeparation(allZombies, characters);
            }
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

// 预碰撞检测：检查目标位置是否安全
GameEngine.prototype.preCollisionCheck = function(character, targetX, targetY) {
    var result = {
        isSafe: true,
        obstacles: [],
        buildingCollision: false,
        objectCollision: false
    };

    if (!this.collisionSystem) {
        return result;
    }

    // 检查建筑物碰撞
    if (this.collisionSystem.isRectCollidingWithBuildings && 
        this.collisionSystem.isRectCollidingWithBuildings(targetX, targetY, character.width, character.height)) {
        result.isSafe = false;
        result.buildingCollision = true;
        result.obstacles.push({ type: 'building', x: targetX, y: targetY });
    }

    // 检查对象碰撞
    if (this.collisionSystem.isObjectOverlappingWithList) {
        var avoidObjects = [];
        
        // 添加所有僵尸
        if (this.zombieManager) {
            var allZombies = this.zombieManager.getAllZombies().filter(z => z.hp > 0);
            avoidObjects = avoidObjects.concat(allZombies);
        }
        
        // 添加其他人物（除了自己）
        if (this.characterManager) {
            var allCharacters = this.characterManager.getAllCharacters();
            for (var i = 0; i < allCharacters.length; i++) {
                if (allCharacters[i].id !== character.id) {
                    avoidObjects.push(allCharacters[i]);
                }
            }
        }

        if (this.collisionSystem.isObjectOverlappingWithList(targetX, targetY, character.width, character.height, avoidObjects)) {
            result.isSafe = false;
            result.objectCollision = true;
            result.obstacles = result.obstacles.concat(avoidObjects);
        }
    }

    return result;
};

// 寻找安全移动路径
GameEngine.prototype.findSafeMovePath = function(character, targetX, targetY, obstacles) {
    if (!this.collisionSystem || !this.collisionSystem.getNonOverlappingPosition) {
        return null;
    }

    // 尝试使用碰撞检测系统获取安全位置
    var avoidObjects = obstacles.filter(obj => obj.type !== 'building');
    var validPosition = this.collisionSystem.getNonOverlappingPosition(
        character.x, character.y, targetX, targetY, character.width, character.height,
        avoidObjects, true // 启用建筑物碰撞检测
    );

    if (validPosition && validPosition.x !== targetX && validPosition.y !== targetY) {
        return validPosition;
    }

    return null;
};

// 寻找最小安全移动
GameEngine.prototype.findMinimalSafeMove = function(character, direction, moveSpeed) {
    if (!this.collisionSystem) {
        return null;
    }

    // 尝试多个距离的移动
    var testDistances = [0.8, 0.6, 0.4, 0.2, 0.1];
    
    for (var i = 0; i < testDistances.length; i++) {
        var testDistance = testDistances[i];
        var testX = character.x + direction.x * moveSpeed * testDistance;
        var testY = character.y + direction.y * moveSpeed * testDistance;
        
        var collisionResult = this.preCollisionCheck(character, testX, testY);
        if (collisionResult.isSafe) {
            return { x: testX, y: testY, distance: testDistance };
        }
    }

    return null;
};

// 验证最终位置
GameEngine.prototype.validateFinalPosition = function(character, finalX, finalY) {
    var result = {
        isValid: true,
        issues: []
    };

    if (!this.collisionSystem) {
        return result;
    }

    // 检查是否在建筑物内
    if (this.collisionSystem.isRectCollidingWithBuildings && 
        this.collisionSystem.isRectCollidingWithBuildings(finalX, finalY, character.width, character.height)) {
        result.isValid = false;
        result.issues.push('final_position_in_building');
    }

    // 检查是否与其他对象重叠
    if (this.collisionSystem.isObjectOverlappingWithList) {
        var avoidObjects = [];
        
        if (this.zombieManager) {
            var allZombies = this.zombieManager.getAllZombies().filter(z => z.hp > 0);
            avoidObjects = avoidObjects.concat(allZombies);
        }
        
        if (this.characterManager) {
            var allCharacters = this.characterManager.getAllCharacters();
            for (var i = 0; i < allCharacters.length; i++) {
                if (allCharacters[i].id !== character.id) {
                    avoidObjects.push(allCharacters[i]);
                }
            }
        }

        if (this.collisionSystem.isObjectOverlappingWithList(finalX, finalY, character.width, character.height, avoidObjects)) {
            result.isValid = false;
            result.issues.push('final_position_overlapping');
        }
    }

    return result;
};

// 验证移动路径
GameEngine.prototype.validateMovePath = function(character, startX, startY, endX, endY) {
    var result = {
        isValid: true,
        issues: []
    };

    if (!this.collisionSystem) {
        return result;
    }

    // 检查建筑物碰撞
    if (this.collisionSystem.isRectCollidingWithBuildings && 
        this.collisionSystem.isRectCollidingWithBuildings(endX, endY, character.width, character.height)) {
        result.isValid = false;
        result.issues.push('move_path_overlapping');
    }

    // 检查对象碰撞
    if (this.collisionSystem.isObjectOverlappingWithList) {
        var avoidObjects = [];
        
        if (this.zombieManager) {
            var allZombies = this.zombieManager.getAllZombies().filter(z => z.hp > 0);
            avoidObjects = avoidObjects.concat(allZombies);
        }
        
        if (this.characterManager) {
            var allCharacters = this.characterManager.getAllCharacters();
            for (var i = 0; i < allCharacters.length; i++) {
                if (allCharacters[i].id !== character.id) {
                    avoidObjects.push(allCharacters[i]);
                }
            }
        }

        if (this.collisionSystem.isObjectOverlappingWithList(endX, endY, character.width, character.height, avoidObjects)) {
            result.isValid = false;
            result.issues.push('move_path_overlapping');
        }
    }

    return result;
};

// 导出
export { TouchJoystick, GameEngine };
export default GameEngine;
