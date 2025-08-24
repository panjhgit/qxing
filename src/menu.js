// 菜单系统
var menuPrototype = {};

// 菜单渲染
menuPrototype.renderMenu = function () {
    var centerX = this.canvas.width / 2;

    var gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderBackgroundGrid();
    this.renderDecorations();

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(255, 87, 51, 0.8)';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#ff5733';
    this.ctx.font = 'bold 42px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('末日Q行', centerX, 120);

    this.ctx.strokeStyle = '#ff5733';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 100, 140);
    this.ctx.lineTo(centerX + 100, 140);
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('生存至100天的挑战', centerX, 170);

    this.renderGameFeatures(centerX);
    this.renderStartButton(centerX);
    this.renderFooterInfo(centerX);

    this.ctx.textAlign = 'left';
};

// 渲染首页
menuPrototype.renderHomePage = function () {
    var centerX = this.canvas.width / 2;
    var centerY = this.canvas.height / 2;

    // 背景渐变
    var gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#2d1b69');
    gradient.addColorStop(0.3, '#11998e');
    gradient.addColorStop(0.7, '#38ef7d');
    gradient.addColorStop(1, '#2d1b69');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制Q版沙盒背景元素
    this.renderSandboxBackground();

    // 绘制可爱的僵尸装饰
    this.renderCuteZombieDecorations();

    // 游戏标题
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.shadowBlur = 25;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🧟 Q版僵尸沙盒', centerX, centerY - 120);

    // 副标题
    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText('🏗️ 建造 • 生存 • 冒险', centerX, centerY - 80);
    this.ctx.restore();

    // 开始游戏按钮
    this.renderHomeStartButton(centerX, centerY);

    // 游戏特色介绍
    this.renderHomeFeatures(centerX, centerY + 80);

    // 底部信息
    this.renderHomeFooter(centerX);
};

// 渲染沙盒背景
menuPrototype.renderSandboxBackground = function () {
    // 绘制网格地面
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    var gridSize = 40;

    for (var x = 0; x < this.canvas.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
    }

    for (var y = 0; y < this.canvas.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
    }
};

// 渲染装饰元素
menuPrototype.renderDecorations = function () {
    // 绘制一些装饰性的几何图形
    this.ctx.fillStyle = 'rgba(255, 87, 51, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(100, 100, 30, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 87, 51, 0.2)';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width - 100, 150, 40, 0, Math.PI * 2);
    this.ctx.fill();
};

// 渲染游戏特色
menuPrototype.renderGameFeatures = function (centerX) {
    var features = [
        '🎯 生存挑战',
        '🏗️ 建造系统',
        '🧟 僵尸战斗',
        '🌍 沙盒世界'
    ];

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';

    features.forEach(function (feature, index) {
        var y = 220 + index * 35;
        this.ctx.fillText(feature, centerX, y);
    }.bind(this));
};

// 渲染开始按钮
menuPrototype.renderStartButton = function (centerX) {
    var buttonWidth = 200;
    var buttonHeight = 60;
    var buttonX = centerX - buttonWidth / 2;
    var buttonY = 400;

    // 按钮背景
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 5;

    // 渐变按钮
    var buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    buttonGradient.addColorStop(0, '#ff6b6b');
    buttonGradient.addColorStop(1, '#ee5a24');
    this.ctx.fillStyle = buttonGradient;

    // 圆角矩形
    this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    this.ctx.fill();

    // 按钮边框
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    this.ctx.stroke();

    this.ctx.restore();

    // 按钮文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('开始游戏', centerX, buttonY + buttonHeight / 2 + 8);

    // 保存按钮区域用于点击检测
    this.startButtonArea = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
};

// 渲染首页开始按钮
menuPrototype.renderHomeStartButton = function (centerX, centerY) {
    var buttonWidth = 200;
    var buttonHeight = 60;
    var buttonX = centerX - buttonWidth / 2;
    var buttonY = centerY + 20;

    // 按钮背景
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 5;

    // 渐变按钮
    var buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    buttonGradient.addColorStop(0, '#ff6b6b');
    buttonGradient.addColorStop(1, '#ee5a24');
    this.ctx.fillStyle = buttonGradient;

    // 圆角矩形
    this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    this.ctx.fill();

    // 按钮边框
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    this.ctx.stroke();

    this.ctx.restore();

    // 按钮文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎮 开始游戏', centerX, centerY + 55);

    // 保存按钮区域用于点击检测
    this.startButtonArea = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
};

// 绘制圆角矩形
menuPrototype.roundRect = function (x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
};

// 渲染首页特色介绍
menuPrototype.renderHomeFeatures = function (centerX, startY) {
    var features = [
        {icon: '🏠', text: '建造你的沙盒世界'},
        {icon: '🧟', text: '对抗可爱的僵尸'},
        {icon: '⚔️', text: '收集资源生存'},
        {icon: '🌟', text: '探索无限可能'}
    ];

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'center';

    features.forEach(function (feature, index) {
        var y = startY + index * 35;
        this.ctx.fillText(feature.icon + ' ' + feature.text, centerX, y);
    }.bind(this));
};

// 渲染首页底部信息
menuPrototype.renderHomeFooter = function (centerX) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('© 2024 Q版僵尸沙盒 - 用爱发电 ❤️', centerX, this.canvas.height - 30);
};

// 检查首页按钮点击
menuPrototype.checkHomeButtonClick = function (x, y) {
    if (this.startButtonArea &&
        x >= this.startButtonArea.x &&
        x <= this.startButtonArea.x + this.startButtonArea.width &&
        y >= this.startButtonArea.y &&
        y <= this.startButtonArea.y + this.startButtonArea.height) {
        return 'start_game';
    }
    return null;
};

// 渲染可爱的僵尸装饰
menuPrototype.renderCuteZombieDecorations = function () {
    // 绘制一些可爱的僵尸装饰元素
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';

    // 左上角僵尸
    this.ctx.fillText('🧟', 80, 120);

    // 右上角僵尸
    this.ctx.fillText('🧟', this.canvas.width - 80, 120);

    // 左下角僵尸
    this.ctx.fillText('🧟', 80, this.canvas.height - 80);

    // 右下角僵尸
    this.ctx.fillText('🧟', this.canvas.width - 80, this.canvas.height - 80);
};

// ES6模块导出
export default menuPrototype;