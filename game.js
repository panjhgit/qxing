// 导入模块
import eventPrototype from './src/event.js';
import mapPrototype from './src/map.js';
import menuPrototype from './src/menu.js';
import { CharacterManager } from './src/character.js';

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
let characterManager = null;

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

        // 将menuSystem设置到全局作用域，供事件系统使用
        window.menuSystem = menuSystem;

    } catch (error) {
        console.error('菜单系统初始化失败:', error);
    }

    // 初始化事件系统
    try {
        eventSystem = Object.create(eventPrototype);
        eventSystem.init(canvas, gameState);
        eventSystem.bindTouchEvents();

        // 更新全局变量
        window.eventSystem = eventSystem;

    } catch (error) {
        console.error('事件系统初始化失败:', error);
    }

    // 更新全局变量
    window.gameState = gameState;
    window.mapSystem = mapSystem;
    window.characterManager = characterManager;

    console.log('游戏初始化完成');
}

// 游戏状态改变回调
window.onGameStateChange = function (newState) {

    gameState = newState;

    // 更新事件系统的游戏状态
    if (eventSystem) {
        console.log('更新事件系统状态');
        eventSystem.gameState = newState;
    } else {
        console.error('eventSystem不存在，无法更新状态');
    }

    // 如果切换到游戏状态，初始化地图系统
    if (newState === 'playing' && !mapSystem) {
        initMapSystem();
    } else if (newState === 'playing' && mapSystem) {
    }

    console.log('=== 状态改变回调完成 ===');
};

// 初始化地图系统
function initMapSystem() {
    try {
        mapSystem = mapPrototype.createMapSystem(canvas, ctx);
        
        // 初始化角色管理器
        characterManager = Object.create(CharacterManager);
        
        // 在摄像机附近创建主人物（更容易看到）
        var mainChar = characterManager.createMainCharacter(8000, 7500);
        
        // 将角色管理器设置到地图系统
        mapSystem.characterManager = characterManager;
        
        console.log('主人物已创建在摄像机附近:', 8000, 7500);
        console.log('主人物对象:', mainChar);
        console.log('角色管理器中的角色数量:', characterManager.getAllCharacters().length);
        console.log('地图系统的角色管理器:', mapSystem.characterManager);
        
    } catch (error) {
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
        // 调用src/menu.js中的renderHomePage方法
        if (menuSystem && menuSystem.renderHomePage) {
            menuSystem.renderHomePage();
        }
    } else if (gameState === 'playing') {
        // 调用src/map.js中的render方法
        if (mapSystem && mapSystem.render) {
            mapSystem.render();
        }
    } else if (gameState === 'menu') {
        // 调用src/menu.js中的renderMenu方法
        if (menuSystem && menuSystem.renderMenu) {
            menuSystem.renderMenu();
        }
    }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    initGame();
    gameLoop();
}

startGame();
