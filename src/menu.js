// 菜单系统 - 自包含版本，不依赖任何外部模块
var menuPrototype = {};

// 初始化菜单系统
menuPrototype.init = function(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    // 设置默认值
    this.startButtonArea = null;
    
    // 绑定触摸事件（抖音小游戏环境）
    this.bindTouchEvents();
    
    console.log('✅ 菜单系统初始化完成');
};

// 绑定触摸事件
menuPrototype.bindTouchEvents = function() {
    var self = this;
    
    // 检查是否在抖音小游戏环境
    if (typeof tt !== 'undefined') {
        // 抖音小游戏环境
        tt.onTouchStart(function(e) {
            if (e.touches && e.touches[0]) {
                var touch = e.touches[0];
                var x = touch.clientX || touch.pageX || 0;
                var y = touch.clientY || touch.pageY || 0;
                self.handleTouch(x, y);
            }
        });
        console.log('✅ 抖音小游戏触摸事件绑定完成');
    } else if (typeof window !== 'undefined' && window.addEventListener) {
        // 普通浏览器环境
        this.canvas.addEventListener('click', function(e) {
            var rect = self.canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            self.handleTouch(x, y);
        });
        console.log('✅ 浏览器点击事件绑定完成');
    }
};

// 处理触摸/点击事件
menuPrototype.handleTouch = function(x, y) {
    console.log('菜单触摸事件:', x, y);
    
    // 检查开始游戏按钮点击
    if (this.startButtonArea) {
        if (x >= this.startButtonArea.x && 
            x <= this.startButtonArea.x + this.startButtonArea.width &&
            y >= this.startButtonArea.y && 
            y <= this.startButtonArea.y + this.startButtonArea.height) {
            
            console.log('✅ 开始游戏按钮被点击！');
            
            // 调用全局的startGame函数
            if (typeof window.startGame === 'function') {
                window.startGame();
            } else {
                console.error('❌ startGame函数未找到，请检查game.js是否正确加载');
                // 显示错误提示
                this.showError('开始游戏功能未准备好，请刷新页面重试');
            }
            return true;
        }
    }
    

    
    // 检查返回主菜单按钮点击
    if (this.returnToMainMenuButtonArea) {
        if (x >= this.returnToMainMenuButtonArea.x && 
            x <= this.returnToMainMenuButtonArea.x + this.returnToMainMenuButtonArea.width &&
            y >= this.returnToMainMenuButtonArea.y && 
            y <= this.returnToMainMenuButtonArea.y + this.returnToMainMenuButtonArea.height) {
            
            console.log('✅ 返回主菜单按钮被点击！');
            
            // 调用全局的resetGame函数
            if (typeof window.resetGame === 'function') {
                window.resetGame();
            } else {
                console.error('❌ resetGame函数未找到，请检查game.js是否正确加载');
                // 显示错误提示
                this.showError('返回主菜单功能未准备好，请刷新页面重试');
            }
            return true;
        }
    }
    
    // 检查继续游戏按钮点击
    if (this.continueGameButtonArea) {
        if (x >= this.continueGameButtonArea.x && 
            x <= this.continueGameButtonArea.x + this.continueGameButtonArea.width &&
            y >= this.continueGameButtonArea.y && 
            y <= this.continueGameButtonArea.y + this.continueGameButtonArea.height) {
            
            console.log('✅ 继续游戏按钮被点击！');
            
            // 隐藏游戏内菜单，继续游戏
            this.hideGameMenu();
            return true;
        }
    }
    
    return false;
};

// 显示错误信息
menuPrototype.showError = function(message) {
    if (this.ctx) {
        // 保存当前状态
        this.ctx.save();
        
        // 绘制错误背景
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制错误文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('错误: ' + message, this.canvas.width / 2, this.canvas.height / 2);
        
        // 恢复状态
        this.ctx.restore();
        
        // 3秒后清除错误信息
        setTimeout(() => {
            this.renderHomePage();
        }, 3000);
    }
};

// 渲染首页
menuPrototype.renderHomePage = function () {
    if (!this.canvas || !this.ctx) {
        console.error('❌ 菜单系统未正确初始化');
        return;
    }
    
    var centerX = this.canvas.width / 2;
    var centerY = this.canvas.height / 2;

    // 计算响应式尺寸
    var isMobile = this.canvas.width < 768;
    var titleFontSize = isMobile ? 32 : 48;
    var subtitleFontSize = isMobile ? 18 : 24;
    var buttonFontSize = isMobile ? 20 : 24;
    var featureFontSize = isMobile ? 16 : 18;
    var footerFontSize = isMobile ? 14 : 16;

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
    this.ctx.font = 'bold ' + titleFontSize + 'px Arial';
    this.ctx.textAlign = 'center';

    // 手机屏幕上的标题位置调整
    var titleY = isMobile ? centerY - 80 : centerY - 120;
    this.ctx.fillText('🧟 Q版僵尸沙盒', centerX, titleY);

    // 副标题
    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.font = 'bold ' + subtitleFontSize + 'px Arial';
    var subtitleY = isMobile ? centerY - 50 : centerY - 80;
    this.ctx.fillText('🏗️ 生存 • 冒险', centerX, subtitleY);
    this.ctx.restore();

    // 开始游戏按钮
    this.renderHomeStartButton(centerX, centerY, isMobile);

    // 底部信息
    this.renderHomeFooter(centerX, footerFontSize);
    
    console.log('✅ 首页渲染完成');
};

// 渲染沙盒背景
menuPrototype.renderSandboxBackground = function () {
    // 绘制网格地面
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    // 根据屏幕尺寸调整网格大小
    var isMobile = this.canvas.width < 768;
    var gridSize = isMobile ? 30 : 40;

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
    var isMobile = this.canvas.width < 768;
    var margin = isMobile ? 60 : 100;
    var size = isMobile ? 20 : 30;

    this.ctx.fillStyle = 'rgba(255, 87, 51, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(margin, margin, size, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 87, 51, 0.2)';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width - margin, margin + 20, size + 5, 0, Math.PI * 2);
    this.ctx.fill();
};

// 渲染背景网格
menuPrototype.renderBackgroundGrid = function () {
    // 绘制背景网格
    this.ctx.strokeStyle = 'rgba(255, 87, 51, 0.1)';
    this.ctx.lineWidth = 1;
    var gridSize = 50;

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

// 渲染游戏特色
menuPrototype.renderGameFeatures = function (centerX) {
    var features = ['🎯 生存挑战', '🏗️ 建造系统', '🧟 僵尸战斗', '🌍 沙盒世界'];

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
    this.ctx.fillText('🎮 开始游戏', centerX, buttonY + buttonHeight / 2 + 8);
};

// 渲染页脚信息
menuPrototype.renderFooterInfo = function (centerX) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('© 2024 末日Q行 - 生存挑战', centerX, this.canvas.height - 30);
};

// 渲染首页开始按钮
menuPrototype.renderHomeStartButton = function (centerX, centerY, isMobile) {
    var buttonWidth = isMobile ? 180 : 200;
    var buttonHeight = isMobile ? 50 : 60;
    var buttonX = centerX - buttonWidth / 2;
    var buttonY = isMobile ? centerY + 10 : centerY + 20;

    // 计算按钮字体大小
    var buttonFontSize = isMobile ? 20 : 24;

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
    this.ctx.font = 'bold ' + buttonFontSize + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎮 开始游戏', centerX, buttonY + buttonHeight / 2 + 8);

    // 保存按钮区域信息
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


// 渲染首页底部信息
menuPrototype.renderHomeFooter = function (centerX, fontSize) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = 'bold ' + fontSize + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('© 2024 Q版僵尸沙盒 - 用爱发电 ❤️', centerX, this.canvas.height - 30);
};

// 检查首页按钮点击
menuPrototype.checkHomeButtonClick = function (x, y) {
    if (this.startButtonArea && x >= this.startButtonArea.x && x <= this.startButtonArea.x + this.startButtonArea.width && y >= this.startButtonArea.y && y <= this.startButtonArea.y + this.startButtonArea.height) {
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

    // 根据屏幕尺寸调整装饰位置
    var isMobile = this.canvas.width < 768;
    var margin = isMobile ? 40 : 80;
    var fontSize = isMobile ? 32 : 48;

    // 左上角僵尸
    this.ctx.font = fontSize + 'px Arial';
    this.ctx.fillText('🧟', margin, margin + fontSize);

    // 右上角僵尸
    this.ctx.fillText('🧟', this.canvas.width - margin, margin + fontSize);

    // 左下角僵尸
    this.ctx.fillText('🧟', margin, this.canvas.height - margin);

    // 右下角僵尸
    this.ctx.fillText('🧟', this.canvas.width - margin, this.canvas.height - margin);
};

// 渲染继续游戏按钮
menuPrototype.renderContinueGameButton = function(centerX, centerY) {
    var buttonWidth = 200;
    var buttonHeight = 50;
    var buttonX = centerX - buttonWidth / 2;
    var buttonY = centerY - 25;
    
    // 保存按钮区域信息
    this.continueGameButtonArea = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
    
    // 绘制按钮背景
    this.ctx.fillStyle = '#27ae60';
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 绘制按钮边框
    this.ctx.strokeStyle = '#229954';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 绘制按钮文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('继续游戏', centerX, centerY + 8);
};

// 隐藏游戏内菜单
menuPrototype.hideGameMenu = function() {
    // 清除按钮区域信息
    this.returnToMainMenuButtonArea = null;
    this.continueGameButtonArea = null;
    
    console.log('✅ 游戏内菜单已隐藏');
};

// 渲染游戏内菜单（包含返回主菜单按钮）
menuPrototype.renderGameMenu = function() {
    if (!this.canvas || !this.ctx) {
        console.error('❌ 菜单系统未正确初始化');
        return;
    }
    
    var centerX = this.canvas.width / 2;
    var centerY = this.canvas.height / 2;
    
    // 半透明背景
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 菜单标题
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('游戏菜单', centerX, centerY - 100);
    
    // 返回主菜单按钮
    this.renderReturnToMainMenuButton(centerX, centerY);
    
    // 继续游戏按钮
    this.renderContinueGameButton(centerX, centerY + 80);
    
    console.log('✅ 游戏内菜单渲染完成');
};

// 渲染返回主菜单按钮
menuPrototype.renderReturnToMainMenuButton = function(centerX, centerY) {
    var buttonWidth = 200;
    var buttonHeight = 50;
    var buttonX = centerX - buttonWidth / 2;
    var buttonY = centerY - 25;
    
    // 保存按钮区域信息
    this.returnToMainMenuButtonArea = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
    
    // 绘制按钮背景
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 绘制按钮边框
    this.ctx.strokeStyle = '#c0392b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 绘制按钮文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('返回主菜单', centerX, centerY + 8);
};

// ES6模块导出
export default menuPrototype;