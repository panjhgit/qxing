/**
 * 人物模块 - 重构版本
 *
 * 重构内容：
 * - 使用ConfigManager统一管理配置
 * - 使用UtilsManager提供工具函数
 * - 消除硬编码的重复值
 * - 提高代码复用性和维护性
 */

import UtilsManager from './utils.js';
import StateMachine, {MAIN_CHARACTER_STATES, PARTNER_STATES} from './state-machine.js';

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

// 使用统一的状态枚举，保持向后兼容
const STATUS = {
    FOLLOW: 'FOLLOW',        // 跟随
    IDLE: MAIN_CHARACTER_STATES.IDLE,            // 静止
    MOVING: MAIN_CHARACTER_STATES.MOVE,        // 移动中
    BLOCKED: 'BLOCKED',      // 被阻挡
    ATTACKING: MAIN_CHARACTER_STATES.ATTACK,  // 攻击中
    AVOIDING: 'AVOIDING',     // 避障中
    DIE: MAIN_CHARACTER_STATES.DIE             // 死亡
};

// 配置获取工具方法
const getConfig = (path, defaultValue) => {
    return window.ConfigManager ? window.ConfigManager.get(path) : defaultValue;
};

// 人物类
var Character = function (role, x, y) {
    // 获取工具类
    var validationUtils = UtilsManager.getValidationUtils();

    // 验证参数
    if (!validationUtils.validatePosition(x, y)) {
        x = 100;
        y = 100;
    }

    if (!validationUtils.validateRange(role, 1, 6, '角色类型')) {
        role = ROLE.CIVILIAN;
    }

    // 基础属性
    this.role = role;        // 角色
    this.x = x;              // X坐标
    this.y = y;              // Y坐标
    this.status = STATUS.IDLE; // 状态：跟随/静止

    // 根据角色类型分配固定ID
    switch (role) {
        case ROLE.MAIN:
            this.id = CHARACTER_ID.MAIN;
            break;
        case ROLE.POLICE:
            this.id = CHARACTER_ID.PARTNER_1;
            break;
        case ROLE.CIVILIAN:
            this.id = CHARACTER_ID.PARTNER_2;
            break;
        case ROLE.DOCTOR:
            this.id = CHARACTER_ID.PARTNER_3;
            break;
        case ROLE.NURSE:
            this.id = CHARACTER_ID.PARTNER_4;
            break;
        case ROLE.CHEF:
            this.id = CHARACTER_ID.PARTNER_5;
            break;
        default:
            this.id = CHARACTER_ID.PARTNER_1;
            break;
    }

    // 从配置获取对象尺寸
    var objectSizes = getConfig('OBJECT_SIZES.CHARACTER', {WIDTH: 32, HEIGHT: 48});
    this.width = objectSizes.WIDTH;
    this.height = objectSizes.HEIGHT;

    // 添加半径属性，用于圆形碰撞检测
    this.radius = this.width / 2;

    // 从配置获取动画属性
    var animationConfig = getConfig('ANIMATION', {DEFAULT_FRAME_RATE: 60});
    this.animationFrame = 0;
    this.animationSpeed = animationConfig.DEFAULT_FRAME_RATE;

    // 从配置获取移动属性
    var movementConfig = getConfig('MOVEMENT', {});
    this.isMoving = false;
    this.targetX = x;
    this.targetY = y;

    // 根据角色设置属性
    this.setupRoleProperties();

    // 初始化状态机
    this.initializeStateMachine();
};

// 设置角色属性
Character.prototype.setupRoleProperties = function () {
    var combatConfig = getConfig('COMBAT', {
        DEFAULT_HP: 100,
        DEFAULT_ATTACK: 20,
        POLICE_ATTACK_RANGE: 100,
        DOCTOR_ATTACK_RANGE: 100,
        NURSE_ATTACK_RANGE: 100,
        CHEF_ATTACK_RANGE: 100
    });

    // 基础属性
    this.hp = combatConfig.DEFAULT_HP;
    this.maxHp = this.hp;
    this.attack = combatConfig.DEFAULT_ATTACK;
    this.weapon = WEAPON.NONE;

    // 根据角色设置特定属性
    switch (this.role) {
        case ROLE.MAIN:
            this.attackRange = combatConfig.POLICE_ATTACK_RANGE;
            this.icon = '👤';
            break;
        case ROLE.POLICE:
            this.attackRange = combatConfig.POLICE_ATTACK_RANGE;
            this.icon = '👮';
            break;
        case ROLE.CIVILIAN:
            this.attackRange = combatConfig.POLICE_ATTACK_RANGE;
            this.icon = '👨';
            break;
        case ROLE.DOCTOR:
            this.attackRange = combatConfig.DOCTOR_ATTACK_RANGE;
            this.icon = '👨‍⚕️';
            break;
        case ROLE.NURSE:
            this.attackRange = combatConfig.NURSE_ATTACK_RANGE;
            this.icon = '👩‍⚕️';
            break;
        case ROLE.CHEF:
            this.attackRange = combatConfig.CHEF_ATTACK_RANGE;
            this.icon = '👨‍🍳';
            break;
        default:
            this.attackRange = combatConfig.POLICE_ATTACK_RANGE;
            this.icon = '❓';
    }
};

// 初始化状态机
Character.prototype.initializeStateMachine = function () {
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
Character.prototype.setupMainCharacterStateMachine = function () {
    const sm = this.stateMachine;

    // 添加状态转换规则 - 移动优先级最高
    sm.addTransition(MAIN_CHARACTER_STATES.IDLE, MAIN_CHARACTER_STATES.MOVE, () => {
        return this.hasJoystickInput();
    });

    sm.addTransition(MAIN_CHARACTER_STATES.IDLE, MAIN_CHARACTER_STATES.ATTACK, () => {
        var attackJudgmentConfig = getConfig('COMBAT.ATTACK_JUDGMENT', {RANGE_BUFFER: 5});
        var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;
        return !this.hasJoystickInput() && this.hasZombieInRange(effectiveAttackRange);
    });

    // 移动状态：摇杆输入消失时才退出
    sm.addTransition(MAIN_CHARACTER_STATES.MOVE, MAIN_CHARACTER_STATES.IDLE, () => {
        var attackJudgmentConfig = getConfig('COMBAT.ATTACK_JUDGMENT', {RANGE_BUFFER: 5});
        var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;
        return !this.hasJoystickInput() && !this.hasZombieInRange(effectiveAttackRange);
    });

    // 攻击状态：摇杆有输入时立即打断攻击
    sm.addTransition(MAIN_CHARACTER_STATES.ATTACK, MAIN_CHARACTER_STATES.MOVE, () => {
        return this.hasJoystickInput();
    });

    sm.addTransition(MAIN_CHARACTER_STATES.ATTACK, MAIN_CHARACTER_STATES.IDLE, () => {
        var attackJudgmentConfig = getConfig('COMBAT.ATTACK_JUDGMENT', {RANGE_BUFFER: 5});
        var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;
        return !this.hasJoystickInput() && !this.hasZombieInRange(effectiveAttackRange);
    });

    // 添加死亡状态转换（所有状态都可以进入死亡）
    sm.addTransition(MAIN_CHARACTER_STATES.IDLE, MAIN_CHARACTER_STATES.DIE, () => {
        return this.hp <= 0;
    });

    sm.addTransition(MAIN_CHARACTER_STATES.MOVE, MAIN_CHARACTER_STATES.DIE, () => {
        return this.hp <= 0;
    });

    sm.addTransition(MAIN_CHARACTER_STATES.ATTACK, MAIN_CHARACTER_STATES.DIE, () => {
        return this.hp <= 0;
    });

    // 添加状态行为
    sm.addBehavior(MAIN_CHARACTER_STATES.IDLE, this.onEnterIdle.bind(this),
        this.onUpdateIdle.bind(this),
        this.onExitIdle.bind(this)
    );

    sm.addBehavior(MAIN_CHARACTER_STATES.MOVE, this.onEnterMove.bind(this),
        this.onUpdateMove.bind(this),
        this.onExitMove.bind(this)
    );

    sm.addBehavior(MAIN_CHARACTER_STATES.ATTACK, this.onEnterAttack.bind(this),
        this.onUpdateAttack.bind(this),
        this.onExitAttack.bind(this)
    );

    sm.addBehavior(MAIN_CHARACTER_STATES.DIE, this.onEnterDie.bind(this),
        this.onUpdateDie.bind(this),
        this.onExitDie.bind(this)
    );
};

// 设置伙伴状态机
Character.prototype.setupPartnerStateMachine = function () {
    const sm = this.stateMachine;

    // 简化的伙伴状态机：只保留必要的状态
    sm.addTransition(PARTNER_STATES.INIT, PARTNER_STATES.FOLLOW, () => {
        var detectionConfig = getConfig('DETECTION', {SAFE_SPAWN_DISTANCE: 100});
        var activationDistance = detectionConfig.SAFE_SPAWN_DISTANCE;
        return this.isMainCharacterNearby(activationDistance);
    });

    sm.addTransition(PARTNER_STATES.FOLLOW, PARTNER_STATES.IDLE, () => {
        return !this.isMainCharacterMoving();
    });

    sm.addTransition(PARTNER_STATES.IDLE, PARTNER_STATES.FOLLOW, () => {
        return this.isMainCharacterMoving();
    });

    // 添加死亡状态转换
    sm.addTransition(PARTNER_STATES.INIT, PARTNER_STATES.DIE, () => {
        return this.hp <= 0;
    });

    sm.addTransition(PARTNER_STATES.FOLLOW, PARTNER_STATES.DIE, () => {
        return this.hp <= 0;
    });

    sm.addTransition(PARTNER_STATES.IDLE, PARTNER_STATES.DIE, () => {
        return this.hp <= 0;
    });

    // 简化的状态行为
    sm.addBehavior(PARTNER_STATES.INIT, this.onEnterIdle.bind(this),
        this.onUpdateIdle.bind(this), this.onExitIdle.bind(this));

    sm.addBehavior(PARTNER_STATES.IDLE, this.onEnterIdle.bind(this), this.onUpdateIdle.bind(this), this.onExitIdle.bind(this));

    sm.addBehavior(PARTNER_STATES.FOLLOW, this.onEnterMove.bind(this),
        this.onUpdateMove.bind(this), this.onExitMove.bind(this));

    sm.addBehavior(PARTNER_STATES.DIE, this.onEnterDie.bind(this), this.onUpdateDie.bind(this), this.onExitDie.bind(this));
};

// 受到攻击
Character.prototype.takeDamage = function (damage) {
    console.log('人物受到攻击:', this.id, '角色:', this.role, '伤害:', damage, '当前血量:', this.hp);
    
    var validationUtils = UtilsManager.getValidationUtils();

    if (!validationUtils.validateRange(damage, 0, 1000, '伤害值')) {
        console.log('伤害值无效:', damage);
        return this.hp;
    }

    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;

    console.log('攻击后血量:', this.hp);

    // 受到伤害后立即检查血量，如果血量归零则触发死亡
    if (this.hp <= 0 && this.role === 1) {
        if (this.stateMachine && this.stateMachine.currentState !== MAIN_CHARACTER_STATES.DIE) {
            this.stateMachine.forceState(MAIN_CHARACTER_STATES.DIE);
        }
    }

    return this.hp;
};

// ==================== 状态机辅助方法 ====================

// 检查是否有摇杆输入
Character.prototype.hasJoystickInput = function () {
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
};

// 检查指定范围内是否有僵尸
Character.prototype.hasZombieInRange = function (range) {
    if (!window.zombieManager) return false;

    const zombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
    const mathUtils = UtilsManager.getMathUtils();

    return zombies.some(zombie => {
        const distance = mathUtils.distance(this.x, this.y, zombie.x, zombie.y);
        return distance <= range;
    });
};

// 检查主人物是否在附近
Character.prototype.isMainCharacterNearby = function (distance) {
    if (!window.characterManager) return false;

    const mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return false;

    const mathUtils = UtilsManager.getMathUtils();
    const dist = mathUtils.distance(this.x, this.y, mainChar.x, mainChar.y);
    return dist <= distance;
};

// 检查主人物是否在移动
Character.prototype.isMainCharacterMoving = function () {
    if (!window.characterManager) return false;

    const mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return false;

    return mainChar.stateMachine && mainChar.stateMachine.isInState(MAIN_CHARACTER_STATES.MOVE);
};

// ==================== 状态行为方法 ====================

// 主人物状态行为
Character.prototype.onEnterIdle = function (stateData) {
    this.status = STATUS.IDLE;
    this.isMoving = false;
    this.attackCooldown = 0;
};

Character.prototype.onUpdateIdle = function (deltaTime, stateData) {
    this.updateAnimation(deltaTime);

    var attackJudgmentConfig = getConfig('COMBAT.ATTACK_JUDGMENT', {RANGE_BUFFER: 5});
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;
    if (this.hasZombieInRange(effectiveAttackRange)) {
        // 主人物在待机状态检测到僵尸，准备攻击
    }

    if (this.hasJoystickInput()) {
        // 主人物检测到摇杆输入，准备移动
    }
};

Character.prototype.onExitIdle = function (stateData) {
    // 主人物退出待机状态
};

Character.prototype.onEnterMove = function (stateData) {
    this.status = STATUS.MOVING;
    this.isMoving = true;
    this.attackCooldown = 0;
};

Character.prototype.onUpdateMove = function (deltaTime, stateData) {
    this.updateMovement(deltaTime);
};

Character.prototype.onExitMove = function (stateData) {
    this.isMoving = false;
};

Character.prototype.onEnterAttack = function (stateData) {
    this.status = STATUS.ATTACKING;
    this.isMoving = false;
    this.attackCooldown = 0;
    this.findAttackTarget();
};

Character.prototype.onUpdateAttack = function (deltaTime, stateData) {
    this.updateAttack(deltaTime);

    if (!this.attackTarget || this.attackTarget.hp <= 0) {
        return;
    }

    if (this.hasJoystickInput()) {
        if (this.stateMachine) {
            this.stateMachine.forceState(MAIN_CHARACTER_STATES.MOVE);
        }
        return;
    }
};

Character.prototype.onExitAttack = function (stateData) {
    this.attackTarget = null;
};

Character.prototype.onEnterDie = function (stateData) {
    this.status = STATUS.DIE;
    this.isMoving = false;
    this.deathAnimationTime = 0;
    this.playDeathAnimation();
    this.handleGameOver();
};

Character.prototype.onUpdateDie = function (deltaTime, stateData) {
    this.deathAnimationTime += deltaTime;

    var gameplayConfig = getConfig('GAMEPLAY', {DEATH: {MAIN_CHARACTER_DURATION: 3.0}});
    var deathDuration = gameplayConfig.DEATH.MAIN_CHARACTER_DURATION;

    if (this.deathAnimationTime >= deathDuration) {
        if (typeof window.resetGame === 'function') {
            window.resetGame();
        }
    }
};

Character.prototype.onExitDie = function (stateData) {
    // 主人物退出死亡状态
};

// 通用的攻击更新方法
Character.prototype.updateAttack = function (deltaTime) {
    if (!this.isAttackTargetValid()) {
        this.findAttackTarget();
        if (!this.attackTarget) {
            return;
        }
    }

    if (!this.attackTarget || this.attackTarget.hp <= 0) {
        return;
    }

    this.attackCooldown += deltaTime;

    var combatConfig = getConfig('COMBAT', {DEFAULT_ATTACK_INTERVAL: 0.5});
    var attackInterval = combatConfig.DEFAULT_ATTACK_INTERVAL;

    if (this.attackCooldown >= attackInterval) {
        this.performAttack();
        this.attackCooldown = 0;
    }

    this.moveToAttackRange();
};

// 计算跟随点（主人物侧后方）
Character.prototype.calculateFollowPoint = function () {
    if (!window.characterManager) return;

    var mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return;

    var mathUtils = UtilsManager.getMathUtils();

    var combatConfig = getConfig('COMBAT', {MIN_ATTACK_RANGE: 100});
    var followDistance = combatConfig.MIN_ATTACK_RANGE;
    var followAngle = Math.PI;

    this.followPoint = {
        x: mainChar.x + Math.cos(followAngle) * followDistance,
        y: mainChar.y + Math.sin(followAngle) * followDistance
    };
};

// 寻找攻击目标（主人物专用）
Character.prototype.findAttackTarget = function () {
    if (!window.zombieManager) return;

    var zombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
    if (zombies.length === 0) {
        this.attackTarget = null;
        return;
    }

    var mathUtils = UtilsManager.getMathUtils();
    var closestZombie = null;
    var closestDistance = Infinity;
    var attackJudgmentConfig = getConfig('COMBAT.ATTACK_JUDGMENT', {RANGE_BUFFER: 5});
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;

    for (var i = 0; i < zombies.length; i++) {
        var zombie = zombies[i];
        var distance = mathUtils.distance(this.x, this.y, zombie.x, zombie.y);

        if (distance <= effectiveAttackRange && distance < closestDistance) {
            closestDistance = distance;
            closestZombie = zombie;
        }
    }

    if (!this.attackTarget || this.attackTarget.hp <= 0 || this.attackTarget !== closestZombie) {
        this.attackTarget = closestZombie;
    }
};

// 检查当前攻击目标是否仍然有效
Character.prototype.isAttackTargetValid = function () {
    if (!this.attackTarget) return false;

    if (this.attackTarget.hp <= 0) {
        this.attackTarget = null;
        return false;
    }

    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
    var attackJudgmentConfig = getConfig('COMBAT.ATTACK_JUDGMENT', {RANGE_BUFFER: 5});
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;

    if (distance > effectiveAttackRange) {
        this.attackTarget = null;
        return false;
    }

    return true;
};

// 移动到攻击范围（主人物专用）
Character.prototype.moveToAttackRange = function () {
    if (!this.attackTarget || this.attackTarget.hp <= 0) return;

    if (this.hasJoystickInput()) return;

    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
    var attackJudgmentConfig = getConfig('COMBAT.ATTACK_JUDGMENT', {RANGE_BUFFER: 5});
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;
    var targetDistance = this.attackRange;

    if (distance > targetDistance) {
        var angle = mathUtils.angle(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
        var targetX = this.attackTarget.x + Math.cos(angle + Math.PI) * targetDistance;
        var targetY = this.attackTarget.y + Math.sin(angle + Math.PI) * targetDistance;
        this.setMoveTarget(targetX, targetY);
    } else {
        this.stopMovement();
    }
};

// 执行攻击（主人物专用）
Character.prototype.performAttack = function () {
    if (!this.attackTarget || this.attackTarget.hp <= 0) return;

    this.attackTarget.takeDamage(this.attack);
    this.playAttackAnimation();
};

// 游戏结束处理
Character.prototype.handleGameOver = function () {
    if (typeof window.handleMainCharacterDeath === 'function') {
        window.handleMainCharacterDeath();
    } else {
        setTimeout(() => {
            if (typeof window.resetGame === 'function') {
                window.resetGame();
            } else {
                this.showGameOverScreen();
            }
        }, 3000);
    }
};

// 显示游戏结束界面
Character.prototype.showGameOverScreen = function () {
    if (window.gameEngine && window.gameEngine.ctx) {
        var canvas = window.gameEngine.canvas;

        if (window.viewSystem && window.viewSystem.getRenderManager) {
            const renderManager = window.viewSystem.getRenderManager();
            renderManager.renderUI('gameOver', {canvas: canvas, message: '游戏结束'});
        }

        this.addGameOverClickListener(canvas);
    }
};

// 添加游戏结束界面的点击事件监听器
Character.prototype.addGameOverClickListener = function (canvas) {
    var self = this;

    if (this.gameOverClickListener) {
        canvas.removeEventListener('touchstart', this.gameOverClickListener);
    }

    this.gameOverClickListener = function (event) {
        event.preventDefault();
        canvas.removeEventListener('touchstart', self.gameOverClickListener);
        self.gameOverClickListener = null;

        if (window.restartGame) {
            window.restartGame();
        }
    };

    canvas.addEventListener('touchstart', this.gameOverClickListener, {passive: true});
};

// 获取摇杆移动方向
Character.prototype.getJoystickDirection = function () {
    if (!window.gameEngine || !window.gameEngine.joystick) {
        return {x: 0, y: 0};
    }

    var joystick = window.gameEngine.joystick;
    return joystick.getMoveDirection();
};

// 检查人物是否卡住
Character.prototype.isStuck = function () {
    if (!this.lastPosition) {
        this.lastPosition = {x: this.x, y: this.y};
        this.stuckTime = 0;
        return false;
    }

    var distance = Math.sqrt(Math.pow(this.x - this.lastPosition.x, 2) + Math.pow(this.y - this.lastPosition.y, 2));

    var gameplayConfig = getConfig('GAMEPLAY', {STUCK_DETECTION: {MIN_MOVE_DISTANCE: 5, STUCK_THRESHOLD: 30}});
    var minMoveDistance = gameplayConfig.STUCK_DETECTION.MIN_MOVE_DISTANCE;
    var stuckThreshold = gameplayConfig.STUCK_DETECTION.STUCK_THRESHOLD;

    if (distance < minMoveDistance) {
        this.stuckTime = (this.stuckTime || 0) + 1;

        if (this.stuckTime > stuckThreshold) {
            return true;
        }
    } else {
        this.stuckTime = 0;
        this.lastPosition = {x: this.x, y: this.y};
    }

    return false;
};

// 重置移动状态
Character.prototype.resetMovementState = function () {
    this.isMoving = false;
    this.status = STATUS.IDLE;
    this.targetX = this.x;
    this.targetY = this.y;
    this.stuckTime = 0;

    if (this.attackTarget) {
        this.attackTarget = null;
    }

    if (this.stateMachine) {
        this.stateMachine.forceState(MAIN_CHARACTER_STATES.IDLE);
    }
};

// 播放攻击动画
Character.prototype.playAttackAnimation = function () {
    this.animationFrame = 0;
    var animationConfig = getConfig('ANIMATION', {ATTACK_ANIMATION_SPEED: 0.3});
    this.animationSpeed = animationConfig.ATTACK_ANIMATION_SPEED;
};

// 播放攻击动画（移动时）
Character.prototype.playAttackAnimationWhileMoving = function () {
    this.animationFrame = 0;
    var animationConfig = getConfig('ANIMATION', {ATTACK_ANIMATION_SPEED: 0.3});
    this.animationSpeed = animationConfig.ATTACK_ANIMATION_SPEED;
};

// 播放死亡动画
Character.prototype.playDeathAnimation = function () {
    this.animationFrame = 0;
    var animationConfig = getConfig('ANIMATION', {DEATH_ANIMATION_SPEED: 0.1});
    this.animationSpeed = animationConfig.DEATH_ANIMATION_SPEED;
};

// 设置移动目标 - 使用工具类
Character.prototype.setMoveTarget = function (targetX, targetY) {
    var validationUtils = UtilsManager.getValidationUtils();
    var mathUtils = UtilsManager.getMathUtils();

    if (!validationUtils.validatePosition(targetX, targetY)) {
        return false;
    }

    this.targetX = targetX;
    this.targetY = targetY;
    this.isMoving = true;
    this.status = STATUS.MOVING;

    var deltaX = targetX - this.x;
    var deltaY = targetY - this.y;

    if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
        this.rotationY = mathUtils.angle(this.x, this.y, targetX, targetY);
    }

    return true;
};

// 停止移动
Character.prototype.stopMovement = function () {
    this.isMoving = false;
    this.status = STATUS.IDLE;
    this.targetX = this.x;
    this.targetY = this.y;
};

// 更新移动 - 只处理动画更新，实际移动由checkJoystickInput处理
Character.prototype.updateMovement = function (deltaTime = 1 / 60) {
    if (!this.isMoving) {
        return;
    }

    if (this.isStuck()) {
        this.resetMovementState();
        return;
    }

    if (!this.lastPosition) {
        this.lastPosition = {x: this.x, y: this.y};
    }
    this.lastPosition.x = this.x;
    this.lastPosition.y = this.y;

    var animationUtils = UtilsManager.getAnimationUtils();
    if (this.animationFrame !== undefined) {
        var animationConfig = getConfig('ANIMATION', {MAX_ANIMATION_FRAMES: 8});
        this.animationFrame = animationUtils.updateFrame(this.animationFrame, this.animationSpeed * deltaTime, animationConfig.MAX_ANIMATION_FRAMES);
    }
};

// 更新动画 - 使用工具类
Character.prototype.updateAnimation = function (deltaTime) {
    var animationUtils = UtilsManager.getAnimationUtils();
    var animationConfig = getConfig('ANIMATION', {
        MAX_ANIMATION_FRAMES: 8,
        STATE_SPEED_MULTIPLIERS: {
            MOVING: 1.5,
            ATTACKING: 2.0,
            AVOIDING: 1.8,
            DIE: 0.5
        }
    });

    var stateSpeedMultipliers = animationConfig.STATE_SPEED_MULTIPLIERS;
    var baseSpeed = this.animationSpeed;
    var adjustedSpeed = baseSpeed;

    switch (this.status) {
        case STATUS.MOVING:
        case STATUS.FOLLOW:
            adjustedSpeed = baseSpeed * stateSpeedMultipliers.MOVING;
            break;
        case STATUS.ATTACKING:
            adjustedSpeed = baseSpeed * stateSpeedMultipliers.ATTACKING;
            break;
        case STATUS.AVOIDING:
            adjustedSpeed = baseSpeed * stateSpeedMultipliers.AVOIDING;
            break;
        case STATUS.DIE:
            adjustedSpeed = baseSpeed * stateSpeedMultipliers.DIE;
            break;
        default:
            adjustedSpeed = baseSpeed;
    }

    this.animationFrame = animationUtils.updateFrame(this.animationFrame, adjustedSpeed * deltaTime, animationConfig.MAX_ANIMATION_FRAMES);

    if (animationUtils.shouldResetAnimation(this.animationFrame, animationConfig.MAX_ANIMATION_FRAMES)) {
        this.animationFrame = 0;
    }

    this.frameCount = (this.frameCount || 0) + 1;
};

// 获取身体颜色
Character.prototype.getBodyColor = function () {
    switch (this.role) {
        case ROLE.MAIN:
            return '#4a90e2';
        case ROLE.POLICE:
            return '#2c3e50';
        case ROLE.CIVILIAN:
            return '#95a5a6';
        case ROLE.DOCTOR:
            return '#e74c3c';
        case ROLE.NURSE:
            return '#e91e63';
        case ROLE.CHEF:
            return '#f39c12';
        default:
            return '#95a5a6';
    }
};

// 获取头部颜色
Character.prototype.getHeadColor = function () {
    return '#fdbcb4';
};

// 角色管理器 - 重构版本：使用对象池优化内存管理
var CharacterManager = {
    // 对象池引用
    objectPool: null,

    // 初始化对象池
    initObjectPool: function () {
        if (!window.objectPoolManager) {
            return;
        }

        this.objectPool = window.objectPoolManager.createPool('character',
            () => new Character(ROLE.MAIN, 0, 0),
            (character) => this.resetCharacter(character));
    },

    // 重置角色状态（对象池复用）
    resetCharacter: function (character) {
        if (!character) return;

        character.hp = character.maxHp || 50;
        character.status = STATUS.IDLE;
        character.isMoving = false;
        character.targetX = character.x;
        character.targetY = character.y;
        character.attackCooldown = 0;
        character.attackTarget = null;
        character.stuckTime = 0;
        character.lastPosition = null;

        var movementConfig = getConfig('MOVEMENT', {CHARACTER_MOVE_SPEED: 4});
        var expectedSpeed = movementConfig.CHARACTER_MOVE_SPEED;

        if (character.role === ROLE.MAIN) {
            character.moveSpeed = expectedSpeed;
        } else {
            character.moveSpeed = expectedSpeed;
        }

        if (character.stateMachine) {
            character.stateMachine.forceState(MAIN_CHARACTER_STATES.IDLE);
        }

        character.animationFrame = 0;
        character.frameCount = 0;
    },

    // 创建主人物
    createMainCharacter: function (x, y) {
        var validationUtils = UtilsManager.getValidationUtils();

        if (!validationUtils.validatePosition(x, y)) {
            return null;
        }

        var mainChar = null;

        if (this.objectPool) {
            mainChar = this.objectPool.get();
            if (mainChar) {
                mainChar.role = ROLE.MAIN;
                mainChar.id = CHARACTER_ID.MAIN;
                mainChar.x = x;
                mainChar.y = y;
                mainChar.setupRoleProperties();
                mainChar.initializeStateMachine();
            }
        }

        if (!mainChar) {
            mainChar = new Character(ROLE.MAIN, x, y);
        }

        if (mainChar && window.objectManager) {
            window.objectManager.registerObject(mainChar, 'character', mainChar.id);
        }

        return mainChar;
    },

    // 从对象管理器获取主人物
    getMainCharacter: function () {
        if (!window.objectManager) {
            return null;
        }

        const mainChar = window.objectManager.getMainCharacter();
        if (mainChar && mainChar.hp > 0) {
            return mainChar;
        }

        return null;
    },

    // 从对象管理器获取所有角色
    getAllCharacters: function () {
        if (!window.objectManager) {
            return [];
        }

        const characters = window.objectManager.getAllCharacters();
        return characters;
    },

    // 更新所有角色
    updateAllCharacters: function (deltaTime = 1 / 60) {
        var performanceUtils = UtilsManager.getPerformanceUtils();

        var characters = this.getAllCharacters();
        if (characters.length === 0) {
            return;
        }

        performanceUtils.startTimer('updateAllCharacters');

        characters.forEach(char => {
            if (char && char.hp > 0) {
                if (char.role === 1) {
                    if (typeof char.updateMainCharacter === 'function') {
                        char.updateMainCharacter(deltaTime);
                    }
                } else {
                    if (typeof char.updateMovement === 'function') {
                        char.updateMovement(deltaTime);
                    }
                }
            }
        });

        performanceUtils.endTimer('updateAllCharacters');
    }
};

// 导出枚举
export {ROLE, WEAPON, STATUS, CHARACTER_ID};

// 导出角色管理器和角色类
export {CharacterManager};
export default Character;

// 主人物专用更新方法
Character.prototype.updateMainCharacter = function (deltaTime) {
    if (this.hp <= 0 && this.stateMachine.currentState !== MAIN_CHARACTER_STATES.DIE) {
        this.stateMachine.forceState(MAIN_CHARACTER_STATES.DIE);
        return;
    }

    this.checkJoystickInput();

    if (this.stateMachine) {
        this.stateMachine.update(deltaTime);
    }

    switch (this.stateMachine.currentState) {
        case MAIN_CHARACTER_STATES.IDLE:
            this.updateAnimation(deltaTime);
            break;

        case MAIN_CHARACTER_STATES.MOVE:
            this.updateMovement(deltaTime);
            this.updateAnimation(deltaTime);
            break;

        case MAIN_CHARACTER_STATES.ATTACK:
            this.updateAttack(deltaTime);
            this.updateAnimation(deltaTime);
            break;

        case MAIN_CHARACTER_STATES.DIE:
            this.updateAnimation(deltaTime);
            break;
    }
};

// 检查摇杆输入并直接移动
Character.prototype.checkJoystickInput = function () {
    if (!this.hasJoystickInput()) {
        return;
    }

    var direction = this.getJoystickDirection();
    var gameplayConfig = getConfig('GAMEPLAY', {JOYSTICK: {DEAD_ZONE: 0.1, MOVE_SPEED: 4}});
    var deadZone = gameplayConfig.JOYSTICK.DEAD_ZONE;
    var moveSpeed = gameplayConfig.JOYSTICK.MOVE_SPEED;

    if (Math.abs(direction.x) > deadZone || Math.abs(direction.y) > deadZone) {
        var newX = this.x + direction.x * moveSpeed;
        var newY = this.y + direction.y * moveSpeed;

        if (window.collisionSystem && window.collisionSystem.isPositionWalkable) {
            if (window.collisionSystem.isPositionWalkable(newX, newY)) {
                this.x = newX;
                this.y = newY;
            } else {
                if (window.collisionSystem.getWallFollowingPosition) {
                    var safePosition = window.collisionSystem.getWallFollowingPosition(this.x, this.y, newX, newY, this.radius || 16, moveSpeed);
                    if (safePosition) {
                        this.x = safePosition.x;
                        this.y = safePosition.y;
                    }
                }
            }
        } else {
            this.x = newX;
            this.y = newY;
        }

        this.isMoving = true;
        this.status = STATUS.MOVING;

        if (this.stateMachine && this.stateMachine.currentState !== MAIN_CHARACTER_STATES.MOVE) {
            this.stateMachine.forceState(MAIN_CHARACTER_STATES.MOVE);
        }
    }
};



