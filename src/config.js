/**
 * 游戏配置管理模块 (config.js)
 *
 * 功能：
 * - 统一管理所有游戏配置常量
 * - 消除硬编码的重复值
 * - 提供配置验证和默认值
 * - 支持不同难度级别的配置
 * - 统一管理角色和状态枚举
 * - 🔴 优化：消除重复配置项
 * - 🔴 优化：添加配置验证和默认值处理
 */

// 角色枚举 - 统一管理所有角色类型
const ROLE = {
    MAIN: 1,      // 主人物
    POLICE: 2,    // 警察
    CIVILIAN: 3,  // 平民
    DOCTOR: 4,    // 医生
    NURSE: 5,     // 护士
    CHEF: 6       // 厨师
};

// 🔴 优化：统一的基础配置
const BASE_CONFIG = {
    // 移动系统配置
    MOVEMENT: {
        CHARACTER_MOVE_SPEED: 3,        // 人物移动速度 (像素/帧，60fps)
        PARTNER_MOVE_SPEED: 3,          // 伙伴移动速度 (像素/帧，60fps)
        ZOMBIE_MOVE_SPEED: 2,           // 僵尸移动速度 (像素/帧，60fps)

        // 贴着建筑物移动配置
        WALL_FOLLOWING: {
            ENABLED: true,               // 启用贴着建筑物移动
            DIAGONAL_FACTOR: 1.0,        // 对角线移动速度因子（1.0倍）- 保持匀速
            SEARCH_STEPS: 8,             // 搜索步数
            MIN_STEP_SIZE: 2,            // 最小步长（像素）
            NEARBY_SEARCH_RADIUS: 0.5    // 附近搜索半径（相对于对象半径）
        }
    },

    // 动画系统配置
    ANIMATION: {
        DEFAULT_FRAME_RATE: 0.2,        // 默认动画帧率 (每帧更新0.2)
        MAX_ANIMATION_FRAMES: 8,        // 最大动画帧数
        ATTACK_ANIMATION_SPEED: 0.3,    // 攻击动画速度
        DEATH_ANIMATION_SPEED: 0.1,     // 死亡动画速度

        // 动画状态速度倍数
        STATE_SPEED_MULTIPLIERS: {
            MOVING: 1.5,                // 移动状态动画速度倍数
            ATTACKING: 2.0,             // 攻击状态动画速度倍数
            AVOIDING: 1.8,              // 避障状态动画速度倍数
            DIE: 0.5                    // 死亡状态动画速度倍数
        }
    },

    // 碰撞检测配置
    COLLISION: {
        DEFAULT_SAFE_DISTANCE: 30,      // 默认安全距离
        BUILDING_COLLISION_MARGIN: 10,  // 建筑物碰撞边距
        OBJECT_OVERLAP_MARGIN: 20,      // 对象重叠边距
        PATH_VALIDATION_STEPS: 10,      // 路径验证步数
        MIN_MOVE_DISTANCE: 1,           // 最小移动距离
    },

    // 检测范围配置
    DETECTION: {
        ZOMBIE_DETECTION_RANGE: 700,    // 僵尸基础检测范围（大部分僵尸类型）
        MAIN_CHARACTER_DETECTION: 1000, // 主人物检测范围
        SAFE_SPAWN_DISTANCE: 100,       // 安全生成距离
        MAX_SPAWN_SEARCH_RADIUS: 300,   // 最大生成搜索半径
    },

    // 攻击系统配置
    COMBAT: {
        // 角色基础属性配置
        DEFAULT_HP: 100,                // 默认血量100
        DEFAULT_ATTACK: 20,             // 默认攻击力20
        DEFAULT_ATTACK_INTERVAL: 0.5,   // 默认攻击间隔0.5秒 (1秒攻击2下)

        // 攻击范围配置
        MIN_ATTACK_RANGE: 100,           // 最小攻击距离
        MAIN_CHARACTER_ATTACK_RANGE: 100, // 主人物攻击范围
        POLICE_ATTACK_RANGE: 100,        // 警察攻击范围
        CIVILIAN_ATTACK_RANGE: 100,      // 平民攻击范围
        DOCTOR_ATTACK_RANGE: 100,        // 医生攻击范围
        NURSE_ATTACK_RANGE: 100,         // 护士攻击范围
        CHEF_ATTACK_RANGE: 100,         // 厨师攻击范围

        // 僵尸攻击配置
        ZOMBIE_ATTACK_COOLDOWN: 500,   // 僵尸攻击冷却时间（毫秒）- 1.5秒攻击一下
        ZOMBIE_ATTACK_RANGE: 80,        // 僵尸攻击范围（像素）

        // 攻击判定配置
        ATTACK_JUDGMENT: {
            RANGE_BUFFER: 5,            // 攻击范围缓冲（像素）- 让攻击更流畅
            DISTANCE_TOLERANCE: 2,       // 距离计算容差（像素）- 避免精度问题
            MIN_ATTACK_DISTANCE: 3       // 最小攻击距离（像素）- 防止贴脸攻击
        }
    },

    // 僵尸配置
    ZOMBIE: {
        // 基础属性
        BASE_HP: 50,                    // 僵尸基础血量
        BASE_ATTACK: 1,                  // 僵尸基础攻击力

        // 僵尸类型配置
        TYPES: {
            SKINNY: {
                HP_MULTIPLIER: 1.0,     // 血量倍数
                ATTACK_MULTIPLIER: 1.0,  // 攻击力倍数
                SIZE: 32,                // 尺寸
                COLOR: '#8B4513',        // 颜色
                SPEED_MULTIPLIER: 1    // 速度倍数
            }, 
            FAT: {
                HP_MULTIPLIER: 1.5,      // 血量倍数
                ATTACK_MULTIPLIER: 1.2,  // 攻击力倍数
                SIZE: 48,                // 尺寸
                COLOR: '#654321',        // 颜色
                SPEED_MULTIPLIER: 0.8    // 速度倍数
            }, 
            BOSS: {
                HP_MULTIPLIER: 3.0,      // 血量倍数
                ATTACK_MULTIPLIER: 2.0,  // 攻击力倍数
                SIZE: 48,                // 尺寸
                COLOR: '#8B0000',        // 颜色
                SPEED_MULTIPLIER: 0.9    // 速度倍数
            }, 
            FAST: {
                HP_MULTIPLIER: 0.8,      // 血量倍数
                ATTACK_MULTIPLIER: 0.8,  // 攻击力倍数
                SIZE: 32,                // 尺寸
                COLOR: '#228B22',        // 颜色
                SPEED_MULTIPLIER: 1    // 速度倍数
            }, 
            TANK: {
                HP_MULTIPLIER: 2.5,      // 血量倍数
                ATTACK_MULTIPLIER: 1.5,  // 攻击力倍数
                SIZE: 48,                // 尺寸
                COLOR: '#2F4F4F',        // 颜色
                SPEED_MULTIPLIER: 0.7    // 速度倍数
            }
        },

        // 行为配置
        BEHAVIOR: {
            ACTIVATION_DISTANCE: 700,    // 激活距离改为700px，确保700px范围内都追击人物
            IDLE_UPDATE_INTERVAL: 5,     // 待机状态更新间隔（帧数）
            ACTIVE_UPDATE_INTERVAL: 1,   // 活跃状态更新间隔（帧数）
            RANDOM_WALK_PROBABILITY: 0.1, // 随机游荡概率
            RANDOM_WALK_DISTANCE: 150    // 随机游荡距离
        },

        // 目标锁定配置
        TARGET_LOCK_DURATION: 100,      // 目标锁定持续时间（毫秒）- 0.1秒
    },

    // 对象尺寸配置
    OBJECT_SIZES: {
        CHARACTER: {
            WIDTH: 32, HEIGHT: 48
        }
    },

    // 伙伴系统配置
    PARTNER: {
        // 伙伴生成配置
        SPAWN: {
            COUNT: 5,                    // 生成伙伴数量
            ROLES: [2, 3, 4, 5, 6],      // 伙伴职业类型数组
            REGIONS: [                    // 生成区域配置
                {name: 'NORTH', centerX: 5000, centerY: 2000}, {
                    name: 'EAST',
                    centerX: 8000,
                    centerY: 5000
                }, {name: 'WEST', centerX: 2000, centerY: 5000}, {
                    name: 'SOUTH',
                    centerX: 5000,
                    centerY: 8000
                }, {name: 'CENTER', centerX: 5000, centerY: 5000}]
        },

        // 伙伴跟随配置
        FOLLOW: {
            MIN_DISTANCE: 200,           // 最小生成距离
            MAX_DISTANCE: 800,           // 最大生成距离
            SAFE_RADIUS: 16,             // 安全半径
            FOLLOW_DISTANCE: 80,         // 跟随距离
            FOLLOW_ANGLE: Math.PI,       // 跟随角度（后方）
            MOVE_THRESHOLD: 5,           // 移动阈值
            SPREAD: {
                ANGLE_RANGE: Math.PI / 3,  // 分散角度范围（60度）
                MAX_PARTNERS: 5,           // 最大伙伴数量
                DISTANCE_VARIATION: 20     // 距离变化范围（像素）
            }
        },

        // 伙伴碰撞配置
        COLLISION: {
            DETECTION_DISTANCE: 50,      // 碰撞检测距离
            MIN_OVERLAP_DISTANCE: 30,    // 最小重叠距离
            TARGET_DISTANCE: 40          // 目标距离
        },

        // 伙伴检测范围配置
        DETECTION: {
            POLICE_RANGE: 300,           // 警察检测范围
            CIVILIAN_RANGE: 250,         // 平民检测范围
            DOCTOR_RANGE: 280,           // 医生检测范围
            NURSE_RANGE: 280,            // 护士检测范围
            CHEF_RANGE: 260,             // 厨师检测范围
            DEFAULT_RANGE: 250           // 默认检测范围
        }
    },

    // 游戏机制配置
    GAMEPLAY: {
        // 摇杆配置
        JOYSTICK: {
            DEAD_ZONE: 0.1,              // 摇杆死区
            AUTO_HIDE: false,            // 摇杆是否自动隐藏（false表示始终显示）
            DYNAMIC_POSITION: false,     // 摇杆是否动态位置（false表示固定在默认位置）
            OUTER_RADIUS: 60,            // 摇杆外圈半径
            INNER_RADIUS: 25,            // 摇杆内圈半径
            TOUCH_THRESHOLD: 20          // 触摸阈值
        },

        // 卡住检测配置
        STUCK_DETECTION: {
            MIN_MOVE_DISTANCE: 5,        // 最小移动距离
            STUCK_THRESHOLD: 30,         // 卡住阈值（帧数）
            RESET_DELAY: 0.5             // 重置延迟（秒）
        }
    },

    // 性能配置
    PERFORMANCE: {
        // 游戏循环配置
        GAME_LOOP: {
            TARGET_FPS: 60,             // 目标帧率（60fps）
            ENABLE_FPS_LIMIT: true,     // 是否启用帧率限制
            FRAME_TIME: 16.67,          // 目标帧时间（毫秒）
        },
        
        MAX_ZOMBIES: 2000,              // 最大僵尸数量
        MAX_PARTNERS: 2000,             // 最大伙伴数量

        // 🔴 新增：渲染系统配置
        RENDERING: {
            // 渲染距离配置
            MAX_RENDER_DISTANCE: 1500,   // 最大渲染距离
            FRUSTUM_CULLING: true,       // 启用视锥剔除
            BATCH_RENDERING: true,      // 启用批量渲染
            
            // 🔴 新增：渲染排序配置
            SORTING: {
                ENABLED: true,           // 启用Y坐标排序
                LAYER_OFFSETS: {
                    BACKGROUND: 0,      // 背景层
                    BUILDING: 50,        // 🔴 修复：建筑物层（降低层级，确保在最底层）
                    ENTITY: 200,         // 实体层（角色、僵尸、伙伴）
                    EFFECT: 300,         // 特效层
                    UI: 400             // UI层
                },
                // 排序优化配置
                OPTIMIZATION: {
                    SORT_INTERVAL: 1,    // 排序间隔（帧数）
                    BATCH_SIZE: 100,     // 批量处理大小
                    ENABLE_CACHING: true // 启用排序缓存
                }
            }
        },

        // 摄像机配置
        CAMERA: {
            ZOOM: 0.7,               // 摄像机缩放比例
            FOLLOW_SPEED: 0.1,       // 跟随速度
            MIN_ZOOM: 0.3,           // 最小缩放
            MAX_ZOOM: 1.2            // 最大缩放
        }
    }
};

// 🔴 优化：时间系统配置（从BASE_CONFIG中分离，避免重复）
const TIME_SYSTEM_CONFIG = {
    DAY_DURATION: 10,              // 一天的长度（秒）- 白天5秒，晚上5秒
    DAY_PHASE_DURATION: 5,         // 白天/夜晚阶段长度（秒）
    ZOMBIES_PER_DAY: 10,           // 每天刷新的僵尸数量
    PARTNERS_PER_DAY: 1,          // 每天刷新的伙伴数量
    SPAWN_RANGE: {
        MIN_DISTANCE: 500,         // 僵尸生成最小距离（px）
        MAX_DISTANCE: 700          // 僵尸生成最大距离（px）
    },
    PARTNER_SPAWN_RANGE: {         // 伙伴生成距离范围
        MIN_DISTANCE: 200,         // 伙伴生成最小距离（px）
        MAX_DISTANCE: 400          // 伙伴生成最大距离（px）
    }
};

// 游戏基础配置
const GAME_CONFIG = {
    ...BASE_CONFIG,
    TIME_SYSTEM: TIME_SYSTEM_CONFIG
};

// 难度级别配置
const DIFFICULTY_CONFIG = {
    EASY: {
        ZOMBIE_HP_MULTIPLIER: 0.8, ZOMBIE_ATTACK_MULTIPLIER: 0.8, ZOMBIE_SPAWN_RATE: 0.7, PLAYER_HP_BONUS: 1.2
    }, 
    NORMAL: {
        ZOMBIE_HP_MULTIPLIER: 1.0, ZOMBIE_ATTACK_MULTIPLIER: 1.0, ZOMBIE_SPAWN_RATE: 1.0, PLAYER_HP_BONUS: 1.0
    }, 
    HARD: {
        ZOMBIE_HP_MULTIPLIER: 1.3, ZOMBIE_ATTACK_MULTIPLIER: 1.2, ZOMBIE_SPAWN_RATE: 1.3, PLAYER_HP_BONUS: 0.9
    }
};

// 🔴 优化：配置验证器
const ConfigValidator = {
    // 验证移动配置
    validateMovementConfig: function (config) {
        if (!config.MOVEMENT) {
            throw new Error('移动配置缺失');
        }
        
        const movement = config.MOVEMENT;
        if (movement.CHARACTER_MOVE_SPEED <= 0 || movement.ZOMBIE_MOVE_SPEED <= 0 || movement.PARTNER_MOVE_SPEED <= 0) {
            throw new Error('移动速度必须大于0');
        }
        
        return config;
    },

    // 验证动画配置
    validateAnimationConfig: function (config) {
        if (!config.ANIMATION) {
            throw new Error('动画配置缺失');
        }
        
        const animation = config.ANIMATION;
        if (animation.DEFAULT_FRAME_RATE <= 0) {
            throw new Error('动画帧率必须大于0');
        }
        
        if (animation.MAX_ANIMATION_FRAMES <= 0) {
            throw new Error('最大动画帧数必须大于0');
        }
        
        return config;
    },

    // 验证时间系统配置
    validateTimeSystemConfig: function (config) {
        if (!config.TIME_SYSTEM) {
            throw new Error('时间系统配置缺失');
        }
        
        const timeSystem = config.TIME_SYSTEM;
        if (timeSystem.DAY_DURATION <= 0) {
            throw new Error('一天的长度必须大于0');
        }
        
        if (timeSystem.ZOMBIES_PER_DAY < 0) {
            throw new Error('每天僵尸数量不能为负数');
        }
        
        if (timeSystem.SPAWN_RANGE.MIN_DISTANCE >= timeSystem.SPAWN_RANGE.MAX_DISTANCE) {
            throw new Error('僵尸生成范围无效');
        }
        
        return config;
    },

    // 验证战斗配置
    validateCombatConfig: function (config) {
        if (!config.COMBAT) {
            throw new Error('战斗配置缺失');
        }
        
        const combat = config.COMBAT;
        if (combat.DEFAULT_HP <= 0) {
            throw new Error('默认血量必须大于0');
        }
        
        if (combat.DEFAULT_ATTACK < 0) {
            throw new Error('默认攻击力不能为负数');
        }
        
        return config;
    },

    // 验证所有配置
    validateAll: function (config) {
        this.validateMovementConfig(config);
        this.validateAnimationConfig(config);
        this.validateTimeSystemConfig(config);
        this.validateCombatConfig(config);
        return config;
    }
};

// 🔴 优化：配置管理器
const ConfigManager = {
    currentDifficulty: 'NORMAL',

    // 获取难度配置
    getDifficultyConfig: function () {
        return DIFFICULTY_CONFIG[this.currentDifficulty] || DIFFICULTY_CONFIG.NORMAL;
    },

    // 获取特定配置项（带默认值）
    get: function (path, defaultValue = null) {
        var keys = path.split('.');
        var value = GAME_CONFIG;

        for (var i = 0; i < keys.length; i++) {
            if (value && value[keys[i]] !== undefined) {
                value = value[keys[i]];
            } else {
                if (defaultValue !== null) {
                    return defaultValue;
                }
                throw new Error('配置路径不存在: ' + path);
            }
        }

        return value;
    },

    // 🔴 新增：安全获取配置项（不抛出错误）
    safeGet: function (path, defaultValue = null) {
        try {
            return this.get(path, defaultValue);
        } catch (error) {
            console.warn('配置获取失败:', path, '使用默认值:', defaultValue);
            return defaultValue;
        }
    },

    // 🔴 新增：设置配置项
    set: function (path, value) {
        var keys = path.split('.');
        var config = GAME_CONFIG;

        for (var i = 0; i < keys.length - 1; i++) {
            if (!config[keys[i]]) {
                config[keys[i]] = {};
            }
            config = config[keys[i]];
        }

        config[keys[keys.length - 1]] = value;
        return value;
    },

    // 🔴 新增：重置配置到默认值
    reset: function () {
        // 重新加载默认配置
        Object.assign(GAME_CONFIG, BASE_CONFIG);
        GAME_CONFIG.TIME_SYSTEM = TIME_SYSTEM_CONFIG;
        
        // 重新验证配置
        ConfigValidator.validateAll(GAME_CONFIG);
        
        console.log('✅ 配置已重置到默认值');
    }
};

// 初始化时验证配置
ConfigValidator.validateAll(GAME_CONFIG);

// 导出配置
export {GAME_CONFIG, DIFFICULTY_CONFIG, ConfigManager, ConfigValidator, ROLE};
export default ConfigManager;
