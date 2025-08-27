// 导入模块
import eventPrototype from './src/event.js';
import { MapRenderer } from './src/maps/map-renderer.js';
import MapManager from './src/maps/map-manager.js';
import menuPrototype from './src/menu.js';
import {CharacterManager} from './src/character.js';
import {ZombieManager} from './src/zombie.js';
import GameEngine from './src/game-engine.js';
import ViewSystem from './src/view.js';
import CollisionSystem from './src/collision.js';

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

    // 将视觉系统设置为全局变量，供游戏引擎使用
    window.ViewSystem = ViewSystem;

    gameEngine = new GameEngine(canvas, ctx);


    // 初始化菜单系统
    menuSystem = Object.create(menuPrototype);
    menuSystem.canvas = canvas;
    menuSystem.ctx = ctx;

    // 将menuSystem设置到全局作用域，供事件系统使用
    window.menuSystem = menuSystem;

    // 初始化事件系统
    eventSystem = Object.create(eventPrototype);
    eventSystem.init(canvas, 'home');
    eventSystem.bindTouchEvents();

    // 更新全局变量
    window.eventSystem = eventSystem;
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

};

// 初始化地图系统
function initMapSystem() {
    // 首先初始化地图管理器
    try {
        // 初始化地图管理器
        MapManager.init('city');
        console.log('✅ 地图管理器初始化成功');
        
        // 将MapManager设置为全局变量，供其他模块使用
        if (typeof window !== 'undefined') {
            window.MapManager = MapManager;
            console.log('✅ 地图管理器已设置为全局变量');
        }
        
        // 创建地图渲染器
        mapSystem = new MapRenderer(canvas, ctx);
        console.log('✅ 新地图渲染器初始化成功');
        
    } catch (error) {
        console.warn('⚠️ 新地图系统初始化失败，使用最小化系统:', error);
        // 创建最小化的地图系统
        mapSystem = {
            mapWidth: 4000,
            mapHeight: 4000,
            buildings: [],
            walkableAreas: [],
            render: function() {
                console.log('最小化地图系统渲染');
            }
        };
        console.log('✅ 最小化地图系统初始化成功');
    }

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

    // 使用新的安全位置生成方法
    var safePos = collisionSystem.generateGameSafePosition(spawnX, spawnY, 100, 200, 32, 48, true);
    spawnX = safePos.x;
    spawnY = safePos.y;
    console.log('找到安全位置:', spawnX, spawnY);

    var mainChar = characterManager.createMainCharacter(spawnX, spawnY);

    // 将主人物添加到碰撞系统的动态四叉树
    if (collisionSystem && collisionSystem.addDynamicObject) {
        collisionSystem.addDynamicObject(mainChar);
        console.log('主人物已添加到碰撞系统动态四叉树');
    }

    // 将角色管理器设置到地图系统
    mapSystem.characterManager = characterManager;

    // 设置游戏引擎的系统引用
    gameEngine.setSystems(mapSystem, characterManager, menuSystem, eventSystem, zombieManager, collisionSystem);

    // 切换到游戏状态
    gameEngine.setGameState('playing');

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

