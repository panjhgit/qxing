/**
 * 视觉系统模块 (view.js)
 *
 * 功能描述：
 * - 摄像机系统：跟随主人物移动，保持主人物在屏幕中心
 * - 视距裁剪：只渲染屏幕可见范围内的对象
 * - 屏幕坐标转换：世界坐标到屏幕坐标的转换
 * - 平滑跟随：摄像机的平滑移动和缓动效果
 * - 边界限制：防止摄像机超出地图边界
 */

// 摄像机类
var Camera = function(canvas) {
    this.canvas = canvas;
    this.x = 0;           // 摄像机世界坐标X
    this.y = 0;           // 摄像机世界坐标Y
    this.targetX = 0;     // 目标X坐标
    this.targetY = 0;     // 目标Y坐标
    this.followSpeed = 0.1; // 跟随速度（0-1，1为立即跟随）
    
    // 屏幕尺寸
    this.screenWidth = canvas.width;
    this.screenHeight = canvas.height;
    
    // 地图边界（由外部设置）
    this.mapWidth = 0;
    this.mapHeight = 0;
    
    // 缩放和偏移
    this.zoom = 0.6;
    this.offsetX = 0;
    this.offsetY = 0;
};

// 设置地图边界
Camera.prototype.setMapBounds = function(width, height) {
    this.mapWidth = width;
    this.mapHeight = height;
    console.log('摄像机地图边界设置:', width, 'x', height);
};

// 设置摄像机位置
Camera.prototype.setPosition = function(x, y) {
    this.x = x;
    this.y = y;
    
    // 限制摄像机在地图边界内
    this.constrainToMap();
    
    console.log('摄像机位置已设置为:', this.x, this.y);
};

// 跟随目标
Camera.prototype.followTarget = function(targetX, targetY) {
    console.log('摄像机跟随目标:', targetX, targetY);
    
    // 直接设置摄像机位置为目标位置，让主人物保持在屏幕中心
    this.x = targetX;
    this.y = targetY;
    
    // 限制摄像机在地图边界内
    this.constrainToMap();
    
    console.log('摄像机位置已更新为:', this.x, this.y);
};

// 更新摄像机位置
Camera.prototype.update = function() {
    // 摄像机位置已经在followTarget中设置，这里只需要确保边界限制
    this.constrainToMap();
};

// 限制摄像机在地图边界内
Camera.prototype.constrainToMap = function() {
    var halfScreenWidth = (this.screenWidth / this.zoom) / 2;
    var halfScreenHeight = (this.screenHeight / this.zoom) / 2;
    
    // 限制X坐标
    if (this.x < halfScreenWidth) {
        this.x = halfScreenWidth;
    } else if (this.x > this.mapWidth - halfScreenWidth) {
        this.x = this.mapWidth - halfScreenWidth;
    }
    
    // 限制Y坐标
    if (this.y < halfScreenHeight) {
        this.y = halfScreenHeight;
    } else if (this.y > this.mapHeight - halfScreenHeight) {
        this.y = this.mapHeight - halfScreenHeight;
    }
    
    console.log('摄像机位置:', this.x, this.y, '地图边界:', this.mapWidth, this.mapHeight);
};

// 世界坐标转屏幕坐标
Camera.prototype.worldToScreen = function(worldX, worldY) {
    // 计算相对于摄像机中心的偏移
    var offsetX = worldX - this.x;
    var offsetY = worldY - this.y;
    
    // 转换为屏幕坐标，主人物应该在屏幕中心
    var screenX = this.screenWidth / 2 + offsetX * this.zoom;
    var screenY = this.screenHeight / 2 + offsetY * this.zoom;
    
    return { x: screenX, y: screenY };
};



// 检查对象是否在屏幕范围内
Camera.prototype.isInView = function(worldX, worldY, width, height) {
    var screenPos = this.worldToScreen(worldX, worldY);
    var screenWidth = width * this.zoom;
    var screenHeight = height * this.zoom;
    
    return screenPos.x + screenWidth >= 0 && 
           screenPos.x <= this.screenWidth && 
           screenPos.y + screenHeight >= 0 && 
           screenPos.y <= this.screenHeight;
};

// 获取摄像机位置
Camera.prototype.getPosition = function() {
    return { x: this.x, y: this.y };
};



// 获取缩放
Camera.prototype.getZoom = function() {
    return this.zoom;
};

// 视觉系统主类
var ViewSystem = function(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.camera = new Camera(canvas);
    
    // 渲染设置
    this.renderDistance = 1000; // 渲染距离
    this.showDebugInfo = false; // 不显示调试信息
};

// 初始化视觉系统
ViewSystem.prototype.init = function(mapWidth, mapHeight) {
    this.camera.setMapBounds(mapWidth, mapHeight);
    console.log('视觉系统初始化完成');
};

// 设置跟随目标
ViewSystem.prototype.setFollowTarget = function(targetX, targetY) {
    this.camera.followTarget(targetX, targetY);
};

// 更新视觉系统
ViewSystem.prototype.update = function() {
    this.camera.update();
};

// 渲染地图（带摄像机变换）
ViewSystem.prototype.renderMap = function(mapRenderer) {
    if (!mapRenderer) return;
    
    // 保存当前上下文状态
    this.ctx.save();
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 应用摄像机变换
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);
    
    // 使用新的地图渲染器
    if (mapRenderer.render) {
        // 传递当前的绘图上下文，这样地图渲染器就能使用摄像机的变换
        mapRenderer.render(this.ctx);
    } else {
        // 兼容旧的mapSystem
        this.renderMapBackground(mapRenderer);
        this.renderStreets(mapRenderer);
        this.renderBuildings(mapRenderer);
        this.renderMapBoundaries(mapRenderer);
    }
    
    // 恢复上下文状态
    this.ctx.restore();
    
    // 渲染UI元素（不受摄像机变换影响）
    this.renderUI();
};

// 渲染UI元素
ViewSystem.prototype.renderUI = function() {
    // 这里可以渲染UI元素，如触摸摇杆、血条等
    // 这些元素不受摄像机变换影响
};

// 渲染地图背景
ViewSystem.prototype.renderMapBackground = function(mapSystem) {
    if (!mapSystem) return;
    
    // 绘制地图背景
    this.ctx.fillStyle = '#F0F8FF';  // 浅蓝色背景
    this.ctx.fillRect(0, 0, mapSystem.mapWidth, mapSystem.mapHeight);
};

// 渲染街道（可通行区域）
ViewSystem.prototype.renderStreets = function(mapSystem) {
    if (!mapSystem || !mapSystem.walkableAreas) return;
    
    console.log('渲染可通行区域，数量:', mapSystem.walkableAreas.length);
    
    // 使用白色代表可通行区域
    this.ctx.fillStyle = '#FFFFFF';
    
    for (var i = 0; i < mapSystem.walkableAreas.length; i++) {
        var area = mapSystem.walkableAreas[i];
        if (!area) continue;
        
        // 绘制可通行区域（白色马路）
        this.ctx.fillRect(area.bounds.left, area.bounds.top, area.bounds.right - area.bounds.left, area.bounds.bottom - area.bounds.top);
        
        // 绘制马路边框（浅灰色）
        this.ctx.strokeStyle = '#E0E0E0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(area.bounds.left, area.bounds.top, area.bounds.right - area.bounds.left, area.bounds.bottom - area.bounds.top);
    }
};

// 渲染建筑物
ViewSystem.prototype.renderBuildings = function(mapSystem) {
    if (!mapSystem || !mapSystem.buildings) return;
    
    console.log('渲染建筑物，数量:', mapSystem.buildings.length);
    
    // 遍历建筑物数组，绘制建筑物
    for (var i = 0; i < mapSystem.buildings.length; i++) {
        var building = mapSystem.buildings[i];
        if (building) {
            this.renderBuilding(building);
        }
    }
};

// 渲染单个建筑物
ViewSystem.prototype.renderBuilding = function(building) {
    if (!building) return;
    
    // 使用中心点坐标系统
    var x = building.x - building.width / 2;
    var y = building.y - building.height / 2;
    
    // 绘制建筑物主体（使用建筑类型对应的颜色）
    this.ctx.fillStyle = building.color || '#CD853F';
    this.ctx.fillRect(x, y, building.width, building.height);
    
    // 绘制建筑物边框
    this.ctx.strokeStyle = '#8B4513';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, building.width, building.height);
    
    // 绘制建筑物图标
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
        building.icon || '🏠',
        building.x,
        building.y
    );
    
    // 绘制建筑物名称
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
        building.type || '建筑',
        building.x,
        y + 20
    );
    
    // 绘制网格坐标（调试用）
    if (building.gridCol !== undefined && building.gridRow !== undefined) {
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(
            `${building.gridCol},${building.gridRow}`,
            building.x,
            y + building.height - 10
        );
    }
};

// 渲染地图边界
ViewSystem.prototype.renderMapBoundaries = function(mapSystem) {
    if (!mapSystem) return;
    
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 5;
    this.ctx.strokeRect(0, 0, mapSystem.mapWidth, mapSystem.mapHeight);
};

// 渲染角色（带摄像机变换）
ViewSystem.prototype.renderCharacters = function(characterManager) {
    if (!characterManager) return;
    
    // 保存当前上下文状态
    this.ctx.save();
    
    // 应用摄像机变换
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);
    
    var characters = characterManager.getAllCharacters();
    characters.forEach(character => {
        // 直接使用世界坐标渲染角色，让摄像机变换处理位置
        this.renderCharacter(character, character.x, character.y);
        
        // 调试信息：主人物位置
        if (character.role === 1) { // 主人物
            console.log('主人物世界坐标:', character.x, character.y);
            console.log('摄像机位置:', this.camera.x, this.camera.y);
            console.log('屏幕中心:', this.canvas.width / 2, this.canvas.height / 2);
        }
    });
    
    // 恢复上下文状态
    this.ctx.restore();
};

// 渲染单个角色
ViewSystem.prototype.renderCharacter = function(character, worldX, worldY) {
    // 绘制阴影 - 改为椭圆形阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(worldX, worldY + character.height/2 + 4, character.width/2, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 绘制人物主体（圆形设计）
    var bodyY = worldY - character.height/2;
    
    // 身体 - 改为圆形
    this.ctx.fillStyle = character.getBodyColor();
    this.ctx.beginPath();
    this.ctx.arc(worldX, bodyY + character.height/2, character.width/2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 头部 - 改为圆形
    this.ctx.fillStyle = character.getHeadColor();
    this.ctx.beginPath();
    this.ctx.arc(worldX, bodyY + character.height/6, character.width/3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 绘制图标
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(character.icon, worldX, bodyY + character.height/2);
    
    // 绘制状态指示器 - 改为圆形
    if (character.status === 'FOLLOW') {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(worldX, bodyY - 6, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }
};

// 🔴 渲染僵尸（带摄像机变换）- 使用高性能活跃僵尸列表
ViewSystem.prototype.renderZombies = function(zombieManager) {
    if (!zombieManager) {
        console.warn('renderZombies: zombieManager 为空');
        return;
    }
    
    // 🔴 获取主人物位置，用于计算活跃僵尸
    var mainCharacter = null;
    if (window.characterManager) {
        mainCharacter = window.characterManager.getMainCharacter();
    }
    
    if (!mainCharacter) {
        console.warn('renderZombies: 无法获取主人物位置，回退到传统渲染');
        var zombies = zombieManager.getAllZombies();
        this.renderZombieList(zombies);
        return;
    }
    
    // 🔴 使用新的高性能活跃僵尸列表
    var activeZombies = [];
    if (zombieManager.getActiveZombies && typeof zombieManager.getActiveZombies === 'function') {
        activeZombies = zombieManager.getActiveZombies(mainCharacter);
        console.log('🔴 高性能渲染: 活跃僵尸数量:', activeZombies.length, '主人物位置:', mainCharacter.x, mainCharacter.y);
    } else {
        // 回退到传统方法
        activeZombies = zombieManager.getAllZombies();
        console.log('renderZombies: 回退到传统方法，僵尸数量:', activeZombies.length);
    }
    
    if (activeZombies.length === 0) {
        console.log('renderZombies: 没有活跃僵尸需要渲染');
        return;
    }
    
    // 🔴 渲染活跃僵尸列表
    this.renderZombieList(activeZombies);
};

// 🔴 新增：渲染僵尸列表的通用方法
ViewSystem.prototype.renderZombieList = function(zombies) {
    zombies.forEach((zombie, index) => {
        // 检查僵尸是否在视野内
        if (this.camera.isInView(zombie.x, zombie.y, zombie.size, zombie.size)) {
            var screenPos = this.camera.worldToScreen(zombie.x, zombie.y);
            this.renderZombie(zombie, screenPos.x, screenPos.y);
        }
    });
};

// 渲染单个僵尸
ViewSystem.prototype.renderZombie = function(zombie, screenX, screenY) {
    // 添加调试信息
    console.log('renderZombie: 开始渲染僵尸:', {
        id: zombie.id,
        type: zombie.type,
        hp: zombie.hp,
        maxHp: zombie.maxHp,
        state: zombie.state,
        x: zombie.x,
        y: zombie.y,
        screenX: screenX,
        screenY: screenY,
        size: zombie.size
    });
    
    if (zombie.hp <= 0) {
        console.log('renderZombie: 僵尸生命值为0，跳过渲染');
        return;
    }
    
    if (!zombie.size || zombie.size <= 0) {
        console.warn('renderZombie: 僵尸尺寸无效:', zombie.size);
        zombie.size = 32; // 使用默认尺寸
    }
    
    // 绘制阴影 - 改为椭圆形阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY + zombie.size/2 + 3, zombie.size/2, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 绘制僵尸主体（圆形设计）
    var bodyY = screenY - zombie.size/2;
    
    // 身体 - 改为圆形
    this.ctx.fillStyle = zombie.color || '#8B4513';
    this.ctx.beginPath();
    this.ctx.arc(screenX, bodyY + zombie.size/2, zombie.size/2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 头部 - 改为圆形
    this.ctx.fillStyle = '#654321';
    this.ctx.beginPath();
    this.ctx.arc(screenX, bodyY + zombie.size/6, zombie.size/3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 绘制图标
    this.ctx.font = Math.floor(zombie.size/2) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(zombie.icon || '🧟‍♂️', screenX, bodyY + zombie.size/2);
    
    // 绘制血条
    this.drawZombieHealthBar(zombie, screenX, bodyY - 10);
    
    // 绘制状态指示器 - 改为圆形
    if (zombie.state === 'chasing') {
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX, bodyY - 7.5, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    console.log('renderZombie: 僵尸渲染完成');
};

// 绘制僵尸血条
ViewSystem.prototype.drawZombieHealthBar = function(zombie, x, y) {
    var barWidth = zombie.size;
    var barHeight = 4;
    var healthPercent = zombie.hp / zombie.maxHp;
    
    // 血条背景
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fillRect(x - barWidth/2, y, barWidth, barHeight);
    
    // 血条
    this.ctx.fillStyle = '#00FF00';
    this.ctx.fillRect(x - barWidth/2, y, barWidth * healthPercent, barHeight);
    
    // 血条边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - barWidth/2, y, barWidth, barHeight);
};

// 渲染触摸摇杆（不受摄像机变换影响）
ViewSystem.prototype.renderJoystick = function(joystick) {
    if (joystick && joystick.render) {
        // 确保触摸摇杆在正确的屏幕位置渲染，传递正确的ctx
        joystick.render(this.ctx);
    }
};



// 渲染调试信息
ViewSystem.prototype.renderDebugInfo = function() {
    if (!this.showDebugInfo) return;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 300, 120);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    
    var cameraPos = this.camera.getPosition();
    this.ctx.fillText('摄像机位置: ' + Math.round(cameraPos.x) + ', ' + Math.round(cameraPos.y), 15, 30);
    this.ctx.fillText('摄像机缩放: ' + this.camera.getZoom().toFixed(2), 15, 45);
    this.ctx.fillText('屏幕尺寸: ' + this.canvas.width + ' x ' + this.canvas.height, 15, 60);
    this.ctx.fillText('地图尺寸: ' + this.camera.mapWidth + ' x ' + this.camera.mapHeight, 15, 75);
    this.ctx.fillText('渲染距离: ' + this.renderDistance, 15, 90);
};

// 渲染时间信息（左上角）
ViewSystem.prototype.renderTimeInfo = function(gameEngine) {
    if (!gameEngine || !gameEngine.getTimeInfo) return;
    
    var timeInfo = gameEngine.getTimeInfo();
    
    // 绘制背景面板
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(10, 10, 180, 60);
    
    // 绘制边框
    this.ctx.strokeStyle = timeInfo.isDay ? '#FFD700' : '#4169E1';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(10, 10, 180, 60);
    
    // 设置文字样式
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    
    // 显示天数
    var dayText = '第 ' + timeInfo.day + ' 天';
    var timeText = timeInfo.isDay ? '☀️ 白天' : '🌙 夜晚';
    this.ctx.fillText(dayText, 20, 30);
    this.ctx.fillText(timeText, 20, 50);
    
    // 显示团队人数和食物数量
    var teamText = '👥 团队: ' + timeInfo.teamSize + ' 人';
    var foodText = '🍖 食物: ' + timeInfo.food;
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(teamText, 20, 70);
    
    this.ctx.fillStyle = timeInfo.food > 0 ? '#00FF00' : '#FF0000';
    this.ctx.fillText(foodText, 120, 70);
};

// 导出
export { Camera, ViewSystem };
export default ViewSystem;
