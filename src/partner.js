/**
 * 伙伴模块 - 独立的状态机驱动系统
 *
 * 功能描述：
 * - 独立的状态机管理伙伴行为
 * - 智能跟随主人物
 * - 自动攻击僵尸
 * - 避障系统
 * - 职业特性
 */

import ConfigManager from './config.js';
import UtilsManager from './utils.js';
import StateMachine, {PARTNER_STATES} from './state-machine.js';

// 伙伴职业枚举
const PARTNER_ROLE = {
    POLICE: 2,    // 警察
    CIVILIAN: 3,  // 平民
    DOCTOR: 4,    // 医生
    NURSE: 5,     // 护士
    CHEF: 6       // 厨师
};
// 角色ID枚举
const CHARACTER_ID = {
    POLICE: 1002,    // 警察
    CIVILIAN: 1003,  // 平民
    DOCTOR: 1004,    // 医生
    NURSE: 1005,     // 护士
    CHEF: 1006       // 厨师
};

// 伙伴状态枚举（扩展）
const PARTNER_STATE = {
    INIT: 'INIT',           // 初始状态
    IDLE: 'IDLE',           // 待机
    FOLLOW: 'FOLLOW',       // 跟随
    ATTACK: 'ATTACK',       // 攻击
    AVOID: 'AVOID',         // 避障
    DIE: 'DIE'              // 死亡
};

// 避障策略枚举
const AVOID_STRATEGY = {
    SIDE_MOVE: 'SIDE_MOVE',     // 侧移
    FORWARD_MOVE: 'FORWARD_MOVE', // 前移
    BACKWARD_MOVE: 'BACKWARD_MOVE' // 后移
};

// 伙伴类
var Partner = function (role, x, y) {
    // 获取工具类
    var validationUtils = UtilsManager.getValidationUtils();
    var mathUtils = UtilsManager.getMathUtils();

    // 验证参数
    if (!validationUtils.validatePosition(x, y)) {
        console.error('无效的伙伴位置:', x, y);
        x = 100;
        y = 100;
    }

    if (!validationUtils.validateRange(role, 2, 6, '伙伴职业类型')) {
        console.error('无效的伙伴职业类型:', role);
        role = PARTNER_ROLE.CIVILIAN;
    }

    // 基础属性
    this.role = role;
    this.x = x;
    this.y = y;
    this.status = PARTNER_STATE.INIT;
    this.type = 'partner';
    this.isInitialState = true; // 初始状态为灰色

    // 从配置获取对象尺寸
    var objectSizes = window.ConfigManager ? window.ConfigManager.get('OBJECT_SIZES.CHARACTER') : null;
    this.width = objectSizes ? objectSizes.WIDTH : 32;
    this.height = objectSizes ? objectSizes.HEIGHT : 48;
    this.radius = this.width / 2;

    // 动画属性
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
    this.animationFrame = 0;
    this.animationSpeed = animationConfig ? animationConfig.DEFAULT_FRAME_RATE : 60;

    // 移动属性
    var movementConfig = window.ConfigManager ? window.ConfigManager.get('MOVEMENT') : null;
    this.isMoving = false;
    this.targetX = x;
    this.targetY = y;
    this.moveSpeed = movementConfig ? movementConfig.CHARACTER_MOVE_SPEED : 5;

    // 跟随属性
    this.followDistance = 80;           // 跟随距离
    this.followAngle = Math.PI;          // 跟随角度（后方）
    this.followPoint = {x: x, y: y};     // 跟随点
    this.lastMainCharPosition = {x: 0, y: 0}; // 主人物上次位置

    // 攻击属性
    this.attackTarget = null;
    this.attackCooldown = 0;
    this.lastAttackTime = 0;

    // 避障属性
    this.avoidStrategy = AVOID_STRATEGY.SIDE_MOVE;
    this.avoidTarget = {x: x, y: y};
    this.avoidProgress = 0;
    this.avoidDuration = 1.0; // 避障持续时间（秒）

    // 设置职业属性
    this.setupRoleProperties();

    // 初始化状态机
    this.initializeStateMachine();
};

// 设置职业属性
Partner.prototype.setupRoleProperties = function () {
    var combatConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT') : null;
    var difficultyConfig = window.ConfigManager ? window.ConfigManager.getDifficultyConfig() : null;

    switch (this.role) {
        case PARTNER_ROLE.POLICE:
            this.hp = Math.round(80 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.maxHp = this.hp;
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 10) : 10;
            this.attackRange = 20; // 警察攻击范围20px
            this.detectionRange = 100; // 检测范围100px
            this.icon = '👮';
            this.color = '#2c3e50';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        case PARTNER_ROLE.CIVILIAN:
            this.hp = Math.round(50 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.maxHp = this.hp;
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.attackRange = 15;
            this.detectionRange = 100;
            this.icon = '👨';
            this.color = '#95a5a6';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        case PARTNER_ROLE.DOCTOR:
            this.hp = Math.round(60 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.maxHp = this.hp;
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.attackRange = 18;
            this.detectionRange = 100;
            this.icon = '👨‍⚕️';
            this.color = '#e74c3c';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        case PARTNER_ROLE.NURSE:
            this.hp = Math.round(55 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.maxHp = this.hp;
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.attackRange = 16;
            this.detectionRange = 100;
            this.icon = '👩‍⚕️';
            this.color = '#e91e63';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        case PARTNER_ROLE.CHEF:
            this.hp = Math.round(70 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.maxHp = this.hp;
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.attackRange = 17;
            this.detectionRange = 100;
            this.icon = '👨‍🍳';
            this.color = '#f39c12';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        default:
            this.hp = Math.round(50 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.maxHp = this.hp;
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.attackRange = 15;
            this.detectionRange = 100;
            this.icon = '❓';
            this.color = '#95a5a6';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
    }
};

// 初始化状态机
Partner.prototype.initializeStateMachine = function () {
    this.stateMachine = new StateMachine(this, PARTNER_STATE.INIT);
    this.setupPartnerStateMachine();
};

// 设置伙伴状态机
Partner.prototype.setupPartnerStateMachine = function () {
    const sm = this.stateMachine;

    // INIT -> FOLLOW: 主人物靠近20px
    sm.addTransition(PARTNER_STATE.INIT, PARTNER_STATE.FOLLOW, () => {
        return this.isMainCharacterNearby(20);
    });

    // INIT -> DIE: 血量归零
    sm.addTransition(PARTNER_STATE.INIT, PARTNER_STATE.DIE, () => {
        return this.hp <= 0;
    });

    // IDLE -> FOLLOW: 主人物移动
    sm.addTransition(PARTNER_STATE.IDLE, PARTNER_STATE.FOLLOW, () => {
        return this.isMainCharacterMoving();
    });

    // IDLE -> ATTACK: 100px内有僵尸
    sm.addTransition(PARTNER_STATE.IDLE, PARTNER_STATE.ATTACK, () => {
        return this.hasZombieInRange(this.detectionRange);
    });

    // IDLE -> DIE: 血量归零
    sm.addTransition(PARTNER_STATE.IDLE, PARTNER_STATE.DIE, () => {
        return this.hp <= 0;
    });

    // FOLLOW -> IDLE: 主人物停止移动且无僵尸
    sm.addTransition(PARTNER_STATE.FOLLOW, PARTNER_STATE.IDLE, () => {
        return !this.isMainCharacterMoving() && !this.hasZombieInRange(this.detectionRange);
    });

    // FOLLOW -> ATTACK: 主人物停止移动且有僵尸
    sm.addTransition(PARTNER_STATE.FOLLOW, PARTNER_STATE.ATTACK, () => {
        return !this.isMainCharacterMoving() && this.hasZombieInRange(this.detectionRange);
    });

    // FOLLOW -> AVOID: 检测到拥堵
    sm.addTransition(PARTNER_STATE.FOLLOW, PARTNER_STATE.AVOID, () => {
        return this.isCongested();
    });

    // FOLLOW -> DIE: 血量归零
    sm.addTransition(PARTNER_STATE.FOLLOW, PARTNER_STATE.DIE, () => {
        return this.hp <= 0;
    });

    // ATTACK -> FOLLOW: 主人物移动（打断攻击）
    sm.addTransition(PARTNER_STATE.ATTACK, PARTNER_STATE.FOLLOW, () => {
        return this.isMainCharacterMoving();
    });

    // ATTACK -> IDLE: 无僵尸
    sm.addTransition(PARTNER_STATE.ATTACK, PARTNER_STATE.IDLE, () => {
        return !this.hasZombieInRange(this.detectionRange);
    });

    // ATTACK -> DIE: 血量归零
    sm.addTransition(PARTNER_STATE.ATTACK, PARTNER_STATE.DIE, () => {
        return this.hp <= 0;
    });

    // AVOID -> FOLLOW: 避障完成且主人物移动
    sm.addTransition(PARTNER_STATE.AVOID, PARTNER_STATE.FOLLOW, () => {
        return this.isAvoidanceComplete() && this.isMainCharacterMoving();
    });

    // AVOID -> ATTACK: 避障完成且主人物停止且有僵尸
    sm.addTransition(PARTNER_STATE.AVOID, PARTNER_STATE.ATTACK, () => {
        return this.isAvoidanceComplete() && !this.isMainCharacterMoving() && this.hasZombieInRange(this.detectionRange);
    });

    // AVOID -> DIE: 血量归零
    sm.addTransition(PARTNER_STATE.AVOID, PARTNER_STATE.DIE, () => {
        return this.hp <= 0;
    });

    // 添加状态行为
    sm.addBehavior(PARTNER_STATE.INIT, this.onEnterInit.bind(this), this.onUpdateInit.bind(this), this.onExitInit.bind(this));
    sm.addBehavior(PARTNER_STATE.IDLE, this.onEnterIdle.bind(this), this.onUpdateIdle.bind(this), this.onExitIdle.bind(this));
    sm.addBehavior(PARTNER_STATE.FOLLOW, this.onEnterFollow.bind(this), this.onUpdateFollow.bind(this), this.onExitFollow.bind(this));
    sm.addBehavior(PARTNER_STATE.ATTACK, this.onEnterAttack.bind(this), this.onUpdateAttack.bind(this), this.onExitAttack.bind(this));
    sm.addBehavior(PARTNER_STATE.AVOID, this.onEnterAvoid.bind(this), this.onUpdateAvoid.bind(this), this.onExitAvoid.bind(this));
    sm.addBehavior(PARTNER_STATE.DIE, this.onEnterDie.bind(this), this.onUpdateDie.bind(this), this.onExitDie.bind(this));
};

// ==================== 状态行为方法 ====================

// INIT状态
Partner.prototype.onEnterInit = function (stateData) {
    this.status = PARTNER_STATE.INIT;
    this.isMoving = false;
    console.log('伙伴进入初始状态');
};

Partner.prototype.onUpdateInit = function (deltaTime, stateData) {
    // 初始状态：静止不动，渲染待机动画
    this.updateAnimation(deltaTime);
    
    // 检查与主角的碰撞
    this.checkCollisionWithMainCharacter();
};

Partner.prototype.onExitInit = function (stateData) {
    this.isInitialState = false; // 退出初始状态，不再显示灰色
    console.log('伙伴退出初始状态');
};

// IDLE状态
Partner.prototype.onEnterIdle = function (stateData) {
    this.status = PARTNER_STATE.IDLE;
    this.isMoving = false;
    console.log('伙伴进入待机状态');
};

Partner.prototype.onUpdateIdle = function (deltaTime, stateData) {
    // 待机状态：静止不动，渲染待机动画
    this.updateAnimation(deltaTime);
};

Partner.prototype.onExitIdle = function (stateData) {
    console.log('伙伴退出待机状态');
};

// FOLLOW状态
Partner.prototype.onEnterFollow = function (stateData) {
    this.status = PARTNER_STATE.FOLLOW;
    this.isMoving = true;
    console.log('伙伴进入跟随状态');
};

Partner.prototype.onUpdateFollow = function (deltaTime, stateData) {
    // 跟随状态：追逐主人物侧后方跟随点
    this.updateFollowMovement(deltaTime);
    this.updateAnimation(deltaTime);
};

Partner.prototype.onExitFollow = function (stateData) {
    this.isMoving = false;
    console.log('伙伴退出跟随状态');
};

// ATTACK状态
Partner.prototype.onEnterAttack = function (stateData) {
    this.status = PARTNER_STATE.ATTACK;
    this.isMoving = false;
    this.attackCooldown = 0;
    console.log('伙伴进入攻击状态');
    this.findAttackTarget();
};

Partner.prototype.onUpdateAttack = function (deltaTime, stateData) {
    // 攻击状态：移动到攻击距离并攻击
    this.updateAttack(deltaTime);
    this.updateAnimation(deltaTime);
};

Partner.prototype.onExitAttack = function (stateData) {
    this.attackTarget = null;
    console.log('伙伴退出攻击状态');
};

// AVOID状态
Partner.prototype.onEnterAvoid = function (stateData) {
    this.status = PARTNER_STATE.AVOID;
    this.isMoving = true;
    this.avoidProgress = 0;
    this.calculateAvoidanceTarget();
    console.log('伙伴进入避障状态');
};

Partner.prototype.onUpdateAvoid = function (deltaTime, stateData) {
    // 避障状态：按避障策略移动
    this.updateAvoidance(deltaTime);
    this.updateAnimation(deltaTime);
};

Partner.prototype.onExitAvoid = function (stateData) {
    this.isMoving = false;
    console.log('伙伴退出避障状态');
};

// DIE状态
Partner.prototype.onEnterDie = function (stateData) {
    this.status = PARTNER_STATE.DIE;
    this.isMoving = false;
    this.deathAnimationTime = 0;
    console.log('伙伴进入死亡状态');
    this.playDeathAnimation();
};

Partner.prototype.onUpdateDie = function (deltaTime, stateData) {
    // 死亡状态：播放死亡动画
    this.deathAnimationTime += deltaTime;
    this.updateAnimation(deltaTime);

    // 死亡动画持续2秒
    if (this.deathAnimationTime >= 2.0) {
        this.destroy();
    }
};

Partner.prototype.onExitDie = function (stateData) {
    console.log('伙伴退出死亡状态');
};

// ==================== 核心逻辑方法 ====================

// 更新跟随移动
Partner.prototype.updateFollowMovement = function (deltaTime) {
    // 计算跟随点
    this.calculateFollowPoint();

    // 移动到跟随点
    var distance = this.getDistanceTo(this.followPoint.x, this.followPoint.y);

    if (distance > 5) { // 距离跟随点超过5px才移动
        var angle = Math.atan2(this.followPoint.y - this.y, this.followPoint.x - this.x);
        var moveDistance = this.moveSpeed * deltaTime;

        var newX = this.x + Math.cos(angle) * moveDistance;
        var newY = this.y + Math.sin(angle) * moveDistance;

        // 检查碰撞
        var finalPosition = this.checkCollision(this.x, this.y, newX, newY);
        if (finalPosition) {
            this.x = finalPosition.x;
            this.y = finalPosition.y;
        }
    }
};

// 计算跟随点
Partner.prototype.calculateFollowPoint = function () {
    var mainChar = this.getMainCharacter();
    if (!mainChar) return;

    // 计算主人物移动方向
    var mainCharDirection = this.getMainCharacterDirection();

    // 跟随点在主人物后方，距离80px
    this.followPoint.x = mainChar.x + Math.cos(this.followAngle) * this.followDistance;
    this.followPoint.y = mainChar.y + Math.sin(this.followAngle) * this.followDistance;

    // 记录主人物位置
    this.lastMainCharPosition.x = mainChar.x;
    this.lastMainCharPosition.y = mainChar.y;
};

// 更新攻击
Partner.prototype.updateAttack = function (deltaTime) {
    if (!this.attackTarget || this.attackTarget.hp <= 0) {
        this.findAttackTarget();
        return;
    }

    var distance = this.getDistanceTo(this.attackTarget.x, this.attackTarget.y);

    if (distance <= this.attackRange) {
        // 在攻击范围内，执行攻击
        this.attackCooldown += deltaTime;
        var combatConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT') : null;
        var attackInterval = combatConfig ? combatConfig.DEFAULT_ATTACK_INTERVAL : 1.0;

        if (this.attackCooldown >= attackInterval) {
            this.performAttack();
            this.attackCooldown = 0;
        }
    } else {
        // 不在攻击范围内，移动到攻击距离
        this.moveToAttackRange();
    }
};

// 寻找攻击目标
Partner.prototype.findAttackTarget = function () {
    if (!window.zombieManager) return;

    var zombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
    if (zombies.length === 0) {
        this.attackTarget = null;
        return;
    }

    var mathUtils = UtilsManager.getMathUtils();
    var closestZombie = null;
    var closestDistance = Infinity;

    // 寻找最近的僵尸
    for (var i = 0; i < zombies.length; i++) {
        var zombie = zombies[i];
        var distance = mathUtils.distance(this.x, this.y, zombie.x, zombie.y);

        if (distance <= this.detectionRange && distance < closestDistance) {
            closestDistance = distance;
            closestZombie = zombie;
        }
    }

    this.attackTarget = closestZombie;

    if (this.attackTarget) {
        console.log('伙伴更新攻击目标:', this.attackTarget.type, '距离:', closestDistance);
    }
};

// 移动到攻击范围
Partner.prototype.moveToAttackRange = function () {
    if (!this.attackTarget || this.attackTarget.hp <= 0) return;

    var distance = this.getDistanceTo(this.attackTarget.x, this.attackTarget.y);
    var targetDistance = this.attackRange - 2;

    if (distance > targetDistance) {
        var angle = Math.atan2(this.attackTarget.y - this.y, this.attackTarget.x - this.x);
        var targetX = this.attackTarget.x + Math.cos(angle + Math.PI) * targetDistance;
        var targetY = this.attackTarget.y + Math.sin(angle + Math.PI) * targetDistance;

        var moveDistance = this.moveSpeed * (1 / 60);
        var newX = this.x + Math.cos(angle) * moveDistance;
        var newY = this.y + Math.sin(angle) * moveDistance;

        // 检查碰撞
        var finalPosition = this.checkCollision(this.x, this.y, newX, newY);
        if (finalPosition) {
            this.x = finalPosition.x;
            this.y = finalPosition.y;
        }
    }
};

// 执行攻击
Partner.prototype.performAttack = function () {
    if (!this.attackTarget || this.attackTarget.hp <= 0) return;

    // 对僵尸造成伤害
    this.attackTarget.takeDamage(this.attack);

    console.log('伙伴攻击僵尸:', this.attackTarget.type, '造成伤害:', this.attack);

    // 播放攻击动画
    this.playAttackAnimation();
};

// 更新避障
Partner.prototype.updateAvoidance = function (deltaTime) {
    this.avoidProgress += deltaTime;

    if (this.avoidProgress >= this.avoidDuration) {
        // 避障完成
        this.avoidProgress = this.avoidDuration;
        return;
    }

    // 计算避障移动
    var progress = this.avoidProgress / this.avoidDuration;
    var easeProgress = this.easeInOutQuad(progress);

    var newX = this.x + (this.avoidTarget.x - this.x) * easeProgress * deltaTime * 2;
    var newY = this.y + (this.avoidTarget.y - this.y) * easeProgress * deltaTime * 2;

    // 检查碰撞
    var finalPosition = this.checkCollision(this.x, this.y, newX, newY);
    if (finalPosition) {
        this.x = finalPosition.x;
        this.y = finalPosition.y;
    }
};

// 计算避障目标
Partner.prototype.calculateAvoidanceTarget = function () {
    var mainChar = this.getMainCharacter();
    if (!mainChar) return;

    var mainCharDirection = this.getMainCharacterDirection();
    var distance = this.getDistanceTo(mainChar.x, mainChar.y);

    // 根据避障策略计算目标位置
    switch (this.avoidStrategy) {
        case AVOID_STRATEGY.SIDE_MOVE:
            // 侧移：垂直于主人物移动方向
            var perpendicularAngle = mainCharDirection + Math.PI / 2;
            this.avoidTarget.x = this.x + Math.cos(perpendicularAngle) * 50;
            this.avoidTarget.y = this.y + Math.sin(perpendicularAngle) * 50;
            break;

        case AVOID_STRATEGY.FORWARD_MOVE:
            // 前移：在主人物移动方向前方
            this.avoidTarget.x = this.x + Math.cos(mainCharDirection) * 50;
            this.avoidTarget.y = this.y + Math.sin(mainCharDirection) * 50;
            break;

        case AVOID_STRATEGY.BACKWARD_MOVE:
            // 后移：在主人物移动方向后方
            this.avoidTarget.x = this.x + Math.cos(mainCharDirection + Math.PI) * 50;
            this.avoidTarget.y = this.y + Math.sin(mainCharDirection + Math.PI) * 50;
            break;
    }

    // 确保避障目标在可行走区域
    if (window.collisionSystem && window.collisionSystem.isPositionWalkable) {
        if (!window.collisionSystem.isPositionWalkable(this.avoidTarget.x, this.avoidTarget.y)) {
            // 如果目标位置不可行走，尝试其他策略
            this.avoidStrategy = AVOID_STRATEGY.SIDE_MOVE;
            this.calculateAvoidanceTarget();
        }
    }
};

// ==================== 辅助方法 ====================

// 检查碰撞
Partner.prototype.checkCollision = function (fromX, fromY, toX, toY) {
    if (!window.collisionSystem) {
        return {x: toX, y: toY};
    }

    // 使用贴着建筑物移动算法
    if (window.collisionSystem.getWallFollowingPosition) {
        var safePos = window.collisionSystem.getWallFollowingPosition(fromX, fromY, toX, toY, this.radius || 16, this.moveSpeed);

        if (safePos) {
            return safePos;
        }
    }

    // 备用方案：直接检查目标位置是否可行走
    if (window.collisionSystem.isPositionWalkable && window.collisionSystem.isPositionWalkable(toX, toY)) {
        return {x: toX, y: toY};
    }

    return {x: fromX, y: fromY};
};

// 获取主人物
Partner.prototype.getMainCharacter = function () {
    if (window.characterManager && window.characterManager.getMainCharacter) {
        return window.characterManager.getMainCharacter();
    }
    return null;
};

// 检查主人物是否在附近
Partner.prototype.isMainCharacterNearby = function (distance) {
    var mainChar = this.getMainCharacter();
    if (!mainChar) return false;

    var mathUtils = UtilsManager.getMathUtils();
    var dist = mathUtils.distance(this.x, this.y, mainChar.x, mainChar.y);
    return dist <= distance;
};

// 检查与主角的碰撞
Partner.prototype.checkCollisionWithMainCharacter = function () {
    var mainChar = this.getMainCharacter();
    if (!mainChar) return;

    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, mainChar.x, mainChar.y);
    
    // 如果距离小于20px，认为发生碰撞
    if (distance <= 20) {
        console.log('伙伴与主角发生碰撞，距离:', distance);
        // 状态机会自动处理状态转换
    }
};

// 检查主人物是否在移动
Partner.prototype.isMainCharacterMoving = function () {
    var mainChar = this.getMainCharacter();
    if (!mainChar) return false;

    return mainChar.stateMachine && mainChar.stateMachine.isInState('MOVE');
};

// 获取主人物移动方向
Partner.prototype.getMainCharacterDirection = function () {
    var mainChar = this.getMainCharacter();
    if (!mainChar) return 0;

    // 计算主人物移动方向
    var deltaX = mainChar.x - this.lastMainCharPosition.x;
    var deltaY = mainChar.y - this.lastMainCharPosition.y;

    if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) {
        return 0; // 主人物没有移动
    }

    return Math.atan2(deltaY, deltaX);
};

// 检查是否有僵尸在范围内
Partner.prototype.hasZombieInRange = function (range) {
    if (!window.zombieManager) return false;

    var zombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
    var mathUtils = UtilsManager.getMathUtils();

    return zombies.some(zombie => {
        var distance = mathUtils.distance(this.x, this.y, zombie.x, zombie.y);
        return distance <= range;
    });
};

// 检查是否拥堵
Partner.prototype.isCongested = function () {
    var mainChar = this.getMainCharacter();
    if (!mainChar) return false;

    var distance = this.getDistanceTo(mainChar.x, mainChar.y);
    var mainCharDirection = this.getMainCharacterDirection();

    // 检查主人物移动方向是否朝向自身
    var angleToMainChar = Math.atan2(mainChar.y - this.y, mainChar.x - this.x);
    var angleDiff = Math.abs(angleToMainChar - mainCharDirection);

    // 如果角度差小于90度且距离小于80px，认为拥堵
    return angleDiff < Math.PI / 2 && distance < 80;
};

// 检查避障是否完成
Partner.prototype.isAvoidanceComplete = function () {
    return this.avoidProgress >= this.avoidDuration;
};

// 计算距离
Partner.prototype.getDistanceTo = function (targetX, targetY) {
    var dx = this.x - targetX;
    var dy = this.y - targetY;
    return Math.sqrt(dx * dx + dy * dy);
};

// 更新动画
Partner.prototype.updateAnimation = function (deltaTime) {
    var animationUtils = UtilsManager.getAnimationUtils();
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;

    // 根据状态调整动画速度
    var baseSpeed = this.animationSpeed;
    var adjustedSpeed = baseSpeed;

    switch (this.status) {
        case PARTNER_STATE.FOLLOW:
            adjustedSpeed = baseSpeed * 1.5;
            break;
        case PARTNER_STATE.ATTACK:
            adjustedSpeed = baseSpeed * 2.0;
            break;
        case PARTNER_STATE.AVOID:
            adjustedSpeed = baseSpeed * 1.8;
            break;
        case PARTNER_STATE.DIE:
            adjustedSpeed = baseSpeed * 0.5;
            break;
        default:
            adjustedSpeed = baseSpeed;
    }

    // 更新动画帧
    this.animationFrame = animationUtils.updateFrame(this.animationFrame, adjustedSpeed * deltaTime, animationConfig ? animationConfig.MAX_ANIMATION_FRAMES : 8);
};

// 播放攻击动画
Partner.prototype.playAttackAnimation = function () {
    this.animationFrame = 0;
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
    this.animationSpeed = animationConfig ? (animationConfig.ATTACK_ANIMATION_SPEED || 0.3) : 0.3;
    console.log('伙伴播放攻击动画');
};

// 播放死亡动画
Partner.prototype.playDeathAnimation = function () {
    this.animationFrame = 0;
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
    this.animationSpeed = animationConfig ? (animationConfig.DEATH_ANIMATION_SPEED || 0.1) : 0.1;
    console.log('伙伴播放死亡动画');
};

// 缓动函数
Partner.prototype.easeInOutQuad = function (t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

// 受到伤害
Partner.prototype.takeDamage = function (damage) {
    var validationUtils = UtilsManager.getValidationUtils();

    if (!validationUtils.validateRange(damage, 0, 1000, '伤害值')) {
        console.warn('无效的伤害值:', damage);
        return this.hp;
    }

    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;
    return this.hp;
};

// 销毁伙伴
Partner.prototype.destroy = function () {
    console.log('伙伴销毁:', this.role);

    // 通知伙伴管理器
    if (window.partnerManager && window.partnerManager.destroyPartner) {
        window.partnerManager.destroyPartner(this);
    }

    this._destroyed = true;
};

// 获取身体颜色
Partner.prototype.getBodyColor = function () {
    // 如果是初始状态，返回初始颜色（灰色）
    if (this.isInitialState) {
        return this.initialColor || '#95a5a6'; // 灰色
    }
    return this.color;
};

// 获取头部颜色
Partner.prototype.getHeadColor = function () {
    return '#fdbcb4'; // 肤色
};

// 伙伴管理器
var PartnerManager = {
    partners: [], maxPartners: 10,

    // 创建伙伴
    createPartner: function (role, x, y) {
        if (this.partners.length >= this.maxPartners) {
            console.warn('伙伴数量已达上限');
            return null;
        }

        var partner = new Partner(role, x, y);
        this.partners.push(partner);

        console.log('创建伙伴:', partner.role, '位置:', x, y);
        return partner;
    },

    // 获取所有伙伴
    getAllPartners: function () {
        return this.partners.filter(partner => partner && partner.hp > 0);
    },

    // 更新所有伙伴
    updateAllPartners: function (deltaTime) {
        var partners = this.getAllPartners();

        partners.forEach(partner => {
            try {
                if (partner.stateMachine) {
                    partner.stateMachine.update(deltaTime);
                }
            } catch (error) {
                console.error('伙伴更新出错:', error);
            }
        });
    },

    // 销毁伙伴
    destroyPartner: function (partner) {
        var index = this.partners.indexOf(partner);
        if (index > -1) {
            this.partners.splice(index, 1);
            console.log('伙伴已从管理器移除');
        }
    },

    // 在地图上生成伙伴
    generatePartnersOnMap: function () {
        console.log('🗺️ 开始在地图上生成伙伴...');
        
        try {
            if (!this.partners) {
                console.error('❌ 伙伴管理器未初始化');
                return;
            }
            
            // 伙伴职业类型
            var partnerRoles = [2, 3, 4, 5, 6]; // 警察、平民、医生、护士、厨师
            var partnerCount = 5; // 生成5个伙伴
            
            for (var i = 0; i < partnerCount; i++) {
                // 随机选择职业
                var role = partnerRoles[Math.floor(Math.random() * partnerRoles.length)];
                
                // 生成安全位置
                var safePosition = null;
                if (window.collisionSystem && window.collisionSystem.generateGameSafePosition) {
                    // 在地图不同区域生成伙伴
                    var centerX, centerY;
                    switch (i) {
                        case 0: // 北部区域
                            centerX = 5000;
                            centerY = 2000;
                            break;
                        case 1: // 东部区域
                            centerX = 8000;
                            centerY = 5000;
                            break;
                        case 2: // 西部区域
                            centerX = 2000;
                            centerY = 5000;
                            break;
                        case 3: // 南部区域
                            centerX = 5000;
                            centerY = 8000;
                            break;
                        case 4: // 中心区域
                            centerX = 5000;
                            centerY = 5000;
                            break;
                        default:
                            centerX = 5000;
                            centerY = 5000;
                    }
                    
                    safePosition = window.collisionSystem.generateGameSafePosition(
                        centerX, centerY,  // 中心位置
                        200, 800,          // 最小距离200，最大距离800
                        32, 48,            // 伙伴尺寸
                        16                 // 安全半径
                    );
                    
                    if (safePosition && safePosition.success) {
                        console.log(`✅ 伙伴${i+1}安全位置生成成功:`, safePosition);
                    } else {
                        console.warn(`⚠️ 伙伴${i+1}安全位置生成失败，使用备用位置`);
                        safePosition = {x: centerX, y: centerY, success: true};
                    }
                } else {
                    // 备用位置
                    var centerX = 5000 + (i - 2) * 1000;
                    var centerY = 5000 + (i - 2) * 1000;
                    safePosition = {x: centerX, y: centerY, success: true};
                }
                
                // 创建伙伴
                var partner = this.createPartner(role, safePosition.x, safePosition.y);
                if (partner) {
                    console.log(`✅ 伙伴${i+1}创建成功:`, partner.role, '位置:', safePosition.x, safePosition.y);
                } else {
                    console.error(`❌ 伙伴${i+1}创建失败`);
                }
            }
            
            var partners = this.getAllPartners();
            console.log(`✅ 伙伴生成完成，伙伴数量: ${partners.length}`);
            
        } catch (error) {
            console.error('❌ 伙伴生成失败:', error);
        }
    }
};

// 导出
export {PARTNER_ROLE, PARTNER_STATE, AVOID_STRATEGY};
export {PartnerManager};
export default Partner;
