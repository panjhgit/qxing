/**
 * 菜单渲染器模块 (view/menu-renderer.js)
 *
 * 功能描述：
 * - 菜单系统渲染：负责渲染首页、按钮、错误信息等
 * - 响应式设计：适配不同屏幕尺寸
 * - 装饰元素渲染：背景网格、装饰圆圈等
 */

/**
 * 菜单渲染器类
 * 负责渲染菜单系统的所有UI元素
 */
export class MenuRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // 响应式配置
        this.isMobile = canvas.width < 768;
        
        // 字体大小配置
        this.fontSizes = this.calculateFontSizes();
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
            footer: isMobile ? 14 : 16
        };
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
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
        }
    }

    /**
     * 渲染首页
     */
    renderHomePage() {
        if (!this.canvas || !this.ctx) {
            console.error('❌ 菜单渲染器未正确初始化');
            return;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 背景渐变
        this.renderBackgroundGradient();

        // 绘制Q版沙盒背景元素
        this.renderSandboxBackground();

        // 绘制可爱的僵尸装饰
        this.renderCuteZombieDecorations();

        // 游戏标题
        this.renderGameTitle(centerX, centerY);

        // 开始游戏按钮
        this.renderHomeStartButton(centerX, centerY);

        // 底部信息
        this.renderHomeFooter(centerX);

        console.log('✅ 首页渲染完成');
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
        // 绘制网格地面
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        // 根据屏幕尺寸调整网格大小
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
     * @param {number} centerX - 中心X坐标
     * @param {number} centerY - 中心Y坐标
     */
    renderGameTitle(centerX, centerY) {
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        this.ctx.shadowBlur = 25;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold ' + this.fontSizes.title + 'px Arial';
        this.ctx.textAlign = 'center';

        // 手机屏幕上的标题位置调整
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
     * 渲染开始游戏按钮
     * @param {number} centerX - 中心X坐标
     * @param {number} centerY - 中心Y坐标
     */
    renderHomeStartButton(centerX, centerY) {
        const buttonWidth = this.isMobile ? 200 : 280;
        const buttonHeight = this.isMobile ? 50 : 60;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = centerY + (this.isMobile ? 20 : 40);

        // 按钮背景
        const buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        buttonGradient.addColorStop(0, '#4CAF50');
        buttonGradient.addColorStop(1, '#45a049');
        this.ctx.fillStyle = buttonGradient;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // 按钮边框
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // 按钮文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold ' + this.fontSizes.button + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('开始游戏', centerX, buttonY + buttonHeight / 2 + 8);

        // 按钮阴影效果
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 5;
    }

    /**
     * 渲染底部信息
     * @param {number} centerX - 中心X坐标
     */
    renderHomeFooter(centerX) {
        const footerY = this.canvas.height - 40;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = this.fontSizes.footer + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('点击开始游戏按钮进入沙盒世界', centerX, footerY);
    }

    /**
     * 渲染游戏特性
     * @param {number} centerX - 中心X坐标
     */
    renderGameFeatures(centerX) {
        const features = [
            '🧟 可爱的Q版僵尸',
            '🏗️ 建造和生存',
            '👥 团队合作',
            '🌍 开放世界'
        ];

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold ' + this.fontSizes.feature + 'px Arial';
        this.ctx.textAlign = 'center';

        const startY = this.canvas.height / 2 + 120;
        const lineHeight = this.fontSizes.feature + 10;

        features.forEach((feature, index) => {
            const y = startY + index * lineHeight;
            this.ctx.fillText(feature, centerX, y);
        });
    }

    /**
     * 渲染背景网格
     */
    renderBackgroundGrid() {
        this.ctx.strokeStyle = 'rgba(255, 87, 51, 0.1)';
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
     * 渲染装饰元素
     */
    renderDecorations() {
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
     * 清除画布
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 设置响应式配置
     * @param {boolean} isMobile - 是否为移动设备
     */
    setResponsive(isMobile) {
        this.isMobile = isMobile;
        this.fontSizes = this.calculateFontSizes();
    }

    /**
     * 获取开始游戏按钮区域
     * @returns {Object} 按钮区域信息
     */
    getStartButtonArea() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const buttonWidth = this.isMobile ? 180 : 200;
        const buttonHeight = this.isMobile ? 50 : 60;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = this.isMobile ? centerY + 10 : centerY + 20;

        return {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }

    /**
     * 渲染游戏内菜单
     */
    renderGameMenu() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

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
    }

    /**
     * 渲染返回主菜单按钮
     * @param {number} centerX - 中心X坐标
     * @param {number} centerY - 中心Y坐标
     */
    renderReturnToMainMenuButton(centerX, centerY) {
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = centerY - 25;

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
    }

    /**
     * 渲染继续游戏按钮
     * @param {number} centerX - 中心X坐标
     * @param {number} centerY - 中心Y坐标
     */
    renderContinueGameButton(centerX, centerY) {
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = centerY - 25;

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
    }

    /**
     * 获取返回主菜单按钮区域
     * @returns {Object} 按钮区域信息
     */
    getReturnToMainMenuButtonArea() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = centerY - 25;

        return {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }

    /**
     * 获取继续游戏按钮区域
     * @returns {Object} 按钮区域信息
     */
    getContinueGameButtonArea() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 + 80;
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = centerY - 25;

        return {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }
}

export default MenuRenderer;
