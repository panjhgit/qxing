/**
 * 游戏工具模块 (utils.js)
 *
 * 功能：
 * - 提供通用的数学计算方法
 * - 消除重复的距离计算、碰撞检测等逻辑
 * - 提供统一的工具函数接口
 * - 优化性能，减少重复计算
 * - 🔴 新增：统一移动控制器
 * - 🔴 新增：统一动画系统
 */

// 数学工具类
const MathUtils = {
    // 计算两点间距离
    distance: function (x1, y1, x2, y2) {
        var deltaX = x2 - x1;
        var deltaY = y2 - y1;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },

    // 计算角度（弧度）
    angle: function (fromX, fromY, toX, toY) {
        return Math.atan2(toY - fromY, toX - fromX);
    },

    // 检查数值是否有效
    isValidNumber: function (value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
};

// 🔴 新增：统一移动控制器
const MovementController = {
    // 获取移动速度（统一入口）
    getMoveSpeed: function (entityType, entityRole = null) {
        var movementConfig = window.ConfigManager ? window.ConfigManager.get('MOVEMENT') : null;
        if (!movementConfig) return 0;

        switch (entityType) {
            case 'character':
                return movementConfig.CHARACTER_MOVE_SPEED || 3;
            case 'partner':
                return movementConfig.PARTNER_MOVE_SPEED || 3;
            case 'zombie':
                return movementConfig.ZOMBIE_MOVE_SPEED || 2;
            default:
                return movementConfig.CHARACTER_MOVE_SPEED || 3;
        }
    },

    // 设置实体移动速度（统一入口）
    setMoveSpeed: function (entity, entityType, entityRole = null) {
        var speed = this.getMoveSpeed(entityType, entityRole);
        entity.moveSpeed = speed;
        return speed;
    },

    // 重置移动速度（统一入口）
    resetMoveSpeed: function (entity, entityType, entityRole = null) {
        return this.setMoveSpeed(entity, entityType, entityRole);
    },

    // 检查摇杆输入（统一入口）
    hasJoystickInput: function () {
        if (!window.gameEngine || !window.gameEngine.joystick) {
            return false;
        }

        var joystick = window.gameEngine.joystick;
        if (!joystick.isVisible || !joystick.isActive) {
            return false;
        }

        var direction = joystick.getMoveDirection();
        var deadZone = 0.1;
        return Math.abs(direction.x) > deadZone || Math.abs(direction.y) > deadZone;
    },

    // 获取摇杆方向（统一入口）
    getJoystickDirection: function () {
        if (!window.gameEngine || !window.gameEngine.joystick) {
            return {x: 0, y: 0};
        }

        var joystick = window.gameEngine.joystick;
        return joystick.getMoveDirection();
    },

    // 执行移动（统一入口）
    executeMove: function (entity, direction, moveSpeed) {
        if (!direction || !moveSpeed) return false;

        var newX = entity.x + direction.x * moveSpeed;
        var newY = entity.y + direction.y * moveSpeed;

        // 检查碰撞
        if (window.collisionSystem && window.collisionSystem.isPositionWalkable) {
            if (window.collisionSystem.isPositionWalkable(newX, newY)) {
                entity.x = newX;
                entity.y = newY;
                return true;
            } else {
                // 贴着建筑物移动
                if (window.collisionSystem.getWallFollowingPosition) {
                    var safePosition = window.collisionSystem.getWallFollowingPosition(
                        entity.x, entity.y, newX, newY, entity.radius || 16, moveSpeed
                    );
                    if (safePosition) {
                        entity.x = safePosition.x;
                        entity.y = safePosition.y;
                        return true;
                    }
                }
            }
        } else {
            // 没有碰撞系统，直接移动
            entity.x = newX;
            entity.y = newY;
            return true;
        }

        return false;
    }
};

// 🔴 新增：统一动画系统
const AnimationSystem = {
    // 获取动画速度（统一入口）
    getAnimationSpeed: function (entityType, animationType = 'default') {
        var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
        if (!animationConfig) return 0.2;

        var baseSpeed = animationConfig.DEFAULT_FRAME_RATE || 0.2;

        switch (animationType) {
            case 'attack':
                return animationConfig.ATTACK_ANIMATION_SPEED || baseSpeed * 1.5;
            case 'death':
                return animationConfig.DEATH_ANIMATION_SPEED || baseSpeed * 0.5;
            case 'moving':
                return baseSpeed * (animationConfig.STATE_SPEED_MULTIPLIERS?.MOVING || 1.5);
            case 'attacking':
                return baseSpeed * (animationConfig.STATE_SPEED_MULTIPLIERS?.ATTACKING || 2.0);
            case 'avoiding':
                return baseSpeed * (animationConfig.STATE_SPEED_MULTIPLIERS?.AVOIDING || 1.8);
            case 'die':
                return baseSpeed * (animationConfig.STATE_SPEED_MULTIPLIERS?.DIE || 0.5);
            default:
                return baseSpeed;
        }
    },

    // 设置实体动画速度（统一入口）
    setAnimationSpeed: function (entity, animationType = 'default') {
        var speed = this.getAnimationSpeed(entity.type || 'character', animationType);
        entity.animationSpeed = speed;
        return speed;
    },

    // 重置动画速度（统一入口）
    resetAnimationSpeed: function (entity) {
        return this.setAnimationSpeed(entity, 'default');
    },

    // 更新动画帧（统一入口）
    updateAnimationFrame: function (entity, deltaTime = 1/60) {
        var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
        var maxFrames = animationConfig ? animationConfig.MAX_ANIMATION_FRAMES : 8;

        if (!entity.animationFrame) entity.animationFrame = 0;
        if (!entity.animationSpeed) entity.animationSpeed = this.getAnimationSpeed(entity.type || 'character');

        entity.animationFrame += entity.animationSpeed * deltaTime;

        if (entity.animationFrame >= maxFrames) {
            entity.animationFrame = 0;
        }

        return entity.animationFrame;
    },

    // 播放特定动画（统一入口）
    playAnimation: function (entity, animationType) {
        entity.animationFrame = 0;
        this.setAnimationSpeed(entity, animationType);
    }
};

// 动画工具类
const AnimationUtils = {
    // 更新动画帧
    updateFrame: function (currentFrame, speed, maxFrames) {
        var newFrame = currentFrame + speed;
        if (newFrame >= maxFrames) {
            newFrame = 0;
        }
        return newFrame;
    },

    // 检查动画是否应该重置
    shouldResetAnimation: function (currentFrame, maxFrames) {
        return currentFrame >= maxFrames;
    }
};

// 验证工具类
const ValidationUtils = {
    // 验证位置参数
    validatePosition: function (x, y) {
        if (!MathUtils.isValidNumber(x) || !MathUtils.isValidNumber(y)) {
            throw new Error('无效的位置参数: ' + x + ', ' + y);
        }

        // 检查坐标范围是否合理
        if (Math.abs(x) > 100000 || Math.abs(y) > 100000) {
            throw new Error('位置参数超出合理范围: ' + x + ', ' + y);
        }

        return true;
    },

    // 验证数值范围
    validateRange: function (value, min, max, name) {
        if (!MathUtils.isValidNumber(value)) {
            throw new Error('无效的数值: ' + name + ' = ' + value);
        }

        if (value < min || value > max) {
            throw new Error('数值超出范围: ' + name + ' = ' + value + ' 应该在 ' + min + ' 到 ' + max + ' 之间');
        }

        return true;
    }
};

// 性能工具类
const PerformanceUtils = {
    // 性能计时器
    timers: {},

    // 开始计时
    startTimer: function (name) {
        this.timers[name] = performance.now();
    },

    // 结束计时并返回耗时
    endTimer: function (name) {
        if (this.timers[name]) {
            var duration = performance.now() - this.timers[name];
            delete this.timers[name];
            return duration;
        }
        return 0;
    }
};

// 🔴 新增：角色属性设置工具
const RolePropertyUtils = {
    // 设置角色属性
    setupRoleProperties: function (character, role) {
        var combatConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT') : null;
        var difficultyConfig = window.ConfigManager ? window.ConfigManager.getDifficultyConfig() : null;

        switch (role) {
            case 1: // 主人物 (ROLE.MAIN)
                character.hp = combatConfig ? combatConfig.DEFAULT_HP : 100;
                character.maxHp = character.hp;
                character.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20;
                character.weapon = 'NONE';
                character.attackRange = combatConfig ? combatConfig.MAIN_CHARACTER_ATTACK_RANGE : 100;
                character.icon = '👤';
                character.color = '#3498db';
                break;

            case 2: // 警察 (ROLE.POLICE)
                character.hp = combatConfig ? combatConfig.DEFAULT_HP : 100;
                character.maxHp = character.hp;
                character.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20;
                character.attackRange = combatConfig ? combatConfig.POLICE_ATTACK_RANGE : 100;
                character.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100;
                character.icon = '👮';
                character.color = '#2c3e50';
                character.initialColor = '#95a5a6';
                break;

            case 3: // 平民 (ROLE.CIVILIAN)
                character.hp = combatConfig ? combatConfig.DEFAULT_HP : 100;
                character.maxHp = character.hp;
                character.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20;
                character.attackRange = combatConfig ? combatConfig.POLICE_ATTACK_RANGE : 100;
                character.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100;
                character.icon = '👨';
                character.color = '#95a5a6';
                character.initialColor = '#95a5a6';
                break;

            case 4: // 医生 (ROLE.DOCTOR)
                character.hp = combatConfig ? combatConfig.DEFAULT_HP : 100;
                character.maxHp = character.hp;
                character.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20;
                character.attackRange = combatConfig ? combatConfig.DOCTOR_ATTACK_RANGE : 100;
                character.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100;
                character.icon = '👨‍⚕️';
                character.color = '#e74c3c';
                character.initialColor = '#95a5a6';
                break;

            case 5: // 护士 (ROLE.NURSE)
                character.hp = combatConfig ? combatConfig.DEFAULT_HP : 100;
                character.maxHp = character.hp;
                character.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20;
                character.attackRange = combatConfig ? combatConfig.NURSE_ATTACK_RANGE : 100;
                character.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100;
                character.icon = '👩‍⚕️';
                character.color = '#e91e63';
                character.initialColor = '#95a5a6';
                break;

            case 6: // 厨师 (ROLE.CHEF)
                character.hp = combatConfig ? combatConfig.DEFAULT_HP : 100;
                character.maxHp = character.hp;
                character.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20;
                character.attackRange = combatConfig ? combatConfig.CHEF_ATTACK_RANGE : 100;
                character.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100;
                character.icon = '👨‍🍳';
                character.color = '#f39c12';
                character.initialColor = '#95a5a6';
                break;

            default:
                character.hp = combatConfig ? combatConfig.DEFAULT_HP : 100;
                character.maxHp = character.hp;
                character.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20;
                character.attackRange = combatConfig ? combatConfig.POLICE_ATTACK_RANGE : 100;
                character.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100;
                character.icon = '❓';
                character.color = '#95a5a6';
                character.initialColor = '#95a5a6';
        }

        // 🔴 新增：使用统一移动控制器设置移动速度
        MovementController.setMoveSpeed(character, 'character', role);
    }
};

// 工具管理器
const UtilsManager = {
    // 获取所有工具类
    getMathUtils: function () {
        return MathUtils;
    }, 
    getAnimationUtils: function () {
        return AnimationUtils;
    }, 
    getValidationUtils: function () {
        return ValidationUtils;
    }, 
    getPerformanceUtils: function () {
        return PerformanceUtils;
    }, 
    getRolePropertyUtils: function () {
        return RolePropertyUtils;
    },
    // 🔴 新增：获取统一移动控制器
    getMovementController: function () {
        return MovementController;
    },
    // 🔴 新增：获取统一动画系统
    getAnimationSystem: function () {
        return AnimationSystem;
    }
};

// 导出工具管理器
export {
    ValidationUtils,
    MathUtils,
    AnimationUtils,
    PerformanceUtils,
    RolePropertyUtils,
    MovementController,
    AnimationSystem,
    UtilsManager
};
export default UtilsManager;
