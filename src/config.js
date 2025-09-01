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
 * - CHARACTER_MOVE_SPEED: 3px/帧 - 主人物移动速度 (60fps下180px/秒)
 * - ZOMBIE_MOVE_SPEED: 2px/帧 - 僵尸移动速度 (60fps下120px/秒，比主人物慢)
 * - PARTNER_MOVE_SPEED: 3px/帧 - 伙伴移动速度 (60fps下180px/秒，与主人物相同)
 *
 * 🎮 游戏循环配置 (PERFORMANCE.GAME_LOOP)
 * ========================================
 * - TARGET_FPS: 60 - 目标帧率（60fps，确保游戏体验一致）
 * - ENABLE_FPS_LIMIT: true - 启用帧率限制（节省电量，提高稳定性）
 * - FRAME_TIME: 16.67ms - 目标帧时间（1000ms/60fps）
 *
 * 60fps限制的好处：
 * 1. 性能稳定：避免高帧率导致的性能浪费
 * 2. 电池续航：减少不必要的渲染，节省电量
 * 3. 游戏一致性：所有设备上的游戏体验完全相同
 * 4. 简化计算：deltaTime固定为1/60秒，移动计算更简单
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
        CHARACTER_MOVE_SPEED: 3,        // 🔴 简化：人物移动速度 (像素/帧，60fps)
        ZOMBIE_MOVE_SPEED: 2,           // 🔴 简化：僵尸移动速度 (像素/帧，60fps)
        PARTNER_MOVE_SPEED: 3,          // 🔴 简化：伙伴移动速度 (像素/帧，60fps)

        // 贴着建筑物移动配置
        WALL_FOLLOWING: {
            ENABLED: true,               // 启用贴着建筑物移动
            DIAGONAL_FACTOR: 1.0,        // 对角线移动速度因子（1.0倍）- 保持匀速
            SEARCH_STEPS: 4,             // 搜索步数
            MIN_STEP_SIZE: 2,            // ✅ 恢复：最小步长（像素）- 从2恢复到4
            NEARBY_SEARCH_RADIUS: 0.5    // 附近搜索半径（相对于对象半径）
        }
    }, // 时间系统配置
    TIME_SYSTEM: {
        DAY_DURATION: 10,              // 一天的长度（秒）- 白天5秒，晚上5秒
        DAY_PHASE_DURATION: 5,         // 白天/夜晚阶段长度（秒）
        ZOMBIES_PER_DAY: 10,           // 每天刷新的僵尸数量
        PARTNERS_PER_DAY: 1,          // 🔴 新增：每天刷新的伙伴数量
        SPAWN_RANGE: {
            MIN_DISTANCE: 500,         // 僵尸生成最小距离（px）
            MAX_DISTANCE: 700          // 僵尸生成最大距离（px）
        }, PARTNER_SPAWN_RANGE: {         // 🔴 新增：伙伴生成距离范围
            MIN_DISTANCE: 200,         // 伙伴生成最小距离（px）
            MAX_DISTANCE: 400          // 伙伴生成最大距离（px）
        }
    }, // 动画系统配置
    ANIMATION: {
        DEFAULT_FRAME_RATE: 0.2,        // 默认动画帧率 (每帧更新0.2)
        MAX_ANIMATION_FRAMES: 8,        // 最大动画帧数
        ANIMATION_RESET_THRESHOLD: 8,   // 动画重置阈值

        // 角色动画速度配置
        ATTACK_ANIMATION_SPEED: 0.3,    // 攻击动画速度
        DEATH_ANIMATION_SPEED: 0.1,     // 死亡动画速度

        // 动画状态速度倍数
        STATE_SPEED_MULTIPLIERS: {
            MOVING: 1.5,                // 移动状态动画速度倍数
            ATTACKING: 2.0,             // 攻击状态动画速度倍数
            AVOIDING: 1.8,              // 避障状态动画速度倍数
            DIE: 0.5                    // 死亡状态动画速度倍数
        },

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

        // 碰撞间距配置
        COLLISION_MARGINS: {
            BUILDING: 1.1,              // 建筑物碰撞：1.1倍半径（额外10%空间）
            CHARACTER_TO_CHARACTER: 1.3  // 角色间重叠：1.3倍半径（30%额外空间）
        }
    },

    // 攻击系统配置
    COMBAT: {
        DEFAULT_ATTACK_COOLDOWN: 500,   // 攻击冷却时间500ms (1秒攻击2下)
        MIN_ATTACK_RANGE: 100,           // 最小攻击距离10px
        MAX_ATTACK_RANGE: 100,           // 最大攻击距离10px
        DAMAGE_REDUCTION_FACTOR: 0.8,   // 伤害衰减因子

        // 角色基础属性配置
        DEFAULT_HP: 100,                // 默认血量100
        DEFAULT_ATTACK: 20,             // 默认攻击力20
        DEFAULT_ATTACK_INTERVAL: 0.5,   // 默认攻击间隔0.5秒 (1秒攻击2下)
        MOVING_ATTACK_INTERVAL: 0.5,    // 移动攻击间隔0.5秒 (1秒攻击2下)

        // 角色攻击范围配置
        POLICE_ATTACK_RANGE: 100,        // 🔴 修复：警察攻击范围增加到150px
        DOCTOR_ATTACK_RANGE: 100,        // 🔴 修复：医生攻击范围增加到140px
        NURSE_ATTACK_RANGE: 100,         // 🔴 修复：护士攻击范围增加到140px
        CHEF_ATTACK_RANGE: 100,         // 🔴 修复：厨师攻击范围增加到130px

        // 僵尸攻击配置
        ZOMBIE_ATTACK_RANGE: 80,        // 僵尸攻击范围（像素）
        ZOMBIE_ATTACK_COOLDOWN: 500,   // 僵尸攻击冷却时间（毫秒）- 1.5秒攻击一下

        // 攻击判定配置
        ATTACK_JUDGMENT: {
            RANGE_BUFFER: 5,            // 攻击范围缓冲（像素）- 让攻击更流畅
            DISTANCE_TOLERANCE: 2,       // 距离计算容差（像素）- 避免精度问题
            MIN_ATTACK_DISTANCE: 3       // 最小攻击距离（像素）- 防止贴脸攻击
        }
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
                DETECTION_RANGE: 1000,    // 检测范围：1000px
                ATTACK_RANGE: 80,        // 攻击范围：10px
                PRIORITY: 'normal'       // 优先级：普通
            },

            // 胖僵尸：中等重量，基础检测能力
            FAT: {
                DETECTION_RANGE: 1000,    // 检测范围：1000px
                ATTACK_RANGE: 80,        // 攻击范围：10px
                PRIORITY: 'normal'       // 优先级：普通
            },

            // Boss僵尸：重量级，增强检测能力
            BOSS: {
                DETECTION_RANGE: 1000,    // 检测范围：1000px
                ATTACK_RANGE: 80,        // 攻击范围：10px
                PRIORITY: 'normal'       // 优先级：普通
            },

            // 快速僵尸：轻量级，增强检测能力
            FAST: {
                DETECTION_RANGE: 1000,    // 检测范围：1000px
                ATTACK_RANGE: 80,        // 攻击范围：10px
                PRIORITY: 'normal'       // 优先级：普通
            },

            // 坦克僵尸：重量级，减少检测能力
            TANK: {
                DETECTION_RANGE: 1000,    // 检测范围：1000px
                ATTACK_RANGE: 80,        // 攻击范围：10px
                PRIORITY: 'normal'       // 优先级：普通
            },

            // 默认僵尸：标准配置
            DEFAULT: {
                DETECTION_RANGE: 1000,    // 检测范围：1000px
                ATTACK_RANGE: 80,        // 攻击范围：10px
                PRIORITY: 'normal'       // 优先级：普通
            }
        },

        // 特殊检测范围配置
        SPECIAL_DETECTION: {
            // 主人物优先检测范围（最高优先级）
            MAIN_CHARACTER_PRIORITY_RANGE: 1000,  // 700px范围内优先检测主人物

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
            }, FAT: {
                HP_MULTIPLIER: 1.5,      // 血量倍数
                ATTACK_MULTIPLIER: 1.2,  // 攻击力倍数
                SIZE: 48,                // 尺寸
                COLOR: '#654321',        // 颜色
                SPEED_MULTIPLIER: 0.8    // 速度倍数
            }, BOSS: {
                HP_MULTIPLIER: 3.0,      // 血量倍数
                ATTACK_MULTIPLIER: 2.0,  // 攻击力倍数
                SIZE: 48,                // 尺寸
                COLOR: '#8B0000',        // 颜色
                SPEED_MULTIPLIER: 0.9    // 速度倍数
            }, FAST: {
                HP_MULTIPLIER: 0.8,      // 血量倍数
                ATTACK_MULTIPLIER: 0.8,  // 攻击力倍数
                SIZE: 32,                // 尺寸
                COLOR: '#228B22',        // 颜色
                SPEED_MULTIPLIER: 1    // 速度倍数
            }, TANK: {
                HP_MULTIPLIER: 2.5,      // 血量倍数
                ATTACK_MULTIPLIER: 1.5,  // 攻击力倍数
                SIZE: 48,                // 尺寸
                COLOR: '#2F4F4F',        // 颜色
                SPEED_MULTIPLIER: 0.7    // 速度倍数
            }
        },

        // 行为配置
        BEHAVIOR: {
            ACTIVATION_DISTANCE: 700,    // 🔴 修复：激活距离改为700px，确保700px范围内都追击人物
            IDLE_UPDATE_INTERVAL: 5,     // 待机状态更新间隔（帧数）
            ACTIVE_UPDATE_INTERVAL: 1,   // 活跃状态更新间隔（帧数）
            RANDOM_WALK_PROBABILITY: 0.1, // 随机游荡概率
            RANDOM_WALK_DISTANCE: 150    // 随机游荡距离
        },

        // 🔴 新增：目标锁定配置
        TARGET_LOCK_DURATION: 1000,     // 目标锁定持续时间（毫秒）- 1秒
        TARGET_SWITCH_COOLDOWN: 200     // 目标切换冷却时间（毫秒）- 0.5秒
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

            // 🔴 新增：伙伴跟随分散配置
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

        // 🔴 新增：伙伴检测范围配置
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
            MOVE_SPEED: 4                // 摇杆移动速度
        },

        // 卡住检测配置
        STUCK_DETECTION: {
            MIN_MOVE_DISTANCE: 5,        // 最小移动距离
            STUCK_THRESHOLD: 30,         // 卡住阈值（帧数）
            RESET_DELAY: 0.5             // 重置延迟（秒）
        },

        // 死亡动画配置
        DEATH: {
            ANIMATION_DURATION: 2.0,     // 死亡动画持续时间
            MAIN_CHARACTER_DURATION: 3.0 // 主人物死亡动画持续时间
        }
    },

    // 性能配置
    PERFORMANCE: {
        // 游戏循环配置
        GAME_LOOP: {
            TARGET_FPS: 60,             // 🔴 新增：目标帧率（60fps）
            ENABLE_FPS_LIMIT: true,     // 🔴 新增：是否启用帧率限制
            FRAME_TIME: 16.67,          // 🔴 新增：目标帧时间（毫秒）
        },
        
        MAX_ZOMBIES: 100,               // 最大僵尸数量
        MAX_CHARACTERS: 50,             // 最大人物数量
        MAX_PARTNERS: 9999,             // 🔴 新增：最大伙伴数量（设置为9999，基本无限制）
        QUADTREE_MAX_OBJECTS: 8,        // 四叉树最大对象数
        QUADTREE_MAX_DEPTH: 6,          // 四叉树最大深度
        CACHE_CLEANUP_THRESHOLD: 1000,  // 缓存清理阈值

        // 性能优化配置
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
            LOD_ENABLED: true,           // 启用细节层次

            // 摄像机配置
            CAMERA: {
                ZOOM: 0.7,               // 摄像机缩放比例
                FOLLOW_SPEED: 0.1,       // 跟随速度
                MIN_ZOOM: 0.3,           // 最小缩放
                MAX_ZOOM: 1.2            // 最大缩放
            }
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
    // 移动配置已固定为5px，无需验证
    validateMovementConfig: function (config) {
        return config;
    },

    // 验证动画配置
    validateAnimationConfig: function (config) {
        if (config.ANIMATION.DEFAULT_FRAME_RATE <= 0) {
            throw new Error('动画帧率必须大于0');
        }
        return config;
    },

    // 验证时间系统配置
    validateTimeSystemConfig: function (config) {
        if (config.TIME_SYSTEM.DAY_DURATION <= 0) {
            throw new Error('一天的长度必须大于0');
        }
        if (config.TIME_SYSTEM.ZOMBIES_PER_DAY <= 0) {
            throw new Error('每天僵尸数量必须大于0');
        }
        if (config.TIME_SYSTEM.SPAWN_RANGE.MIN_DISTANCE >= config.TIME_SYSTEM.SPAWN_RANGE.MAX_DISTANCE) {
            throw new Error('僵尸生成范围无效');
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
        } else {
            throw new Error('无效的难度级别: ' + difficulty);
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
                throw new Error('配置路径不存在: ' + path);
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
