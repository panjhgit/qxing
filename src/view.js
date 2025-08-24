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

// 屏幕坐标转世界坐标
Camera.prototype.screenToWorld = function(screenX, screenY) {
    var worldX = (screenX - this.screenWidth / 2) / this.zoom + this.x;
    var worldY = (screenY - this.screenHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
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

// 设置缩放
Camera.prototype.setZoom = function(newZoom) {
    this.zoom = Math.max(0.3, Math.min(2.0, newZoom));
    this.constrainToMap();
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
ViewSystem.prototype.renderMap = function(mapSystem) {
    if (!mapSystem) return;
    
    // 保存当前上下文状态
    this.ctx.save();
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 应用摄像机变换
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);
    
    // 渲染地图背景
    this.renderMapBackground(mapSystem);
    
    // 渲染街道
    this.renderStreets(mapSystem);
    
    // 渲染建筑物
    this.renderBuildings(mapSystem);
    
    // 渲染地图边界
    this.renderMapBoundaries(mapSystem);
    
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

// 渲染街道
ViewSystem.prototype.renderStreets = function(mapSystem) {
    if (!mapSystem) return;
    
    this.ctx.fillStyle = '#808080';  // 灰色街道
    
    // 计算网格尺寸
    var gridSize = mapSystem.blockSize + mapSystem.streetWidth;
    
    // 绘制水平街道
    for (var row = 1; row < 8; row++) {
        var y = row * gridSize - mapSystem.streetWidth;
        this.ctx.fillRect(0, y, mapSystem.mapWidth, mapSystem.streetWidth);
    }
    
    // 绘制垂直街道
    for (var col = 1; col < 8; col++) {
        var x = col * gridSize - mapSystem.streetWidth;
        this.ctx.fillRect(x, 0, mapSystem.streetWidth, mapSystem.mapHeight);
    }
    
    // 绘制街道中心线（虚线）
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 8]);
    
    // 水平中心线
    for (var row = 1; row < 8; row++) {
        var y = row * gridSize - mapSystem.streetWidth + mapSystem.streetWidth / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(mapSystem.mapWidth, y);
        this.ctx.stroke();
    }
    
    // 垂直中心线
    for (var col = 1; col < 8; col++) {
        var x = col * gridSize - mapSystem.streetWidth + mapSystem.streetWidth / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, mapSystem.mapHeight);
        this.ctx.stroke();
    }
    
    this.ctx.setLineDash([]); // 重置虚线样式
};

// 渲染建筑物
ViewSystem.prototype.renderBuildings = function(mapSystem) {
    if (!mapSystem || !mapSystem.mapGrid) return;
    
    for (var row = 0; row < mapSystem.mapGrid.length; row++) {
        for (var col = 0; col < mapSystem.mapGrid[row].length; col++) {
            var building = mapSystem.mapGrid[row][col];
            if (building) {
                this.renderBuilding(building);
            }
        }
    }
};

// 渲染单个建筑物
ViewSystem.prototype.renderBuilding = function(building) {
    if (!building || !building.type) return;
    
    var x = building.x;
    var y = building.y;
    
    // 绘制建筑物主体
    this.ctx.fillStyle = building.type.color;
    this.ctx.fillRect(x, y, building.width, building.height);
    
    // 绘制建筑物边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, building.width, building.height);
    
    // 绘制门
    this.ctx.fillStyle = building.type.doorColor;
    this.ctx.fillRect(building.doorX, building.doorY, building.doorWidth, building.doorHeight);
    
    // 绘制门边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(building.doorX, building.doorY, building.doorWidth, building.doorHeight);
    
    // 绘制建筑物图标
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
        building.type.icon,
        x + building.width / 2,
        y + building.height / 2 + 8
    );
    
    // 绘制建筑物名称
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
        building.type.name,
        x + building.width / 2,
        y + 16
    );
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
    // 绘制阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(worldX - character.width/2, worldY + character.height/2, character.width, 8);
    
    // 绘制人物主体（2.5D效果）
    var bodyY = worldY - character.height/2;
    
    // 身体
    this.ctx.fillStyle = character.getBodyColor();
    this.ctx.fillRect(worldX - character.width/2, bodyY + character.height/3, character.width, character.height * 2/3);
    
    // 头部
    this.ctx.fillStyle = character.getHeadColor();
    this.ctx.fillRect(worldX - character.width/3, bodyY, character.width * 2/3, character.height/3);
    
    // 绘制图标
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(character.icon, worldX, bodyY + character.height/3);
    
    // 绘制状态指示器
    if (character.status === 'FOLLOW') {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(worldX - 4, bodyY - 8, 8, 4);
    }
};

// 渲染僵尸（带摄像机变换）
ViewSystem.prototype.renderZombies = function(zombieManager) {
    if (!zombieManager) return;
    
    var zombies = zombieManager.getAllZombies();
    zombies.forEach(zombie => {
        if (this.camera.isInView(zombie.x, zombie.y, zombie.size, zombie.size)) {
            var screenPos = this.camera.worldToScreen(zombie.x, zombie.y);
            this.renderZombie(zombie, screenPos.x, screenPos.y);
        }
    });
};

// 渲染单个僵尸
ViewSystem.prototype.renderZombie = function(zombie, screenX, screenY) {
    if (zombie.hp <= 0) return;
    
    // 绘制阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fillRect(screenX - zombie.size/2, screenY + zombie.size/2, zombie.size, 6);
    
    // 绘制僵尸主体
    var bodyY = screenY - zombie.size/2;
    
    // 身体
    this.ctx.fillStyle = zombie.color;
    this.ctx.fillRect(screenX - zombie.size/2, bodyY + zombie.size/3, zombie.size, zombie.size * 2/3);
    
    // 头部
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(screenX - zombie.size/3, bodyY, zombie.size * 2/3, zombie.size/3);
    
    // 绘制图标
    this.ctx.font = Math.floor(zombie.size/2) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(zombie.icon, screenX, bodyY + zombie.size/2);
    
    // 绘制血条
    this.drawZombieHealthBar(zombie, screenX, bodyY - 10);
    
    // 绘制状态指示器
    if (zombie.state === 'chasing') {
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(screenX - 4, bodyY - 15, 8, 4);
    }
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
        console.log('ViewSystem渲染触摸摇杆，joystick状态:', joystick.isVisible);
        // 确保触摸摇杆在正确的屏幕位置渲染，传递正确的ctx
        joystick.render(this.ctx);
    } else {
        console.warn('触摸摇杆对象无效或没有render方法');
    }
};

// 获取摄像机引用
ViewSystem.prototype.getCamera = function() {
    return this.camera;
};

// 设置调试信息显示
ViewSystem.prototype.setDebugInfo = function(show) {
    this.showDebugInfo = show;
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
