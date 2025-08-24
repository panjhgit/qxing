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
TouchJoystick.prototype.render = function() {
    if (!this.isVisible) return;
    
    // 绘制外圈
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.outerRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 绘制外圈边框
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 绘制内圈（摇杆）
    var innerX = this.centerX + this.joystickX;
    var innerY = this.centerY + this.joystickY;
    
    this.ctx.fillStyle = this.isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(innerX, innerY, this.innerRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 绘制内圈边框
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // 绘制中心点
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
    this.ctx.fill();
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
    } else {
        this.joystick.hide();
    }
    
    console.log('游戏状态切换为:', newState);
};

// 设置系统引用
GameEngine.prototype.setSystems = function(mapSystem, characterManager, menuSystem, eventSystem) {
    this.mapSystem = mapSystem;
    this.characterManager = characterManager;
    this.menuSystem = menuSystem;
    this.eventSystem = eventSystem;
    
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

// 游戏循环更新
GameEngine.prototype.update = function() {
    // 更新触摸摇杆控制的角色移动
    this.updateJoystickMovement();
    
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
            
            // 渲染僵尸（如果有的话）
            // this.viewSystem.renderZombies(this.zombieManager);
            
            // 渲染触摸摇杆
            this.viewSystem.renderJoystick(this.joystick);
            
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
