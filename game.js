// 导入模块
import eventPrototype from './src/event.js';
import mapPrototype from './src/map.js';
import menuPrototype from './src/menu.js';
import { CharacterManager } from './src/character.js';
import { ZombieManager } from './src/zombie.js';
import GameEngine from './src/game-engine.js';
import ViewSystem from './src/view.js';
import CollisionSystem from './src/collision.js';

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

let gameEngine = null;
let mapSystem = null;
let eventSystem = null;
let menuSystem = null;
let characterManager = null;
let collisionSystem = null;

// 将关键变量设置为全局变量，供事件系统使用
window.mapSystem = mapSystem;
window.eventSystem = eventSystem;
window.menuSystem = menuSystem;

function initGame() {
    console.log('游戏初始化开始');
    console.log('GameEngine类:', typeof GameEngine);
    console.log('canvas:', canvas);
    console.log('ctx:', ctx);
    
    // 初始化游戏引擎
    try {
        // 将视觉系统设置为全局变量，供游戏引擎使用
        window.ViewSystem = ViewSystem;
        
        gameEngine = new GameEngine(canvas, ctx);
        console.log('游戏引擎初始化成功');
        console.log('gameEngine对象:', gameEngine);
        console.log('gameEngine.gameState:', gameEngine.gameState);
    } catch (error) {
        console.error('游戏引擎初始化失败:', error);
        console.error('错误详情:', error.stack);
    }

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
        eventSystem.init(canvas, 'home');
        eventSystem.bindTouchEvents();

        // 更新全局变量
        window.eventSystem = eventSystem;

    } catch (error) {
        console.error('事件系统初始化失败:', error);
    }

    // 更新全局变量
    window.gameEngine = gameEngine;
    window.mapSystem = mapSystem;
    window.characterManager = characterManager;

    console.log('游戏初始化完成');
}

// 游戏状态改变回调
window.onGameStateChange = function (newState) {
    // 使用游戏引擎管理状态
    if (gameEngine) {
        gameEngine.setGameState(newState);
        
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
        }
    }

    console.log('=== 状态改变回调完成 ===');
};

// 初始化地图系统
function initMapSystem() {
    try {
        mapSystem = mapPrototype.createMapSystem(canvas, ctx);
        
        // 初始化角色管理器
        characterManager = Object.create(CharacterManager);
        
        // 初始化僵尸管理器
        var zombieManager = Object.create(ZombieManager);
        
        // 初始化碰撞检测系统
        collisionSystem = Object.create(CollisionSystem);
        collisionSystem.init();
        window.collisionSystem = collisionSystem;
        
        // 在摄像机附近创建主人物（更容易看到）
        var spawnX = 8000, spawnY = 7500;
        
        // 检查生成位置是否在建筑物内
        if (collisionSystem.isObjectInBuilding(spawnX, spawnY, 32, 48)) {
            console.log('主人物生成位置在建筑物内，寻找安全位置');
            var safePos = collisionSystem.findSafePosition(spawnX, spawnY, 100, 200, 32, 48);
            spawnX = safePos.x;
            spawnY = safePos.y;
            console.log('找到安全位置:', spawnX, spawnY);
        }
        
        var mainChar = characterManager.createMainCharacter(spawnX, spawnY);
        
        // 将角色管理器设置到地图系统
        mapSystem.characterManager = characterManager;
        
        // 设置游戏引擎的系统引用
        gameEngine.setSystems(mapSystem, characterManager, menuSystem, eventSystem, zombieManager, collisionSystem);
        
        // 切换到游戏状态
        gameEngine.setGameState('playing');
        
        console.log('主人物已创建在摄像机附近:', 8000, 7500);
        console.log('游戏引擎系统已设置');
        console.log('主人物对象:', mainChar);
        console.log('角色管理器中的角色数量:', characterManager.getAllCharacters().length);
        console.log('地图系统的角色管理器:', mapSystem.characterManager);
        console.log('僵尸管理器已初始化');
        
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
    // 添加调试信息
    if (!gameEngine) {
        console.warn('游戏引擎未初始化');
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // 暂时使用原来的渲染逻辑，确保游戏能正常运行
    if (gameEngine.gameState === 'home') {
        // 调用src/menu.js中的renderHomePage方法
        if (menuSystem && menuSystem.renderHomePage) {
            menuSystem.renderHomePage();
        } else {
            console.warn('menuSystem或renderHomePage方法不存在');
        }
    } else if (gameEngine.gameState === 'playing') {
        // 使用游戏引擎的更新和渲染方法
        gameEngine.update();
        gameEngine.render();
    } else if (gameEngine.gameState === 'menu') {
        // 调用src/menu.js中的renderMenu方法
        if (menuSystem && menuSystem.renderMenu) {
            menuSystem.renderMenu();
        } else {
            console.warn('menuSystem或renderMenu方法不存在');
        }
    }
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    initGame();
    gameLoop();
}

startGame();

