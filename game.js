console.log('使用抖音开发者工具开发过程中可以参考以下文档:');
console.log(
    'https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/introduction',
);

let systemInfo = tt.getSystemInfoSync();
let canvas = tt.createCanvas(),
    ctx = canvas.getContext('2d');
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

// 游戏状态
let gameState = 'home'; // 'home', 'playing', 'menu'

// 初始化游戏
function initGame() {
    // 绑定触摸事件
    bindTouchEvents();
    
    // 开始游戏循环
    gameLoop();
}

// 绑定触摸事件
function bindTouchEvents() {
    tt.onTouchStart(function(e) {
        if (gameState === 'home') {
            var touch = e.touches[0];
            var result = checkHomeButtonClick(touch.clientX, touch.clientY);
            
            if (result === 'start_game') {
                console.log('开始游戏按钮被点击！');
                gameState = 'playing';
                // 这里可以添加切换到游戏逻辑的代码
            }
        } else if (gameState === 'playing') {
            // 游戏进行中点击返回首页
            gameState = 'home';
        }
    });
}

// 游戏主循环
function gameLoop() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 根据游戏状态渲染不同内容
    switch (gameState) {
        case 'home':
            renderHomePage();
            break;
        case 'playing':
            renderGame();
            break;
        case 'menu':
            renderMenu();
            break;
    }
    
    // 继续循环
    requestAnimationFrame(gameLoop);
}

// 渲染首页
function renderHomePage() {
    // 检查prototype对象是否存在
    if (typeof prototype !== 'undefined' && prototype.renderHomePage) {
        // 创建上下文对象
        var menuContext = {
            canvas: canvas,
            ctx: ctx,
            startButtonArea: null
        };
        
        // 调用首页渲染函数
        prototype.renderHomePage.call(menuContext);
        
        // 保存按钮区域信息
        window.startButtonArea = menuContext.startButtonArea;
    } else {
        // 如果prototype不存在，显示默认首页
        renderDefaultHomePage();
    }
}

// 默认首页渲染
function renderDefaultHomePage() {
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;
    
    // 背景渐变
    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2d1b69');
    gradient.addColorStop(0.3, '#11998e');
    gradient.addColorStop(0.7, '#38ef7d');
    gradient.addColorStop(1, '#2d1b69');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 游戏标题
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🧟 Q版僵尸沙盒', centerX, centerY - 120);
    
    // 副标题
    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('🏗️ 建造 • 生存 • 冒险', centerX, centerY - 80);
    ctx.restore();
    
    // 开始游戏按钮
    renderStartButton(centerX, centerY);
    
    // 游戏特色介绍
    renderFeatures(centerX, centerY + 80);
    
    // 底部信息
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('© 2024 Q版僵尸沙盒 - 用爱发电 ❤️', centerX, canvas.height - 30);
}

// 渲染开始按钮
function renderStartButton(centerX, centerY) {
    var buttonWidth = 200;
    var buttonHeight = 60;
    var buttonX = centerX - buttonWidth / 2;
    var buttonY = centerY - 20;
    
    // 按钮背景
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    
    // 渐变按钮
    var buttonGradient = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    buttonGradient.addColorStop(0, '#ff6b6b');
    buttonGradient.addColorStop(1, '#ee5a24');
    ctx.fillStyle = buttonGradient;
    
    // 圆角矩形
    roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    ctx.fill();
    
    // 按钮边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    ctx.stroke();
    
    ctx.restore();
    
    // 按钮文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 开始游戏', centerX, centerY + 15);
    
    // 保存按钮区域用于点击检测
    window.startButtonArea = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
}

// 绘制圆角矩形
function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// 渲染特色介绍
function renderFeatures(centerX, startY) {
    var features = [
        { icon: '🏠', text: '建造你的沙盒世界' },
        { icon: '🧟', text: '对抗可爱的僵尸' },
        { icon: '⚔️', text: '收集资源生存' },
        { icon: '🌟', text: '探索无限可能' }
    ];
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    
    features.forEach(function(feature, index) {
        var y = startY + index * 35;
        ctx.fillText(feature.icon + ' ' + feature.text, centerX, y);
    });
}

// 检查首页按钮点击
function checkHomeButtonClick(x, y) {
    if (window.startButtonArea && 
        x >= window.startButtonArea.x && 
        x <= window.startButtonArea.x + window.startButtonArea.width &&
        y >= window.startButtonArea.y && 
        y <= window.startButtonArea.y + window.startButtonArea.height) {
        return 'start_game';
    }
    return null;
}

// 渲染游戏画面
function renderGame() {
    // 游戏进行中的渲染逻辑
    ctx.fillStyle = '#2d1b69';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏进行中...', canvas.width / 2, canvas.height / 2);
    ctx.fillText('点击返回首页', canvas.width / 2, canvas.height / 2 + 40);
}

// 渲染菜单
function renderMenu() {
    // 菜单渲染逻辑
    ctx.fillStyle = '#11998e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏菜单', canvas.width / 2, canvas.height / 2);
}

// 启动游戏
function startGame() {
    initGame();
}

// 启动游戏
startGame();
