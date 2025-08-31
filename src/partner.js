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
    // 伙伴移动速度 - 从配置获取
    this.moveSpeed = movementConfig ? movementConfig.PARTNER_MOVE_SPEED : 4.5;

    // 🔴 修复：从配置获取跟随距离
    var combatConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT') : null;
    this.followDistance = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100; // 从config.js获取跟随距离
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
            this.hp = combatConfig ? combatConfig.DEFAULT_HP : 100; // 从config.js获取血量
            this.maxHp = this.hp;
            this.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20; // 从config.js获取攻击力
            this.attackRange = combatConfig ? combatConfig.POLICE_ATTACK_RANGE : 100; // 从config.js获取攻击范围
            this.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100; // 从config.js获取检测范围
            this.icon = '👮';
            this.color = '#2c3e50';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        case PARTNER_ROLE.CIVILIAN:
            this.hp = combatConfig ? combatConfig.DEFAULT_HP : 100; // 从config.js获取血量
            this.maxHp = this.hp;
            this.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20; // 从config.js获取攻击力
            this.attackRange = combatConfig ? combatConfig.POLICE_ATTACK_RANGE : 100; // 从config.js获取攻击范围
            this.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100; // 从config.js获取检测范围
            this.icon = '👨';
            this.color = '#95a5a6';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        case PARTNER_ROLE.DOCTOR:
            this.hp = combatConfig ? combatConfig.DEFAULT_HP : 100; // 从config.js获取血量
            this.maxHp = this.hp;
            this.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20; // 从config.js获取攻击力
            this.attackRange = combatConfig ? combatConfig.DOCTOR_ATTACK_RANGE : 100; // 从config.js获取攻击范围
            this.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100; // 从config.js获取检测范围
            this.icon = '👨‍⚕️';
            this.color = '#e74c3c';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        case PARTNER_ROLE.NURSE:
            this.hp = combatConfig ? combatConfig.DEFAULT_HP : 100; // 从config.js获取血量
            this.maxHp = this.hp;
            this.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20; // 从config.js获取攻击力
            this.attackRange = combatConfig ? combatConfig.NURSE_ATTACK_RANGE : 100; // 从config.js获取攻击范围
            this.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100; // 从config.js获取检测范围
            this.icon = '👩‍⚕️';
            this.color = '#e91e63';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        case PARTNER_ROLE.CHEF:
            this.hp = combatConfig ? combatConfig.DEFAULT_HP : 100; // 从config.js获取血量
            this.maxHp = this.hp;
            this.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20; // 从config.js获取攻击力
            this.attackRange = combatConfig ? combatConfig.CHEF_ATTACK_RANGE : 100; // 从config.js获取攻击范围
            this.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100; // 从config.js获取检测范围
            this.icon = '👨‍🍳';
            this.color = '#f39c12';
            this.initialColor = '#95a5a6'; // 初始状态为灰色
            break;

        default:
            this.hp = combatConfig ? combatConfig.DEFAULT_HP : 100; // 从config.js获取血量
            this.maxHp = this.hp;
            this.attack = combatConfig ? combatConfig.DEFAULT_ATTACK : 20; // 从config.js获取攻击力
            this.attackRange = combatConfig ? combatConfig.POLICE_ATTACK_RANGE : 100; // 从config.js获取攻击范围
            this.detectionRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100; // 从config.js获取检测范围
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

          // INIT -> FOLLOW: 主人物靠近配置距离
      sm.addTransition(PARTNER_STATE.INIT, PARTNER_STATE.FOLLOW, () => {
          // 从配置获取伙伴激活距离
          var detectionConfig = window.ConfigManager ? window.ConfigManager.get('DETECTION') : null;
          var activationDistance = detectionConfig ? detectionConfig.SAFE_SPAWN_DISTANCE : 100;
          return this.isMainCharacterNearby(activationDistance);
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

    // 🔴 修复：从配置获取攻击范围
    var attackJudgmentConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT.ATTACK_JUDGMENT') : { RANGE_BUFFER: 5 };
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;
    if (distance <= effectiveAttackRange) { // 使用配置的攻击范围
        // 在攻击范围内，执行攻击
        this.attackCooldown += deltaTime;
        
        // 🔴 修复：从配置获取攻击间隔
        var combatConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT') : null;
        var attackInterval = combatConfig ? combatConfig.DEFAULT_ATTACK_INTERVAL : 0.5; // 从配置获取攻击间隔

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
      var attackJudgmentConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT.ATTACK_JUDGMENT') : { RANGE_BUFFER: 5 };
      var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER; // 有效攻击范围（攻击范围加上缓冲）
      var targetDistance = this.attackRange; // 目标距离等于基础攻击范围（不使用缓冲）

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
    
    // 🔴 修复：增加碰撞检测距离到50px，确保能检测到碰撞
    if (distance <= 50) {
        console.warn('🔴 伙伴与主角发生碰撞，距离:', distance);
        
        // 🔴 新增：碰撞后的特殊处理逻辑
        this.handleCollisionWithMainCharacter(distance);
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

    // 🔴 修复：从配置获取拥堵检测距离
    var combatConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT') : null;
    var congestionDistance = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 100;
    // 如果角度差小于90度且距离小于配置距离，认为拥堵
    return angleDiff < Math.PI / 2 && distance < congestionDistance;
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

// 🔴 修复：添加缺失的移动攻击动画方法（抖音小游戏环境兼容）
Partner.prototype.playAttackAnimationWhileMoving = function () {
    // 移动时播放攻击动画
    this.animationFrame = 0;
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
    this.animationSpeed = animationConfig ? (animationConfig.ATTACK_ANIMATION_SPEED || 0.3) : 0.3;
    console.log('伙伴播放移动攻击动画');
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
        throw new Error('无效的伤害值: ' + damage);
        return this.hp;
    }

    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;
    
    // 🔴 修复：受到伤害后立即检查血量，如果血量归零则触发死亡
    if (this.hp <= 0) {
        console.log('💀 伙伴受到致命伤害，血量归零');
        if (this.stateMachine && this.stateMachine.currentState !== PARTNER_STATE.DIE) {
            this.stateMachine.forceState(PARTNER_STATE.DIE);
        }
    }
    
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

// 🔴 新增：处理与主角碰撞的方法
Partner.prototype.handleCollisionWithMainCharacter = function (distance) {
    console.warn('🔴 开始处理伙伴与主角的碰撞，当前状态:', this.status);
    
    // 确保伙伴已加入对象管理模块
    this.ensureRegisteredInObjectManager();
    
    // 如果距离太近（小于30px），强制调整位置避免重叠
    if (distance < 30) {
        this.adjustPositionToAvoidOverlap();
    }
    
    // 🔴 核心：确保跟随状态正确，跟随优先
    if (this.status === PARTNER_STATE.INIT) {
        // 如果还在初始状态，强制转换为跟随状态
        if (this.stateMachine) {
            this.stateMachine.forceState(PARTNER_STATE.FOLLOW);
            console.log('🔴 碰撞后强制转换到跟随状态');
        }
    } else if (this.status !== PARTNER_STATE.FOLLOW) {
        // 如果不在跟随状态，也强制转换到跟随状态（跟随优先）
        if (this.stateMachine) {
            this.stateMachine.forceState(PARTNER_STATE.FOLLOW);
            console.log('🔴 碰撞后强制转换到跟随状态（从其他状态）');
        }
    }
    
    // 更新跟随点，确保跟随逻辑正确
    this.calculateFollowPoint();
    
    // 标记伙伴为活跃状态
    this.isActive = true;
    this.isInitialState = false;
    
    console.warn('🔴 碰撞处理完成，伙伴状态:', this.status);
};

// 🔴 新增：确保伙伴已注册到对象管理模块
Partner.prototype.ensureRegisteredInObjectManager = function () {
    if (!window.objectManager) {
        console.error('🔴 对象管理器未初始化');
        return;
    }
    
    // 检查是否已经注册
    var existingPartner = window.objectManager.getObject(this.id);
    if (!existingPartner) {
        // 如果未注册，则注册到对象管理器
        window.objectManager.registerObject(this, 'partner', this.id);
        console.log('🔴 伙伴已注册到对象管理器:', this.id);
    } else {
        console.log('🔴 伙伴已在对象管理器中注册:', this.id);
    }
};

// 🔴 新增：调整位置避免重叠
Partner.prototype.adjustPositionToAvoidOverlap = function () {
    var mainChar = this.getMainCharacter();
    if (!mainChar) return;
    
    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, mainChar.x, mainChar.y);
    
    if (distance < 30) {
        // 计算远离主角的方向
        var angle = Math.atan2(this.y - mainChar.y, this.x - mainChar.x);
        var targetDistance = 40; // 目标距离40px
        
        // 计算新位置
        var newX = mainChar.x + Math.cos(angle) * targetDistance;
        var newY = mainChar.y + Math.sin(angle) * targetDistance;
        
        // 检查新位置是否可行走
        if (window.collisionSystem && window.collisionSystem.isPositionWalkable) {
            if (window.collisionSystem.isPositionWalkable(newX, newY)) {
                this.x = newX;
                this.y = newY;
                console.log('🔴 调整伙伴位置避免重叠:', this.x, this.y);
            }
        }
    }
};

// 🔴 新增：调试方法，用于诊断跟随问题
Partner.prototype.debugFollowStatus = function () {
    var mainChar = this.getMainCharacter();
    if (!mainChar) {
        console.log('🔴 调试: 无法获取主人物');
        return;
    }
    
          var distance = this.getDistanceTo(mainChar.x, mainChar.y);
      // 从配置获取伙伴激活距离
      var detectionConfig = window.ConfigManager ? window.ConfigManager.get('DETECTION') : null;
      var activationDistance = detectionConfig ? detectionConfig.SAFE_SPAWN_DISTANCE : 100;
      var isNearby = this.isMainCharacterNearby(activationDistance);
    var isMoving = this.isMainCharacterMoving();
    var followDistance = this.getDistanceTo(this.followPoint.x, this.followPoint.y);
    
    console.log('🔴 伙伴调试信息:', {
        '伙伴ID': this.id,
        '伙伴状态': this.status,
        '距离主角': distance.toFixed(2),
        '是否在附近(50px)': isNearby,
        '主角是否移动': isMoving,
        '距离跟随点': followDistance.toFixed(2),
        '跟随点位置': {x: this.followPoint.x.toFixed(2), y: this.followPoint.y.toFixed(2)},
        '伙伴位置': {x: this.x.toFixed(2), y: this.y.toFixed(2)},
        '主角位置': {x: mainChar.x.toFixed(2), y: mainChar.y.toFixed(2)},
        '是否活跃': this.isActive,
        '是否初始状态': this.isInitialState
    });
};

// 🔴 新增：强制跟随方法（用于测试）
Partner.prototype.forceFollow = function () {
    if (this.stateMachine) {
        this.stateMachine.forceState(PARTNER_STATE.FOLLOW);
        console.log('🔴 强制伙伴进入跟随状态');
    }
};

// 伙伴管理器
var PartnerManager = {
    partners: [], 
    maxPartners: 9999, // 🔴 修改：直接设置为9999，移除伙伴数量限制
    
    // 对象池引用
    objectPool: null,

    // 初始化对象池
    initObjectPool: function() {
        if (!window.objectPoolManager) {
            return;
        }
        
        // 创建伙伴对象池
        this.objectPool = window.objectPoolManager.createPool('partner', 
            // 创建函数
            () => new Partner(PARTNER_ROLE.CIVILIAN, 0, 0),
            // 重置函数
            (partner) => this.resetPartner(partner)
        );
        
        console.log('✅ 伙伴对象池初始化完成');
    },
    
    // 重置伙伴状态（对象池复用）
    resetPartner: function(partner) {
        if (!partner) return;
        
        // 重置基础属性
        partner.hp = partner.maxHp || 50;
        partner.status = PARTNER_STATE.IDLE;
        partner.isMoving = false;
        partner.targetX = partner.x;
        partner.targetY = partner.y;
        partner.attackCooldown = 0;
        partner.attackTarget = null;
        partner.stuckTime = 0;
        partner.lastPosition = null;
        
        // 🔴 修复：重新设置移动速度，确保从对象池复用的伙伴有正确的速度
        var movementConfig = window.ConfigManager ? window.ConfigManager.get('MOVEMENT') : null;
        var expectedSpeed = movementConfig ? movementConfig.PARTNER_MOVE_SPEED : 4.5;
        
        partner.moveSpeed = expectedSpeed;
        
        // 🔴 新增：验证移动速度
        if (partner.moveSpeed !== expectedSpeed) {
            console.warn('⚠️ 伙伴移动速度不一致:', partner.moveSpeed, 'vs', expectedSpeed, '角色:', partner.role);
            partner.moveSpeed = expectedSpeed;
        }
        
        // 重置状态机
        if (partner.stateMachine) {
            partner.stateMachine.forceState(PARTNER_STATE.IDLE);
        }
        
        // 重置动画
        partner.animationFrame = 0;
        partner.frameCount = 0;
        
        console.log('✅ 伙伴状态重置完成:', partner.id, '角色:', partner.role, '移动速度:', partner.moveSpeed);
    },

    // 创建伙伴
    createPartner: function (role, x, y) {
        if (!window.objectManager) {
            throw new Error('对象管理器未初始化');
        }
        
        var currentPartnerCount = window.objectManager.getObjectCount('partner');
        if (currentPartnerCount >= this.maxPartners) {
            console.log('达到最大伙伴数量限制:', currentPartnerCount, '/', this.maxPartners);
            return null;
        }

        var partner = null;
        
        // 优先使用对象池
        if (this.objectPool) {
            partner = this.objectPool.get();
            if (partner) {
                // 重新初始化伙伴属性
                partner.role = role;
                partner.x = x;
                partner.y = y;
                partner.setupRoleProperties();
                partner.initializeStateMachine();
                
                console.log('✅ 从对象池获取伙伴:', partner.role, '位置:', x, y);
            }
        }
        
        // 对象池不可用时，使用传统创建方式
        if (!partner) {
            partner = new Partner(role, x, y);
            console.log('✅ 传统方式创建伙伴:', partner.role, '位置:', x, y);
        }
        
        // 🔴 协调对象管理器：注册新创建的伙伴
        if (partner && window.objectManager) {
            window.objectManager.registerObject(partner, 'partner', partner.id);
            console.log('✅ 伙伴已注册到对象管理器:', partner.id);
        } else {
            throw new Error('对象管理器未初始化或伙伴创建失败');
        }
        
        // 🔴 重构：不再添加到内部存储，对象管理器作为唯一数据源
        console.log('✅ 伙伴创建完成，已注册到对象管理器:', partner.role, '位置:', x, y);
        return partner;
    },

    // 🔴 重构：从对象管理器获取所有伙伴 - 对象管理器作为唯一数据源
    getAllPartners: function () {
        if (!window.objectManager) {
            throw new Error('对象管理器未初始化');
        }
        
        return window.objectManager.getAllPartners();
    },

    // 更新所有伙伴
    updateAllPartners: function (deltaTime) {
        var partners = this.getAllPartners();

        partners.forEach(partner => {
            // 🔴 修复：首先检查血量，如果血量小于等于0，立即切换到死亡状态
            if (partner.hp <= 0 && partner.stateMachine.currentState !== PARTNER_STATE.DIE) {
                console.log('💀 伙伴血量归零，强制切换到死亡状态');
                partner.stateMachine.forceState(PARTNER_STATE.DIE);
            }
            
            if (partner.stateMachine) {
                partner.stateMachine.update(deltaTime);
            }
        });
    },

    // 销毁伙伴
    destroyPartner: function (partner) {
        if (!partner) return;
        
        console.log('🗑️ 销毁伙伴:', partner.id, '角色:', partner.role);
        
        // 🔴 协调对象管理器：从对象管理器中移除
        if (window.objectManager) {
            const destroyResult = window.objectManager.destroyObject(partner.id);
            if (destroyResult) {
                console.log('✅ 伙伴已从对象管理器移除:', partner.id);
            } else {
                console.warn('⚠️ 伙伴从对象管理器移除失败:', partner.id);
            }
        }
        
        // 🔴 协调对象池：使用对象池管理对象生命周期
        if (this.objectPool) {
            // 重置伙伴状态
            partner.hp = 0;
            partner.status = PARTNER_STATE.DIE;
            partner.isActive = false;
            
            // 归还到对象池
            this.objectPool.return(partner);
            console.log('✅ 伙伴已归还到对象池:', partner.id);
        } else {
            // 对象池不可用时，直接删除引用
            partner.isActive = false;
            console.log('✅ 伙伴已标记为非活跃:', partner.id);
        }
        
        // 🔴 重构：对象已通过对象管理器销毁，无需从内部列表移除
        console.log('✅ 伙伴已通过对象管理器销毁:', partner.id);
    },

    // 🔴 新增：测试碰撞和跟随功能
    testCollisionAndFollow: function () {
        console.log('🔴 开始测试碰撞和跟随功能...');
        
        var partners = this.getAllPartners();
        if (partners.length === 0) {
            console.log('🔴 没有找到伙伴，无法测试');
            return;
        }
        
        var mainChar = window.characterManager ? window.characterManager.getMainCharacter() : null;
        if (!mainChar) {
            console.log('🔴 没有找到主人物，无法测试');
            return;
        }
        
        // 测试每个伙伴
        partners.forEach((partner, index) => {
            console.log(`🔴 测试伙伴${index + 1}:`, {
                'ID': partner.id,
                '状态': partner.status,
                '位置': {x: partner.x.toFixed(2), y: partner.y.toFixed(2)},
                '距离主角': partner.getDistanceTo(mainChar.x, mainChar.y).toFixed(2)
            });
            
            // 调用调试方法
            if (partner.debugFollowStatus) {
                partner.debugFollowStatus();
            }
            
            // 如果伙伴在INIT状态，尝试强制跟随
            if (partner.status === PARTNER_STATE.INIT) {
                console.log('🔴 伙伴在INIT状态，尝试强制跟随');
                if (partner.forceFollow) {
                    partner.forceFollow();
                }
            }
        });
        
        console.log('🔴 碰撞和跟随功能测试完成');
    },

    // 在地图上生成伙伴
    generatePartnersOnMap: function () {
        console.log('🗺️ 开始在地图上生成伙伴...');
        
        if (!window.objectManager) {
            console.error('❌ 对象管理器未初始化');
            return;
        }
            
            // 伙伴职业类型
            var partnerRoles = [PARTNER_ROLE.POLICE, PARTNER_ROLE.CIVILIAN, PARTNER_ROLE.DOCTOR, PARTNER_ROLE.NURSE, PARTNER_ROLE.CHEF]; // 警察、平民、医生、护士、厨师
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
                        throw new Error(`伙伴${i+1}安全位置生成失败`);
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
            

    }
};

// 导出
export {PARTNER_ROLE, PARTNER_STATE, AVOID_STRATEGY};
export {PartnerManager};
export default Partner;
