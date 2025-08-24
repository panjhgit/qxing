// 导入模块
import eventPrototype from './src/event.js';
import mapPrototype from './src/map.js';
import menuPrototype from './src/menu.js';

let systemInfo = tt.getSystemInfoSync();
let canvas = tt.createCanvas(), ctx = canvas.getContext('2d');
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

let gameState = 'home'; // 'home', 'playing', 'menu'
let mapSystem = null;
let eventSystem = null;
let menuSystem = null;

function initGame() {
    console.log('游戏初始化开始');
    
    // 初始化菜单系统
    try {
        menuSystem = Object.create(menuPrototype);
        menuSystem.canvas = canvas;
        menuSystem.ctx = ctx;
        console.log('菜单系统初始化成功');
    } catch (error) {
        console.error('菜单系统初始化失败:', error);
    }
    
    // 初始化事件系统
    try {
        eventSystem = Object.create(eventPrototype);
        eventSystem.init(canvas, gameState);
        eventSystem.bindTouchEvents();
        console.log('事件系统初始化成功');
    } catch (error) {
        console.error('事件系统初始化失败:', error);
    }
    
    console.log('游戏初始化完成');
}

// 游戏状态改变回调
window.onGameStateChange = function(newState) {
    console.log('游戏状态改变:', gameState, '->', newState);
    gameState = newState;
    
    // 更新事件系统的游戏状态
    if (eventSystem) {
        eventSystem.gameState = newState;
    }
    
    // 如果切换到游戏状态，初始化地图系统
    if (newState === 'playing' && !mapSystem) {
        initMapSystem();
    }
};

// 初始化地图系统
function initMapSystem() {
    try {
        mapSystem = mapPrototype.createMapSystem(canvas, ctx);
        console.log('地图系统初始化成功');
    } catch (error) {
        console.error('地图系统初始化失败:', error);
        showMapSystemError();
    }
}

// 显示地图系统错误信息
function showMapSystemError() {
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('地图系统加载失败', canvas.width / 2, canvas.height / 2);
    ctx.fillText('请检查map.js文件是否正确加载', canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText('确保文件路径和语法正确', canvas.width / 2, canvas.height / 2 + 60);
}

function gameLoop() {
    if (gameState === 'home') {
        renderHomePage();
    } else if (gameState === 'playing') {
        renderGame();
    } else if (gameState === 'menu') {
        renderMenu();
    }
    
    requestAnimationFrame(gameLoop);
}

function renderHomePage() {
    if (menuSystem && menuSystem.renderHomePage) {
        menuSystem.renderHomePage();
    } else {
        renderDefaultHomePage();
    }
}

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
}

function renderStartButton(centerX, centerY) {
    var buttonWidth = 200;
    var buttonHeight = 60;
    var buttonX = centerX - buttonWidth / 2;
    var buttonY = centerY - buttonHeight / 2;
    
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
}

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

function renderGame() {
    if (mapSystem && mapSystem.render) {
        mapSystem.render();
    }
    renderBackButton();
}

function renderBackButton() {
    var buttonWidth = 120;
    var buttonHeight = 40;
    var buttonX = 20;
    var buttonY = 20;
    
    // 按钮背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 按钮边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 按钮文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('返回首页', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);
}

function renderMenu() {
    if (menuSystem && menuSystem.renderMenu) {
        menuSystem.renderMenu();
    } else {
        renderDefaultMenu();
    }
}

function renderDefaultMenu() {
    var centerX = canvas.width / 2;
    
    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.shadowColor = 'rgba(255, 87, 51, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff5733';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('末日Q行', centerX, 120);
    
    ctx.strokeStyle = '#ff5733';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 100, 140);
    ctx.lineTo(centerX + 100, 140);
    ctx.stroke();
    ctx.restore();
    
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('生存至100天的挑战', centerX, 170);
}

function startGame() {
    initGame();
    gameLoop();
}

startGame();
