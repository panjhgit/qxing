/**
 * 游戏配置管理模块 (config.js)
 * 
 * 功能：
 * - 统一管理所有游戏配置常量
 * - 消除硬编码的重复值
 * - 提供配置验证和默认值
 * - 支持不同难度级别的配置
 */

// 游戏基础配置
const GAME_CONFIG = {
    // 移动系统配置
    MOVEMENT: {
        DEFAULT_MOVE_SPEED: 5,          // 默认移动速度 (像素/帧)
        CHARACTER_MOVE_SPEED: 5,        // 人物移动速度 (像素/帧)
        ZOMBIE_MOVE_SPEED: 3,           // 僵尸移动速度 (像素/帧) - 比人物慢
        MIN_MOVE_DISTANCE: 1,            // 最小移动距离
        PATHFINDING_STEPS: 10,          // 路径检测步数
        SMOOTH_MOVE_RATIOS: [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1] // 平滑移动比例
    },

    // 动画系统配置
    ANIMATION: {
        DEFAULT_FRAME_RATE: 0.2,        // 默认动画帧率 (每帧更新0.2)
        MAX_ANIMATION_FRAMES: 8,        // 最大动画帧数
        ANIMATION_RESET_THRESHOLD: 8    // 动画重置阈值
    },

    // 碰撞检测配置
    COLLISION: {
        DEFAULT_SAFE_DISTANCE: 30,      // 默认安全距离
        BUILDING_COLLISION_MARGIN: 10,  // 建筑物碰撞边距
        OBJECT_OVERLAP_MARGIN: 20,      // 对象重叠边距
        PATH_VALIDATION_STEPS: 10       // 路径验证步数
    },

    // 攻击系统配置
    COMBAT: {
        DEFAULT_ATTACK_COOLDOWN: 1000,  // 默认攻击冷却时间 (毫秒)
        MIN_ATTACK_RANGE: 30,           // 最小攻击距离
        MAX_ATTACK_RANGE: 150,          // 最大攻击距离
        DAMAGE_REDUCTION_FACTOR: 0.8    // 伤害衰减因子
    },

    // 检测范围配置
    DETECTION: {
        ZOMBIE_DETECTION_RANGE: 200,    // 僵尸检测范围
        MAIN_CHARACTER_DETECTION: 1000, // 主人物检测范围
        SAFE_SPAWN_DISTANCE: 100,       // 安全生成距离
        MAX_SPAWN_SEARCH_RADIUS: 300    // 最大生成搜索半径
    },

    // 地图配置
    MAP: {
        DEFAULT_BUILDING_SIZE: 750,     // 默认建筑物大小
        DEFAULT_STREET_WIDTH: 500,      // 默认街道宽度
        GRID_SIZE: 1250,                // 网格大小 (750 + 500)
        MAP_DIMENSIONS: {
            WIDTH: 10000,               // 地图宽度
            HEIGHT: 10000               // 地图高度
        }
    },

    // 对象尺寸配置
    OBJECT_SIZES: {
        CHARACTER: {
            WIDTH: 32,
            HEIGHT: 48
        },
        ZOMBIE: {
            DEFAULT: { WIDTH: 32, HEIGHT: 32 },
            SKINNY: { WIDTH: 24, HEIGHT: 24 },
            FAT: { WIDTH: 32, HEIGHT: 32 },
            BOSS: { WIDTH: 48, HEIGHT: 48 },
            FAST: { WIDTH: 20, HEIGHT: 20 },
            TANK: { WIDTH: 40, HEIGHT: 40 }
        }
    },

    // 性能配置
    PERFORMANCE: {
        MAX_ZOMBIES: 100,               // 最大僵尸数量
        MAX_CHARACTERS: 50,             // 最大人物数量
        QUADTREE_MAX_OBJECTS: 8,        // 四叉树最大对象数
        QUADTREE_MAX_DEPTH: 6,          // 四叉树最大深度
        CACHE_CLEANUP_THRESHOLD: 1000   // 缓存清理阈值
    }
};

// 难度级别配置
const DIFFICULTY_CONFIG = {
    EASY: {
        ZOMBIE_HP_MULTIPLIER: 0.8,
        ZOMBIE_ATTACK_MULTIPLIER: 0.8,
        ZOMBIE_SPAWN_RATE: 0.7,
        PLAYER_HP_BONUS: 1.2
    },
    NORMAL: {
        ZOMBIE_HP_MULTIPLIER: 1.0,
        ZOMBIE_ATTACK_MULTIPLIER: 1.0,
        ZOMBIE_SPAWN_RATE: 1.0,
        PLAYER_HP_BONUS: 1.0
    },
    HARD: {
        ZOMBIE_HP_MULTIPLIER: 1.3,
        ZOMBIE_ATTACK_MULTIPLIER: 1.2,
        ZOMBIE_SPAWN_RATE: 1.3,
        PLAYER_HP_BONUS: 0.9
    }
};

// 配置验证器
const ConfigValidator = {
    // 验证移动配置
    validateMovementConfig: function(config) {
        if (config.MOVEMENT.DEFAULT_MOVE_SPEED <= 0) {
            console.warn('移动速度必须大于0，使用默认值');
            config.MOVEMENT.DEFAULT_MOVE_SPEED = 120;
        }
        return config;
    },

    // 验证动画配置
    validateAnimationConfig: function(config) {
        if (config.ANIMATION.DEFAULT_FRAME_RATE <= 0) {
            console.warn('动画帧率必须大于0，使用默认值');
            config.ANIMATION.DEFAULT_FRAME_RATE = 0.1;
        }
        return config;
    },

    // 验证所有配置
    validateAll: function(config) {
        this.validateMovementConfig(config);
        this.validateAnimationConfig(config);
        return config;
    }
};

// 配置管理器
const ConfigManager = {
    currentDifficulty: 'NORMAL',
    
    // 获取当前配置
    getConfig: function() {
        return GAME_CONFIG;
    },
    
    // 获取难度配置
    getDifficultyConfig: function() {
        return DIFFICULTY_CONFIG[this.currentDifficulty] || DIFFICULTY_CONFIG.NORMAL;
    },
    
    // 设置难度
    setDifficulty: function(difficulty) {
        if (DIFFICULTY_CONFIG[difficulty]) {
            this.currentDifficulty = difficulty;
            console.log('游戏难度已设置为:', difficulty);
        } else {
            console.warn('无效的难度级别:', difficulty, '使用默认难度');
            this.currentDifficulty = 'NORMAL';
        }
    },
    
    // 获取特定配置项
    get: function(path) {
        var keys = path.split('.');
        var value = GAME_CONFIG;
        
        for (var i = 0; i < keys.length; i++) {
            if (value && value[keys[i]] !== undefined) {
                value = value[keys[i]];
            } else {
                console.warn('配置路径不存在:', path);
                return null;
            }
        }
        
        return value;
    },
    
    // 应用难度修正
    getWithDifficulty: function(path, baseValue) {
        var config = this.get(path);
        if (config === null) return baseValue;
        
        var difficultyConfig = this.getDifficultyConfig();
        var multiplier = 1.0;
        
        // 根据路径确定使用哪个修正因子
        if (path.includes('ZOMBIE_HP')) {
            multiplier = difficultyConfig.ZOMBIE_HP_MULTIPLIER;
        } else if (path.includes('ZOMBIE_ATTACK')) {
            multiplier = difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER;
        }
        
        return config * multiplier;
    }
};

// 初始化时验证配置
ConfigValidator.validateAll(GAME_CONFIG);

// 导出配置
export { GAME_CONFIG, DIFFICULTY_CONFIG, ConfigManager, ConfigValidator };
export default ConfigManager;
