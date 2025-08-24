// 导入模块
import eventPrototype from './src/event.js';
import mapPrototype from './src/map.js';
import menuPrototype from './src/menu.js';

console.log('=== 模块导入状态 ===');
console.log('eventPrototype导入成功:', !!eventPrototype);
console.log('mapPrototype导入成功:', !!mapPrototype);
console.log('menuPrototype导入成功:', !!menuPrototype);
console.log('menuPrototype内容:', menuPrototype);
console.log('==================');

let systemInfo = tt.getSystemInfoSync();
let canvas = tt.createCanvas(), ctx = canvas.getContext('2d');
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

let gameState = 'home'; // 'home', 'playing', 'menu'
let mapSystem = null;
let eventSystem = null;
let menuSystem = null;

// 将关键变量设置为全局变量，供事件系统使用
window.gameState = gameState;
window.mapSystem = mapSystem;
window.eventSystem = eventSystem;
window.menuSystem = menuSystem;

function initGame() {
    console.log('游戏初始化开始');
    console.log('menuPrototype存在:', !!menuPrototype);
    console.log('menuPrototype内容:', menuPrototype);
    console.log('menuPrototype.checkHomeButtonClick方法存在:', !!(menuPrototype && menuPrototype.checkHomeButtonClick));
    
    // 初始化菜单系统
    try {
        menuSystem = Object.create(menuPrototype);
        menuSystem.canvas = canvas;
        menuSystem.ctx = ctx;
        console.log('菜单系统初始化成功');
        console.log('menuSystem对象:', menuSystem);
        console.log('menuSystem.checkHomeButtonClick方法存在:', !!(menuSystem && menuSystem.checkHomeButtonClick));
        
        // 将menuSystem设置到全局作用域，供事件系统使用
        window.menuSystem = menuSystem;
        console.log('menuSystem已设置到全局作用域:', !!window.menuSystem);
        console.log('全局menuSystem.checkHomeButtonClick方法存在:', !!(window.menuSystem && window.menuSystem.checkHomeButtonClick));
        
    } catch (error) {
        console.error('菜单系统初始化失败:', error);
    }
    
    // 初始化事件系统
    try {
        eventSystem = Object.create(eventPrototype);
        eventSystem.init(canvas, gameState);
        eventSystem.bindTouchEvents();
        console.log('事件系统初始化成功');
        
        // 更新全局变量
        window.eventSystem = eventSystem;
        console.log('eventSystem已设置到全局作用域:', !!window.eventSystem);
        
    } catch (error) {
        console.error('事件系统初始化失败:', error);
    }
    
    // 更新全局变量
    window.gameState = gameState;
    window.mapSystem = mapSystem;
    
    console.log('游戏初始化完成');
}

// 游戏状态改变回调
window.onGameStateChange = function(newState) {
    console.log('=== 游戏状态改变回调被调用 ===');
    console.log('当前状态:', gameState);
    console.log('新状态:', newState);
    console.log('eventSystem存在:', !!eventSystem);
    console.log('mapSystem存在:', !!mapSystem);
    
    gameState = newState;
    console.log('状态已更新为:', gameState);
    
    // 更新事件系统的游戏状态
    if (eventSystem) {
        console.log('更新事件系统状态');
        eventSystem.gameState = newState;
    } else {
        console.error('eventSystem不存在，无法更新状态');
    }
    
    // 如果切换到游戏状态，初始化地图系统
    if (newState === 'playing' && !mapSystem) {
        console.log('切换到游戏状态，开始初始化地图系统');
        initMapSystem();
    } else if (newState === 'playing' && mapSystem) {
        console.log('地图系统已存在，无需重新初始化');
    }
    
    console.log('=== 状态改变回调完成 ===');
};

// 初始化地图系统
function initMapSystem() {
    console.log('=== 开始初始化地图系统 ===');
    console.log('mapPrototype存在:', !!mapPrototype);
    console.log('createMapSystem方法存在:', !!(mapPrototype && mapPrototype.createMapSystem));
    console.log('canvas存在:', !!canvas);
    console.log('ctx存在:', !!ctx);
    
    try {
        mapSystem = mapPrototype.createMapSystem(canvas, ctx);
        console.log('地图系统创建成功:', mapSystem);
        console.log('地图系统render方法存在:', !!(mapSystem && mapSystem.render));
        console.log('地图系统moveMap方法存在:', !!(mapSystem && mapSystem.moveMap));
        console.log('地图系统checkBuildingClick方法存在:', !!(mapSystem && mapSystem.checkBuildingClick));
        console.log('地图系统初始化成功');
    } catch (error) {
        console.error('地图系统初始化失败:', error);
        showMapSystemError();
    }
    
    console.log('=== 地图系统初始化完成 ===');
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
        renderMenu();
    }
    requestAnimationFrame(gameLoop);
}


function renderMenu() {
    if (menuSystem && menuSystem.renderMenu) {
        menuSystem.renderMenu();
    } else {
        renderDefaultMenu();
    }
}

function startGame() {
    initGame();
    gameLoop();
}

startGame();
