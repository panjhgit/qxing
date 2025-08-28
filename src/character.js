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
import StateMachine, { MAIN_CHARACTER_STATES, PARTNER_STATES } from './state-machine.js';

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
    FOLLOW: 'FOLLOW',        // 跟随
    IDLE: 'IDLE',            // 静止
    MOVING: 'MOVING',        // 移动中
    BLOCKED: 'BLOCKED',      // 被阻挡
    ATTACKING: 'ATTACKING',  // 攻击中
    AVOIDING: 'AVOIDING'     // 避障中
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
    
    // 初始化状态机
    this.initializeStateMachine();
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



// 初始化状态机
Character.prototype.initializeStateMachine = function() {
    if (this.role === ROLE.MAIN) {
        // 主人物状态机
        this.stateMachine = new StateMachine(this, MAIN_CHARACTER_STATES.IDLE);
        this.setupMainCharacterStateMachine();
    } else {
        // 伙伴状态机
        this.stateMachine = new StateMachine(this, PARTNER_STATES.INIT);
        this.setupPartnerStateMachine();
    }
};

// 设置主人物状态机
Character.prototype.setupMainCharacterStateMachine = function() {
    const sm = this.stateMachine;
    
    // 添加状态转换规则
    sm.addTransition(MAIN_CHARACTER_STATES.IDLE, MAIN_CHARACTER_STATES.MOVE, () => {
        // 摇杆有输入（触摸偏移 > 死区）
        return this.hasJoystickInput();
    });
    
    sm.addTransition(MAIN_CHARACTER_STATES.IDLE, MAIN_CHARACTER_STATES.ATTACK, () => {
        // 100px 内有僵尸
        return this.hasZombieInRange(100);
    });
    
    sm.addTransition(MAIN_CHARACTER_STATES.MOVE, MAIN_CHARACTER_STATES.IDLE, () => {
        // 摇杆输入消失且无僵尸
        return !this.hasJoystickInput() && !this.hasZombieInRange(50);
    });
    
    sm.addTransition(MAIN_CHARACTER_STATES.MOVE, MAIN_CHARACTER_STATES.ATTACK, () => {
        // 摇杆输入消失且50px内有僵尸
        return !this.hasJoystickInput() && this.hasZombieInRange(50);
    });
    
    sm.addTransition(MAIN_CHARACTER_STATES.ATTACK, MAIN_CHARACTER_STATES.MOVE, () => {
        // 摇杆有输入（打断攻击）
        return this.hasJoystickInput();
    });
    
    sm.addTransition(MAIN_CHARACTER_STATES.ATTACK, MAIN_CHARACTER_STATES.IDLE, () => {
        // 无僵尸或僵尸超出范围
        return !this.hasZombieInRange(50);
    });
    
    // 添加状态行为
    sm.addBehavior(MAIN_CHARACTER_STATES.IDLE, 
        this.onEnterIdle.bind(this),      // 进入待机
        this.onUpdateIdle.bind(this),     // 更新待机
        this.onExitIdle.bind(this)        // 退出待机
    );
    
    sm.addBehavior(MAIN_CHARACTER_STATES.MOVE, 
        this.onEnterMove.bind(this),      // 进入移动
        this.onUpdateMove.bind(this),     // 更新移动
        this.onExitMove.bind(this)        // 退出移动
    );
    
    sm.addBehavior(MAIN_CHARACTER_STATES.ATTACK, 
        this.onEnterAttack.bind(this),    // 进入攻击
        this.onUpdateAttack.bind(this),   // 更新攻击
        this.onExitAttack.bind(this)      // 退出攻击
    );
};

// 设置伙伴状态机
Character.prototype.setupPartnerStateMachine = function() {
    const sm = this.stateMachine;
    
    // 添加状态转换规则
    sm.addTransition(PARTNER_STATES.INIT, PARTNER_STATES.FOLLOW, () => {
        // 主人物靠近跟随者距离20px
        return this.isMainCharacterNearby(20);
    });
    
    sm.addTransition(PARTNER_STATES.IDLE, PARTNER_STATES.FOLLOW, () => {
        // 主人物移动
        return this.isMainCharacterMoving();
    });
    
    sm.addTransition(PARTNER_STATES.IDLE, PARTNER_STATES.ATTACK, () => {
        // 100px 内有僵尸
        return this.hasZombieInRange(100);
    });
    
    sm.addTransition(PARTNER_STATES.FOLLOW, PARTNER_STATES.IDLE, () => {
        // 主人物停止移动且无僵尸
        return !this.isMainCharacterMoving() && !this.hasZombieInRange(50);
    });
    
    sm.addTransition(PARTNER_STATES.FOLLOW, PARTNER_STATES.ATTACK, () => {
        // 主人物停止移动且50px内有僵尸
        return !this.isMainCharacterMoving() && this.hasZombieInRange(50);
    });
    
    sm.addTransition(PARTNER_STATES.FOLLOW, PARTNER_STATES.AVOID, () => {
        // 检测到拥堵
        return this.detectCongestion();
    });
    
    sm.addTransition(PARTNER_STATES.ATTACK, PARTNER_STATES.FOLLOW, () => {
        // 主人物移动（打断攻击）
        return this.isMainCharacterMoving();
    });
    
    sm.addTransition(PARTNER_STATES.AVOID, PARTNER_STATES.FOLLOW, () => {
        // 避障完成且主人物仍在移动
        return this.isAvoidanceComplete() && this.isMainCharacterMoving();
    });
    
    sm.addTransition(PARTNER_STATES.AVOID, PARTNER_STATES.ATTACK, () => {
        // 避障完成且主人物停止且50px内有僵尸
        return this.isAvoidanceComplete() && !this.isMainCharacterMoving() && this.hasZombieInRange(50);
    });
    
    // 添加状态行为
    sm.addBehavior(PARTNER_STATES.INIT, 
        this.onEnterInit.bind(this),      // 进入初始状态
        this.onUpdateInit.bind(this),     // 更新初始状态
        this.onExitInit.bind(this)        // 退出初始状态
    );
    
    sm.addBehavior(PARTNER_STATES.IDLE, 
        this.onEnterIdle.bind(this),      // 进入待机
        this.onUpdateIdle.bind(this),     // 更新待机
        this.onExitIdle.bind(this)        // 退出待机
    );
    
    sm.addBehavior(PARTNER_STATES.FOLLOW, 
        this.onEnterFollow.bind(this),    // 进入跟随
        this.onUpdateFollow.bind(this),   // 更新跟随
        this.onExitFollow.bind(this)      // 退出跟随
    );
    
    sm.addBehavior(PARTNER_STATES.ATTACK, 
        this.onEnterAttack.bind(this),    // 进入攻击
        this.onUpdateAttack.bind(this),   // 更新攻击
        this.onExitAttack.bind(this)      // 退出攻击
    );
    
    sm.addBehavior(PARTNER_STATES.AVOID, 
        this.onEnterAvoid.bind(this),     // 进入避障
        this.onUpdateAvoid.bind(this),    // 更新避障
        this.onExitAvoid.bind(this)       // 退出避障
    );
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

// ==================== 状态机辅助方法 ====================

// 检查是否有摇杆输入
Character.prototype.hasJoystickInput = function() {
    // 这里需要与游戏引擎的摇杆系统连接
    // 暂时返回false，后续需要实现
    return false;
};

// 检查指定范围内是否有僵尸
Character.prototype.hasZombieInRange = function(range) {
    if (!window.zombieManager) return false;
    
    const zombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
    const mathUtils = UtilsManager.getMathUtils();
    
    return zombies.some(zombie => {
        const distance = mathUtils.distance(this.x, this.y, zombie.x, zombie.y);
        return distance <= range;
    });
};

// 检查主人物是否在附近
Character.prototype.isMainCharacterNearby = function(distance) {
    if (!window.characterManager) return false;
    
    const mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return false;
    
    const mathUtils = UtilsManager.getMathUtils();
    const dist = mathUtils.distance(this.x, this.y, mainChar.x, mainChar.y);
    return dist <= distance;
};

// 检查主人物是否在移动
Character.prototype.isMainCharacterMoving = function() {
    if (!window.characterManager) return false;
    
    const mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return false;
    
    return mainChar.stateMachine && mainChar.stateMachine.isInState(MAIN_CHARACTER_STATES.MOVE);
};

// 检测拥堵
Character.prototype.detectCongestion = function() {
    if (!window.characterManager) return false;
    
    const mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return false;
    
    const mathUtils = UtilsManager.getMathUtils();
    const distance = mathUtils.distance(this.x, this.y, mainChar.x, mainChar.y);
    
    // 检查主人物移动方向是否朝向自身
    if (mainChar.stateMachine && mainChar.stateMachine.isInState(MAIN_CHARACTER_STATES.MOVE)) {
        const angleToPartner = mathUtils.angle(mainChar.x, mainChar.y, this.x, this.y);
        const mainCharAngle = mathUtils.angle(mainChar.x, mainChar.y, mainChar.targetX, mainChar.targetY);
        const angleDiff = Math.abs(angleToPartner - mainCharAngle);
        
        // 如果角度差小于45度且距离小于80px，认为拥堵
        return angleDiff < Math.PI / 4 && distance < 80;
    }
    
    return false;
};

// 检查避障是否完成
Character.prototype.isAvoidanceComplete = function() {
    // 这里需要实现避障逻辑
    // 暂时返回true，后续需要实现
    return true;
};

// ==================== 状态行为方法 ====================

// 主人物状态行为
Character.prototype.onEnterIdle = function(stateData) {
    this.status = STATUS.IDLE;
    this.isMoving = false;
    console.log('主人物进入待机状态');
};

Character.prototype.onUpdateIdle = function(deltaTime, stateData) {
    // 待机状态下的行为：渲染待机动画
    this.updateAnimation(deltaTime);
};

Character.prototype.onExitIdle = function(stateData) {
    console.log('主人物退出待机状态');
};

Character.prototype.onEnterMove = function(stateData) {
    this.status = STATUS.MOVING;
    this.isMoving = true;
    console.log('主人物进入移动状态');
};

Character.prototype.onUpdateMove = function(deltaTime, stateData) {
    // 移动状态下的行为：处理移动逻辑
    // 调用原有的移动更新方法
    this.updateMovement(deltaTime);
};

Character.prototype.onExitMove = function(stateData) {
    this.isMoving = false;
    console.log('主人物退出移动状态');
};

Character.prototype.onEnterAttack = function(stateData) {
    this.status = STATUS.ATTACKING;
    console.log('主人物进入攻击状态');
};

Character.prototype.onUpdateAttack = function(deltaTime, stateData) {
    // 攻击状态下的行为：移动到攻击距离，触发攻击动画
    this.updateAttack(deltaTime);
};

Character.prototype.onExitAttack = function(stateData) {
    console.log('主人物退出攻击状态');
};

// 伙伴状态行为
Character.prototype.onEnterInit = function(stateData) {
    this.status = STATUS.IDLE;
    console.log('伙伴进入初始状态');
};

Character.prototype.onUpdateInit = function(deltaTime, stateData) {
    // 初始状态下的行为：静止不动，渲染待机动画
    this.updateAnimation(deltaTime);
};

Character.prototype.onExitInit = function(stateData) {
    console.log('伙伴退出初始状态');
};

Character.prototype.onEnterFollow = function(stateData) {
    this.status = STATUS.FOLLOW;
    this.isMoving = true;
    console.log('伙伴进入跟随状态');
};

Character.prototype.onUpdateFollow = function(deltaTime, stateData) {
    // 跟随状态下的行为：追逐主人物侧后方跟随点
    this.updateFollow(deltaTime);
};

Character.prototype.onExitFollow = function(stateData) {
    this.isMoving = false;
    console.log('伙伴退出跟随状态');
};

Character.prototype.onEnterAvoid = function(stateData) {
    this.status = STATUS.AVOIDING;
    console.log('伙伴进入避障状态');
};

Character.prototype.onUpdateAvoid = function(deltaTime, stateData) {
    // 避障状态下的行为：按避障策略为主体让路
    this.updateAvoid(deltaTime);
};

Character.prototype.onExitAvoid = function(stateData) {
    console.log('伙伴退出避障状态');
};

// 通用的攻击更新方法
Character.prototype.updateAttack = function(deltaTime) {
    // 这里需要实现攻击逻辑
    // 暂时为空，后续需要实现
};

// 通用的跟随更新方法
Character.prototype.updateFollow = function(deltaTime) {
    // 这里需要实现跟随逻辑
    // 暂时为空，后续需要实现
};

// 通用的避障更新方法
Character.prototype.updateAvoid = function(deltaTime) {
    // 这里需要实现避障逻辑
    // 暂时为空，后续需要实现
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

    console.log('角色设置移动目标成功:', {
        idd: this.id,
        role: this.role,
        from: { x: this.x, y: this.y },
        to: { x: targetX, y: targetY },
        distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        isMoving: this.isMoving,
        status: this.status
    });

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
        // 更新状态机
        if (this.stateMachine) {
            this.stateMachine.update(deltaTime);
        }
        
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
    
    // 检查是否到达目标 - 修复过早停止移动的问题
    if (moveVector.reached) {
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
        console.log('角色到达目标位置，停止移动');
        return;
    }
    
    // 检查移动距离是否过小（只有在移动距离确实很小时才停止）
    if (moveVector.distance < (collisionConfig.MIN_MOVE_DISTANCE || 1)) {
        console.log('移动距离过小，停止移动:', moveVector.distance);
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
