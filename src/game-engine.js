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
    tt.onTouchStart(function(e) {
        if (!self.isVisible) return;
        
        var touch = e.touches[0];
        var x = touch.clientX || touch.pageX || 0;
        var y = touch.clientY || touch.pageY || 0;
        
        // 检查触摸是否在摇杆范围内
        var distance = Math.sqrt(Math.pow(x - self.centerX, 2) + Math.pow(y - self.centerY, 2));
        if (distance <= self.outerRadius) {
            self.touchId = touch.identifier;
            self.isDragging = true;
            self.isActive = true;
            self.updateJoystickPosition(x, y);
        }
    });
    
    // 触摸移动
    tt.onTouchMove(function(e) {
        if (!self.isVisible || !self.isDragging) return;
        
        // 找到对应的触摸点
        var touch = null;
        for (var i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === self.touchId) {
                touch = e.touches[i];
                break;
            }
        }
        
        if (touch) {
            var x = touch.clientX || touch.pageX || 0;
            var y = touch.clientY || touch.pageY || 0;
            self.updateJoystickPosition(x, y);
        }
    });
    
    // 触摸结束
    tt.onTouchEnd(function(e) {
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
    });
};

// 更新摇杆位置
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
    
    // 计算移动方向
    this.moveDirection.x = deltaX / this.outerRadius;
    this.moveDirection.y = deltaY / this.outerRadius;
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
};

// 渲染摇杆
TouchJoystick.prototype.render = function(ctx) {
    if (!this.isVisible) {
        console.log('触摸摇杆不可见，跳过渲染');
        return;
    }
    
    // 使用传入的ctx，如果没有传入则使用this.ctx
    var renderCtx = ctx || this.ctx;
    
    if (!renderCtx) {
        console.error('触摸摇杆渲染失败：没有有效的ctx');
        return;
    }
    
    console.log('触摸摇杆渲染中，位置:', this.centerX, this.centerY, '可见状态:', this.isVisible);
    
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
    
    console.log('触摸摇杆渲染完成');
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
    
    // 初始化
    this.init();
};

// 初始化游戏引擎
GameEngine.prototype.init = function() {
    // 初始化触摸摇杆
    this.joystick = new TouchJoystick(this.canvas, this.ctx);
    
    // 初始化视觉系统
    try {
        // 使用全局导入的视觉系统
        if (typeof ViewSystem !== 'undefined') {
            this.viewSystem = new ViewSystem(this.canvas, this.ctx);
            console.log('视觉系统初始化成功');
        } else {
            console.warn('视觉系统类未找到，将使用回退渲染');
        }
    } catch (error) {
        console.error('视觉系统初始化失败:', error);
    }
    
    console.log('游戏引擎初始化完成');
};

// 设置游戏状态
GameEngine.prototype.setGameState = function(newState) {
    this.gameState = newState;
    
    // 根据状态显示/隐藏摇杆
    if (newState === 'playing') {
        this.joystick.show();
        console.log('触摸摇杆已显示，状态:', this.joystick.isVisible);
        
        // 游戏开始时刷新初始僵尸
        if (this.zombieManager && this.characterManager) {
            console.log('游戏开始，刷新初始僵尸');
            this.spawnZombiesForDay();
        }
    } else {
        this.joystick.hide();
        console.log('触摸摇杆已隐藏，状态:', this.joystick.isVisible);
    }
    
    console.log('游戏状态切换为:', newState);
};

// 设置系统引用
GameEngine.prototype.setSystems = function(mapSystem, characterManager, menuSystem, eventSystem, zombieManager) {
    this.mapSystem = mapSystem;
    this.characterManager = characterManager;
    this.menuSystem = menuSystem;
    this.eventSystem = eventSystem;
    this.zombieManager = zombieManager;
    
    // 初始化视觉系统
    if (this.viewSystem && mapSystem) {
        console.log('地图系统信息:', mapSystem.mapWidth, 'x', mapSystem.mapHeight);
        this.viewSystem.init(mapSystem.mapWidth, mapSystem.mapHeight);
        console.log('视觉系统已初始化地图边界');
        
        // 设置初始摄像机位置为主人物位置
        if (characterManager) {
            var mainChar = characterManager.getMainCharacter();
            if (mainChar) {
                this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
                console.log('初始摄像机位置设置为主人物位置:', mainChar.x, mainChar.y);
            }
        }
    }
};

// 更新触摸摇杆控制的角色移动
GameEngine.prototype.updateJoystickMovement = function() {
    if (!this.joystick || !this.joystick.isActive || !this.characterManager) return;
    
    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) return;
    
    var direction = this.joystick.getMoveDirection();
    var moveSpeed = mainChar.moveSpeed;
    
    // 计算新位置
    var newX = mainChar.x + direction.x * moveSpeed;
    var newY = mainChar.y + direction.y * moveSpeed;
    
    // 调试信息
    console.log('触摸摇杆移动 - 方向:', direction.x, direction.y, '速度:', moveSpeed);
    console.log('主人物当前位置:', mainChar.x, mainChar.y);
    console.log('主人物新位置:', newX, newY);
    
    // 移动主人物
    mainChar.move(newX, newY);
    
    // 更新状态
    if (Math.abs(direction.x) > 0.1 || Math.abs(direction.y) > 0.1) {
        mainChar.status = 'FOLLOW';
    } else {
        mainChar.status = 'IDLE';
    }
    
    // 更新视觉系统跟随目标
    if (this.viewSystem) {
        this.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
        console.log('设置摄像机跟随目标:', mainChar.x, mainChar.y);
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
            console.log('第', this.timeSystem.day, '天夜晚开始');
        } else {
            // 夜晚变白天，天数+1
            this.timeSystem.isDay = true;
            this.timeSystem.day++;
            
            // 减少食物（每人消耗1个）
            var teamSize = this.getTeamSize();
            this.timeSystem.food = Math.max(0, this.timeSystem.food - teamSize);
            
            console.log('第', this.timeSystem.day, '天白天开始，团队人数:', teamSize, '剩余食物:', this.timeSystem.food);
            
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
    if (!this.zombieManager || !this.characterManager) {
        console.warn('僵尸刷新失败：系统未初始化');
        return;
    }
    
    var mainChar = this.characterManager.getMainCharacter();
    if (!mainChar) {
        console.warn('僵尸刷新失败：主人物未找到');
        return;
    }
    
    // 计算僵尸数量：10 * 天数
    var zombieCount = 10 * this.timeSystem.day;
    
    console.log('开始刷新僵尸，主人物位置:', mainChar.x, mainChar.y, '僵尸数量:', zombieCount);
    
    // 清除现有僵尸
    this.zombieManager.clearAllZombies();
    
    // 生成僵尸
    for (var i = 0; i < zombieCount; i++) {
        try {
            // 在距离主人物700px的位置随机生成
            var angle = (Math.PI * 2 * i) / zombieCount; // 均匀分布
            var distance = 700 + Math.random() * 100; // 700-800px之间
            
            var zombieX = mainChar.x + Math.cos(angle) * distance;
            var zombieY = mainChar.y + Math.sin(angle) * distance;
            
            // 随机选择僵尸类型
            var zombieTypes = ['skinny', 'fat', 'fast', 'tank', 'boss'];
            var randomType = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
            
            // 确保僵尸类型有效
            if (!randomType) {
                randomType = 'skinny'; // 默认类型
            }
            
            console.log('创建僵尸:', randomType, '位置:', zombieX, zombieY);
            
            // 创建僵尸
            var zombie = this.zombieManager.createZombie(randomType, zombieX, zombieY);
            
            if (zombie) {
                console.log('僵尸创建成功，ID:', zombie.id);
            } else {
                console.warn('僵尸创建失败');
            }
        } catch (error) {
            console.error('创建僵尸时出错:', error);
        }
    }
    
    console.log('僵尸刷新完成，当前僵尸数量:', this.zombieManager.getZombieCount());
};

// 游戏循环更新
GameEngine.prototype.update = function() {
    // 更新触摸摇杆控制的角色移动
    this.updateJoystickMovement();
    
    // 更新计时系统
    this.updateTimeSystem();
    
    // 更新僵尸
    if (this.zombieManager) {
        try {
            var characters = this.characterManager ? this.characterManager.getAllCharacters() : [];
            console.log('更新僵尸，角色数量:', characters.length, '僵尸数量:', this.zombieManager.getZombieCount());
            this.zombieManager.updateAllZombies(characters, 1/60);
        } catch (error) {
            console.error('更新僵尸时出错:', error);
        }
    }
    
    // 更新视觉系统
    if (this.viewSystem) {
        this.viewSystem.update();
    }
};

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
