// 导入模块
import eventPrototype from './src/event.js';
import MapManager from './src/maps/map-manager.js';
import createMenuSystem from './src/menu.js';
import {CharacterManager} from './src/character.js';
import {ZombieManager} from './src/zombie.js';
import {PartnerManager} from './src/partner.js';
import GameEngine from './src/game-engine.js';
import ViewSystem from './src/view/index.js';
import CollisionSystem from './src/obj/collision.js';
import objectPoolManager from './src/obj/object-pool.js';
import memoryMonitor from './src/obj/memory-optimization.js';
import objectManager from './src/obj/object-manager.js';
import objectHealthChecker from './src/obj/health-checker.js';
import ConfigManager from './src/config.js';


// 全局变量声明
let systemInfo = tt.getSystemInfoSync();
let canvas = tt.createCanvas(), ctx = canvas.getContext('2d');
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

// 设置canvas渲染质量，避免模糊
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

// 测试配置路径
if (window.ConfigManager && window.ConfigManager.get) {
    try {
        const zoomValue = window.ConfigManager.get('PERFORMANCE.OPTIMIZATION.CAMERA.ZOOM');
        console.log('✅ 配置路径测试成功，ZOOM值:', zoomValue);
    } catch (error) {
        console.error('❌ 配置路径测试失败:', error.message);
        console.log('可用的配置路径示例:');
        console.log('- PERFORMANCE.OPTIMIZATION.RENDER_DISTANCE');
        console.log('- MOVEMENT.CHARACTER_MOVE_SPEED');
    }
}

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
    console.log('🔄 开始环境重置...');

    // 第一步：环境重置（销毁所有对象和系统）
    resetGameEnvironment();

    // 第二步：重置游戏状态
    resetGameState();

    // 第三步：重新初始化菜单系统
    reinitializeMenuSystem();

    // 第四步：显示主菜单
    showHomePage();

    console.log('✅ 环境重置完成，状态如首次加载');
}

// 主人物死亡处理函数
function handleMainCharacterDeath() {
    console.log('💀 主人物死亡，开始死亡处理流程...');

    // 设置游戏引擎为死亡状态
    if (window.gameEngine && window.gameEngine.setDeathState) {
        window.gameEngine.setDeathState();
    }

    // 显示死亡提示
    showDeathMessage();

    // 不再自动重置，等待玩家选择
    console.log('💀 等待玩家选择重新开始或返回主菜单...');
}

// 设置全局函数
window.handleMainCharacterDeath = handleMainCharacterDeath;

// 🔴 新增：游戏状态变化处理函数
window.onGameStateChange = function (newState) {
    console.log('🔄 游戏状态变化:', newState);

    if (newState === 'playing') {
        // 开始游戏
        if (!isGameInitialized && !isInitializing) {
            console.log('🎮 用户点击开始游戏，开始懒加载游戏系统...');
            startGame();
        } else if (isGameInitialized && gameEngine) {
            // 重新开始游戏
            console.log('🔄 重新开始游戏...');
            // 🔴 修复：重新开始时应该完全重置环境，确保对象创建方式一致
            resetGame();
        }
    } else if (newState === 'home') {
        // 返回主菜单
        if (gameEngine) {
            gameEngine.setGameState('home');
        }
        showHomePage();
    }
};

// 显示死亡消息
function showDeathMessage() {
    console.log('💀 显示死亡消息...');

    if (menuSystem && menuSystem.showDeathMessage) {
        menuSystem.showDeathMessage();
    } else {
        // 回退到简单的死亡提示
        if (canvas && ctx) {
            ctx.save();

            // 绘制死亡背景
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 绘制死亡文字
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀 主人物已死亡', canvas.width / 2, canvas.height / 2 - 40);

            ctx.fillStyle = '#FFEB3B';
            ctx.font = '20px Arial';
            ctx.fillText('正在重置游戏环境...', canvas.width / 2, canvas.height / 2);

            ctx.restore();
        }
    }
}


// 环境重置辅助函数：暂停系统更新
function pauseSystemUpdates() {
    console.log('⏸️ 暂停系统更新...');

    // 暂停游戏引擎更新
    if (window.gameEngine) {
        if (window.gameEngine.setGameState) {
            window.gameEngine.setGameState('home');
        }
        console.log('✅ 游戏引擎已暂停');
    }

    // 暂停内存监控
    if (window.memoryMonitor && window.memoryMonitor.pause) {
        window.memoryMonitor.pause();
        console.log('✅ 内存监控已暂停');
    }

    // 暂停对象健康检查器
    if (window.objectHealthChecker && window.objectHealthChecker.pause) {
        window.objectHealthChecker.pause();
        console.log('✅ 对象健康检查器已暂停');
    }

    // 暂停对象池管理器
    if (window.objectPoolManager && window.objectPoolManager.pause) {
        window.objectPoolManager.pause();
        console.log('✅ 对象池管理器已暂停');
    }

    console.log('✅ 系统更新已暂停');
}

// 环境重置（销毁所有对象和系统，但保持游戏循环运行）
function resetGameEnvironment() {
    console.log('🔄 开始环境重置...');

    // 第一步：暂停系统更新
    pauseSystemUpdates();

    // 🔴 修复：停止当前游戏循环，防止FPS叠加
    if (window.gameLoopId) {
        console.log('⏹️ 停止当前游戏循环...');
        cancelAnimationFrame(window.gameLoopId);
        window.gameLoopId = null;
    }

    // 🔴 新增：重置游戏循环标志，确保重启时使用正确的帧率
    window.shouldStopGameLoop = false;

    // 第二步：销毁所有角色对象
    if (window.characterManager) {
        console.log('🗑️ 销毁所有角色对象...');
        if (window.characterManager.getAllCharacters) {
            var characters = window.characterManager.getAllCharacters();
            characters.forEach(char => {
                if (char && char.destroy) {
                    char.destroy();
                }
            });
        }
        window.characterManager = null;
        characterManager = null;
        console.log('✅ 角色管理器已清理');
    }

    // 第二步：销毁所有僵尸对象
    if (window.zombieManager) {
        console.log('🗑️ 销毁所有僵尸对象...');
        if (window.zombieManager.getAllZombies) {
            var zombies = window.zombieManager.getAllZombies();
            zombies.forEach(zombie => {
                if (zombie && zombie.destroy) {
                    zombie.destroy();
                }
            });
        }
        window.zombieManager = null;
        console.log('✅ 僵尸管理器已清理');
    }

    // 第三步：销毁所有伙伴对象
    if (window.partnerManager) {
        console.log('🗑️ 销毁所有伙伴对象...');
        if (window.partnerManager.getAllPartners) {
            var partners = window.partnerManager.getAllPartners();
            partners.forEach(partner => {
                if (partner && partner.destroy) {
                    partner.destroy();
                }
            });
        }
        window.partnerManager = null;
        console.log('✅ 伙伴管理器已清理');
    }

    // 第四步：完全重置对象管理器
    if (window.objectManager) {
        console.log('🗑️ 完全重置对象管理器...');
        if (window.objectManager.destroy) {
            window.objectManager.destroy();
        }
        window.objectManager = null;
        console.log('✅ 对象管理器已销毁');
    }

    // 第五步：完全重置对象池管理器
    if (window.objectPoolManager) {
        console.log('🗑️ 完全重置对象池管理器...');
        if (window.objectPoolManager.destroy) {
            window.objectPoolManager.destroy();
        }
        window.objectPoolManager = null;
        console.log('✅ 对象池管理器已销毁');
    }

    // 第六步：完全重置内存监控
    if (window.memoryMonitor) {
        console.log('🗑️ 完全重置内存监控...');
        if (window.memoryMonitor.destroy) {
            window.memoryMonitor.destroy();
        }
        window.memoryMonitor = null;
        console.log('✅ 内存监控已销毁');
    }

    // 第七步：完全重置健康检查器
    if (window.objectHealthChecker) {
        console.log('🗑️ 完全重置健康检查器...');
        if (window.objectHealthChecker.destroy) {
            window.objectHealthChecker.destroy();
        }
        window.objectHealthChecker = null;
        console.log('✅ 健康检查器已销毁');
    }

    // 第八步：完全重置碰撞系统
    if (window.collisionSystem) {
        console.log('🗑️ 完全重置碰撞系统...');
        if (window.collisionSystem.destroy) {
            window.collisionSystem.destroy();
        }
        window.collisionSystem = null;
        collisionSystem = null;
        console.log('✅ 碰撞系统已销毁');
    }

    // 第九步：完全重置地图系统
    if (window.mapSystem) {
        console.log('🗑️ 完全重置地图系统...');
        if (window.mapSystem.destroy) {
            window.mapSystem.destroy();
        }
        window.mapSystem = null;
        mapSystem = null;
        console.log('✅ 地图系统已销毁');
    }

    // 第十步：完全重置游戏引擎
    if (window.gameEngine) {
        console.log('🗑️ 完全重置游戏引擎...');
        if (window.gameEngine.destroy) {
            window.gameEngine.destroy();
        }
        window.gameEngine = null;
        gameEngine = null;
        console.log('✅ 游戏引擎已销毁');
    }

    // 第十一步：完全重置视图系统
    if (window.viewSystem) {
        console.log('🗑️ 完全重置视图系统...');
        if (window.viewSystem.destroy) {
            window.viewSystem.destroy();
        }
        window.viewSystem = null;
        console.log('✅ 视图系统已销毁');
    }

    // 第十二步：清理所有全局变量（保留画布和上下文）
    console.log('🗑️ 清理所有全局变量...');
    const globalVarsToClean = ['characterManager', 'zombieManager', 'partnerManager', 'objectManager', 'objectPoolManager', 'memoryMonitor', 'objectHealthChecker', 'collisionSystem', 'mapSystem', 'gameEngine', 'viewSystem', 'renderManager', 'MapManager', 'ViewSystem'];

    globalVarsToClean.forEach(varName => {
        if (window[varName] !== undefined) {
            delete window[varName];
        }
    });

    console.log('✅ 环境重置完成，游戏循环继续运行');
}

// 重置游戏状态
function resetGameState() {
    console.log('🔄 重置游戏状态...');

    // 重置初始化标志
    isGameInitialized = false;
    isInitializing = false;

    // 重置游戏循环标志
    window.shouldStopGameLoop = false;

    // 清空所有全局变量（除了画布和上下文）
    if (typeof window !== 'undefined') {
        // 保留画布和上下文
        // window.canvas = canvas;
        // window.ctx = ctx;

        // 清空所有游戏相关全局变量
        const varsToDelete = ['characterManager', 'zombieManager', 'partnerManager', 'collisionSystem', 'mapSystem', 'gameEngine', 'MapManager', 'ViewSystem', 'objectPoolManager', 'objectManager', 'memoryMonitor', 'objectHealthChecker', 'viewSystem', 'renderManager'];

        varsToDelete.forEach(varName => {
            if (window[varName] !== undefined) {
                delete window[varName];
            }
        });
    }

    console.log('✅ 游戏状态重置完成');
}

// 重新初始化菜单系统
function reinitializeMenuSystem() {
    console.log('🔄 重新初始化菜单系统...');

    try {
        // 销毁旧的菜单系统
        if (window.menuSystem && window.menuSystem.destroy) {
            window.menuSystem.destroy();
        }

        // 创建新的菜单系统
        menuSystem = createMenuSystem(canvas, ctx);

        // 设置全局变量
        window.menuSystem = menuSystem;
        window.canvas = canvas;
        window.ctx = ctx;

        console.log('✅ 菜单系统重新初始化完成');

    } catch (error) {
        console.error('❌ 菜单系统重新初始化失败:', error);
        throw error;
    }
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
        // 使用新的独立菜单系统
        menuSystem = createMenuSystem(canvas, ctx);

        // 设置全局变量
        window.menuSystem = menuSystem;
        window.canvas = canvas;
        window.ctx = ctx;

        console.log('✅ 独立菜单系统初始化完成');

    } catch (error) {
        console.error('❌ 独立菜单系统初始化失败:', error);
        throw error;
    }
}

// 显示首页
function showHomePage() {
    try {
        if (menuSystem && menuSystem.render) {
            // 确保菜单系统处于主页面状态
            if (menuSystem.getCurrentState() !== 'home') {
                menuSystem.setState('home');
            } else {
                menuSystem.render();
            }
            console.log('✅ 首页显示完成');
        } else {
            console.error('❌ 独立菜单系统不可用');
            throw new Error('独立菜单系统不可用');
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

        // 确保ConfigManager在游戏引擎初始化前可用
        if (typeof window !== 'undefined' && !window.ConfigManager && typeof ConfigManager !== 'undefined') {
            window.ConfigManager = ConfigManager;
            console.log('✅ ConfigManager已设置为全局可用');
        }

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
        // 🔴 新增：检查对象管理器导入状态
        console.log('🔍 检查对象管理器导入状态...');
        console.log('objectManager:', objectManager);
        console.log('typeof objectManager:', typeof objectManager);

        // 🔴 修复：先设置对象池管理器为全局变量，确保角色和僵尸管理器可以访问
        if (typeof window !== 'undefined') {
            window.objectPoolManager = objectPoolManager;
            window.memoryMonitor = memoryMonitor;
            window.objectManager = objectManager;
            window.objectHealthChecker = objectHealthChecker;
            window.ConfigManager = ConfigManager; // 🔴 修复：确保ConfigManager在角色创建前可用
        }

        // 🔴 新增：验证移动速度配置
        console.log('🔍 验证移动速度配置:');
        console.log('- CHARACTER_MOVE_SPEED:', ConfigManager.get('MOVEMENT.CHARACTER_MOVE_SPEED'));
        console.log('- ZOMBIE_MOVE_SPEED:', ConfigManager.get('MOVEMENT.ZOMBIE_MOVE_SPEED'));
        console.log('- PARTNER_MOVE_SPEED:', ConfigManager.get('MOVEMENT.PARTNER_MOVE_SPEED'));

        // 🔴 新增：验证对象管理器设置
        if (window.objectManager) {
            console.log('✅ 对象管理器已正确设置为全局变量');
        } else {
            console.error('❌ 对象管理器设置失败');
            throw new Error('对象管理器设置失败');
        }

        // 初始化角色管理器
        console.log('👤 初始化角色管理器');
        characterManager = Object.create(CharacterManager);
        characterManager.initObjectPool(); // 🔴 新增：初始化对象池

        // 初始化僵尸管理器
        console.log('🧟‍♂️ 初始化僵尸管理器');
        var zombieManager = Object.create(ZombieManager);
        zombieManager.maxZombies = zombieManager.maxZombies || 2000;
        zombieManager.difficulty = zombieManager.difficulty || 1;
        zombieManager.initObjectPool(); // 🔴 新增：初始化对象池

        // 初始化伙伴管理器
        console.log('👥 初始化伙伴管理器');
        var partnerManager = Object.create(PartnerManager);
        partnerManager.initObjectPool(); // 🔴 新增：初始化对象池

        // 设置其他全局变量
        if (typeof window !== 'undefined') {
            window.characterManager = characterManager;
            window.zombieManager = zombieManager;
            window.partnerManager = partnerManager;
        }

        console.log('✅ 角色、僵尸和伙伴系统初始化完成');

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

// 创建主人物
function createMainCharacter() {
    console.log('👤 开始创建主人物...');

    try {
        var mainChar = null;
        if (window.characterManager) {
            // 使用碰撞系统生成安全的随机位置
            var safePosition = null;
            if (window.collisionSystem && window.collisionSystem.generateGameSafePosition) {
                // 尝试在地图中心区域生成安全位置
                safePosition = window.collisionSystem.generateGameSafePosition(2000, 2000,  // 地图中心区域
                    100, 500,    // 最小距离100，最大距离500
                    32, 48,      // 主人物尺寸
                    16           // 安全半径
                );

                if (safePosition && safePosition.success) {
                    console.log('✅ 生成安全位置成功:', safePosition);
                } else {
                    throw new Error('安全位置生成失败');
                }
            } else {
                // 备用位置：地图中心
                safePosition = {x: 2000, y: 2000, success: true};
            }

            mainChar = window.characterManager.createMainCharacter(safePosition.x, safePosition.y);
            if (mainChar) {
                console.log('✅ 主人物创建成功:', mainChar.id, '位置:', safePosition.x, safePosition.y);

                // 🔴 验证：确认主人物已正确存储到角色管理器
                var storedMainChar = window.characterManager.getMainCharacter();
                if (storedMainChar) {
                    console.log('✅ 主人物存储验证成功:', storedMainChar.id);
                } else {
                    throw new Error('主人物存储验证失败');
                }
            } else {
                throw new Error('主人物创建失败');
            }
        } else {
            throw new Error('角色管理器未初始化');
        }

        console.log('✅ 主人物创建完成');

    } catch (error) {
        console.error('❌ 主人物创建失败:', error);
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

        // 第二步：立即重新开始
        console.log('🎮 重新开始游戏...');
        startGame();

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

        // 🔴 新增：注册地图到对象管理器
        if (window.objectManager && MapManager.currentMap) {
            MapManager.registerMapToObjectManager();
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
        // 第三步：初始化地图管理器
        console.log('🗺️ 步骤3: 初始化地图管理器');
        mapSystem = MapManager;
        mapSystem.init('city'); // 立即初始化地图管理器

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

        // 第三步：等待地图系统完全准备好后创建主人物
        console.log('⚙️ 步骤3: 等待地图系统完全准备好...');
        setTimeout(() => {
            // 第四步：创建主人物
            console.log('👤 步骤4: 创建主人物');
            createMainCharacter();

            // 第五步：设置游戏引擎系统
            console.log('⚙️ 步骤5: 设置游戏引擎系统');
            setupGameEngineSystems();

            // 第六步：执行初始渲染
            console.log('🎨 步骤6: 执行初始渲染');
            performInitialRendering();

            // 第七步：切换到游戏状态
            console.log('🚀 步骤7: 切换到游戏状态');
            gameEngine.setGameState('playing');

            // 第八步：启动游戏循环
            console.log('🔄 步骤8: 启动游戏循环');
            startGameLoop();

            // 标记游戏初始化完成
            isGameInitialized = true;
            isInitializing = false;

            console.log('🎉 游戏系统初始化完成！游戏可以开始！');

            // 启动内存监控
            if (window.memoryMonitor) {
                try {
                    window.memoryMonitor.start();
                    console.log('🔍 内存监控已启动');
                } catch (error) {
                    console.warn('⚠️ 内存监控启动失败:', error.message);
                    // 如果内存监控已在运行，重置后重新启动
                    if (error.message.includes('已在运行中')) {
                        window.memoryMonitor.reset();
                        window.memoryMonitor.start();
                        console.log('🔍 内存监控已重置并重新启动');
                    }
                }
            }

            if (window.objectHealthChecker) {
                console.log('🔍 健康检查器已启动');
            }

            // 隐藏加载提示
            hideLoadingMessage();
        }, 500); // 等待500ms确保地图系统完全初始化

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
        // 第一步：验证地图系统
        console.log('🗺️ 验证地图系统...');
        if (mapSystem && mapSystem.getCurrentMap) {
            const currentMap = mapSystem.getCurrentMap();
            if (currentMap) {
                console.log('✅ 地图系统验证完成，当前地图:', currentMap.id);
            } else {
                throw new Error('无法获取当前地图');
            }
        } else {
            throw new Error('地图系统未正确初始化');
        }


        // 第二步：设置摄像机位置
        console.log('📷 设置摄像机位置...');
        if (gameEngine.viewSystem && gameEngine.viewSystem.camera) {
            // 获取主人物当前位置，设置摄像机跟随
            var mainChar = window.characterManager.getMainCharacter();
            if (mainChar && gameEngine.viewSystem.setFollowTarget) {
                gameEngine.viewSystem.setFollowTarget(mainChar.x, mainChar.y);
                console.log('✅ 摄像机跟随主人物位置:', mainChar.x, mainChar.y);
            } else if (mainChar && gameEngine.viewSystem.camera.setPosition) {
                // 如果没有setFollowTarget方法，直接设置摄像机位置
                gameEngine.viewSystem.camera.setPosition(mainChar.x, mainChar.y);
                console.log('✅ 摄像机位置设置完成:', mainChar.x, mainChar.y);
            } else {
                throw new Error('无法设置摄像机位置或跟随');
            }
        } else {
            throw new Error('视觉系统或摄像机未初始化');
        }

        // 第三步：渲染角色
        console.log('👤 渲染角色...');
        if (gameEngine.viewSystem && window.characterManager) {
            // 主人物已经在上面创建了，这里只需要确认状态
            var mainChar = window.characterManager.getMainCharacter();
            if (mainChar) {
                console.log('✅ 角色渲染设置完成');
            } else {
                throw new Error('主人物创建失败');
            }
        } else {
            throw new Error('角色管理器或视觉系统未初始化');
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
            throw new Error('僵尸管理器或视觉系统未初始化');
        }

        // 第五步：生成伙伴
        console.log('👥 生成伙伴...');
        if (gameEngine.viewSystem && window.partnerManager) {
            // 在地图上随机生成伙伴
            window.partnerManager.generatePartnersOnMap();
        } else {
            throw new Error('伙伴管理器或视觉系统未初始化');
        }

        // 第六步：渲染UI元素
        console.log('🎮 渲染UI元素...');
        if (gameEngine.viewSystem && gameEngine.viewSystem.renderDebugInfo) {
            console.log('✅ UI元素渲染设置完成');
        }

        // 第七步：检查碰撞系统状态
        console.log('🔍 检查碰撞系统状态...');
        if (window.collisionSystem) {
            // 简化版碰撞系统状态检查
            console.log('✅ 简化版碰撞系统已初始化');
            console.log('✅ 地图矩阵已加载，网格大小:', window.collisionSystem.gridCols, 'x', window.collisionSystem.gridRows);
        } else {
            throw new Error('碰撞系统未初始化');
        }

        // 第八步：最终验证主人物状态
        console.log('🔍 最终验证主人物状态...');
        if (window.characterManager) {
            var finalMainChar = window.characterManager.getMainCharacter();
            var allCharacters = window.characterManager.getAllCharacters();
            console.log('🔍 最终状态检查:', {
                hasMainCharacter: !!finalMainChar,
                mainCharacterId: finalMainChar ? finalMainChar.id : 'N/A',
                totalCharacters: allCharacters.length,
                characterManager: !!window.characterManager
            });
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
                throw new Error('初始游戏引擎渲染失败: ' + error.message);
            }
        } else {
            throw new Error('游戏引擎或渲染方法不存在');
        }

    } catch (error) {
        console.error('❌ 初始渲染失败:', error);
        throw error;
    }
}

// 启动游戏循环
function startGameLoop() {
    console.log('🔄 启动游戏循环...');

    // 🔴 修复：确保停止之前的游戏循环，防止FPS叠加
    if (window.gameLoopId) {
        console.log('⏹️ 停止之前的游戏循环...');
        cancelAnimationFrame(window.gameLoopId);
        window.gameLoopId = null;
    }

    // 重置停止标志
    window.shouldStopGameLoop = false;

    // 🔴 新增：从配置获取帧率限制设置
    var performanceConfig = window.ConfigManager ? window.ConfigManager.get('PERFORMANCE.GAME_LOOP') : null;
    var enableFPSLimit = performanceConfig.ENABLE_FPS_LIMIT;
    var targetFPS = performanceConfig.TARGET_FPS;
    var targetFrameTime = performanceConfig.FRAME_TIME;

    // 🔴 修复：将帧率相关变量设为全局，确保重启时正确重置
    if (!window.gameLoopVars) {
        window.gameLoopVars = {
            lastFrameTime: 0, fpsCounter: 0, fpsLastTime: 0, currentFPS: 0
        };
    } else {
        // 🔴 新增：重启时重置帧率变量
        window.gameLoopVars.lastFrameTime = 0;
        window.gameLoopVars.fpsCounter = 0;
        window.gameLoopVars.fpsLastTime = 0;
        window.gameLoopVars.currentFPS = 0;
    }

    function gameLoop(currentTime) {
        try {
            // 🔴 新增：FPS计算和打印
            window.gameLoopVars.fpsCounter++;
            if (window.gameLoopVars.fpsLastTime === 0) {
                window.gameLoopVars.fpsLastTime = currentTime;
            }

            // 检查是否应该停止游戏循环
            if (window.shouldStopGameLoop) {
                console.log('⏹️ 游戏循环收到停止信号，停止执行');
                return;
            }

            // 检查游戏引擎状态
            if (!gameEngine) {
                // 如果没有游戏引擎，只渲染菜单
                if (menuSystem && menuSystem.render) {
                    menuSystem.render();
                }
            } else {
                // 执行游戏逻辑
                if (gameEngine.gameState === 'home') {
                    // 渲染首页
                    if (menuSystem && menuSystem.render) {
                        menuSystem.render();
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
                    if (menuSystem && menuSystem.render) {
                        // 确保菜单系统处于游戏内菜单状态
                        if (menuSystem.getCurrentState() !== 'game_menu') {
                            menuSystem.setState('game_menu');
                        } else {
                            menuSystem.render();
                        }
                    }
                } else if (gameEngine.gameState === 'death') {
                    // 🔴 修复：死亡状态下使用游戏引擎的渲染方法
                    if (gameEngine.render) {
                        try {
                            // 死亡状态下只渲染，不更新游戏逻辑
                            gameEngine.render();
                        } catch (error) {
                            console.error('死亡界面渲染错误:', error);
                            // 备用渲染方案
                            if (menuSystem && menuSystem.render) {
                                menuSystem.render();
                            }
                        }
                    } else {
                        // 备用方案：使用菜单系统渲染
                        if (menuSystem && menuSystem.render) {
                            // 确保菜单系统处于死亡状态
                            if (menuSystem.getCurrentState && menuSystem.getCurrentState() !== 'death') {
                                menuSystem.setState('death');
                            }
                            menuSystem.render();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('游戏循环执行错误:', error);
        }

        // 继续下一帧（除非收到停止信号）
        if (!window.shouldStopGameLoop) {
            window.gameLoopId = requestAnimationFrame(gameLoop);
        }
    }

    // 启动游戏循环
    window.gameLoopId = requestAnimationFrame(gameLoop);
    console.log('✅ 游戏循环已启动' + (enableFPSLimit ? `（${targetFPS}fps限制）` : '（无帧率限制）'));
}

