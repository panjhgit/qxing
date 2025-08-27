/**
 * 人物模块 - 重构版本
 * 
 * 重构内容：
 * - 使用ConfigManager统一管理配置
 * - 使用UtilsManager提供工具函数
 * - 消除硬编码的重复值
 * - 提高代码复用性和维护性
 */

import ConfigManager from './config.js';
import UtilsManager from './utils.js';

// 角色枚举
const ROLE = {
    MAIN: 1,      // 主人物
    POLICE: 2,    // 警察
    CIVILIAN: 3,  // 平民
    DOCTOR: 4,    // 医生
    NURSE: 5,     // 护士
    CHEF: 6       // 厨师
};

// 武器枚举
const WEAPON = {
    NONE: 'NONE',        // 无
    PISTOL: 'PISTOL',    // 手枪
    BAT: 'BAT',          // 棒球棒
    KNIFE: 'KNIFE'       // 菜刀
};

// 状态枚举
const STATUS = {
    FOLLOW: 'FOLLOW',    // 跟随
    IDLE: 'IDLE',        // 静止
    MOVING: 'MOVING',    // 移动中
    BLOCKED: 'BLOCKED'   // 被阻挡
};

// 人物类
var Character = function (role, x, y) {
    // 获取工具类
    var validationUtils = UtilsManager.getValidationUtils();
    var mathUtils = UtilsManager.getMathUtils();
    
    // 验证参数
    if (!validationUtils.validatePosition(x, y)) {
        console.error('无效的人物位置:', x, y);
        x = 100; y = 100; // 使用默认位置
    }
    
    if (!validationUtils.validateRange(role, 1, 6, '角色类型')) {
        console.error('无效的角色类型:', role);
        role = ROLE.CIVILIAN; // 使用默认角色
    }
    
    // 基础属性
    this.role = role;        // 角色
    this.x = x;              // X坐标
    this.y = y;              // Y坐标
    this.status = STATUS.IDLE; // 状态：跟随/静止

    // 从配置获取对象尺寸
    var objectSizes = ConfigManager.get('OBJECT_SIZES.CHARACTER');
    this.width = objectSizes.WIDTH;         // 模型宽度
    this.height = objectSizes.HEIGHT;       // 模型高度
    
    // 添加半径属性，用于圆形碰撞检测
    this.radius = this.width / 2;          // 碰撞半径（宽度的一半）
    
    // 从配置获取动画属性
    var animationConfig = ConfigManager.get('ANIMATION');
    this.animationFrame = 0;                // 动画帧
    this.animationSpeed = animationConfig.DEFAULT_FRAME_RATE; // 动画速度
    
    // 从配置获取移动属性
    var movementConfig = ConfigManager.get('MOVEMENT');
    this.isMoving = false;                  // 是否在移动
    this.moveSpeed = movementConfig.CHARACTER_MOVE_SPEED;    // 移动速度
    this.targetX = x;                       // 目标X坐标
    this.targetY = y;                       // 目标Y坐标

    // 根据角色设置属性
    this.setupRoleProperties();
};

// 设置角色属性
Character.prototype.setupRoleProperties = function() {
    var combatConfig = ConfigManager.get('COMBAT');
    var difficultyConfig = ConfigManager.getDifficultyConfig();
    
    switch (this.role) {
        case ROLE.MAIN: // 主人物
            this.hp = Math.round(100 * difficultyConfig.PLAYER_HP_BONUS);
            this.attack = 10;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig.MAX_ATTACK_RANGE;
            this.icon = '👤';
            break;

        case ROLE.POLICE: // 警察
            this.hp = 80;
            this.attack = 10;
            this.weapon = WEAPON.NONE;
            this.attackRange = 100;
            this.icon = '👮';
            break;

        case ROLE.CIVILIAN: // 平民
            this.hp = 50;
            this.attack = 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig.MIN_ATTACK_RANGE;
            this.icon = '👨';
            break;

        case ROLE.DOCTOR: // 医生
            this.hp = 60;
            this.attack = 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = 80;
            this.icon = '👨‍⚕️';
            break;

        case ROLE.NURSE: // 护士
            this.hp = 55;
            this.attack = 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = 60;
            this.icon = '👩‍⚕️';
            break;

        case ROLE.CHEF: // 厨师
            this.hp = 70;
            this.attack = 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = 70;
            this.icon = '👨‍🍳';
            break;

        default:
            this.hp = 50;
            this.attack = 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = 60;
            this.icon = '❓';
    }
};



// 受到攻击
Character.prototype.takeDamage = function (damage) {
    var validationUtils = UtilsManager.getValidationUtils();
    
    if (!validationUtils.validateRange(damage, 0, 1000, '伤害值')) {
        console.warn('无效的伤害值:', damage);
        return this.hp;
    }
    
    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;
    return this.hp;
};

// 设置移动目标 - 使用工具类
Character.prototype.setMoveTarget = function (targetX, targetY) {
    var validationUtils = UtilsManager.getValidationUtils();
    var mathUtils = UtilsManager.getMathUtils();
    
    // 使用验证工具检查目标位置
    if (!validationUtils.validatePosition(targetX, targetY)) {
        console.warn('无效的目标位置:', targetX, targetY);
        return false;
    }

    this.targetX = targetX;
    this.targetY = targetY;
    this.isMoving = true;
    this.status = STATUS.MOVING;

    // 使用数学工具计算朝向角度
    var deltaX = targetX - this.x;
    var deltaY = targetY - this.y;
    
    if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
        this.rotationY = mathUtils.angle(this.x, this.y, targetX, targetY);
    }

    return true;
};

    // 更新移动 - 使用工具类，优化平滑移动
    Character.prototype.updateMovement = function (deltaTime = 1/60) {
        if (!this.isMoving) {
            console.log('人物不在移动状态:', this.status, this.isMoving);
            return;
        }

        var movementUtils = UtilsManager.getMovementUtils();
        var animationUtils = UtilsManager.getAnimationUtils();
        var collisionConfig = ConfigManager.get('COLLISION');
        
        // 使用移动工具计算移动向量 - 基于时间的匀速移动
        var moveVector = movementUtils.calculateMoveVector(
            this.x, this.y, this.targetX, this.targetY, this.moveSpeed, deltaTime
        );
    
    console.log('移动向量计算:', '当前位置:', this.x, this.y, '目标位置:', this.targetX, this.targetY, '移动向量:', moveVector, 'deltaTime:', deltaTime);
    
    // 检查是否到达目标
    if (moveVector.reached || moveVector.distance < collisionConfig.MIN_MOVE_DISTANCE) {
        // 到达目标位置，但也要检查碰撞
        if (window.collisionSystem && window.collisionSystem.getCircleSafeMovePosition) {
            var finalMove = window.collisionSystem.getCircleSafeMovePosition(
                this.x, this.y, this.targetX, this.targetY, this.radius
            );
            if (finalMove) {
                this.x = finalMove.x;
                this.y = finalMove.y;
            }
        } else {
            console.warn('碰撞系统不可用，角色停止移动');
            this.status = STATUS.BLOCKED;
            return;
        }
        this.isMoving = false;
        this.status = STATUS.IDLE;
        return;
    }

    // 直接使用计算好的移动向量（已经是基于时间的匀速移动）
    var newX = this.x + moveVector.x;
    var newY = this.y + moveVector.y;

    // 使用新的简洁碰撞检测系统
    if (window.collisionSystem && window.collisionSystem.getCircleSafeMovePosition) {
        // 首先检查建筑物碰撞
        var buildingSafePos = window.collisionSystem.getCircleSafeMovePosition(
            this.x, this.y, newX, newY, this.radius
        );
        
        if (buildingSafePos) {
            // 建筑物碰撞检测通过，现在检查是否与僵尸重叠
            if (window.collisionSystem.isCharacterOverlappingWithZombies && window.zombieManager) {
                var allZombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
                
                var zombieOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(
                    buildingSafePos.x, buildingSafePos.y, this.radius, allZombies, 0.1
                );
                
                if (!zombieOverlap) {
                    // 移动安全，更新位置
                    this.x = buildingSafePos.x;
                    this.y = buildingSafePos.y;
                    this.status = STATUS.MOVING;
                    
                    // 记录移动类型（用于调试）
                    if (buildingSafePos.type && buildingSafePos.type.startsWith('slide')) {
                        console.log('角色墙体滑动:', buildingSafePos.type, '位置:', buildingSafePos.x.toFixed(2), buildingSafePos.y.toFixed(2));
                    }
                } else {
                    // 与僵尸重叠，停止移动
                    this.status = STATUS.BLOCKED;
                    console.log('角色移动被僵尸阻挡');
                    return;
                }
            } else {
                // 移动安全，更新位置
                this.x = buildingSafePos.x;
                this.y = buildingSafePos.y;
                this.status = STATUS.MOVING;
                
                // 记录移动类型（用于调试）
                if (buildingSafePos.type && buildingSafePos.type.startsWith('slide')) {
                    console.log('角色墙体滑动:', buildingSafePos.type, '位置:', buildingSafePos.x.toFixed(2), buildingSafePos.y.toFixed(2));
                }
            }
        } else {
            // 移动被阻挡，保持原位置
            this.status = STATUS.BLOCKED;
            console.log('角色移动被建筑物阻挡');
            return;
        }
    } else {
        console.warn('碰撞系统不可用，角色停止移动');
        this.status = STATUS.BLOCKED;
        return;
    }

    // 使用动画工具更新动画帧 - 优化动画更新频率
    if (this.isMoving) {
        var animationConfig = ConfigManager.get('ANIMATION');
        // 根据移动状态调整动画速度
        var adjustedSpeed = this.isMoving ? this.animationSpeed * 1.5 : this.animationSpeed;
        this.animationFrame = animationUtils.updateFrame(
            this.animationFrame, 
            adjustedSpeed, 
            animationConfig.MAX_ANIMATION_FRAMES
        );
    }
};

// 获取身体颜色
Character.prototype.getBodyColor = function () {
    switch (this.role) {
        case ROLE.MAIN:
            return '#4a90e2';      // 主人物蓝色
        case ROLE.POLICE:
            return '#2c3e50';    // 警察深蓝
        case ROLE.CIVILIAN:
            return '#95a5a6';  // 平民灰色
        case ROLE.DOCTOR:
            return '#e74c3c';    // 医生红色
        case ROLE.NURSE:
            return '#e91e63';     // 护士粉色
        case ROLE.CHEF:
            return '#f39c12';      // 厨师橙色
        default:
            return '#95a5a6';
    }
};

// 获取头部颜色
Character.prototype.getHeadColor = function () {
    return '#fdbcb4'; // 肤色
};


// 角色管理器
var CharacterManager = {
    characters: [], // 存储所有角色

    // 创建主人物
    createMainCharacter: function (x, y) {
        var validationUtils = UtilsManager.getValidationUtils();
        var performanceUtils = UtilsManager.getPerformanceUtils();
        
        // 使用性能工具测量创建时间
        return performanceUtils.measureFunction('createMainCharacter', function() {
            // 使用验证工具检查参数
            if (!validationUtils.validatePosition(x, y)) {
                console.error('无效的主人物位置:', x, y);
                return null;
            }

            var mainChar = new Character(ROLE.MAIN, x, y);

            // 验证角色创建是否成功
            if (!validationUtils.validateObject(mainChar, ['role', 'x', 'y', 'hp'])) {
                console.error('主人物创建失败');
                return null;
            }

            this.characters.push(mainChar);
            console.log('主人物创建成功:', mainChar.role, '位置:', x, y);
            return mainChar;
        }.bind(this));
    },

    // 获取主人物
    getMainCharacter: function () {
        var validationUtils = UtilsManager.getValidationUtils();
        
        var mainChar = this.characters.find(char => 
            validationUtils.validateObject(char, ['role']) && char.role === ROLE.MAIN
        );
        
        if (!mainChar) {
            console.warn('未找到主人物');
        }
        return mainChar;
    },

    // 获取所有角色
    getAllCharacters: function () {
        var validationUtils = UtilsManager.getValidationUtils();
        
        // 过滤掉无效的角色
        var validCharacters = this.characters.filter(char => 
            validationUtils.validateObject(char, ['x', 'y', 'hp'])
        );

        if (validCharacters.length !== this.characters.length) {
            console.warn('发现无效角色，已清理');
            this.characters = validCharacters;
        }

        return validCharacters;
    },

    // 更新所有角色
    updateAllCharacters: function (deltaTime = 1/60) {
        var validCharacters = this.getAllCharacters();
        var performanceUtils = UtilsManager.getPerformanceUtils();

        // 使用性能工具测量更新时间
        performanceUtils.startTimer('updateAllCharacters');
        
        validCharacters.forEach(char => {
            try {
                if (char && typeof char.updateMovement === 'function') {
                    char.updateMovement(deltaTime);
                } else {
                    console.warn('角色缺少updateMovement方法:', char);
                }
            } catch (error) {
                console.error('更新角色时发生错误:', error, char);
            }
        });
        
        var updateTime = performanceUtils.endTimer('updateAllCharacters');
        if (updateTime > 16) { // 超过16ms（60fps）
            console.warn('角色更新耗时过长:', updateTime.toFixed(2), 'ms');
        }
    }
};

// 导出枚举
export {ROLE, WEAPON, STATUS};

// 导出角色管理器和角色类
export {CharacterManager};
export default Character;
