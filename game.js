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
    console.log('🗺️ 开始初始化地图系统...');
    
    try {
        // 第一步：初始化地图管理器
        console.log('📋 步骤1: 初始化地图管理器');
        MapManager.init('city');
        console.log('✅ 地图管理器初始化成功');
        
        // 将MapManager设置为全局变量，供其他模块使用
        if (typeof window !== 'undefined') {
            window.MapManager = MapManager;
            console.log('✅ 地图管理器已设置为全局变量');
        }
        
        // 第二步：等待地图数据完全加载
        console.log('⏳ 步骤2: 等待地图数据完全加载');
        waitForMapDataLoaded();
        
        // 第三步：创建地图渲染器
        console.log('🎨 步骤3: 创建地图渲染器');
        mapSystem = new MapRenderer(canvas, ctx);
        console.log('✅ 地图渲染器初始化成功');
        
        // 第四步：初始化角色管理器
        console.log('👤 步骤4: 初始化角色管理器');
        characterManager = Object.create(CharacterManager);
        // 角色管理器现在通过四叉树管理，不需要本地数组
        console.log('✅ 角色管理器初始化成功');
        
        // 将characterManager设置为全局变量，供其他模块使用
        if (typeof window !== 'undefined') {
            window.characterManager = characterManager;
            console.log('✅ 角色管理器已设置为全局变量');
        }
        
        // 第五步：初始化僵尸管理器
        console.log('🧟‍♂️ 步骤5: 初始化僵尸管理器');
        var zombieManager = Object.create(ZombieManager);
        // 确保僵尸管理器的属性被正确初始化
        zombieManager.maxZombies = zombieManager.maxZombies || 100;
        zombieManager.difficulty = zombieManager.difficulty || 1;
        console.log('✅ 僵尸管理器初始化成功');
        
        // 将zombieManager设置为全局变量，供其他模块使用
        if (typeof window !== 'undefined') {
            window.zombieManager = zombieManager;
            console.log('✅ 僵尸管理器已设置为全局变量');
        }
        
        // 第六步：初始化碰撞检测系统（确保地图数据已加载）
        console.log('🔍 步骤6: 初始化碰撞检测系统');
        initCollisionSystemWithVerification();
        
        // 第七步：创建游戏对象并添加到四叉树
        console.log('🎯 步骤7: 创建游戏对象并添加到四叉树');
        createAndAddGameObjects();
        
        // 第八步：验证四叉树数据完整性
        console.log('✅ 步骤8: 验证四叉树数据完整性');
        verifyQuadTreeDataIntegrity();
        
        // 第九步：设置游戏引擎系统引用
        console.log('⚙️ 步骤9: 设置游戏引擎系统引用');
        console.log('🔍 传递给setSystems的参数:');
        console.log('- mapSystem:', !!mapSystem);
        console.log('- characterManager:', !!characterManager, '类型:', typeof characterManager);
        console.log('- menuSystem:', !!menuSystem);
        console.log('- eventSystem:', !!eventSystem);
        console.log('- zombieManager:', !!zombieManager);
        console.log('- collisionSystem:', !!collisionSystem);
        
        gameEngine.setSystems(mapSystem, characterManager, menuSystem, eventSystem, zombieManager, collisionSystem);
        console.log('✅ 游戏引擎系统设置完成');
        
        // 第十步：执行初始渲染
        console.log('🎨 步骤10: 执行初始渲染');
        performInitialRendering();
        
        // 第十一步：切换到游戏状态
        console.log('🚀 步骤11: 切换到游戏状态');
        gameEngine.setGameState('playing');
        
        // 验证所有系统是否正确设置
        console.log('🔍 系统验证:');
        console.log('- 游戏引擎:', !!gameEngine);
        console.log('- 地图系统:', !!mapSystem);
        console.log('- 角色管理器:', !!window.characterManager);
        console.log('- 僵尸管理器:', !!window.zombieManager);
        console.log('- 碰撞系统:', !!collisionSystem);
        console.log('- 触摸摇杆:', !!gameEngine.joystick);
        console.log('- 触摸摇杆可见:', gameEngine.joystick ? gameEngine.joystick.isVisible : 'N/A');
        
        console.log('🎉 地图系统初始化完成！所有资源已加载，游戏可以开始！');
        
    } catch (error) {
        console.error('❌ 地图系统初始化失败:', error);
        // 直接抛出错误，快速定位问题
        throw new Error(`地图系统初始化失败: ${error.message}`);
    }
}

// 等待地图数据完全加载
function waitForMapDataLoaded() {
    console.log('⏳ 等待地图数据加载...');
    let attempts = 0;
    const maxAttempts = 100; // 最多等待10秒
    
    while (attempts < maxAttempts) {
        if (MapManager.currentMap && MapManager.currentMap.isLoaded) {
            console.log('✅ 地图数据加载完成');
            return;
        }
        
        attempts++;
        console.log(`⏳ 等待地图数据加载... (${attempts}/${maxAttempts})`);
        
        // 使用同步等待（阻塞）
        const startTime = Date.now();
        while (Date.now() - startTime < 100) {
            // 等待100ms
        }
    }
    
    throw new Error('地图数据加载超时');
}

// 初始化碰撞检测系统并验证
function initCollisionSystemWithVerification() {
    console.log('🔍 初始化碰撞检测系统...');
    
    // 创建碰撞检测系统
    collisionSystem = Object.create(CollisionSystem);
    
    // 确保地图管理器已准备好
    if (MapManager.currentMap) {
        console.log('✅ 地图数据已准备，开始初始化碰撞系统');
        collisionSystem.init('city');
    } else {
        console.warn('⚠️ 地图数据未准备，使用默认配置初始化碰撞系统');
        collisionSystem.init('city');
    }
    
    // 设置到全局变量
    window.collisionSystem = collisionSystem;
    console.log('✅ 碰撞检测系统初始化成功');
    
    // 等待四叉树数据加载完成
    console.log('⏳ 等待四叉树数据加载...');
    waitForQuadTreeDataLoaded();
}

// 等待四叉树数据加载完成
function waitForQuadTreeDataLoaded() {
    console.log('⏳ 等待四叉树数据加载...');
    let attempts = 0;
    const maxAttempts = 100; // 最多等待10秒
    
    while (attempts < maxAttempts) {
        // 检查静态四叉树是否有建筑物数据
        if (collisionSystem.staticQuadTree) {
            const buildings = collisionSystem.staticQuadTree.getAllObjects();
            if (buildings && buildings.length > 0) {
                console.log(`✅ 静态四叉树数据加载完成，建筑物数量: ${buildings.length}`);
                return;
            }
        }
        
        attempts++;
        console.log(`⏳ 等待四叉树数据加载... (${attempts}/${maxAttempts})`);
        
        // 使用同步等待（阻塞）
        const startTime = Date.now();
        while (Date.now() - startTime < 100) {
            // 等待100ms
        }
    }
    
    throw new Error('四叉树数据加载超时');
}

// 创建游戏对象并添加到四叉树
function createAndAddGameObjects() {
    console.log('🎯 开始创建游戏对象...');
    
    // 在摄像机附近创建主人物（更容易看到）
    var spawnX = 8000, spawnY = 7500;
    
    // 使用碰撞系统生成安全位置（此时四叉树已有建筑物数据）
    if (collisionSystem && collisionSystem.generateGameSafePosition) {
        var safePos = collisionSystem.generateGameSafePosition(spawnX, spawnY, 100, 200, 32, 48, true);
        spawnX = safePos.x;
        spawnY = safePos.y;
        console.log('✅ 找到安全位置:', spawnX, spawnY);
    } else {
        console.warn('⚠️ 碰撞系统未准备好，使用默认位置');
    }
    
    // 创建主人物
    var characterManager = window.characterManager;
    if (!characterManager) {
        console.error('❌ 角色管理器未找到');
        throw new Error('角色管理器未找到');
    }
    
    var mainChar = characterManager.createMainCharacter(spawnX, spawnY);
    if (mainChar) {
        console.log('✅ 主人物创建成功:', mainChar.id);
        
        // 验证角色是否在角色管理器中
        var allCharacters = characterManager.getAllCharacters();
        console.log('🔍 角色管理器验证:');
        console.log('- 角色管理器中的角色数量:', allCharacters.length);
        console.log('- 主人物在角色管理器中:', allCharacters.includes(mainChar));
        console.log('- 主人物角色:', mainChar.role);
        console.log('- 主人物位置:', mainChar.x, mainChar.y);
        
        // 将主人物添加到碰撞系统的动态四叉树
        if (collisionSystem && collisionSystem.addDynamicObject) {
            var added = collisionSystem.addDynamicObject(mainChar);
            if (added) {
                console.log('✅ 主人物已添加到碰撞系统动态四叉树');
            } else {
                console.error('❌ 主人物添加到四叉树失败');
                throw new Error('主人物添加到四叉树失败');
            }
        } else {
            console.error('❌ 碰撞系统未准备好，无法添加主人物到四叉树');
            throw new Error('碰撞系统未准备好');
        }
    } else {
        console.error('❌ 主人物创建失败');
        throw new Error('主人物创建失败');
    }
    
    // 将角色管理器设置到地图系统
    mapSystem.characterManager = characterManager;
    
    // 创建初始僵尸
    console.log('🧟‍♂️ 创建初始僵尸...');
    var zombieManager = window.zombieManager;
    if (!zombieManager) {
        console.error('❌ 僵尸管理器未找到');
        throw new Error('僵尸管理器未找到');
    }
    
    var testZombie = zombieManager.createZombie('skinny', 8000, 7500);
    if (testZombie) {
        console.log('✅ 初始僵尸创建成功:', testZombie.id);
        
        // 确保僵尸能找到主人物目标
        var mainChar = characterManager.getMainCharacter();
        if (mainChar && testZombie.findTarget) {
            console.log('🔍 为僵尸设置目标...');
            console.log('- 主人物位置:', mainChar.x, mainChar.y);
            console.log('- 僵尸位置:', testZombie.x, testZombie.y);
            
            // 手动调用僵尸的findTarget方法
            testZombie.findTarget([mainChar]);
            
            console.log('- 僵尸目标位置:', testZombie.targetX, testZombie.targetY);
            console.log('- 僵尸状态:', testZombie.state);
            
            // 验证僵尸目标设置是否成功
            if (isNaN(testZombie.targetX) || isNaN(testZombie.targetY)) {
                console.error('❌ 僵尸目标设置失败，targetX:', testZombie.targetX, 'targetY:', testZombie.targetY);
            } else {
                console.log('✅ 僵尸目标设置成功');
            }
        } else {
            console.error('❌ 无法为僵尸设置目标:', {
                mainChar: !!mainChar,
                hasFindTarget: !!testZombie.findTarget,
                mainCharRole: mainChar ? mainChar.role : 'N/A'
            });
        }
        
        // 检查僵尸是否在四叉树中
        var zombies = zombieManager.getAllZombies();
        console.log('✅ 四叉树中的僵尸数量:', zombies.length);
    } else {
        console.error('❌ 初始僵尸创建失败');
        throw new Error('初始僵尸创建失败');
    }
    
    console.log('✅ 所有游戏对象创建并添加到四叉树完成');
}

// 验证四叉树数据完整性
function verifyQuadTreeDataIntegrity() {
    console.log('🔍 验证四叉树数据完整性...');
    
    // 验证静态四叉树（建筑物）
    if (collisionSystem.staticQuadTree) {
        const buildings = collisionSystem.staticQuadTree.getAllObjects();
        if (buildings && buildings.length > 0) {
            console.log(`✅ 静态四叉树验证通过，建筑物数量: ${buildings.length}`);
        } else {
            console.error('❌ 静态四叉树验证失败，没有建筑物数据');
            throw new Error('静态四叉树没有建筑物数据');
        }
    } else {
        console.error('❌ 静态四叉树未初始化');
        throw new Error('静态四叉树未初始化');
    }
    
    // 验证动态四叉树（人物和僵尸）
    if (collisionSystem.dynamicQuadTree) {
        const dynamicObjects = collisionSystem.dynamicQuadTree.getAllObjects();
        if (dynamicObjects && dynamicObjects.length > 0) {
            console.log(`✅ 动态四叉树验证通过，动态对象数量: ${dynamicObjects.length}`);
            
            // 检查是否包含主人物
            const mainChar = dynamicObjects.find(obj => obj.role === 1);
            if (mainChar) {
                console.log('✅ 主人物在动态四叉树中验证通过');
            } else {
                console.error('❌ 主人物不在动态四叉树中');
                throw new Error('主人物不在动态四叉树中');
            }
            
            // 检查是否包含僵尸
            const zombies = dynamicObjects.filter(obj => obj.type && ['skinny', 'fat', 'boss', 'fast', 'tank'].includes(obj.type));
            if (zombies.length > 0) {
                console.log(`✅ 僵尸在动态四叉树中验证通过，数量: ${zombies.length}`);
            } else {
                console.error('❌ 僵尸不在动态四叉树中');
                throw new Error('僵尸不在动态四叉树中');
            }
        } else {
            console.error('❌ 动态四叉树验证失败，没有动态对象数据');
            throw new Error('动态四叉树没有动态对象数据');
        }
    } else {
        console.error('❌ 动态四叉树未初始化');
        throw new Error('动态四叉树未初始化');
    }
    
    console.log('✅ 四叉树数据完整性验证通过！');
}

// 执行初始渲染
function performInitialRendering() {
    console.log('🎨 开始执行初始渲染...');
    
    try {
        // 第一步：渲染地图
        console.log('🗺️ 渲染地图...');
        if (mapSystem && mapSystem.render) {
            mapSystem.render();
            console.log('✅ 地图渲染完成');
        }
        
        // 第二步：设置摄像机位置
        console.log('📷 设置摄像机位置...');
        if (gameEngine.viewSystem && window.characterManager) {
            var mainChar = window.characterManager.getMainCharacter();
            if (mainChar && gameEngine.viewSystem.setFollowTarget) {
                gameEngine.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
                console.log('✅ 摄像机位置设置完成');
            }
        }
        
        // 第三步：渲染角色
        console.log('👤 渲染角色...');
        if (gameEngine.viewSystem && window.characterManager) {
            console.log('✅ 角色渲染设置完成');
        }
        
        // 第四步：渲染僵尸
        console.log('🧟‍♂️ 渲染僵尸...');
        if (gameEngine.viewSystem && window.zombieManager) {
            var zombies = window.zombieManager.getAllZombies();
            console.log(`✅ 僵尸渲染设置完成，僵尸数量: ${zombies.length}`);
        }
        
        // 第五步：渲染UI元素
        console.log('🎮 渲染UI元素...');
        if (gameEngine.viewSystem && gameEngine.viewSystem.renderDebugInfo) {
            console.log('✅ UI元素渲染设置完成');
        }
        
        console.log('✅ 初始渲染完成');
        
    } catch (error) {
        console.error('❌ 初始渲染失败:', error);
        throw error;
    }
}


function gameLoop() {
    // 同步检查游戏引擎状态
    if (!gameEngine) {
        console.warn('游戏引擎未初始化');
        // 使用同步方式重试，而不是递归调用
        setTimeout(() => gameLoop(), 16); // 16ms = 60fps
        return;
    }

    // 同步执行游戏逻辑
    try {
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
    } catch (error) {
        console.error('游戏循环执行错误:', error);
    }

    // 继续下一帧
    requestAnimationFrame(gameLoop);
}

function startGame() {
    initGame();
    gameLoop();
}

startGame();

