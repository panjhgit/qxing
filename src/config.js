/**
 * 游戏配置管理模块 (config.js)
 *
 * 功能：
 * - 统一管理所有游戏配置常量
 * - 消除硬编码的重复值
 * - 提供配置验证和默认值
 * - 支持不同难度级别的配置
 *
 * 配置说明：
 * ========================================
 *
 * 🎯 检测范围配置 (DETECTION)
 * ========================================
 *
 * 1. 基础检测范围
 *    - ZOMBIE_DETECTION_RANGE: 200px - 僵尸基础检测范围
 *    - MAIN_CHARACTER_DETECTION: 1000px - 主人物检测范围
 *    - SAFE_SPAWN_DISTANCE: 100px - 安全生成距离
 *    - MAX_SPAWN_SEARCH_RADIUS: 300px - 最大生成搜索半径
 *
 * 2. 僵尸各类型检测范围 (ZOMBIE_TYPES)
 *    - SKINNY: 检测200px, 攻击40px - 轻量级，基础检测能力
 *    - FAT: 检测200px, 攻击50px - 中等重量，基础检测能力
 *    - BOSS: 检测300px, 攻击80px - 重量级，增强检测能力(+50%)
 *    - FAST: 检测250px, 攻击30px - 轻量级，增强检测能力(+25%)
 *    - TANK: 检测150px, 攻击60px - 重量级，减少检测能力(-25%)
 *    - DEFAULT: 检测200px, 攻击45px - 标准配置
 *
 * 3. 特殊检测范围 (SPECIAL_DETECTION)
 *    - MAIN_CHARACTER_PRIORITY_RANGE: 700px - 主人物优先检测范围（最高优先级）
 *    - PARTNER_DETECTION_RANGE: 200px - 伙伴检测范围
 *
 * 4. 检测行为配置 (BEHAVIOR)
 *    - DETECTION_FREQUENCY: 0.005 - 每帧检测概率(0.5%)
 *    - TARGET_SWITCH_DELAY: 1000ms - 目标切换延迟
 *    - RANGE_DECAY_FACTOR: 0.95 - 检测范围衰减因子
 *    - MULTI_TARGET_STRATEGY: 'nearest' - 多目标选择策略
 *
 * 🚀 移动系统配置 (MOVEMENT)
 * ========================================
 * - DEFAULT_MOVE_SPEED: 300px/s - 默认移动速度
 * - CHARACTER_MOVE_SPEED: 300px/s - 人物移动速度
 * - ZOMBIE_MOVE_SPEED: 180px/s - 僵尸移动速度（比人物慢）
 *
 * ⚔️ 攻击系统配置 (COMBAT)
 * ========================================
 * - DEFAULT_ATTACK_COOLDOWN: 1000ms - 默认攻击冷却时间
 * - MIN_ATTACK_RANGE: 30px - 最小攻击距离
 * - MAX_ATTACK_RANGE: 150px - 最大攻击距离
 *
 * 🎮 游戏平衡说明
 * ========================================
 *
 * 僵尸检测范围设计原则：
 * 1. 基础僵尸(200px): 平衡的检测能力，不会过早发现玩家
 * 2. 增强僵尸(250-300px): 更具威胁性，需要玩家更谨慎
 * 3. 减弱僵尸(150px): 降低威胁，适合新手玩家
 * 4. 主人物优先检测(700px): 确保僵尸能及时发现主要威胁
 *
 * 攻击范围设计原则：
 * 1. 轻量级僵尸(30-40px): 需要接近玩家才能攻击
 * 2. 重量级僵尸(60-80px): 可以在更远距离攻击
 * 3. 平衡性考虑：攻击范围越大，移动速度通常越慢
 *
 * 配置调整建议：
 * - 增加僵尸检测范围：提高游戏难度
 * - 减少僵尸检测范围：降低游戏难度
 * - 调整主人物优先检测范围：影响僵尸的警觉性
 * - 修改检测频率：影响僵尸的反应速度
 */

// 游戏基础配置
const GAME_CONFIG = {
    // 移动系统配置
    MOVEMENT: {
        DEFAULT_MOVE_SPEED: 300,        // 默认移动速度 (像素/秒)
        CHARACTER_MOVE_SPEED: 300,      // 人物移动速度 (像素/秒)
        ZOMBIE_MOVE_SPEED: 180,         // 僵尸移动速度 (像素/秒) - 比人物慢
        MIN_MOVE_DISTANCE: 1,            // 最小移动距离
        PATHFINDING_STEPS: 10,          // 路径检测步数
        SMOOTH_MOVE_RATIOS: [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1], // 平滑移动比例
        
        // 夜晚速度配置
        NIGHT_SPEED_MULTIPLIER: 1.67    // 夜晚速度倍数（僵尸夜晚速度提升）
    },

    // 动画系统配置
    ANIMATION: {
        DEFAULT_FRAME_RATE: 0.2,        // 默认动画帧率 (每帧更新0.2)
        MAX_ANIMATION_FRAMES: 8,        // 最大动画帧数
        ANIMATION_RESET_THRESHOLD: 8,   // 动画重置阈值
        
        // 角色动画速度配置
        ATTACK_ANIMATION_SPEED: 0.3,    // 攻击动画速度
        DEATH_ANIMATION_SPEED: 0.1,     // 死亡动画速度
        
        // 僵尸动画速度配置
        ZOMBIE_ATTACK_ANIMATION_SPEED: 0.4,  // 僵尸攻击动画速度
        DEATH_ANIMATION_DURATION: 2.0        // 死亡动画持续时间（秒）
    },

    // 碰撞检测配置
    COLLISION: {
        DEFAULT_SAFE_DISTANCE: 30,      // 默认安全距离
        BUILDING_COLLISION_MARGIN: 10,  // 建筑物碰撞边距
        OBJECT_OVERLAP_MARGIN: 20,      // 对象重叠边距
        PATH_VALIDATION_STEPS: 10,      // 路径验证步数
        MIN_MOVE_DISTANCE: 1,           // 最小移动距离

        // 新增：碰撞间距配置
        COLLISION_MARGINS: {
            BUILDING: 1.1,              // 建筑物碰撞：1.1倍半径（额外10%空间）
            CHARACTER_TO_CHARACTER: 1.3  // 角色间重叠：1.3倍半径（30%额外空间）
        }
    },

    // 攻击系统配置
    COMBAT: {
        DEFAULT_ATTACK_COOLDOWN: 1000,  // 默认攻击冷却时间 (毫秒) - 改回合理值
        MIN_ATTACK_RANGE: 30,           // 最小攻击距离
        MAX_ATTACK_RANGE: 150,          // 最大攻击距离
        DAMAGE_REDUCTION_FACTOR: 0.8,   // 伤害衰减因子
        
        // 角色攻击配置
        DEFAULT_ATTACK: 10,             // 默认攻击力
        DEFAULT_ATTACK_INTERVAL: 1.0,   // 默认攻击间隔（秒）
        MOVING_ATTACK_INTERVAL: 0.8,    // 移动攻击间隔（秒）
        
        // 角色攻击范围配置
        POLICE_ATTACK_RANGE: 100,       // 警察攻击范围
        DOCTOR_ATTACK_RANGE: 80,        // 医生攻击范围
        NURSE_ATTACK_RANGE: 60,         // 护士攻击范围
        CHEF_ATTACK_RANGE: 70           // 厨师攻击范围
    },

    // 检测范围配置
    DETECTION: {
        // 基础检测范围
        ZOMBIE_DETECTION_RANGE: 700,    // 僵尸基础检测范围（大部分僵尸类型）
        MAIN_CHARACTER_DETECTION: 1000, // 主人物检测范围
        SAFE_SPAWN_DISTANCE: 100,       // 安全生成距离
        MAX_SPAWN_SEARCH_RADIUS: 300,   // 最大生成搜索半径

        // 僵尸各类型检测范围配置
        ZOMBIE_TYPES: {
            // 瘦僵尸：轻量级，基础检测能力
            SKINNY: {
                DETECTION_RANGE: 700,    // 检测范围：200px（改回合理值）
                ATTACK_RANGE: 40,        // 攻击范围：40px
                PRIORITY: 'normal'       // 优先级：普通
            },

            // 胖僵尸：中等重量，基础检测能力
            FAT: {
                DETECTION_RANGE: 700,    // 检测范围：200px（改回合理值）
                ATTACK_RANGE: 50,        // 攻击范围：50px
                PRIORITY: 'normal'       // 优先级：普通
            },

            // Boss僵尸：重量级，增强检测能力
            BOSS: {
                DETECTION_RANGE: 700,    // 检测范围：300px（改回合理值）
                ATTACK_RANGE: 80,        // 攻击范围：80px
                PRIORITY: 'high'         // 优先级：高
            },

            // 快速僵尸：轻量级，增强检测能力
            FAST: {
                DETECTION_RANGE: 700,    // 检测范围：250px（改回合理值）
                ATTACK_RANGE: 30,        // 攻击范围：30px
                PRIORITY: 'high'         // 优先级：高
            },

            // 坦克僵尸：重量级，减少检测能力
            TANK: {
                DETECTION_RANGE: 700,    // 检测范围：150px（改回合理值）
                ATTACK_RANGE: 60,        // 攻击范围：60px
                PRIORITY: 'low'          // 优先级：低
            },

            // 默认僵尸：标准配置
            DEFAULT: {
                DETECTION_RANGE: 700,    // 检测范围：200px（改回合理值）
                ATTACK_RANGE: 45,        // 攻击范围：45px
                PRIORITY: 'normal'       // 优先级：普通
            }
        },

        // 特殊检测范围配置
        SPECIAL_DETECTION: {
            // 主人物优先检测范围（最高优先级）
            MAIN_CHARACTER_PRIORITY_RANGE: 700,  // 700px范围内优先检测主人物

            // 伙伴检测范围
            PARTNER_DETECTION_RANGE: 200,        // 200px范围内检测伙伴


        },

        // 检测行为配置
        BEHAVIOR: {
            // 检测频率（每帧检测概率）
            DETECTION_FREQUENCY: 0.005,         // 0.5%概率每帧检测

            // 目标切换延迟
            TARGET_SWITCH_DELAY: 1000,          // 1000ms后允许切换目标

            // 检测范围衰减
            RANGE_DECAY_FACTOR: 0.95,           // 检测范围随时间衰减因子

            // 多目标选择策略
            MULTI_TARGET_STRATEGY: 'nearest',   // 选择最近的目标
        }
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

    // 时间系统配置
    TIME_SYSTEM: {
        DAY_DURATION: 10,              // 一天的长度（秒）- 白天5秒，晚上5秒
        DAY_PHASE_DURATION: 5,         // 白天/夜晚阶段长度（秒）
        ZOMBIES_PER_DAY: 10,           // 每天刷新的僵尸数量
        SPAWN_RANGE: {
            MIN_DISTANCE: 500,         // 僵尸生成最小距离（px）
            MAX_DISTANCE: 700          // 僵尸生成最大距离（px）
        }
    },

    // 对象尺寸配置
    OBJECT_SIZES: {
        CHARACTER: {
            WIDTH: 32, HEIGHT: 48
        }, ZOMBIE: {
            DEFAULT: {WIDTH: 32, HEIGHT: 32},
            SKINNY: {WIDTH: 24, HEIGHT: 24},
            FAT: {WIDTH: 32, HEIGHT: 32},
            BOSS: {WIDTH: 48, HEIGHT: 48},
            FAST: {WIDTH: 20, HEIGHT: 20},
            TANK: {WIDTH: 40, HEIGHT: 40}
        }
    },

    // 性能配置
    PERFORMANCE: {
        MAX_ZOMBIES: 100,               // 最大僵尸数量
        MAX_CHARACTERS: 50,             // 最大人物数量
        QUADTREE_MAX_OBJECTS: 8,        // 四叉树最大对象数
        QUADTREE_MAX_DEPTH: 6,          // 四叉树最大深度
        CACHE_CLEANUP_THRESHOLD: 1000,  // 缓存清理阈值
        
        // 新增：分帧更新策略配置
        BATCH_UPDATE: {
            BATCH_SIZE: 5,              // 僵尸分为5个批次
            HIGH_PRIORITY_RANGE: 500,   // 高优先级范围：500px内
            MEDIUM_PRIORITY_RANGE: 800, // 中优先级范围：500-800px
            LOW_PRIORITY_RANGE: Infinity, // 低优先级范围：800px外
            HIGH_UPDATE_FREQUENCY: 1,   // 高优先级：每帧更新
            MEDIUM_UPDATE_FREQUENCY: 2, // 中优先级：每2帧更新
            LOW_UPDATE_FREQUENCY: 3     // 低优先级：每3帧更新
        },
        
        // 新增：性能优化配置
        OPTIMIZATION: {
            // 检测范围限制（防止性能问题）
            MAX_DETECTION_RANGE: 500,    // 最大检测范围限制
            MIN_DETECTION_RANGE: 100,    // 最小检测范围限制
            
            // 更新频率控制
            ZOMBIE_UPDATE_INTERVAL: 2,   // 僵尸每2帧更新一次（减少CPU负载）
            CHARACTER_UPDATE_INTERVAL: 1, // 角色每帧更新一次
            
            // 碰撞检测优化
            COLLISION_CHECK_INTERVAL: 3, // 碰撞检测每3帧检查一次
            DISTANCE_CALC_CACHE: true,   // 启用距离计算缓存
            
            // 内存管理
            MAX_ACTIVE_OBJECTS: 200,     // 最大活跃对象数
            GARBAGE_COLLECTION_INTERVAL: 300, // 垃圾回收间隔（帧数）
            
            // 渲染优化
            RENDER_DISTANCE: 1500,       // 渲染距离限制
            CULLING_ENABLED: true,       // 启用视锥剔除
            LOD_ENABLED: true            // 启用细节层次
        }
    }
};

// 难度级别配置
const DIFFICULTY_CONFIG = {
    EASY: {
        ZOMBIE_HP_MULTIPLIER: 0.8, ZOMBIE_ATTACK_MULTIPLIER: 0.8, ZOMBIE_SPAWN_RATE: 0.7, PLAYER_HP_BONUS: 1.2
    }, NORMAL: {
        ZOMBIE_HP_MULTIPLIER: 1.0, ZOMBIE_ATTACK_MULTIPLIER: 1.0, ZOMBIE_SPAWN_RATE: 1.0, PLAYER_HP_BONUS: 1.0
    }, HARD: {
        ZOMBIE_HP_MULTIPLIER: 1.3, ZOMBIE_ATTACK_MULTIPLIER: 1.2, ZOMBIE_SPAWN_RATE: 1.3, PLAYER_HP_BONUS: 0.9
    }
};

// 配置验证器
const ConfigValidator = {
    // 验证移动配置
    validateMovementConfig: function (config) {
        if (config.MOVEMENT.DEFAULT_MOVE_SPEED <= 0) {
            console.warn('移动速度必须大于0，使用默认值');
            config.MOVEMENT.DEFAULT_MOVE_SPEED = 120;
        }
        return config;
    },

    // 验证动画配置
    validateAnimationConfig: function (config) {
        if (config.ANIMATION.DEFAULT_FRAME_RATE <= 0) {
            console.warn('动画帧率必须大于0，使用默认值');
            config.ANIMATION.DEFAULT_FRAME_RATE = 0.1;
        }
        return config;
    },

    // 验证时间系统配置
    validateTimeSystemConfig: function (config) {
        if (config.TIME_SYSTEM.DAY_DURATION <= 0) {
            console.warn('一天的长度必须大于0，使用默认值');
            config.TIME_SYSTEM.DAY_DURATION = 10;
        }
        if (config.TIME_SYSTEM.ZOMBIES_PER_DAY <= 0) {
            console.warn('每天僵尸数量必须大于0，使用默认值');
            config.TIME_SYSTEM.ZOMBIES_PER_DAY = 10;
        }
        if (config.TIME_SYSTEM.SPAWN_RANGE.MIN_DISTANCE >= config.TIME_SYSTEM.SPAWN_RANGE.MAX_DISTANCE) {
            console.warn('僵尸生成范围无效，使用默认值');
            config.TIME_SYSTEM.SPAWN_RANGE.MIN_DISTANCE = 500;
            config.TIME_SYSTEM.SPAWN_RANGE.MAX_DISTANCE = 700;
        }
        return config;
    },

    // 验证所有配置
    validateAll: function (config) {
        this.validateMovementConfig(config);
        this.validateAnimationConfig(config);
        this.validateTimeSystemConfig(config);
        return config;
    }
};

// 配置管理器
const ConfigManager = {
    currentDifficulty: 'NORMAL',

    // 获取当前配置
    getConfig: function () {
        return GAME_CONFIG;
    },

    // 获取难度配置
    getDifficultyConfig: function () {
        return DIFFICULTY_CONFIG[this.currentDifficulty] || DIFFICULTY_CONFIG.NORMAL;
    },

    // 设置难度
    setDifficulty: function (difficulty) {
        if (DIFFICULTY_CONFIG[difficulty]) {
            this.currentDifficulty = difficulty;
            console.log('游戏难度已设置为:', difficulty);
        } else {
            console.warn('无效的难度级别:', difficulty, '使用默认难度');
            this.currentDifficulty = 'NORMAL';
        }
    },

    // 获取特定配置项
    get: function (path) {
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
    getWithDifficulty: function (path, baseValue) {
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
export {GAME_CONFIG, DIFFICULTY_CONFIG, ConfigManager, ConfigValidator};
export default ConfigManager;
