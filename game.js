// 导入模块
import eventPrototype from './src/event.js';
import { MapRenderer } from './src/maps/map-renderer.js';
import MapManager from './src/maps/map-manager.js';
import menuPrototype from './src/menu.js';
import {CharacterManager} from './src/character.js';
import {ZombieManager} from './src/zombie.js';
import GameEngine from './src/game-engine.js';
import ViewSystem from './src/view.js';
import CollisionSystem from './src/obj/collision.js';
import objectPoolManager from './src/obj/object-pool.js';
import memoryMonitor from './src/obj/memory-optimization.js';
import ConfigManager from './src/config.js';

// 全局变量声明
let systemInfo = tt.getSystemInfoSync();
let canvas = tt.createCanvas(), ctx = canvas.getContext('2d');
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

// 第一阶段：只初始化菜单系统
let menuSystem = null;
let gameEngine = null;
let mapSystem = null;
let eventSystem = null;
let characterManager = null;
let collisionSystem = null;

// 游戏状态
let isGameInitialized = false; // 标记游戏是否已初始化
let isInitializing = false; // 标记是否正在初始化

// 游戏重置功能
function resetGame() {
    console.log('🔄 开始重置游戏...');
    
    try {
        // 第一步：停止游戏循环
        if (gameEngine && gameEngine.gameState === 'playing') {
            gameEngine.setGameState('home');
        }
        
        // 第二步：清空角色和僵尸数据
        clearGameData();
        
        // 第三步：重置游戏状态
        resetGameState();
        
        // 第四步：显示主菜单
        showHomePage();
        
        console.log('✅ 游戏重置完成');
        
    } catch (error) {
        console.error('❌ 游戏重置失败:', error);
        showErrorMessage('游戏重置失败: ' + error.message);
    }
}

// 清空游戏数据
function clearGameData() {
    console.log('🗑️ 清空游戏数据...');
    
    // 清空角色管理器
    if (window.characterManager) {
        // 🔴 修复：使用正确的管理器方法获取角色
        if (window.characterManager.getAllCharacters) {
            var characters = window.characterManager.getAllCharacters();
            characters.forEach(char => {
                if (char && char.id !== 1001) { // 保留主人物ID
                    // 从空间索引中移除
                    if (window.collisionSystem && window.collisionSystem.removeFromSpatialIndex) {
                        window.collisionSystem.removeFromSpatialIndex(char);
                    }
                }
            });
        }
        
        // 重置角色管理器
        window.characterManager = null;
        characterManager = null;
    }
    
    // 清空僵尸管理器
    if (window.zombieManager) {
        // 🔴 修复：使用正确的管理器方法获取僵尸
        if (window.zombieManager.getAllZombies) {
            var zombies = window.zombieManager.getAllZombies();
            zombies.forEach(zombie => {
                if (zombie) {
                    // 从空间索引中移除
                    if (window.collisionSystem && window.collisionSystem.removeFromSpatialIndex) {
                        window.collisionSystem.removeFromSpatialIndex(zombie);
                    }
                }
            });
        }
        
        // 重置僵尸管理器
        window.zombieManager = null;
    }
    
    // 清理对象池
    if (window.objectPoolManager) {
        window.objectPoolManager.resetAllPools();
    }
    
    // 停止内存监控
    if (window.memoryMonitor) {
        window.memoryMonitor.stop();
    }
    
    // 清空碰撞系统
    if (window.collisionSystem) {
        // 清空动态四叉树
        if (window.collisionSystem.dynamicQuadTree) {
            window.collisionSystem.dynamicQuadTree.clear();
        }
        
        // 重置碰撞系统
        window.collisionSystem = null;
        collisionSystem = null;
    }
    
    // 清空地图系统
    if (window.mapSystem) {
        window.mapSystem = null;
        mapSystem = null;
    }
    
    // 清空游戏引擎
    if (window.gameEngine) {
        window.gameEngine = null;
        gameEngine = null;
    }
    
    console.log('✅ 游戏数据清空完成');
}

// 重置游戏状态
function resetGameState() {
    console.log('🔄 重置游戏状态...');
    
    // 重置初始化标志
    isGameInitialized = false;
    isInitializing = false;
    
    // 清空全局变量
    if (typeof window !== 'undefined') {
        // 保留必要的系统变量
        // window.menuSystem = menuSystem; // 保留菜单系统
        // window.canvas = canvas; // 保留画布
        // window.ctx = ctx; // 保留上下文
        
        // 清空游戏相关全局变量
        delete window.characterManager;
        delete window.zombieManager;
        delete window.collisionSystem;
        delete window.mapSystem;
        delete window.gameEngine;
        delete window.MapManager;
        delete window.ViewSystem;
        delete window.objectPoolManager;
        delete window.memoryMonitor;
    }
    
    console.log('✅ 游戏状态重置完成');
}

// 页面加载完成后立即执行
console.log('🚀 游戏页面加载完成，开始初始化菜单系统...');

try {
    // 第一步：初始化菜单系统（仅此而已）
    console.log('🔧 初始化菜单系统...');
    initMenuSystem();
    
    // 第二步：显示首页
    console.log('🏠 显示首页...');
    showHomePage();
    
    console.log('✅ 菜单系统初始化完成，等待用户点击开始游戏');
    
} catch (error) {
    console.error('❌ 菜单系统初始化失败:', error);
    showErrorMessage('菜单系统初始化失败: ' + error.message);
}

// 初始化菜单系统
function initMenuSystem() {
    try {
        // 初始化菜单系统
        menuSystem = Object.create(menuPrototype);
        menuSystem.init(canvas, ctx);
        
        // 设置全局变量
        window.menuSystem = menuSystem;
        window.canvas = canvas;
        window.ctx = ctx;
        
        console.log('✅ 菜单系统初始化完成');
        
    } catch (error) {
        console.error('❌ 菜单系统初始化失败:', error);
        throw error;
    }
}

// 显示首页
function showHomePage() {
    try {
        if (menuSystem && menuSystem.renderHomePage) {
            menuSystem.renderHomePage();
            console.log('✅ 首页显示完成');
        } else {
            console.error('❌ 菜单系统不可用');
            throw new Error('菜单系统不可用');
        }
    } catch (error) {
        console.error('❌ 首页显示失败:', error);
        throw error;
    }
}

// 显示错误消息
function showErrorMessage(message) {
    if (ctx) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('错误: ' + message, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('请刷新页面重试', canvas.width / 2, canvas.height / 2 + 20);
    }
}

// 开始游戏（用户点击开始游戏按钮后调用）
function startGame() {
    if (isInitializing) {
        console.log('⏳ 游戏正在初始化中，请稍候...');
        return;
    }
    
    if (isGameInitialized) {
        console.log('✅ 游戏已经初始化完成');
        return;
    }
    
    console.log('🎮 用户点击开始游戏，开始懒加载游戏系统...');
    isInitializing = true;
    
    try {
        // 显示加载提示
        showLoadingMessage('正在加载游戏资源...');
        
        // 异步初始化游戏系统
        initGameSystemsAsync();
        
    } catch (error) {
        console.error('❌ 开始游戏失败:', error);
        isInitializing = false;
        showErrorMessage('开始游戏失败: ' + error.message);
    }
}

// 显示加载提示
function showLoadingMessage(message) {
    console.log('⏳ 显示加载提示:', message);
    
    if (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }
}

// 隐藏加载提示
function hideLoadingMessage() {
    console.log('✅ 隐藏加载提示');
    
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// 异步初始化游戏系统
function initGameSystemsAsync() {
    console.log('🔄 开始异步初始化游戏系统...');
    
    // 使用setTimeout确保UI更新
    setTimeout(() => {
        try {
            // 第一步：初始化游戏引擎
            console.log('⚙️ 步骤1: 初始化游戏引擎');
            initGameEngine();
            
            // 第二步：初始化地图系统（其他系统会在地图系统准备好后自动初始化）
            console.log('🗺️ 步骤2: 初始化地图系统');
            initMapSystem();
            
            // 注意：其他系统（角色、僵尸、碰撞等）会在地图系统完全准备好后自动初始化
            // 这是通过 continueGameSystemsInit() 函数实现的
            
        } catch (error) {
            console.error('❌ 游戏系统初始化失败:', error);
            isInitializing = false;
            showErrorMessage('游戏初始化失败: ' + error.message);
        }
    }, 100);
}

// 初始化游戏引擎
function initGameEngine() {
    try {
        console.log('🔧 初始化游戏引擎...');
        
        // 将视觉系统设置为全局变量，供游戏引擎使用
        window.ViewSystem = ViewSystem;
        
        gameEngine = new GameEngine(canvas, ctx);
        
        console.log('✅ 游戏引擎初始化完成');
        
    } catch (error) {
        console.error('❌ 游戏引擎初始化失败:', error);
        throw error;
    }
}

// 初始化角色和僵尸系统
function initCharacterAndZombieSystems() {
    try {
        // 🔴 修复：先设置对象池管理器为全局变量，确保角色和僵尸管理器可以访问
        if (typeof window !== 'undefined') {
            window.objectPoolManager = objectPoolManager;
            window.memoryMonitor = memoryMonitor;
            window.ConfigManager = ConfigManager;
        }
        
        // 初始化角色管理器
        console.log('👤 初始化角色管理器');
        characterManager = Object.create(CharacterManager);
        characterManager.initObjectPool(); // 🔴 新增：初始化对象池
        
        // 初始化僵尸管理器
        console.log('🧟‍♂️ 初始化僵尸管理器');
        var zombieManager = Object.create(ZombieManager);
        zombieManager.maxZombies = zombieManager.maxZombies || 100;
        zombieManager.difficulty = zombieManager.difficulty || 1;
        zombieManager.initObjectPool(); // 🔴 新增：初始化对象池
        
        // 设置其他全局变量
        if (typeof window !== 'undefined') {
            window.characterManager = characterManager;
            window.zombieManager = zombieManager;
        }
        
        console.log('✅ 角色和僵尸系统初始化完成');
        
    } catch (error) {
        console.error('❌ 角色和僵尸系统初始化失败:', error);
        throw error;
    }
}

// 初始化碰撞系统
function initCollisionSystem() {
    try {
        console.log('🔍 初始化碰撞检测系统...');
        
        // 创建碰撞检测系统
        collisionSystem = Object.create(CollisionSystem);
        
        // 确保地图管理器已准备好
        if (MapManager.currentMap) {
            console.log('✅ 地图数据已准备，开始初始化碰撞系统');
            collisionSystem.init('city');
        } else {
            console.error('❌ 地图数据未准备，无法初始化碰撞系统');
            throw new Error('地图数据未准备');
        }
        
        // 设置到全局变量
        window.collisionSystem = collisionSystem;
        console.log('✅ 碰撞检测系统初始化成功');
        
    } catch (error) {
        console.error('❌ 碰撞检测系统初始化失败:', error);
        throw error;
    }
}

// 设置游戏引擎系统
function setupGameEngineSystems() {
    try {
        console.log('⚙️ 设置游戏引擎系统...');
        
        // 设置游戏引擎系统引用
        gameEngine.setSystems(mapSystem, characterManager, menuSystem, eventSystem, window.zombieManager, collisionSystem);
        
        // 将gameEngine设置为全局变量，让角色能够访问摇杆系统
        window.gameEngine = gameEngine;
        
        console.log('✅ 游戏引擎系统设置完成');
        
    } catch (error) {
        console.error('❌ 游戏引擎系统设置失败:', error);
        throw error;
    }
}

// 将startGame函数暴露到全局，供菜单系统调用
if (typeof window !== 'undefined') {
    window.startGame = startGame;
    window.resetGame = resetGame;
    window.resetAllConfig = resetAllConfig;
}

// 重新开始游戏（从游戏结束界面调用）
function restartGame() {
    console.log('🔄 重新开始游戏...');
    
    try {
        // 第一步：重置游戏
        resetGame();
        
        // 第二步：等待一小段时间后重新开始
        setTimeout(() => {
            console.log('🎮 重新开始游戏...');
            startGame();
        }, 500);
        
    } catch (error) {
        console.error('❌ 重新开始游戏失败:', error);
        showErrorMessage('重新开始游戏失败: ' + error.message);
    }
}

// 重置所有配置（从首页调用）
function resetAllConfig() {
    console.log('🔄 开始重置所有配置...');
    
    try {
        // 第一步：停止游戏循环
        if (gameEngine && gameEngine.gameState === 'playing') {
            gameEngine.setGameState('home');
        }
        
        // 第二步：清空所有游戏数据
        clearGameData();
        
        // 第三步：重置游戏状态
        resetGameState();
        
        // 第四步：重置配置管理器
        if (window.ConfigManager && window.ConfigManager.reset) {
            window.ConfigManager.reset();
            console.log('✅ 配置管理器已重置');
        }
        
        // 第五步：重置工具管理器
        if (window.UtilsManager && window.UtilsManager.reset) {
            window.UtilsManager.reset();
            console.log('✅ 工具管理器已重置');
        }
        
        // 第六步：显示主菜单
        showHomePage();
        
        console.log('✅ 所有配置重置完成');
        
    } catch (error) {
        console.error('❌ 重置所有配置失败:', error);
        showErrorMessage('重置配置失败: ' + error.message);
    }
}

// 将restartGame函数暴露到全局
if (typeof window !== 'undefined') {
    window.restartGame = restartGame;
}

// 初始化地图系统
function initMapSystem() {
    console.log('🗺️ 开始初始化地图系统...');
    
    try {
        // 第一步：初始化地图管理器
        console.log('📋 步骤1: 初始化地图管理器');
        MapManager.init('city');
        
        // 将MapManager设置为全局变量，供其他模块使用
        if (typeof window !== 'undefined') {
            window.MapManager = MapManager;
        }
        
        // 第二步：直接继续后续步骤（地图数据已同步加载）
        console.log('✅ 地图数据已加载，继续后续步骤');
        continueMapSystemInit();
        
    } catch (error) {
        console.error('❌ 地图系统初始化失败:', error);
        throw new Error(`地图系统初始化失败: ${error.message}`);
    }
}

// 继续地图系统初始化的后续步骤
function continueMapSystemInit() {
    try {
        // 第三步：创建地图渲染器
        console.log('🎨 步骤3: 创建地图渲染器');
        mapSystem = new MapRenderer(canvas, ctx);
        mapSystem.init('city'); // 立即初始化地图渲染器
        
        // 第四步：等待建筑物数据生成完成
        console.log('⏳ 步骤4: 等待建筑物数据生成完成');
        waitForBuildingsReady(() => {
            // 建筑物数据准备好后继续后续步骤
            continueAfterBuildingsReady();
        });
        
    } catch (error) {
        console.error('❌ 地图系统后续初始化失败:', error);
        throw error;
    }
}

// 等待建筑物数据生成完成
function waitForBuildingsReady(callback) {
    console.log('⏳ 等待建筑物数据生成...');
    let attempts = 0;
    const maxAttempts = 50; // 最多等待5秒
    
    function checkBuildings() {
        // 添加详细的调试信息
        console.log('🔍 检查建筑物数据状态:', {
            mapSystem: !!mapSystem,
            currentMap: mapSystem ? mapSystem.currentMap : 'undefined',
            matrix: mapSystem && mapSystem.currentMap ? mapSystem.currentMap.matrix : 'undefined',
            buildingTypes: mapSystem && mapSystem.currentMap ? mapSystem.currentMap.buildingTypes : 'undefined',
            buildings: mapSystem && mapSystem.currentMap ? mapSystem.currentMap.buildings : 'undefined',
            buildingsLength: mapSystem && mapSystem.currentMap && mapSystem.currentMap.buildings ? mapSystem.currentMap.buildings.length : 'N/A'
        });
        
        if (mapSystem && mapSystem.currentMap && mapSystem.currentMap.buildings && mapSystem.currentMap.buildings.length > 0) {
            console.log('✅ 建筑物数据生成完成，数量:', mapSystem.currentMap.buildings.length);
            callback(); // 调用回调函数继续后续步骤
            return;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
            console.error('❌ 建筑物数据生成超时');
            console.error('最终状态:', {
                mapSystem: mapSystem,
                currentMap: mapSystem ? mapSystem.currentMap : 'undefined',
                buildings: mapSystem && mapSystem.currentMap ? mapSystem.currentMap.buildings : 'undefined'
            });
            throw new Error('建筑物数据生成超时');
        }
        
        console.log(`⏳ 等待建筑物数据生成... (${attempts}/${maxAttempts})`);
        
        // 使用setTimeout异步等待，不阻塞主线程
        setTimeout(checkBuildings, 100);
    }
    
    checkBuildings();
}

// 建筑物数据准备好后的后续步骤
function continueAfterBuildingsReady() {
    try {
        console.log('✅ 地图系统初始化完成');
        
        // 继续后续的系统初始化
        continueGameSystemsInit();
        
    } catch (error) {
        console.error('❌ 地图系统后续步骤失败:', error);
        throw error;
    }
}

// 继续游戏系统初始化（在地图系统准备好后）
function continueGameSystemsInit() {
    try {
        console.log('🔄 继续游戏系统初始化...');
        
        // 第一步：初始化角色和僵尸系统
        console.log('👥 步骤1: 初始化角色和僵尸系统');
        initCharacterAndZombieSystems();
        
        // 第二步：初始化碰撞系统
        console.log('🔍 步骤2: 初始化碰撞系统');
        initCollisionSystem();
        
        // 第三步：设置游戏引擎系统
        console.log('⚙️ 步骤3: 设置游戏引擎系统');
        setupGameEngineSystems();
        
        // 第四步：执行初始渲染
        console.log('🎨 步骤4: 执行初始渲染');
        performInitialRendering();
        
        // 第五步：切换到游戏状态
        console.log('🚀 步骤5: 切换到游戏状态');
        gameEngine.setGameState('playing');
        
        // 第六步：启动游戏循环
        console.log('🔄 步骤6: 启动游戏循环');
        startGameLoop();
        
        // 标记游戏初始化完成
        isGameInitialized = true;
        isInitializing = false;
        
        console.log('🎉 游戏系统初始化完成！游戏可以开始！');
        
        // 启动内存监控
        if (window.memoryMonitor) {
            window.memoryMonitor.start();
            console.log('🔍 内存监控已启动');
        }
        
        // 隐藏加载提示
        hideLoadingMessage();
        
    } catch (error) {
        console.error('❌ 游戏系统初始化失败:', error);
        isInitializing = false;
        showErrorMessage('游戏初始化失败: ' + error.message);
    }
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
        if (gameEngine.viewSystem && gameEngine.viewSystem.camera) {
            // 先创建主人物，然后根据主人物位置设置摄像机
            var mainChar = null;
            if (window.characterManager) {
                // 使用碰撞系统生成安全的随机位置
                var safePosition = null;
                if (window.collisionSystem && window.collisionSystem.generateGameSafePosition) {
                    // 尝试在南部公园区生成安全位置
                    safePosition = window.collisionSystem.generateGameSafePosition(
                        5000, 9600,  // 南部公园区中心
                        100, 500,    // 最小距离100，最大距离500
                        32, 48,      // 主人物尺寸
                        16           // 安全半径
                    );
                    
                    if (safePosition && safePosition.success) {
                        console.log('✅ 生成安全位置成功:', safePosition);
                    } else {
                        console.warn('⚠️ 安全位置生成失败，使用备用位置');
                        // 备用位置：南部公园区
                        safePosition = {x: 5000, y: 9600, success: true};
                    }
                } else {
                    // 备用位置：南部公园区（第46-49行，完全空旷）
                    safePosition = {x: 5000, y: 9600, success: true};
                }
                
                mainChar = window.characterManager.createMainCharacter(safePosition.x, safePosition.y);
                if (mainChar) {
                    console.log('✅ 主人物创建成功:', mainChar.id, '位置:', safePosition.x, safePosition.y);
                } else {
                    console.error('❌ 主人物创建失败');
                }
            }
            
            // 获取主人物当前位置，设置摄像机跟随
            if (mainChar && gameEngine.viewSystem.setFollowTarget) {
                gameEngine.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
                console.log('✅ 摄像机跟随主人物位置:', mainChar.x, mainChar.y);
            } else if (mainChar && gameEngine.viewSystem.camera.setPosition) {
                // 如果没有setFollowTarget方法，直接设置摄像机位置
                gameEngine.viewSystem.camera.setPosition(mainChar.x, mainChar.y);
                console.log('✅ 摄像机位置设置完成:', mainChar.x, mainChar.y);
            } else {
                console.warn('⚠️ 无法设置摄像机位置或跟随');
            }
            

        } else {
            console.warn('⚠️ 视觉系统或摄像机未初始化');
        }
        
        // 第三步：渲染角色
        console.log('👤 渲染角色...');
        if (gameEngine.viewSystem && window.characterManager) {
            // 主人物已经在上面创建了，这里只需要确认状态
            if (mainChar) {
                console.log('✅ 角色渲染设置完成');
            } else {
                console.error('❌ 主人物创建失败');
            }
        } else {
            console.warn('⚠️ 角色管理器或视觉系统未初始化');
        }
        
        // 第四步：渲染僵尸
        console.log('🧟‍♂️ 渲染僵尸...');
        if (gameEngine.viewSystem && window.zombieManager) {
            // 创建初始僵尸（在南部公园区，远离建筑物）
            var zombieX = 4800;
            var zombieY = 9400;
            var testZombie = window.zombieManager.createZombie('skinny', zombieX, zombieY);
            if (testZombie) {
                console.log('✅ 初始僵尸创建成功:', testZombie.id, '位置:', zombieX, zombieY);
            } else {
                console.error('❌ 初始僵尸创建失败');
            }
            
            var zombies = window.zombieManager.getAllZombies();
            console.log(`✅ 僵尸渲染设置完成，僵尸数量: ${zombies.length}`);
        } else {
            console.warn('⚠️ 僵尸管理器或视觉系统未初始化');
        }
        
        // 第五步：渲染UI元素
        console.log('🎮 渲染UI元素...');
        if (gameEngine.viewSystem && gameEngine.viewSystem.renderDebugInfo) {
            console.log('✅ UI元素渲染设置完成');
        }
        
        // 第六步：检查碰撞系统状态
        console.log('🔍 检查碰撞系统状态...');
        if (window.collisionSystem) {
            // 检查静态四叉树中的建筑物数量
            if (window.collisionSystem.staticQuadTree) {
                var allBuildings = window.collisionSystem.staticQuadTree.getAllObjects();
                console.log('✅ 静态四叉树中的建筑物数量:', allBuildings.length);
                

            } else {
                console.warn('⚠️ 静态四叉树未初始化');
            }
            
            // 检查动态四叉树中的对象数量
            if (window.collisionSystem.dynamicQuadTree) {
                var allDynamicObjects = window.collisionSystem.dynamicQuadTree.getAllObjects();
                console.log('✅ 动态四叉树中的对象数量:', allDynamicObjects.length);
                

            } else {
                console.warn('⚠️ 动态四叉树未初始化');
            }
            

        } else {
            console.warn('⚠️ 碰撞系统未初始化');
        }
        
        console.log('✅ 初始渲染完成');
        
        // 立即执行一次游戏引擎渲染，确保所有内容显示在屏幕上
        console.log('🎨 执行初始游戏引擎渲染...');
        

        
        if (gameEngine && gameEngine.render) {
            try {
                // 强制渲染一次
                gameEngine.render();
                console.log('✅ 初始游戏引擎渲染完成');
            } catch (error) {
                console.warn('⚠️ 初始游戏引擎渲染失败:', error);
            }
        } else {
            console.warn('⚠️ 游戏引擎或渲染方法不存在');
        }
        
    } catch (error) {
        console.error('❌ 初始渲染失败:', error);
        throw error;
    }
}

// 启动游戏循环
function startGameLoop() {
    console.log('🔄 启动游戏循环...');
    
    function gameLoop() {
        try {
            // 检查游戏引擎状态
            if (!gameEngine) {
                console.warn('游戏引擎未初始化，停止游戏循环');
                return;
            }

            // 执行游戏逻辑
            if (gameEngine.gameState === 'home') {
                // 渲染首页
                if (menuSystem && menuSystem.renderHomePage) {
                    menuSystem.renderHomePage();
                }
            } else if (gameEngine.gameState === 'playing') {
                // 使用游戏引擎的更新和渲染方法
                if (gameEngine.update && gameEngine.render) {
                    gameEngine.update();
                    gameEngine.render();
                } else {
                    console.error('游戏引擎的update或render方法不存在');
                }
            } else if (gameEngine.gameState === 'menu') {
                // 渲染菜单
                if (menuSystem && menuSystem.renderMenu) {
                    menuSystem.renderMenu();
                }
            }
        } catch (error) {
            console.error('游戏循环执行错误:', error);
        }

        // 继续下一帧
        requestAnimationFrame(gameLoop);
    }

    // 启动游戏循环
    gameLoop();
    console.log('✅ 游戏循环已启动');
}

