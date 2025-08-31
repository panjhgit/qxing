// 菜单系统 - 使用统一渲染系统
import { MenuRenderer } from './view/menu-renderer.js';

var menuPrototype = {};

// 初始化菜单系统
menuPrototype.init = function (canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;

    // 初始化菜单渲染器
    this.menuRenderer = new MenuRenderer(canvas, ctx);

    // 设置默认值
    this.startButtonArea = null;
    this.returnToMainMenuButtonArea = null;
    this.continueGameButtonArea = null;

    // 绑定触摸事件（抖音小游戏环境）
    this.bindTouchEvents();

    console.log('✅ 菜单系统初始化完成');
};

// 绑定触摸事件
menuPrototype.bindTouchEvents = function () {
    var self = this;

    // 检查是否在抖音小游戏环境
    if (typeof tt !== 'undefined') {
        // 抖音小游戏环境
        tt.onTouchStart(function (e) {
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
        this.canvas.addEventListener('click', function (e) {
            var rect = self.canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            self.handleTouch(x, y);
        });
        console.log('✅ 浏览器点击事件绑定完成');
    }
};

// 处理触摸/点击事件
menuPrototype.handleTouch = function (x, y) {
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
menuPrototype.showError = function (message) {
    if (this.menuRenderer) {
        this.menuRenderer.showError(message);

        // 3秒后清除错误信息
        setTimeout(() => {
            this.renderHomePage();
        }, 3000);
    }
};

// 渲染首页
menuPrototype.renderHomePage = function () {
    if (!this.menuRenderer) {
        console.error('❌ 菜单渲染器未正确初始化');
        return;
    }

    // 使用菜单渲染器渲染首页
    this.menuRenderer.renderHomePage();

    // 获取按钮区域信息用于事件处理
    this.startButtonArea = this.menuRenderer.getStartButtonArea();

    console.log('✅ 首页渲染完成');
};

// 渲染游戏内菜单（包含返回主菜单按钮）
menuPrototype.renderGameMenu = function () {
    if (!this.menuRenderer) {
        console.error('❌ 菜单渲染器未正确初始化');
        return;
    }

    // 使用菜单渲染器渲染游戏内菜单
    this.menuRenderer.renderGameMenu();

    // 获取按钮区域信息用于事件处理
    this.returnToMainMenuButtonArea = this.menuRenderer.getReturnToMainMenuButtonArea();
    this.continueGameButtonArea = this.menuRenderer.getContinueGameButtonArea();

    console.log('✅ 游戏内菜单渲染完成');
};

// 隐藏游戏内菜单
menuPrototype.hideGameMenu = function () {
    // 清除按钮区域信息
    this.returnToMainMenuButtonArea = null;
    this.continueGameButtonArea = null;

    console.log('✅ 游戏内菜单已隐藏');
};

// ES6模块导出
export default menuPrototype;