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
import StateMachine, {MAIN_CHARACTER_STATES, PARTNER_STATES} from './state-machine.js';

// 角色枚举
const ROLE = {
    MAIN: 1      // 主人物
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
        x = 100;
        y = 100; // 使用默认位置
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
    var objectSizes = window.ConfigManager ? window.ConfigManager.get('OBJECT_SIZES.CHARACTER') : null;
    this.width = objectSizes ? objectSizes.WIDTH : 32;         // 模型宽度
    this.height = objectSizes ? objectSizes.HEIGHT : 48;       // 模型高度

    // 添加半径属性，用于圆形碰撞检测
    this.radius = this.width / 2;          // 碰撞半径（宽度的一半）

    // 从配置获取动画属性
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
    this.animationFrame = 0;                // 动画帧
    this.animationSpeed = animationConfig ? animationConfig.DEFAULT_FRAME_RATE : 60; // 动画速度

    // 从配置获取移动属性
    var movementConfig = window.ConfigManager ? window.ConfigManager.get('MOVEMENT') : null;
    this.isMoving = false;                  // 是否在移动
    // 移动速度已固定为5px，不再需要动态配置
    this.targetX = x;                       // 目标X坐标
    this.targetY = y;                       // 目标Y坐标

    // 根据角色设置属性
    this.setupRoleProperties();

    // 初始化状态机
    this.initializeStateMachine();
};

// 设置角色属性
Character.prototype.setupRoleProperties = function () {
    var combatConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT') : null;
    var difficultyConfig = window.ConfigManager ? window.ConfigManager.getDifficultyConfig() : null;

    switch (this.role) {
        case ROLE.MAIN: // 主人物
            this.hp = Math.round(100 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.maxHp = this.hp; // 🔴 新增：设置最大血量
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 10) : 10;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig ? (combatConfig.MAX_ATTACK_RANGE || 120) : 120;
            this.icon = '👤';
            break;

        case ROLE.POLICE: // 警察
            this.hp = Math.round(80 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 10) : 10;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig ? (combatConfig.POLICE_ATTACK_RANGE || 100) : 100;
            this.icon = '👮';
            break;

        case ROLE.CIVILIAN: // 平民
            this.hp = Math.round(50 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 60;
            this.icon = '👨';
            break;

        case ROLE.DOCTOR: // 医生
            this.hp = Math.round(60 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig ? (combatConfig.DOCTOR_ATTACK_RANGE || 80) : 80;
            this.icon = '👨‍⚕️';
            break;

        case ROLE.NURSE: // 护士
            this.hp = Math.round(55 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig ? (combatConfig.NURSE_ATTACK_RANGE || 60) : 60;
            this.icon = '👩‍⚕️';
            break;

        case ROLE.CHEF: // 厨师
            this.hp = Math.round(70 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig ? (combatConfig.CHEF_ATTACK_RANGE || 70) : 70;
            this.icon = '👨‍🍳';
            break;

        default:
            this.hp = Math.round(50 * (difficultyConfig ? difficultyConfig.PLAYER_HP_BONUS : 1));
            this.attack = combatConfig ? (combatConfig.DEFAULT_ATTACK || 5) : 5;
            this.weapon = WEAPON.NONE;
            this.attackRange = combatConfig ? combatConfig.MIN_ATTACK_RANGE : 60;
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
        // 摇杆有输入（触摸偏移 > 死区）→ 立即进入移动状态
        return this.hasJoystickInput();
    });

    sm.addTransition(MAIN_CHARACTER_STATES.IDLE, MAIN_CHARACTER_STATES.ATTACK, () => {
        // 100px 内有僵尸且无摇杆输入
        return !this.hasJoystickInput() && this.hasZombieInRange(100);
    });

    // 移动状态：摇杆输入消失时才退出
    sm.addTransition(MAIN_CHARACTER_STATES.MOVE, MAIN_CHARACTER_STATES.IDLE, () => {
        // 摇杆输入消失且无僵尸
        return !this.hasJoystickInput() && !this.hasZombieInRange(50);
    });

    sm.addTransition(MAIN_CHARACTER_STATES.MOVE, MAIN_CHARACTER_STATES.ATTACK, () => {
        // 摇杆输入消失且50px内有僵尸
        return !this.hasJoystickInput() && this.hasZombieInRange(50);
    });

    // 攻击状态：摇杆有输入时立即打断攻击
    sm.addTransition(MAIN_CHARACTER_STATES.ATTACK, MAIN_CHARACTER_STATES.MOVE, () => {
        // 摇杆有输入（立即打断攻击，移动优先级最高）
        return this.hasJoystickInput();
    });

    sm.addTransition(MAIN_CHARACTER_STATES.ATTACK, MAIN_CHARACTER_STATES.IDLE, () => {
        // 无僵尸或僵尸超出范围，且无摇杆输入
        return !this.hasJoystickInput() && !this.hasZombieInRange(50);
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
    sm.addBehavior(MAIN_CHARACTER_STATES.IDLE, this.onEnterIdle.bind(this),      // 进入待机
        this.onUpdateIdle.bind(this),     // 更新待机
        this.onExitIdle.bind(this)        // 退出待机
    );

    sm.addBehavior(MAIN_CHARACTER_STATES.MOVE, this.onEnterMove.bind(this),      // 进入移动
        this.onUpdateMove.bind(this),     // 更新移动
        this.onExitMove.bind(this)        // 退出移动
    );

    sm.addBehavior(MAIN_CHARACTER_STATES.ATTACK, this.onEnterAttack.bind(this),    // 进入攻击
        this.onUpdateAttack.bind(this),   // 更新攻击
        this.onExitAttack.bind(this)      // 退出攻击
    );

    sm.addBehavior(MAIN_CHARACTER_STATES.DIE, this.onEnterDie.bind(this),       // 进入死亡
        this.onUpdateDie.bind(this),      // 更新死亡
        this.onExitDie.bind(this)         // 退出死亡
    );
};

// 设置伙伴状态机
Character.prototype.setupPartnerStateMachine = function () {
    const sm = this.stateMachine;

    // 简化的伙伴状态机：只保留必要的状态
    sm.addTransition(PARTNER_STATES.INIT, PARTNER_STATES.FOLLOW, () => {
        return this.isMainCharacterNearby(20);
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
    sm.addBehavior(PARTNER_STATES.INIT, this.onEnterIdle.bind(this),      // 复用待机行为
        this.onUpdateIdle.bind(this), this.onExitIdle.bind(this));

    sm.addBehavior(PARTNER_STATES.IDLE, this.onEnterIdle.bind(this), this.onUpdateIdle.bind(this), this.onExitIdle.bind(this));

    sm.addBehavior(PARTNER_STATES.FOLLOW, this.onEnterMove.bind(this),      // 复用移动行为
        this.onUpdateMove.bind(this), this.onExitMove.bind(this));

    sm.addBehavior(PARTNER_STATES.DIE, this.onEnterDie.bind(this), this.onUpdateDie.bind(this), this.onExitDie.bind(this));
};

// 受到攻击
Character.prototype.takeDamage = function (damage) {
    var validationUtils = UtilsManager.getValidationUtils();

    if (!validationUtils.validateRange(damage, 0, 1000, '伤害值')) {
        throw new Error('无效的伤害值: ' + damage);
        return this.hp;
    }

    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;
    return this.hp;
};

// ==================== 状态机辅助方法 ====================

// 检查是否有摇杆输入
Character.prototype.hasJoystickInput = function () {
    // 检查游戏引擎和摇杆系统是否可用
    if (!window.gameEngine || !window.gameEngine.joystick) {
        return false;
    }

    var joystick = window.gameEngine.joystick;

    // 检查摇杆是否可见且激活
    if (!joystick.isVisible || !joystick.isActive) {
        return false;
    }

    // 检查是否有移动方向
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
    this.attackCooldown = 0; // 重置攻击冷却
    console.log('主人物进入待机状态');
};

Character.prototype.onUpdateIdle = function (deltaTime, stateData) {
    // 待机状态下的行为：渲染待机动画
    this.updateAnimation(deltaTime);

    // 检查是否有僵尸需要攻击
    if (this.hasZombieInRange(100)) {
        console.log('主人物在待机状态检测到僵尸，准备攻击');
    }

    // 检查是否有摇杆输入
    if (this.hasJoystickInput()) {
        console.log('主人物检测到摇杆输入，准备移动');
    }
};

Character.prototype.onExitIdle = function (stateData) {
    console.log('主人物退出待机状态');
};

Character.prototype.onEnterMove = function (stateData) {
    this.status = STATUS.MOVING;
    this.isMoving = true;
    this.attackCooldown = 0; // 重置攻击冷却
    console.log('主人物进入移动状态');
};

Character.prototype.onUpdateMove = function (deltaTime, stateData) {
    // 移动状态下的行为：处理移动逻辑（优先级最高）
    this.updateMovement(deltaTime);

    // 移动中若攻击范围内有僵尸，播放攻击动画但不停止移动
    if (this.hasZombieInRange(50)) {
        this.playAttackAnimationWhileMoving(deltaTime);
    }
};

Character.prototype.onExitMove = function (stateData) {
    this.isMoving = false;
    console.log('主人物退出移动状态');
};

Character.prototype.onEnterAttack = function (stateData) {
    this.status = STATUS.ATTACKING;
    this.isMoving = false;
    this.attackCooldown = 0; // 重置攻击冷却
    console.log('主人物进入攻击状态');

    // 寻找最近的僵尸作为攻击目标
    this.findAttackTarget();
};

Character.prototype.onUpdateAttack = function (deltaTime, stateData) {
    // 攻击状态下的行为：移动到攻击距离，触发攻击动画
    this.updateAttack(deltaTime);

    // 检查攻击目标是否仍然有效
    if (!this.attackTarget || this.attackTarget.hp <= 0) {
        console.log('主人物攻击目标无效，准备切换状态');
        return;
    }

    // 检查是否应该打断攻击（摇杆有输入）
    if (this.hasJoystickInput()) {
        console.log('摇杆有输入，主人物攻击被打断');
        return;
    }
};

Character.prototype.onExitAttack = function (stateData) {
    this.attackTarget = null; // 清除攻击目标
    console.log('主人物退出攻击状态');
};

Character.prototype.onEnterDie = function (stateData) {
    this.status = STATUS.DIE;
    this.isMoving = false;
    this.deathAnimationTime = 0; // 死亡动画计时器
    console.log('主人物进入死亡状态，游戏结束');

    // 播放死亡动画
    this.playDeathAnimation();

    // 游戏结束处理
    this.handleGameOver();
};

Character.prototype.onUpdateDie = function (deltaTime, stateData) {
    // 死亡状态下的行为：播放死亡动画
    this.deathAnimationTime += deltaTime;

    // 死亡动画持续3秒
    if (this.deathAnimationTime >= 3.0) {
        console.log('主人物死亡动画结束');
    }
};

Character.prototype.onExitDie = function (stateData) {
    console.log('主人物退出死亡状态');
};

// 通用的攻击更新方法
Character.prototype.updateAttack = function (deltaTime) {
    // 首先检查当前攻击目标是否仍然有效
    if (!this.isAttackTargetValid()) {
        // 目标无效，重新寻找目标
        this.findAttackTarget();

        // 如果仍然没有有效目标，退出攻击状态
        if (!this.attackTarget) {
            console.log('主人物没有有效的攻击目标，退出攻击状态');
            return;
        }
    }

    if (!this.attackTarget || this.attackTarget.hp <= 0) {
        return;
    }

    // 检查攻击冷却
    this.attackCooldown += deltaTime;
    var combatConfig = window.ConfigManager ? window.ConfigManager.get('COMBAT') : null;
    var attackInterval = combatConfig ? combatConfig.DEFAULT_ATTACK_INTERVAL : 1.0; // 从配置读取攻击间隔

    if (this.attackCooldown >= attackInterval) {
        // 执行攻击
        this.performAttack();
        this.attackCooldown = 0;
    }

    // 移动到攻击距离（如果不在攻击范围内）
    this.moveToAttackRange();
};


// 计算跟随点（主人物侧后方）
Character.prototype.calculateFollowPoint = function () {
    if (!window.characterManager) return;

    var mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return;

    var mathUtils = UtilsManager.getMathUtils();

    // 计算跟随点位置（后方，距离80px）
    var followDistance = 80;
    var followAngle = Math.PI; // 后方

    this.followPoint = {
        x: mainChar.x + Math.cos(followAngle) * followDistance, y: mainChar.y + Math.sin(followAngle) * followDistance
    };
};

// 寻找攻击目标（主人物专用）
Character.prototype.findAttackTarget = function () {
    if (!window.zombieManager) return;

    var zombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
    if (zombies.length === 0) {
        // 没有僵尸时清除攻击目标
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

        if (distance <= this.attackRange && distance < closestDistance) {
            closestDistance = distance;
            closestZombie = zombie;
        }
    }

    // 如果当前目标无效或不是最近的，更新目标
    if (!this.attackTarget || this.attackTarget.hp <= 0 || this.attackTarget !== closestZombie) {

        this.attackTarget = closestZombie;

        if (this.attackTarget) {
            console.log('主人物更新攻击目标:', this.attackTarget.type, '距离:', closestDistance);
        } else {
            console.log('主人物没有找到有效的攻击目标');
        }
    }
};

// 检查当前攻击目标是否仍然有效
Character.prototype.isAttackTargetValid = function () {
    if (!this.attackTarget) return false;

    // 检查目标是否还活着
    if (this.attackTarget.hp <= 0) {
        console.log('主人物攻击目标已死亡，清除目标');
        this.attackTarget = null;
        return false;
    }

    // 检查目标是否在攻击范围内
    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.attackTarget.x, this.attackTarget.y);

    if (distance > this.attackRange) {
        console.log('主人物攻击目标超出范围，距离:', distance, '攻击范围:', this.attackRange);
        this.attackTarget = null;
        return false;
    }

    return true;
};

// 移动到攻击范围（主人物专用）
Character.prototype.moveToAttackRange = function () {
    if (!this.attackTarget || this.attackTarget.hp <= 0) return;

    // 如果摇杆有输入，不执行自动移动
    if (this.hasJoystickInput()) return;

    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
    var targetDistance = this.attackRange - 5;

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

    // 对僵尸造成伤害
    this.attackTarget.takeDamage(this.attack);

    console.log('主人物攻击僵尸:', this.attackTarget.type, '造成伤害:', this.attack);

    // 播放攻击动画
    this.playAttackAnimation();
};


// 游戏结束处理
Character.prototype.handleGameOver = function () {
    console.log('主人物死亡，游戏结束');

    // 通知游戏引擎游戏结束
    if (window.gameEngine && window.gameEngine.setGameState) {
        window.gameEngine.setGameState('gameOver');
    }

    // 显示游戏结束界面
    this.showGameOverScreen();
};

// 显示游戏结束界面
Character.prototype.showGameOverScreen = function () {
    console.log('显示游戏结束界面');

    // 在画布上显示游戏结束文字
    if (window.gameEngine && window.gameEngine.ctx) {
        var ctx = window.gameEngine.ctx;
        var canvas = window.gameEngine.canvas;

        // 半透明黑色背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 游戏结束文字
        ctx.fillStyle = '#FF0000';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 50);

        // 死亡原因
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.fillText('主人物已死亡', canvas.width / 2, canvas.height / 2);

        // 重新开始提示
        ctx.fillStyle = '#FFFF00';
        ctx.font = '20px Arial';
        ctx.fillText('点击屏幕重新开始', canvas.width / 2, canvas.height / 2 + 50);

        // 添加点击事件监听器
        this.addGameOverClickListener(canvas);
    }
};

// 添加游戏结束界面的点击事件监听器
Character.prototype.addGameOverClickListener = function (canvas) {
    var self = this;

    // 移除之前的事件监听器（如果存在）
    if (this.gameOverClickListener) {
        canvas.removeEventListener('touchstart', this.gameOverClickListener);
    }

    // 创建新的事件监听器
    this.gameOverClickListener = function (event) {
        event.preventDefault();
        console.log('游戏结束界面被点击，重新开始游戏');

        // 移除事件监听器
        canvas.removeEventListener('touchstart', self.gameOverClickListener);
        self.gameOverClickListener = null;

        // 调用重新开始游戏函数
        if (window.restartGame) {
            window.restartGame();
        } else {
            console.error('restartGame函数未找到');
        }
    };

    // 添加事件监听器
    canvas.addEventListener('touchstart', this.gameOverClickListener);
};

// 获取摇杆移动方向
Character.prototype.getJoystickDirection = function () {
    if (!window.gameEngine || !window.gameEngine.joystick) {
        return {x: 0, y: 0};
    }

    var joystick = window.gameEngine.joystick;
    return joystick.getMoveDirection();
};


// 🔴 新增：检查人物是否卡住
Character.prototype.isStuck = function () {
    // 检查是否在同一个位置停留太久
    if (!this.lastPosition) {
        this.lastPosition = {x: this.x, y: this.y};
        this.stuckTime = 0;
        return false;
    }

    var distance = Math.sqrt(Math.pow(this.x - this.lastPosition.x, 2) + Math.pow(this.y - this.lastPosition.y, 2));

    // 如果移动距离小于5像素，增加卡住时间
    if (distance < 5) {
        this.stuckTime = (this.stuckTime || 0) + 1;

        // 如果卡住超过30帧（0.5秒），认为卡住了
        if (this.stuckTime > 30) {
            console.log('人物卡住检测：位置变化:', distance.toFixed(2), 'px, 卡住时间:', this.stuckTime, '帧');
            return true;
        }
    } else {
        // 有移动，重置卡住时间
        this.stuckTime = 0;
        this.lastPosition = {x: this.x, y: this.y};
    }

    return false;
};

// 🔴 新增：重置移动状态
Character.prototype.resetMovementState = function () {
    console.log('重置人物移动状态');

    // 重置移动相关状态
    this.isMoving = false;
    this.status = STATUS.IDLE;
    this.targetX = this.x;
    this.targetY = this.y;
    this.stuckTime = 0;

    // 清除攻击目标，避免继续卡住
    if (this.attackTarget) {
        console.log('清除攻击目标，避免卡住');
        this.attackTarget = null;
    }

    // 强制状态机回到待机状态
    if (this.stateMachine) {
        this.stateMachine.forceState(MAIN_CHARACTER_STATES.IDLE);
    }

    console.log('人物移动状态已重置');
};

// 播放攻击动画
Character.prototype.playAttackAnimation = function () {
    // 设置攻击动画帧
    this.animationFrame = 0;
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
    this.animationSpeed = animationConfig ? (animationConfig.ATTACK_ANIMATION_SPEED || 0.3) : 0.3; // 从配置读取攻击动画速度

    console.log('主人物播放攻击动画');
};

// 播放死亡动画
Character.prototype.playDeathAnimation = function () {
    // 设置死亡动画帧
    this.animationFrame = 0;
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
    this.animationSpeed = animationConfig ? (animationConfig.DEATH_ANIMATION_SPEED || 0.1) : 0.1; // 从配置读取死亡动画速度

    console.log('主人物播放死亡动画');
};


// 设置移动目标 - 使用工具类
Character.prototype.setMoveTarget = function (targetX, targetY) {
    var validationUtils = UtilsManager.getValidationUtils();
    var mathUtils = UtilsManager.getMathUtils();

    // 使用验证工具检查目标位置
    if (!validationUtils.validatePosition(targetX, targetY)) {
        throw new Error('无效的目标位置: ' + targetX + ', ' + targetY);
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
        from: {x: this.x, y: this.y},
        to: {x: targetX, y: targetY},
        distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        isMoving: this.isMoving,
        status: this.status
    });

    return true;
};

// 停止移动
Character.prototype.stopMovement = function () {
    this.isMoving = false;
    this.status = STATUS.IDLE;
    this.targetX = this.x; // 将目标位置设为当前位置
    this.targetY = this.y;
    console.log('角色停止移动，当前位置:', this.x, this.y);
};

// 更新移动 - 只处理动画更新，移动由触摸摇杆控制
Character.prototype.updateMovement = function (deltaTime = 1 / 60) {
    // 注意：移动由触摸摇杆直接控制，这里只处理动画和状态更新

    if (!this.isMoving) {
        return;
    }

    // 🔴 修复：检查是否卡住，如果卡住则重置移动状态
    if (this.isStuck()) {
        console.log('检测到人物卡住，重置移动状态');
        this.resetMovementState();
        return;
    }

    var animationUtils = UtilsManager.getAnimationUtils();

    // 更新最后位置，用于卡住检测
    if (!this.lastPosition) {
        this.lastPosition = {x: this.x, y: this.y};
    }
    this.lastPosition.x = this.x;
    this.lastPosition.y = this.y;

    // 使用动画工具更新动画帧 - 优化动画更新频率
    if (this.animationFrame !== undefined) {
        var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;
        this.animationFrame = animationUtils.updateFrame(this.animationFrame, this.animationSpeed * deltaTime, animationConfig ? animationConfig.MAX_ANIMATION_FRAMES : 8);
    }
};


// 更新动画 - 使用工具类
Character.prototype.updateAnimation = function (deltaTime) {
    var animationUtils = UtilsManager.getAnimationUtils();
    var animationConfig = window.ConfigManager ? window.ConfigManager.get('ANIMATION') : null;

    // 根据状态调整动画速度
    var baseSpeed = this.animationSpeed;
    var adjustedSpeed = baseSpeed;

    switch (this.status) {
        case STATUS.MOVING:
        case STATUS.FOLLOW:
            adjustedSpeed = baseSpeed * 1.5; // 移动状态动画更快
            break;
        case STATUS.ATTACKING:
            adjustedSpeed = baseSpeed * 2.0; // 攻击状态动画最快
            break;
        case STATUS.AVOIDING:
            adjustedSpeed = baseSpeed * 1.8; // 避障状态动画较快
            break;
        case STATUS.DIE:
            adjustedSpeed = baseSpeed * 0.5; // 死亡状态动画较慢
            break;
        default:
            adjustedSpeed = baseSpeed; // 待机状态正常速度
    }

    // 更新动画帧
    this.animationFrame = animationUtils.updateFrame(this.animationFrame, adjustedSpeed * deltaTime, animationConfig ? animationConfig.MAX_ANIMATION_FRAMES : 8);

    // 检查动画是否应该重置
    if (animationUtils.shouldResetAnimation(this.animationFrame, animationConfig ? animationConfig.MAX_ANIMATION_FRAMES : 8)) {
        this.animationFrame = 0;
    }


    this.frameCount = (this.frameCount || 0) + 1;
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


// 角色管理器 - 重构版本：使用对象池优化内存管理
var CharacterManager = {
    // 对象池引用
    objectPool: null,

    // 初始化对象池
    initObjectPool: function () {
        if (!window.objectPoolManager) {
    
            return;
        }

        // 创建角色对象池 - 修复：使用ROLE.MAIN作为默认角色类型
        this.objectPool = window.objectPoolManager.createPool('character', // 创建函数 - 修复：使用ROLE.MAIN而不是ROLE.CIVILIAN
            () => new Character(ROLE.MAIN, 0, 0), // 重置函数
            (character) => this.resetCharacter(character));

        console.log('✅ 角色对象池初始化完成');
    },

    // 重置角色状态（对象池复用）
    resetCharacter: function (character) {
        if (!character) return;

        // 重置基础属性
        character.hp = character.maxHp || 50;
        character.status = STATUS.IDLE;
        character.isMoving = false;
        character.targetX = character.x;
        character.targetY = character.y;
        character.attackCooldown = 0;
        character.attackTarget = null;
        character.stuckTime = 0;
        character.lastPosition = null;

        // 重置状态机
        if (character.stateMachine) {
            character.stateMachine.forceState(MAIN_CHARACTER_STATES.IDLE);
        }

        // 重置动画
        character.animationFrame = 0;
        character.frameCount = 0;

        console.log('✅ 角色状态重置完成:', character.id);
    },

    // 创建主人物
    createMainCharacter: function (x, y) {
        console.log('🔍 CharacterManager.createMainCharacter: 开始创建主人物，参数:', {x: x, y: y});

        var validationUtils = UtilsManager.getValidationUtils();

        // 使用验证工具检查参数
        if (!validationUtils.validatePosition(x, y)) {
            console.error('❌ 无效的主人物位置:', x, y);
            return null;
        }

        console.log('✅ 位置参数验证通过');

        var mainChar = null;

        // 优先使用对象池
        if (this.objectPool) {
            console.log('🔍 尝试从对象池获取主人物...');
            mainChar = this.objectPool.get();
            if (mainChar) {
                console.log('✅ 从对象池获取到对象:', mainChar);
                // 重新初始化主人物属性
                mainChar.role = ROLE.MAIN;
                mainChar.id = CHARACTER_ID.MAIN;
                mainChar.x = x;
                mainChar.y = y;
                mainChar.setupRoleProperties();
                mainChar.initializeStateMachine();

                console.log('✅ 从对象池获取主人物:', mainChar.id, '位置:', x, y);
            } else {
        
            }
        } else {
            console.log('🔍 对象池不可用，将使用传统创建方式');
        }

        // 对象池不可用时，使用传统创建方式
        if (!mainChar) {
            console.log('🔍 使用传统方式创建主人物...');
            mainChar = new Character(ROLE.MAIN, x, y);
            console.log('✅ 传统方式创建主人物成功:', mainChar);
            console.log('✅ 传统方式创建主人物:', mainChar.role, 'ID:', mainChar.id, '位置:', mainChar.x, mainChar.y, 'hp:', mainChar.hp);
        }

        // 验证角色创建是否成功
        console.log('🔍 验证角色创建结果...');
        if (!validationUtils.validateObject(mainChar, ['role', 'x', 'y', 'hp'])) {
            console.error('❌ 主人物创建失败，验证不通过');
            console.error('🔍 主人物对象详情:', mainChar);
            return null;
        }

        console.log('✅ 角色创建验证通过');

        // 🔴 重构：直接存储到内部存储，不再依赖四叉树
        this.mainCharacter = mainChar;

        console.log('✅ 主人物创建完成并存储到内部:', mainChar.id, '位置:', x, y);
        console.log('🔍 角色管理器状态检查:', {
            hasMainCharacter: !!this.mainCharacter,
            mainCharacterId: this.mainCharacter ? this.mainCharacter.id : 'N/A',
            mainCharacterRole: this.mainCharacter ? this.mainCharacter.role : 'N/A',
            mainCharacterType: this.mainCharacter ? this.mainCharacter.type : 'N/A',
            mainCharacterHp: this.mainCharacter ? this.mainCharacter.hp : 'N/A'
        });

        // 🔴 验证：立即验证存储是否成功
        var immediateCheck = this.getMainCharacter();
        if (immediateCheck) {
            console.log('✅ 立即验证成功：主人物已正确存储');
        } else {
            console.error('❌ 立即验证失败：主人物未正确存储！');
        }

        return mainChar;
    },

    // 🔴 重构：从内部存储获取主人物 - 角色业务逻辑的唯一数据源
    getMainCharacter: function () {
        // 直接从内部存储获取主人物
        if (this.mainCharacter && this.mainCharacter.hp > 0) {
            console.log('CharacterManager.getMainCharacter: 从内部存储获取到主人物:', {
                id: this.mainCharacter.id,
                role: this.mainCharacter.role,
                x: this.mainCharacter.x,
                y: this.mainCharacter.y,
                hp: this.mainCharacter.hp
            });
            return this.mainCharacter;
        }

        throw new Error('CharacterManager.getMainCharacter: 内部存储中未找到有效的主人物');
        return null;
    },

    // 🔴 重构：从内部存储获取所有角色 - 角色业务逻辑的唯一数据源
    getAllCharacters: function () {
        var characters = [];

        // 添加主人物
        if (this.mainCharacter && this.mainCharacter.hp > 0) {
            characters.push(this.mainCharacter);
        }

        // 添加伙伴（如果有的话）
        if (this.partners && Array.isArray(this.partners)) {
            characters.push(...this.partners.filter(partner => partner && partner.hp > 0));
        }

        console.log('CharacterManager.getAllCharacters: 从内部存储获取到角色数量:', characters.length);
        return characters;
    },

    // 更新所有角色 - 从四叉树获取角色列表
    updateAllCharacters: function (deltaTime = 1 / 60) {
        var performanceUtils = UtilsManager.getPerformanceUtils();

        // 🔴 重构：直接从管理器获取角色
        var characters = this.getAllCharacters();
        if (characters.length === 0) {
            throw new Error('无法获取角色列表');
            return;
        }


        // 使用性能工具测量更新时间
        performanceUtils.startTimer('updateAllCharacters');

        characters.forEach(char => {
            if (char && char.hp > 0) {
                if (char.role === 1) {
                    // 主人物：使用专用更新方法
                    if (typeof char.updateMainCharacter === 'function') {
                        char.updateMainCharacter(deltaTime);
                    } else {
                        throw new Error('主人物缺少updateMainCharacter方法: ' + char.id);
                    }
                } else {
                    // 伙伴：使用通用更新方法
                    if (typeof char.updateMovement === 'function') {
                        char.updateMovement(deltaTime);
                    } else {
                        throw new Error('伙伴缺少updateMovement方法: ' + char.id);
                    }
                }
            } else {
                throw new Error('角色无效或已死亡: ' + char.id);
            }
        });

        var updateTime = performanceUtils.endTimer('updateAllCharacters');

    }
};

// 导出枚举
export {ROLE, WEAPON, STATUS, CHARACTER_ID};

// 导出角色管理器和角色类
export {CharacterManager};
export default Character;

// 主人物专用更新方法
Character.prototype.updateMainCharacter = function (deltaTime) {
    // 首先检查摇杆输入并设置移动目标（优先级最高）
    this.checkJoystickInput();

    // 然后更新状态机
    if (this.stateMachine) {
        this.stateMachine.update(deltaTime);
    }


    // 根据当前状态执行相应行为
    switch (this.stateMachine.currentState) {
        case MAIN_CHARACTER_STATES.IDLE:
            // 待机状态：渲染待机动画
            this.updateAnimation(deltaTime);
            break;

        case MAIN_CHARACTER_STATES.MOVE:
            // 移动状态：处理移动逻辑
            this.updateMovement(deltaTime);
            this.updateAnimation(deltaTime);
            break;

        case MAIN_CHARACTER_STATES.ATTACK:
            // 攻击状态：处理攻击逻辑
            this.updateAttack(deltaTime);
            this.updateAnimation(deltaTime);
            break;

        case MAIN_CHARACTER_STATES.DIE:
            // 死亡状态：播放死亡动画
            this.updateAnimation(deltaTime);
            break;

        default:
            throw new Error('主人物未知状态: ' + this.stateMachine.currentState);
            break;
    }
};

// 检查摇杆输入并设置移动目标
Character.prototype.checkJoystickInput = function () {
    if (!this.hasJoystickInput()) {
        return;
    }

    var direction = this.getJoystickDirection();
    var deadZone = 0.1;

    // 检查是否超过死区
    if (Math.abs(direction.x) > deadZone || Math.abs(direction.y) > deadZone) {
        // 🔴 修复：增加移动距离，避免移动过慢
        var moveDistance = 150; // 每次移动150px（从100px增加到150px）
        var targetX = this.x + direction.x * moveDistance;
        var targetY = this.y + direction.y * moveDistance;


        // 设置移动目标并激活移动状态
        this.setMoveTarget(targetX, targetY);
        this.isMoving = true;
        this.status = STATUS.MOVING;

        if (this.stateMachine && this.stateMachine.currentState !== MAIN_CHARACTER_STATES.MOVE) {
            this.stateMachine.forceState(MAIN_CHARACTER_STATES.MOVE);
        }
    }
};



