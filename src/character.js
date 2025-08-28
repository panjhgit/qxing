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

// 角色ID枚举
const CHARACTER_ID = {
    MAIN: 1001,       // 主人物
    PARTNER_1: 1002,  // 伙伴1
    PARTNER_2: 1003,  // 伙伴2
    PARTNER_3: 1004,  // 伙伴3
    PARTNER_4: 1005,  // 伙伴4
    PARTNER_5: 1006   // 伙伴5
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
    
    // 根据角色类型分配固定ID
    switch (role) {
        case ROLE.MAIN:
            this.id = CHARACTER_ID.MAIN; // 主人物：1001
            break;
        case ROLE.POLICE:
            this.id = CHARACTER_ID.PARTNER_1; // 警察：1002
            break;
        case ROLE.CIVILIAN:
            this.id = CHARACTER_ID.PARTNER_2; // 平民：1003
            break;
        case ROLE.DOCTOR:
            this.id = CHARACTER_ID.PARTNER_3; // 医生：1004
            break;
        case ROLE.NURSE:
            this.id = CHARACTER_ID.PARTNER_4; // 护士：1005
            break;
        case ROLE.CHEF:
            this.id = CHARACTER_ID.PARTNER_5; // 厨师：1006
            break;
        default:
            this.id = CHARACTER_ID.PARTNER_1; // 默认：1002
            break;
    }

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

// 停止移动
Character.prototype.stopMovement = function() {
    this.isMoving = false;
    this.status = STATUS.IDLE;
    this.targetX = this.x; // 将目标位置设为当前位置
    this.targetY = this.y;
    console.log('角色停止移动，当前位置:', this.x, this.y);
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
                    var oldX = this.x, oldY = this.y;
                    this.x = buildingSafePos.x;
                    this.y = buildingSafePos.y;
                    this.status = STATUS.MOVING;
                    
                    // 通过四叉树更新位置
                    if (window.collisionSystem && window.collisionSystem.updateCharacterPosition) {
                        window.collisionSystem.updateCharacterPosition(this, oldX, oldY, this.x, this.y);
                    } else if (window.collisionSystem && window.collisionSystem.updateDynamicObjectPosition) {
                        // 兼容旧版本
                        window.collisionSystem.updateDynamicObjectPosition(this, oldX, oldY, this.x, this.y);
                    }
                    
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
                var oldX = this.x, oldY = this.y;
                this.x = buildingSafePos.x;
                this.y = buildingSafePos.y;
                this.status = STATUS.MOVING;
                
                // 通过四叉树更新位置
                if (window.collisionSystem && window.collisionSystem.updateCharacterPosition) {
                    window.collisionSystem.updateCharacterPosition(this, oldX, oldY, this.x, this.y);
                } else if (window.collisionSystem && window.collisionSystem.updateDynamicObjectPosition) {
                    // 兼容旧版本
                    window.collisionSystem.updateDynamicObjectPosition(this, oldX, oldY, this.x, this.y);
                }
                
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


// 角色管理器 - 重构版本：只负责游戏逻辑，四叉树负责对象管理
var CharacterManager = {
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
            
            console.log('主人物创建成功:', mainChar.role, 'ID:', mainChar.id, '位置:', x, y);
            
            // 通过四叉树创建角色（四叉树负责对象管理）
            console.log('CharacterManager.createMainCharacter: 准备通过四叉树创建角色');
            
            if (window.collisionSystem && window.collisionSystem.createCharacterObject) {
                console.log('CharacterManager.createMainCharacter: 调用四叉树createCharacterObject方法');
                var createdCharacter = window.collisionSystem.createCharacterObject(mainChar);
                if (createdCharacter) {
                    console.log('CharacterManager.createMainCharacter: 四叉树创建角色成功:', mainChar.role, mainChar.id);
                    return createdCharacter;
                } else {
                    console.error('CharacterManager.createMainCharacter: 四叉树创建角色失败:', mainChar.role, mainChar.id);
                    return null;
                }
            } else {
                console.error('CharacterManager.createMainCharacter: 四叉树不支持角色对象创建，可用方法:', Object.keys(window.collisionSystem));
                return null;
            }
        }.bind(this));
    },

    // 创建伙伴
    createPartner: function (role, x, y) {
        var validationUtils = UtilsManager.getValidationUtils();
        var performanceUtils = UtilsManager.getPerformanceUtils();
        
        // 使用性能工具测量创建时间
        return performanceUtils.measureFunction('createPartner', function() {
            // 使用验证工具检查参数
            if (!validationUtils.validatePosition(x, y)) {
                console.error('无效的伙伴位置:', x, y);
                return null;
            }

            if (!validationUtils.validateRange(role, 2, 6, '伙伴角色类型')) {
                console.error('无效的伙伴角色类型:', role);
                return null;
            }

            var partner = new Character(role, x, y);

            // 验证角色创建是否成功
            if (!validationUtils.validateObject(partner, ['role', 'x', 'y', 'hp'])) {
                console.error('伙伴创建失败');
                return null;
            }
            
            console.log('伙伴创建成功:', partner.role, 'ID:', partner.id, '位置:', x, y);
            
            // 通过四叉树创建角色（四叉树负责对象管理）
            console.log('CharacterManager.createPartner: 准备通过四叉树创建伙伴');
            
            if (window.collisionSystem && window.collisionSystem.createCharacterObject) {
                console.log('CharacterManager.createPartner: 调用四叉树createCharacterObject方法');
                var createdCharacter = window.collisionSystem.createCharacterObject(partner);
                if (createdCharacter) {
                    console.log('CharacterManager.createPartner: 四叉树创建伙伴成功:', partner.role, partner.id);
                    return createdCharacter;
                } else {
                    console.error('CharacterManager.createPartner: 四叉树创建伙伴失败:', partner.role, partner.id);
                    return null;
                }
            } else {
                console.error('CharacterManager.createPartner: 四叉树不支持角色对象创建，可用方法:', Object.keys(window.collisionSystem));
                return null;
            }
        }.bind(this));
    },

    // 获取主人物 - 从四叉树获取
    getMainCharacter: function () {
        if (!window.collisionSystem) {
            console.warn('CharacterManager.getMainCharacter: 碰撞系统未初始化');
            return null;
        }
        
        if (!window.collisionSystem.getAllCharacters) {
            console.warn('CharacterManager.getMainCharacter: 四叉树不支持getAllCharacters方法');
            return null;
        }
        
        var allCharacters = window.collisionSystem.getAllCharacters();
        var mainChar = allCharacters.find(char => 
            char && char.role === ROLE.MAIN && char.hp > 0
        );
        
        if (!mainChar) {
            console.warn('未找到主人物');
        }
        return mainChar;
    },

    // 获取所有角色 - 从四叉树获取
    getAllCharacters: function () {
        if (!window.collisionSystem) {
            console.warn('CharacterManager.getAllCharacters: 碰撞系统未初始化');
            return [];
        }
        
        if (!window.collisionSystem.getAllCharacters) {
            console.warn('CharacterManager.getAllCharacters: 四叉树不支持getAllCharacters方法');
            return [];
        }
        
        var allCharacters = window.collisionSystem.getAllCharacters();
        console.log('CharacterManager.getAllCharacters: 从四叉树获取角色，数量:', allCharacters.length);
        return allCharacters;
    },

    // 更新所有角色 - 从四叉树获取角色列表
    updateAllCharacters: function (deltaTime = 1/60) {
        var performanceUtils = UtilsManager.getPerformanceUtils();
        
        // 从四叉树获取所有角色
        var characters = [];
        if (window.collisionSystem && window.collisionSystem.getAllCharacters) {
            characters = window.collisionSystem.getAllCharacters();
        } else {
            console.warn('无法从四叉树获取角色列表');
            return;
        }
        
        console.log('更新角色，数量:', characters.length);

        // 使用性能工具测量更新时间
        performanceUtils.startTimer('updateAllCharacters');
        
        characters.forEach(char => {
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
export {ROLE, WEAPON, STATUS, CHARACTER_ID};

// 导出角色管理器和角色类
export {CharacterManager};
export default Character;
