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
    
    sm.addTransition(PARTNER_STATES.ATTACK, PARTNER_STATES.IDLE, () => {
        // 僵尸死亡或超出范围
        return !this.hasZombieInRange(50);
    });
    
    sm.addTransition(PARTNER_STATES.AVOID, PARTNER_STATES.FOLLOW, () => {
        // 避障完成且主人物仍在移动
        return this.isAvoidanceComplete() && this.isMainCharacterMoving();
    });
    
    sm.addTransition(PARTNER_STATES.AVOID, PARTNER_STATES.ATTACK, () => {
        // 避障完成且主人物停止且50px内有僵尸
        return this.isAvoidanceComplete() && !this.isMainCharacterMoving() && this.hasZombieInRange(50);
    });
    
    // 添加死亡状态转换
    sm.addTransition(PARTNER_STATES.INIT, PARTNER_STATES.DIE, () => {
        return this.hp <= 0;
    });
    
    sm.addTransition(PARTNER_STATES.IDLE, PARTNER_STATES.DIE, () => {
        return this.hp <= 0;
    });
    
    sm.addTransition(PARTNER_STATES.FOLLOW, PARTNER_STATES.DIE, () => {
        return this.hp <= 0;
    });
    
    sm.addTransition(PARTNER_STATES.ATTACK, PARTNER_STATES.DIE, () => {
        return this.hp <= 0;
    });
    
    sm.addTransition(PARTNER_STATES.AVOID, PARTNER_STATES.DIE, () => {
        return this.hp <= 0;
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
    
    sm.addBehavior(PARTNER_STATES.DIE, 
        this.onEnterDie.bind(this),       // 进入死亡
        this.onUpdateDie.bind(this),      // 更新死亡
        this.onExitDie.bind(this)         // 退出死亡
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
        if (angleDiff < Math.PI / 4 && distance < 80) {
            // 多伙伴协同：优先让离主人物最近的伙伴进入避障状态
            return this.shouldEnterAvoidance(mainChar);
        }
    }
    
    return false;
};

// 判断是否应该进入避障状态（多伙伴协同逻辑）
Character.prototype.shouldEnterAvoidance = function(mainChar) {
    if (!window.characterManager) return true;
    
    const allCharacters = window.characterManager.getAllCharacters();
    const partners = allCharacters.filter(char => 
        char.role !== 1 && // 不是主人物
        char.hp > 0 && // 活着
        char.id !== this.id // 不是自己
    );
    
    if (partners.length === 0) return true; // 没有其他伙伴，直接避障
    
    const mathUtils = UtilsManager.getMathUtils();
    const myDistance = mathUtils.distance(this.x, this.y, mainChar.x, mainChar.y);
    
    // 检查是否有其他伙伴距离主人物更近
    for (let i = 0; i < partners.length; i++) {
        const partner = partners[i];
        const partnerDistance = mathUtils.distance(partner.x, partner.y, mainChar.x, mainChar.y);
        
        // 如果其他伙伴距离更近，且也在拥堵范围内，让它们优先避障
        if (partnerDistance < myDistance && partnerDistance < 80) {
            // 检查其他伙伴是否已经在避障状态
            if (partner.stateMachine && partner.stateMachine.isInState(PARTNER_STATES.AVOID)) {
                console.log('伙伴', this.id, '检测到其他伙伴已在避障，等待轮到自己');
                return false; // 等待其他伙伴完成避障
            }
            
            // 如果其他伙伴没有避障，让距离最近的先避障
            if (partnerDistance < myDistance - 10) { // 10px的缓冲距离
                console.log('伙伴', this.id, '检测到更近的伙伴，让它们先避障');
                return false;
            }
        }
    }
    
    // 我是最近的伙伴，或者没有其他伙伴在拥堵范围内，可以进入避障
    console.log('伙伴', this.id, '进入避障状态，距离主人物:', myDistance);
    return true;
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
    this.isMoving = false;
    this.attackCooldown = 0; // 重置攻击冷却
    console.log('伙伴进入初始状态');
};

Character.prototype.onUpdateInit = function(deltaTime, stateData) {
    // 初始状态下的行为：静止不动，渲染待机动画
    this.updateAnimation(deltaTime);
    
    // 检查是否应该切换到跟随状态
    if (this.isMainCharacterNearby(20)) {
        console.log('伙伴检测到主人物靠近，准备切换到跟随状态');
    }
};

Character.prototype.onExitInit = function(stateData) {
    console.log('伙伴退出初始状态');
};

Character.prototype.onEnterIdle = function(stateData) {
    this.status = STATUS.IDLE;
    this.isMoving = false;
    this.attackCooldown = 0; // 重置攻击冷却
    console.log('伙伴进入待机状态');
};

Character.prototype.onUpdateIdle = function(deltaTime, stateData) {
    // 待机状态下的行为：渲染待机动画
    this.updateAnimation(deltaTime);
    
    // 检查是否有僵尸需要攻击
    if (this.hasZombieInRange(100)) {
        console.log('伙伴在待机状态检测到僵尸，准备攻击');
    }
    
    // 检查主人物是否开始移动
    if (this.isMainCharacterMoving()) {
        console.log('伙伴检测到主人物移动，准备跟随');
    }
};

Character.prototype.onExitIdle = function(stateData) {
    console.log('伙伴退出待机状态');
};

Character.prototype.onEnterFollow = function(stateData) {
    this.status = STATUS.FOLLOW;
    this.isMoving = true;
    this.attackCooldown = 0; // 重置攻击冷却
    console.log('伙伴进入跟随状态');
    
    // 计算跟随点
    this.calculateFollowPoint();
};

Character.prototype.onUpdateFollow = function(deltaTime, stateData) {
    // 跟随状态下的行为：追逐主人物侧后方跟随点
    this.updateFollow(deltaTime);
    
    // 每帧重新计算跟随点（避免伙伴"绕圈追"）
    this.calculateFollowPoint();
    
    // 检查是否应该避障
    if (this.detectCongestion()) {
        console.log('伙伴检测到拥堵，准备避障');
    }
};

Character.prototype.onExitFollow = function(stateData) {
    this.isMoving = false;
    console.log('伙伴退出跟随状态');
};

Character.prototype.onEnterAttack = function(stateData) {
    this.status = STATUS.ATTACKING;
    this.isMoving = false;
    this.attackCooldown = 0; // 重置攻击冷却
    console.log('伙伴进入攻击状态');
    
    // 寻找最近的僵尸作为攻击目标
    this.findAttackTarget();
};

Character.prototype.onUpdateAttack = function(deltaTime, stateData) {
    // 攻击状态下的行为：移动到攻击距离，触发攻击动画
    this.updateAttack(deltaTime);
    
    // 检查攻击目标是否仍然有效
    if (!this.attackTarget || this.attackTarget.hp <= 0) {
        console.log('伙伴攻击目标无效，准备切换状态');
        return;
    }
    
    // 检查是否应该打断攻击（主人物移动）
    if (this.isMainCharacterMoving()) {
        console.log('主人物移动，伙伴攻击被打断');
        return;
    }
};

Character.prototype.onExitAttack = function(stateData) {
    this.attackTarget = null; // 清除攻击目标
    console.log('伙伴退出攻击状态');
};

Character.prototype.onEnterAvoid = function(stateData) {
    this.status = STATUS.AVOIDING;
    this.isMoving = true;
    console.log('伙伴进入避障状态');
    
    // 计算避障策略
    this.calculateAvoidanceStrategy();
};

Character.prototype.onUpdateAvoid = function(deltaTime, stateData) {
    // 避障状态下的行为：按避障策略为主体让路
    this.updateAvoid(deltaTime);
    
    // 检查避障是否完成
    if (this.isAvoidanceComplete()) {
        console.log('伙伴避障完成');
    }
};

Character.prototype.onExitAvoid = function(stateData) {
    console.log('伙伴退出避障状态');
};

Character.prototype.onEnterDie = function(stateData) {
    this.status = STATUS.DIE;
    this.isMoving = false;
    this.deathAnimationTime = 0; // 死亡动画计时器
    console.log('伙伴进入死亡状态');
    
    // 播放死亡动画
    this.playDeathAnimation();
};

Character.prototype.onUpdateDie = function(deltaTime, stateData) {
    // 死亡状态下的行为：播放死亡动画
    this.deathAnimationTime += deltaTime;
    
    // 死亡动画持续2秒
    if (this.deathAnimationTime >= 2.0) {
        console.log('伙伴死亡动画结束，准备销毁');
        this.destroy();
    }
};

Character.prototype.onExitDie = function(stateData) {
    console.log('伙伴退出死亡状态');
};

// 通用的攻击更新方法
Character.prototype.updateAttack = function(deltaTime) {
    if (!this.attackTarget || this.attackTarget.hp <= 0) {
        return;
    }
    
    // 检查攻击冷却
    this.attackCooldown += deltaTime;
    var attackInterval = 1.0; // 1秒攻击一次（与主人物错开）
    
    if (this.attackCooldown >= attackInterval) {
        // 执行攻击
        this.performAttack();
        this.attackCooldown = 0;
    }
    
    // 移动到攻击距离
    this.moveToAttackRange();
};

// 通用的跟随更新方法
Character.prototype.updateFollow = function(deltaTime) {
    if (!this.followPoint) {
        this.calculateFollowPoint();
        return;
    }
    
    // 计算到跟随点的距离
    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.followPoint.x, this.followPoint.y);
    
    if (distance > 5) { // 5px的跟随精度
        // 移动到跟随点
        this.setMoveTarget(this.followPoint.x, this.followPoint.y);
    } else {
        // 到达跟随点，停止移动
        this.stopMovement();
    }
};

// 通用的避障更新方法
Character.prototype.updateAvoid = function(deltaTime) {
    if (!this.avoidanceTarget) {
        return;
    }
    
    // 移动到避障目标位置
    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.avoidanceTarget.x, this.avoidanceTarget.y);
    
    if (distance > 3) { // 3px的避障精度
        this.setMoveTarget(this.avoidanceTarget.x, this.avoidanceTarget.y);
    } else {
        // 到达避障位置，停止移动
        this.stopMovement();
        this.avoidanceComplete = true;
    }
};

// 计算跟随点（主人物侧后方）
Character.prototype.calculateFollowPoint = function() {
    if (!window.characterManager) return;
    
    var mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return;
    
    var mathUtils = UtilsManager.getMathUtils();
    
    // 计算主人物移动方向
    var mainCharDirection = 0;
    if (mainChar.isMoving && mainChar.targetX !== mainChar.x && mainChar.targetY !== mainChar.y) {
        mainCharDirection = mathUtils.angle(mainChar.x, mainChar.y, mainChar.targetX, mainChar.targetY);
    }
    
    // 计算跟随点位置（侧后方，距离80px）
    var followDistance = 80;
    var followAngle = mainCharDirection + Math.PI; // 后方
    var sideOffset = Math.PI / 4; // 45度侧方偏移
    
    // 根据伙伴ID选择左侧或右侧跟随
    var sideMultiplier = (this.id % 2 === 0) ? 1 : -1;
    var finalAngle = followAngle + (sideOffset * sideMultiplier);
    
    this.followPoint = {
        x: mainChar.x + Math.cos(finalAngle) * followDistance,
        y: mainChar.y + Math.sin(finalAngle) * followDistance
    };
    
    // 确保跟随点不在建筑物内
    if (window.collisionSystem && window.collisionSystem.isCircleCollidingWithBuildings) {
        if (window.collisionSystem.isCircleCollidingWithBuildings(this.followPoint.x, this.followPoint.y, 16)) {
            // 如果跟随点在建筑物内，寻找附近的安全位置
            var safePos = this.findSafeFollowPosition(mainChar.x, mainChar.y, followDistance);
            if (safePos) {
                this.followPoint = safePos;
            }
        }
    }
};

// 寻找安全的跟随位置
Character.prototype.findSafeFollowPosition = function(centerX, centerY, baseDistance) {
    var searchRadius = baseDistance;
    var searchSteps = 8; // 8个方向
    
    for (var i = 0; i < searchSteps; i++) {
        var angle = (i / searchSteps) * Math.PI * 2;
        var testX = centerX + Math.cos(angle) * searchRadius;
        var testY = centerY + Math.sin(angle) * searchRadius;
        
        if (!window.collisionSystem.isCircleCollidingWithBuildings(testX, testY, 16)) {
            return {x: testX, y: testY};
        }
    }
    
    // 如果都找不到，返回原位置
    return {x: centerX, y: centerY};
};

// 寻找攻击目标
Character.prototype.findAttackTarget = function() {
    if (!window.zombieManager) return;
    
    var zombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0);
    if (zombies.length === 0) return;
    
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
    
    this.attackTarget = closestZombie;
    
    if (this.attackTarget) {
        console.log('伙伴找到攻击目标:', this.attackTarget.type, '距离:', closestDistance);
    }
};

// 移动到攻击范围
Character.prototype.moveToAttackRange = function() {
    if (!this.attackTarget || this.attackTarget.hp <= 0) return;
    
    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
    var targetDistance = this.attackRange - 5; // 留5px缓冲
    
    if (distance > targetDistance) {
        // 计算到攻击范围边缘的位置
        var angle = mathUtils.angle(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
        var targetX = this.attackTarget.x + Math.cos(angle + Math.PI) * targetDistance;
        var targetY = this.attackTarget.y + Math.sin(angle + Math.PI) * targetDistance;
        
        this.setMoveTarget(targetX, targetY);
    } else {
        // 在攻击范围内，停止移动
        this.stopMovement();
    }
};

// 执行攻击
Character.prototype.performAttack = function() {
    if (!this.attackTarget || this.attackTarget.hp <= 0) return;
    
    // 对僵尸造成伤害
    this.attackTarget.takeDamage(this.attack);
    
    console.log('伙伴攻击僵尸:', this.attackTarget.type, '造成伤害:', this.attack);
    
    // 播放攻击动画
    this.playAttackAnimation();
};

// 计算避障策略
Character.prototype.calculateAvoidanceStrategy = function() {
    if (!window.characterManager) return;
    
    var mainChar = window.characterManager.getMainCharacter();
    if (!mainChar) return;
    
    var mathUtils = UtilsManager.getMathUtils();
    
    // 计算主人物移动方向
    var mainCharDirection = 0;
    if (mainChar.isMoving && mainChar.targetX !== mainChar.x && mainChar.targetY !== mainChar.y) {
        mainCharDirection = mathUtils.angle(mainChar.x, mainChar.y, mainChar.targetX, mainChar.targetY);
    }
    
    // 计算避障方向（垂直于主人物移动方向）
    var avoidDirection = mainCharDirection + Math.PI / 2; // 90度垂直
    
    // 根据伙伴ID选择避障方向（避免所有伙伴往同一方向避障）
    var sideMultiplier = (this.id % 2 === 0) ? 1 : -1;
    var finalAvoidDirection = avoidDirection * sideMultiplier;
    
    // 计算避障目标位置（距离100px）
    var avoidDistance = 100;
    this.avoidanceTarget = {
        x: this.x + Math.cos(finalAvoidDirection) * avoidDistance,
        y: this.y + Math.sin(finalAvoidDirection) * avoidDistance
    };
    
    // 确保避障目标位置安全
    if (window.collisionSystem && window.collisionSystem.isCircleCollidingWithBuildings) {
        if (window.collisionSystem.isCircleCollidingWithBuildings(this.avoidanceTarget.x, this.avoidanceTarget.y, 16)) {
            // 寻找附近的安全避障位置
            var safePos = this.findSafeAvoidancePosition(this.x, this.y, avoidDistance);
            if (safePos) {
                this.avoidanceTarget = safePos;
            }
        }
    }
    
    this.avoidanceComplete = false;
    console.log('伙伴计算避障策略，目标位置:', this.avoidanceTarget);
};

// 寻找安全的避障位置
Character.prototype.findSafeAvoidancePosition = function(centerX, centerY, baseDistance) {
    var searchRadius = baseDistance;
    var searchSteps = 12; // 12个方向
    
    for (var i = 0; i < searchSteps; i++) {
        var angle = (i / searchSteps) * Math.PI * 2;
        var testX = centerX + Math.cos(angle) * searchRadius;
        var testY = centerY + Math.sin(angle) * searchRadius;
        
        if (!window.collisionSystem.isCircleCollidingWithBuildings(testX, testY, 16)) {
            return {x: testX, y: testY};
        }
    }
    
    // 如果都找不到，返回原位置
    return {x: centerX, y: centerY};
};

// 检查避障是否完成
Character.prototype.isAvoidanceComplete = function() {
    return this.avoidanceComplete || false;
};

// 播放攻击动画
Character.prototype.playAttackAnimation = function() {
    // 设置攻击动画帧
    this.animationFrame = 0;
    this.animationSpeed = 0.3; // 攻击动画速度
    
    console.log('伙伴播放攻击动画');
};

// 播放死亡动画
Character.prototype.playDeathAnimation = function() {
    // 设置死亡动画帧
    this.animationFrame = 0;
    this.animationSpeed = 0.1; // 死亡动画速度
    
    console.log('伙伴播放死亡动画');
};

// 销毁角色
Character.prototype.destroy = function() {
    console.log('伙伴销毁:', this.role, this.id);
    
    // 从四叉树中移除
    if (window.collisionSystem && window.collisionSystem.removeDynamicObject) {
        window.collisionSystem.removeDynamicObject(this);
    }
    
    // 标记为已销毁
    this._destroyed = true;
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

// 更新动画 - 使用工具类
Character.prototype.updateAnimation = function (deltaTime) {
    var animationUtils = UtilsManager.getAnimationUtils();
    var animationConfig = ConfigManager.get('ANIMATION');
    
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
    this.animationFrame = animationUtils.updateFrame(
        this.animationFrame, 
        adjustedSpeed * deltaTime, 
        animationConfig.MAX_ANIMATION_FRAMES
    );
    
    // 检查动画是否应该重置
    if (animationUtils.shouldResetAnimation(this.animationFrame, animationConfig.MAX_ANIMATION_FRAMES)) {
        this.animationFrame = 0;
    }
    
    // 记录动画状态（用于调试）
    if (this.frameCount % 60 === 0) { // 每秒记录一次
        console.log('角色动画更新:', {
            role: this.role,
            status: this.status,
            frame: this.animationFrame,
            speed: adjustedSpeed,
            deltaTime: deltaTime
        });
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
