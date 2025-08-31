// 事件处理系统
var eventPrototype = {};

// 初始化事件系统
eventPrototype.init = function (canvas, gameState) {
    this.canvas = canvas;
    this.gameState = gameState;
    this.isDragging = false;
    this.lastTouchX = 0;
    this.lastTouchY = 0;

    console.log('事件系统初始化完成');
};

// 处理触摸开始事件
eventPrototype.handleTouchStart = function (e) {
    var touch = e.touches[0];
    var x = touch.clientX;
    var y = touch.clientY;

    console.log('触摸开始:', x, y, '游戏状态:', this.gameState);

    if (this.gameState === 'home') {
        return this.handleHomeTouch(x, y);
    } else if (this.gameState === 'playing') {
        return this.handleGameTouch(x, y);
    }

    return false;
};

// 处理触摸移动事件
eventPrototype.handleTouchMove = function (e) {
    if (this.gameState === 'playing' && this.isDragging) {
        var touch = e.touches[0];
        var x = touch.clientX;
        var y = touch.clientY;

        var deltaX = x - this.lastTouchX;
        var deltaY = y - this.lastTouchY;

        // 移动地图
        window.mapSystem.moveMap(-deltaX, -deltaY);

        this.lastTouchX = x;
        this.lastTouchY = y;

        if (e.preventDefault) {
            e.preventDefault();
        }
        return true;
    }

    return false;
};

// 处理触摸结束事件
eventPrototype.handleTouchEnd = function (e) {
    if (this.gameState === 'playing') {
        this.isDragging = false;
        console.log('触摸结束，停止拖动');
    }

    return false;
};

// 处理首页触摸事件
eventPrototype.handleHomeTouch = function (x, y) {
    console.log('=== 处理首页触摸事件 ===');
    console.log('触摸坐标:', x, y);
    
    // 检查开始游戏按钮点击
    var result = window.menuSystem.checkHomeButtonClick.call(window.menuSystem, x, y);
    console.log('按钮点击检测结果:', result);
    
    if (result === 'start_game') {
        console.log('开始游戏按钮被点击，准备切换状态');
        // 通知游戏状态改变
        window.onGameStateChange('playing');
        console.log('onGameStateChange调用完成');
        return true;
    }
    
    console.log('=== 首页触摸事件处理完成 ===');
    return false;
};

// 处理游戏中的触摸事件
eventPrototype.handleGameTouch = function (x, y) {
    // 检查返回按钮点击
    if (this.checkBackButtonClick(x, y)) {
        console.log('返回按钮被点击');
        // 通知游戏状态改变
        if (typeof window.onGameStateChange === 'function') {
            window.onGameStateChange('home');
        }
        return true;
    }

    // 检查建筑物点击
    if (window.mapSystem && window.mapSystem.checkBuildingClick) {
        var building = window.mapSystem.checkBuildingClick(x, y);
        if (building) {
            console.log('建筑物被点击:', building.type.name);
            this.showBuildingInfo(building);
            return true;
        }
    }

    // 开始拖动地图
    this.isDragging = true;
    this.lastTouchX = x;
    this.lastTouchY = y;
    console.log('开始拖动地图');

    return true;
};

// 检查返回按钮点击
eventPrototype.checkBackButtonClick = function (x, y) {
    var buttonWidth = 120;
    var buttonHeight = 40;
    var buttonX = 20;
    var buttonY = 20;

    return x >= buttonX && x <= buttonX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight;
};

// 显示建筑物信息
eventPrototype.showBuildingInfo = function (building) {
    if (window.mapSystem && window.mapSystem.getBuildingInfo) {
        var info = window.mapSystem.getBuildingInfo(building);
        console.log('建筑物信息:', info);

        // 这里可以显示建筑物信息的UI
        // 比如弹出一个信息框显示建筑物的详细信息
        alert('建筑物信息:\n类型: ' + info.type + '\n图标: ' + info.icon + '\n位置: (' + info.position.x + ', ' + info.position.y + ')' + '\n尺寸: ' + info.size.width + 'x' + info.size.height);
    }
};

// 绑定触摸事件
eventPrototype.bindTouchEvents = function () {
    var self = this;

    // 触摸开始
    tt.onTouchStart(function (e) {
        self.handleTouchStart(e);
    });

    // 触摸移动
    tt.onTouchMove(function (e) {
        self.handleTouchMove(e);
    });

    // 触摸结束
    tt.onTouchEnd(function (e) {
        self.handleTouchEnd(e);
    });

    console.log('触摸事件绑定完成');
};

// ES6模块导出
export default eventPrototype;