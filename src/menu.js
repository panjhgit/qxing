/**
 * 独立菜单系统 (menu.js)
 * 
 * 功能描述：
 * - 完全独立的菜单系统，不依赖任何其他模块
 * - 自包含的渲染引擎和事件处理
 * - 支持多种菜单页面和状态
 * - 响应式设计，适配不同屏幕尺寸
 * - 易于扩展和维护
 */

// 菜单状态枚举
const MENU_STATE = {
    HOME: 'home',           // 主菜单
    GAME_MENU: 'game_menu', // 游戏内菜单
    SETTINGS: 'settings',   // 设置菜单
    HELP: 'help',           // 帮助菜单
    CREDITS: 'credits'      // 制作人员
};

// 按钮类型枚举
const BUTTON_TYPE = {
    START_GAME: 'start_game',
    RETURN_MAIN: 'return_main',
    CONTINUE_GAME: 'continue_game',
    RESET: 'reset',
    SETTINGS: 'settings',
    HELP: 'help',
    CREDITS: 'credits',
    BACK: 'back'
};

// 独立菜单系统类
class IndependentMenuSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // 菜单状态
        this.currentState = MENU_STATE.HOME;
        this.previousState = null;
        
        // 响应式配置
        this.isMobile = canvas.width < 768;
        this.fontSizes = this.calculateFontSizes();
        
        // 按钮区域缓存
        this.buttonAreas = new Map();
        
        // 动画相关
        this.animationFrame = 0;
        this.animationSpeed = 0.1;
        
        // 事件处理
        this.touchHandlers = new Map();
        this.isInitialized = false;
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化菜单系统
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('🚀 初始化独立菜单系统...');
        
        // 绑定事件处理器
        this.bindEventHandlers();
        
        // 设置初始状态
        this.setState(MENU_STATE.HOME);
        
        this.isInitialized = true;
        console.log('✅ 独立菜单系统初始化完成');
    }
    
    /**
     * 计算响应式字体大小
     */
    calculateFontSizes() {
        const isMobile = this.isMobile;
        return {
            title: isMobile ? 32 : 48,
            subtitle: isMobile ? 18 : 24,
            button: isMobile ? 20 : 24,
            feature: isMobile ? 16 : 18,
            footer: isMobile ? 14 : 16,
            menu: isMobile ? 22 : 28
        };
    }
    
    /**
     * 绑定事件处理器
     */
    bindEventHandlers() {
        // 清除之前的处理器
        this.touchHandlers.clear();
        
        // 绑定触摸事件（抖音小游戏环境）
        if (typeof tt !== 'undefined') {
            tt.onTouchStart(this.handleTouch.bind(this));
            console.log('✅ 抖音小游戏触摸事件绑定完成');
        } else if (typeof window !== 'undefined' && window.addEventListener) {
            this.canvas.addEventListener('click', this.handleClick.bind(this));
            console.log('✅ 浏览器点击事件绑定完成');
        }
        
        // 注册按钮处理器
        this.registerButtonHandlers();
    }
    
    /**
     * 注册按钮事件处理器
     */
    registerButtonHandlers() {
        // 开始游戏按钮
        this.touchHandlers.set(BUTTON_TYPE.START_GAME, () => {
            console.log('🎮 开始游戏按钮被点击');
            this.onStartGame();
        });
        
        // 返回主菜单按钮
        this.touchHandlers.set(BUTTON_TYPE.RETURN_MAIN, () => {
            console.log('🏠 返回主菜单按钮被点击');
            this.onReturnToMainMenu();
        });
        
        // 继续游戏按钮
        this.touchHandlers.set(BUTTON_TYPE.CONTINUE_GAME, () => {
            console.log('▶️ 继续游戏按钮被点击');
            this.onContinueGame();
        });
        
        // 设置按钮
        this.touchHandlers.set(BUTTON_TYPE.SETTINGS, () => {
            console.log('⚙️ 设置按钮被点击');
            this.setState(MENU_STATE.SETTINGS);
        });
        
        // 帮助按钮
        this.touchHandlers.set(BUTTON_TYPE.HELP, () => {
            console.log('❓ 帮助按钮被点击');
            this.setState(MENU_STATE.HELP);
        });
        
        // 制作人员按钮
        this.touchHandlers.set(BUTTON_TYPE.CREDITS, () => {
            console.log('👥 制作人员按钮被点击');
            this.setState(MENU_STATE.CREDITS);
        });
        
        // 重置按钮
        this.touchHandlers.set(BUTTON_TYPE.RESET, () => {
            console.log('🔄 重置按钮被点击');
            this.onReset();
        });
        
        // 返回按钮
        this.touchHandlers.set(BUTTON_TYPE.BACK, () => {
            console.log('⬅️ 返回按钮被点击');
            this.goBack();
        });
    }
    
    /**
     * 处理触摸事件
     */
    handleTouch(e) {
        if (!e.touches || !e.touches[0]) return;
        
        const touch = e.touches[0];
        const x = touch.clientX || touch.pageX || 0;
        const y = touch.clientY || touch.pageY || 0;
        
        this.processClick(x, y);
    }
    
    /**
     * 处理点击事件
     */
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.processClick(x, y);
    }
    
    /**
     * 处理点击逻辑
     */
    processClick(x, y) {
        console.log('🖱️ 菜单点击事件:', x, y);
        
        // 检查死亡弹框按钮点击
        if (this.deathButtonAreas) {
            if (this.isPointInArea(x, y, this.deathButtonAreas.restart)) {
                console.log('🔄 重新开始按钮被点击');
                this.onRestartGame();
                return true;
            }
            
            if (this.isPointInArea(x, y, this.deathButtonAreas.menu)) {
                console.log('🏠 返回主菜单按钮被点击');
                this.onReturnToMainMenu();
                return true;
            }
        }
        
        // 检查按钮点击
        for (const [buttonType, area] of this.buttonAreas) {
            if (this.isPointInArea(x, y, area)) {
                const handler = this.touchHandlers.get(buttonType);
                if (handler) {
                    handler();
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * 检查点是否在区域内
     */
    isPointInArea(x, y, area) {
        return x >= area.x && x <= area.x + area.width &&
               y >= area.y && y <= area.y + area.height;
    }
    
    /**
     * 设置菜单状态
     */
    setState(newState) {
        if (this.currentState === newState) return;
        
        this.previousState = this.currentState;
        this.currentState = newState;
        
        console.log(`🔄 菜单状态切换: ${this.previousState} -> ${this.currentState}`);
        
        // 清除按钮区域缓存
        this.buttonAreas.clear();
        
        // 立即渲染新状态
        this.render();
    }
    
    /**
     * 返回上一个状态
     */
    goBack() {
        if (this.previousState) {
            this.setState(this.previousState);
        } else {
            this.setState(MENU_STATE.HOME);
        }
    }
    
    /**
     * 渲染菜单
     */
    render() {
        if (!this.canvas || !this.ctx) {
            console.error('❌ 菜单系统未正确初始化');
            return;
        }
        
        // 根据当前状态渲染
        switch (this.currentState) {
            case MENU_STATE.HOME:
                this.renderHomePage();
                break;
            case MENU_STATE.GAME_MENU:
                this.renderGameMenu();
                break;
            case MENU_STATE.SETTINGS:
                this.renderSettingsPage();
                break;
            case MENU_STATE.HELP:
                this.renderHelpPage();
                break;
            case MENU_STATE.CREDITS:
                this.renderCreditsPage();
                break;
            default:
                this.renderHomePage();
        }
    }
    
    /**
     * 渲染主页面
     */
    renderHomePage() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 清空画布
        this.clearCanvas();
        
        // 渲染背景
        this.renderBackgroundGradient();
        this.renderSandboxBackground();
        this.renderCuteZombieDecorations();
        
        // 渲染标题
        this.renderGameTitle(centerX, centerY);
        
        // 渲染按钮
        this.renderHomeButtons(centerX, centerY);
        
        // 渲染底部信息
        this.renderHomeFooter(centerX);
        
        console.log('✅ 主页面渲染完成');
    }
    
    /**
     * 渲染游戏内菜单
     */
    renderGameMenu() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 清空画布
        this.clearCanvas();
        
        // 半透明背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 菜单标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold ' + this.fontSizes.menu + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('游戏菜单', centerX, centerY - 120);
        
        // 渲染按钮
        this.renderGameMenuButtons(centerX, centerY);
        
        console.log('✅ 游戏内菜单渲染完成');
    }
    
    /**
     * 渲染设置页面
     */
    renderSettingsPage() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 清空画布
        this.clearCanvas();
        
        // 背景
        this.renderBackgroundGradient();
        
        // 标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold ' + this.fontSizes.title + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⚙️ 设置', centerX, centerY - 150);
        
        // 设置选项（占位符）
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = this.fontSizes.subtitle + 'px Arial';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('设置功能开发中...', centerX, centerY);
        
        // 返回按钮
        this.renderBackButton(centerX, centerY + 100);
        
        console.log('✅ 设置页面渲染完成');
    }
    
    /**
     * 渲染帮助页面
     */
    renderHelpPage() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 清空画布
        this.clearCanvas();
        
        // 背景
        this.renderBackgroundGradient();
        
        // 标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold ' + this.fontSizes.title + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('❓ 帮助', centerX, centerY - 150);
        
        // 帮助内容
        const helpText = [
            '🎮 使用触摸摇杆控制角色移动',
            '🧟 躲避或攻击僵尸',
            '👥 收集伙伴形成团队',
            '🌍 在城市中探索生存'
        ];
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = this.fontSizes.subtitle + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        helpText.forEach((text, index) => {
            const y = centerY - 50 + index * 40;
            this.ctx.fillText(text, centerX, y);
        });
        
        // 返回按钮
        this.renderBackButton(centerX, centerY + 150);
        
        console.log('✅ 帮助页面渲染完成');
    }
    
    /**
     * 渲染制作人员页面
     */
    renderCreditsPage() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 清空画布
        this.clearCanvas();
        
        // 背景
        this.renderBackgroundGradient();
        
        // 标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold ' + this.fontSizes.title + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('👥 制作人员', centerX, centerY - 150);
        
        // 制作人员信息
        const credits = [
            '🎨 美术设计: AI助手',
            '💻 程序开发: AI助手',
            '🎵 音效设计: AI助手',
            '📝 游戏策划: AI助手'
        ];
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = this.fontSizes.subtitle + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        credits.forEach((text, index) => {
            const y = centerY - 50 + index * 40;
            this.ctx.fillText(text, centerX, y);
        });
        
        // 返回按钮
        this.renderBackButton(centerX, centerY + 150);
        
        console.log('✅ 制作人员页面渲染完成');
    }
    
    /**
     * 渲染背景渐变
     */
    renderBackgroundGradient() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#2d1b69');
        gradient.addColorStop(0.3, '#11998e');
        gradient.addColorStop(0.7, '#38ef7d');
        gradient.addColorStop(1, '#2d1b69');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * 渲染沙盒背景
     */
    renderSandboxBackground() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const gridSize = this.isMobile ? 30 : 40;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    /**
     * 渲染可爱的僵尸装饰
     */
    renderCuteZombieDecorations() {
        const margin = this.isMobile ? 40 : 60;
        const size = this.isMobile ? 20 : 30;
        
        // 左上角装饰
        this.ctx.fillStyle = 'rgba(255, 87, 51, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(margin, margin, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 右上角装饰
        this.ctx.fillStyle = 'rgba(255, 87, 51, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - margin, margin + 20, size + 5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * 渲染游戏标题
     */
    renderGameTitle(centerX, centerY) {
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        this.ctx.shadowBlur = 25;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold ' + this.fontSizes.title + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const titleY = this.isMobile ? centerY - 80 : centerY - 120;
        this.ctx.fillText('🧟 Q版僵尸沙盒', centerX, titleY);
        
        // 副标题
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.font = 'bold ' + this.fontSizes.subtitle + 'px Arial';
        const subtitleY = this.isMobile ? centerY - 50 : centerY - 80;
        this.ctx.fillText('🏗️ 生存 • 冒险', centerX, subtitleY);
        this.ctx.restore();
    }
    
    /**
     * 渲染主页面按钮
     */
    renderHomeButtons(centerX, centerY) {
        // 计算按钮位置，确保完全居中
        const totalButtonHeight = (this.isMobile ? 50 : 60) * 2 + (this.isMobile ? 70 : 80);
        const startY = centerY + (this.isMobile ? 30 : 50);
        
        // 开始游戏按钮
        this.renderButton(
            centerX, startY,
            this.isMobile ? 200 : 280,
            this.isMobile ? 50 : 60,
            '开始游戏',
            '#4CAF50',
            BUTTON_TYPE.START_GAME
        );
        
        // 重置按钮
        this.renderButton(
            centerX, startY + (this.isMobile ? 70 : 80),
            this.isMobile ? 200 : 280,
            this.isMobile ? 50 : 60,
            '重置',
            '#f44336',
            BUTTON_TYPE.RESET
        );
    }
    
    /**
     * 渲染游戏内菜单按钮
     */
    renderGameMenuButtons(centerX, centerY) {
        // 返回主菜单按钮
        this.renderButton(
            centerX, centerY - 20,
            200, 50,
            '返回主菜单',
            '#e74c3c',
            BUTTON_TYPE.RETURN_MAIN
        );
        
        // 继续游戏按钮
        this.renderButton(
            centerX, centerY + 60,
            200, 50,
            '继续游戏',
            '#27ae60',
            BUTTON_TYPE.CONTINUE_GAME
        );
    }
    
    /**
     * 渲染返回按钮
     */
    renderBackButton(centerX, centerY) {
        this.renderButton(
            centerX, centerY,
            150, 40,
            '返回',
            '#607D8B',
            BUTTON_TYPE.BACK
        );
    }
    
    /**
     * 渲染通用按钮
     */
    renderButton(centerX, centerY, width, height, text, color, buttonType) {
        const buttonX = centerX - width / 2;
        const buttonY = centerY - height / 2;
        
        // 按钮背景
        const gradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.darkenColor(color, 0.2));
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(buttonX, buttonY, width, height);
        
        // 按钮边框
        this.ctx.strokeStyle = this.darkenColor(color, 0.3);
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(buttonX, buttonY, width, height);
        
        // 按钮文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold ' + this.fontSizes.button + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, centerX, centerY);
        
        // 保存按钮区域
        this.buttonAreas.set(buttonType, {
            x: buttonX,
            y: buttonY,
            width: width,
            height: height
        });
    }
    
    /**
     * 渲染底部信息
     */
    renderHomeFooter(centerX) {
        const footerY = this.canvas.height - 40;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = this.fontSizes.footer + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('开始游戏或重置当前进度', centerX, footerY);
    }
    
    /**
     * 清除画布
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * 颜色变暗
     */
    darkenColor(color, factor) {
        // 简单的颜色变暗实现
        const colors = {
            '#4CAF50': '#45a049',
            '#2196F3': '#1976D2',
            '#FF9800': '#F57C00',
            '#9C27B0': '#7B1FA2',
            '#e74c3c': '#c0392b',
            '#27ae60': '#229954',
            '#607D8B': '#455A64',
            '#f44336': '#d32f2f'
        };
        return colors[color] || color;
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        this.ctx.save();
        
        // 绘制错误背景
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制错误文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('错误: ' + message, this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.restore();
        
        // 3秒后恢复
        setTimeout(() => {
            this.render();
        }, 3000);
    }
    
    /**
     * 设置响应式配置
     */
    setResponsive(isMobile) {
        this.isMobile = isMobile;
        this.fontSizes = this.calculateFontSizes();
    }
    
    /**
     * 获取当前状态
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * 检查是否为游戏内菜单
     */
    isGameMenu() {
        return this.currentState === MENU_STATE.GAME_MENU;
    }
    
    // ==================== 事件回调方法 ====================
    
    /**
     * 开始游戏回调
     */
    onStartGame() {
        console.log('🎮 独立菜单系统: 开始游戏');
        
        // 通过全局函数调用游戏开始
        if (typeof window.startGame === 'function') {
            window.startGame();
        } else {
            this.showError('游戏系统未准备好，请刷新页面重试');
        }
    }
    
    /**
     * 返回主菜单回调
     */
    onReturnToMainMenu() {
        console.log('🏠 独立菜单系统: 返回主菜单');
        
        // 清除死亡弹框状态
        this.deathButtonAreas = null;
        
        // 通过全局函数调用重置游戏
        if (typeof window.resetGame === 'function') {
            window.resetGame();
        } else {
            this.setState(MENU_STATE.HOME);
        }
    }
    
    /**
     * 继续游戏回调
     */
    onContinueGame() {
        console.log('▶️ 独立菜单系统: 继续游戏');
        
        // 隐藏菜单，继续游戏
        if (typeof window.hideGameMenu === 'function') {
            window.hideGameMenu();
        } else {
            this.showError('继续游戏功能未准备好');
        }
    }
    
    /**
     * 重置游戏回调
     */
    onReset() {
        console.log('🔄 独立菜单系统: 环境重置');
        
        // 通过全局函数调用环境重置
        if (typeof window.resetGame === 'function') {
            window.resetGame();
        } else {
            this.showError('重置功能未准备好');
        }
    }
    
    /**
     * 重新开始游戏回调
     */
    onRestartGame() {
        console.log('🔄 独立菜单系统: 重新开始游戏');
        
        // 清除死亡弹框状态
        this.deathButtonAreas = null;
        
        // 通过全局函数调用重置游戏
        if (typeof window.resetGame === 'function') {
            window.resetGame();
        } else {
            this.showError('重置功能未准备好');
        }
    }
    
    /**
     * 显示重置确认信息
     */
    showResetConfirmation() {
        this.ctx.save();
        
        // 绘制确认背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制确认文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🔄 正在环境重置...', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        this.ctx.fillStyle = '#FFEB3B';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('销毁所有对象，重置游戏环境', this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        this.ctx.restore();
    }
    
    /**
     * 显示死亡消息
     */
    showDeathMessage() {
        this.ctx.save();
        
        // 绘制死亡背景
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制死亡文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('💀 主人物已死亡', this.canvas.width / 2, this.canvas.height / 2 - 60);
        
        this.ctx.fillStyle = '#FFEB3B';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('是否重新开始游戏？', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        // 绘制按钮区域
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonY = this.canvas.height / 2 + 20;
        
        // 重新开始按钮
        const restartX = this.canvas.width / 2 - buttonWidth - 20;
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(restartX, buttonY, buttonWidth, buttonHeight);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('重新开始', restartX + buttonWidth / 2, buttonY + buttonHeight / 2);
        
        // 返回主菜单按钮
        const menuX = this.canvas.width / 2 + 20;
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(menuX, buttonY, buttonWidth, buttonHeight);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('主菜单', menuX + buttonWidth / 2, buttonY + buttonHeight / 2);
        
        // 存储按钮区域用于点击检测
        this.deathButtonAreas = {
            restart: { x: restartX, y: buttonY, width: buttonWidth, height: buttonHeight },
            menu: { x: menuX, y: buttonY, width: buttonWidth, height: buttonHeight }
        };
        
        this.ctx.restore();
    }
    
    /**
     * 销毁菜单系统
     */
    destroy() {
        console.log('🗑️ 销毁独立菜单系统');
        
        // 清除事件处理器
        this.touchHandlers.clear();
        this.buttonAreas.clear();
        
        // 移除事件监听器
        if (typeof tt !== 'undefined') {
            // 抖音小游戏环境，无法直接移除事件监听器
            console.log('抖音小游戏环境，事件监听器将在页面刷新时自动清除');
        } else if (this.canvas) {
            this.canvas.removeEventListener('click', this.handleClick.bind(this));
        }
        
        this.isInitialized = false;
    }
}

// 创建菜单系统实例的工厂函数
function createMenuSystem(canvas, ctx) {
    return new IndependentMenuSystem(canvas, ctx);
}

// 导出
export { 
    IndependentMenuSystem, 
    createMenuSystem, 
    MENU_STATE, 
    BUTTON_TYPE 
};

// 默认导出工厂函数
export default createMenuSystem;