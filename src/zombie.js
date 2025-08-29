/**
 * 僵尸模块 - 重构版本 (zombie.js)
 *
 * 重构内容：
 * - 四叉树成为僵尸管理的核心
 * - ZombieManager只负责游戏逻辑
 * - 对象的创建、删除、位置更新都通过四叉树进行
 * - 确保数据的一致性和系统的可靠性
 */

import ConfigManager from './config.js';
import UtilsManager from './utils.js';

// 僵尸类型枚举
const ZOMBIE_TYPE = {
    SKINNY: 'skinny',      // 瘦僵尸
    FAT: 'fat',            // 胖僵尸
    BOSS: 'boss',          // 僵尸Boss
    FAST: 'fast',          // 快速僵尸
    TANK: 'tank'           // 坦克僵尸
};

// 僵尸状态枚举
const ZOMBIE_STATE = {
    IDLE: 'idle',          // 待机
    WALKING: 'walking',    // 行走
    ATTACKING: 'attacking', // 攻击
    DEAD: 'dead',          // 死亡
    CHASING: 'chasing'     // 追击
};

// 基础僵尸类
var Zombie = function (type, x, y) {
    // 获取工具类
    var validationUtils = UtilsManager.getValidationUtils();
    var mathUtils = UtilsManager.getMathUtils();

    // 验证参数
    if (!validationUtils.validatePosition(x, y)) {
        console.error('无效的僵尸位置:', x, y);
        x = 100;
        y = 100; // 使用默认位置
    }

    if (!Object.values(ZOMBIE_TYPE).includes(type)) {
        console.error('无效的僵尸类型:', type);
        type = ZOMBIE_TYPE.SKINNY; // 使用默认类型
    }

    // 基础属性 - 统一类型为'zombie'，用zombieType区分具体类型
    this.type = 'zombie';           // 统一类型标识，用于四叉树识别
    this.zombieType = type;         // 具体僵尸类型（skinny, fat, boss等）

    // 使用Object.defineProperty保护type属性，防止被意外修改
    Object.defineProperty(this, 'type', {
        value: 'zombie', writable: false, configurable: false
    });
    this.x = x;
    this.y = y;
    this.id = Date.now() + Math.random(); // 唯一ID

    // 根据类型设置属性
    this.setupProperties();

    // AI状态
    this.state = ZOMBIE_STATE.IDLE;
    this.targetX = this.x;  // 修复：使用this.x而不是x
    this.targetY = this.y;  // 修复：使用this.y而不是y
    this.targetCharacter = null;

    // 从配置获取攻击属性
    var combatConfig = ConfigManager.get('COMBAT');
    this.lastAttackTime = 0;
    this.attackCooldown = combatConfig.DEFAULT_ATTACK_COOLDOWN;

    // 从配置获取动画属性
    var animationConfig = ConfigManager.get('ANIMATION');
    this.animationFrame = 0;
    this.animationSpeed = animationConfig.DEFAULT_FRAME_RATE;
    this.direction = 0; // 朝向角度

    // 验证僵尸属性设置
    console.log('=== 僵尸初始化完成 ===');
    console.log('统一类型:', this.type);
    console.log('具体类型:', this.zombieType);
    console.log('ID:', this.id);
    console.log('生命值:', this.hp);
    console.log('最大生命值:', this.maxHp);
    console.log('位置:', this.x, this.y);
    console.log('状态:', this.state);
    console.log('尺寸:', this.size);
    console.log('颜色:', this.color);
    console.log('图标:', this.icon);
    console.log('攻击范围:', this.attackRange);
    console.log('检测范围:', this.detectionRange);
    console.log('移动速度:', this.moveSpeed);
    console.log('====================');
};

// 设置僵尸属性 - 使用配置管理
Zombie.prototype.setupProperties = function () {
    var movementConfig = ConfigManager.get('MOVEMENT');
    var detectionConfig = ConfigManager.get('DETECTION');
    var objectSizes = ConfigManager.get('OBJECT_SIZES.ZOMBIE');
    var difficultyConfig = ConfigManager.getDifficultyConfig();

    // 基础配置
    var baseConfig = {
        moveSpeed: movementConfig.ZOMBIE_MOVE_SPEED,
        detectionRange: detectionConfig.ZOMBIE_DETECTION_RANGE,
        mainCharacterDetectionRange: detectionConfig.MAIN_CHARACTER_DETECTION,
        icon: '🧟‍♂️'
    };

    // 从配置文件获取僵尸类型特定配置
    var zombieTypeConfig = detectionConfig.ZOMBIE_TYPES[this.zombieType] || detectionConfig.ZOMBIE_TYPES.DEFAULT;

    switch (this.zombieType) {
        case ZOMBIE_TYPE.SKINNY:
            this.hp = Math.round(30 * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
            this.maxHp = this.hp;
            this.attack = Math.round(15 * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);
            this.moveSpeed = baseConfig.moveSpeed;
            this.attackRange = zombieTypeConfig.ATTACK_RANGE;        // 从配置读取：40px
            this.detectionRange = zombieTypeConfig.DETECTION_RANGE;  // 从配置读取：200px
            this.mainCharacterDetectionRange = baseConfig.mainCharacterDetectionRange;
            this.icon = baseConfig.icon;
            this.color = '#8B4513';
            this.size = objectSizes.SKINNY.WIDTH;
            this.width = objectSizes.SKINNY.WIDTH;
            this.height = objectSizes.SKINNY.HEIGHT;
            this.radius = this.width / 2; // 碰撞半径（宽度的一半）
            break;

        case ZOMBIE_TYPE.FAT:
            this.hp = Math.round(60 * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
            this.maxHp = this.hp;
            this.attack = Math.round(25 * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);
            this.moveSpeed = baseConfig.moveSpeed;
            this.attackRange = zombieTypeConfig.ATTACK_RANGE;        // 从配置读取：50px
            this.detectionRange = zombieTypeConfig.DETECTION_RANGE;  // 从配置读取：200px
            this.mainCharacterDetectionRange = baseConfig.mainCharacterDetectionRange;
            this.icon = baseConfig.icon;
            this.color = '#654321';
            this.size = objectSizes.FAT.WIDTH;
            this.width = objectSizes.FAT.WIDTH;
            this.height = objectSizes.FAT.HEIGHT;
            this.radius = this.width / 2; // 碰撞半径（宽度的一半）
            break;

        case ZOMBIE_TYPE.BOSS:
            this.hp = Math.round(200 * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
            this.maxHp = this.hp;
            this.attack = Math.round(50 * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);
            this.moveSpeed = baseConfig.moveSpeed;
            this.attackRange = zombieTypeConfig.ATTACK_RANGE;        // 从配置读取：80px
            this.detectionRange = zombieTypeConfig.DETECTION_RANGE;  // 从配置读取：300px
            this.mainCharacterDetectionRange = baseConfig.mainCharacterDetectionRange;
            this.icon = baseConfig.icon;
            this.color = '#8B0000';
            this.size = objectSizes.BOSS.WIDTH;
            this.width = objectSizes.BOSS.WIDTH;
            this.height = objectSizes.BOSS.HEIGHT;
            this.radius = this.width / 2; // 碰撞半径（宽度的一半）
            break;

        case ZOMBIE_TYPE.FAST:
            this.hp = Math.round(20 * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
            this.maxHp = this.hp;
            this.attack = Math.round(10 * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);
            this.moveSpeed = baseConfig.moveSpeed;
            this.attackRange = zombieTypeConfig.ATTACK_RANGE;        // 从配置读取：30px
            this.detectionRange = zombieTypeConfig.DETECTION_RANGE;  // 从配置读取：250px
            this.mainCharacterDetectionRange = baseConfig.mainCharacterDetectionRange;
            this.icon = baseConfig.icon;
            this.color = '#228B22';
            this.size = objectSizes.FAST.WIDTH;
            this.width = objectSizes.FAST.WIDTH;
            this.height = objectSizes.FAST.HEIGHT;
            this.radius = this.width / 2; // 碰撞半径（宽度的一半）
            break;

        case ZOMBIE_TYPE.TANK:
            this.hp = Math.round(150 * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
            this.maxHp = this.hp;
            this.attack = Math.round(35 * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);
            this.moveSpeed = baseConfig.moveSpeed;
            this.attackRange = zombieTypeConfig.ATTACK_RANGE;        // 从配置读取：60px
            this.detectionRange = zombieTypeConfig.DETECTION_RANGE;  // 从配置读取：150px
            this.mainCharacterDetectionRange = baseConfig.mainCharacterDetectionRange;
            this.icon = baseConfig.icon;
            this.color = '#2F4F4F';
            this.size = objectSizes.TANK.WIDTH;
            this.width = objectSizes.TANK.WIDTH;
            this.height = objectSizes.TANK.HEIGHT;
            this.radius = this.width / 2; // 碰撞半径（宽度的一半）
            break;

        default:
            this.hp = Math.round(40 * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
            this.maxHp = this.hp;
            this.attack = Math.round(20 * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);
            this.moveSpeed = baseConfig.moveSpeed;
            this.attackRange = zombieTypeConfig.ATTACK_RANGE;        // 从配置读取：45px
            this.detectionRange = zombieTypeConfig.DETECTION_RANGE;  // 从配置读取：200px
            this.mainCharacterDetectionRange = baseConfig.mainCharacterDetectionRange;
            this.icon = baseConfig.icon;
            this.color = '#696969';
            this.size = objectSizes.DEFAULT.WIDTH;
            this.width = objectSizes.DEFAULT.WIDTH;
            this.height = objectSizes.DEFAULT.HEIGHT;
            this.radius = this.width / 2; // 碰撞半径（宽度的一半）
    }
};

// 更新僵尸状态 - 使用工具类和性能优化
Zombie.prototype.update = function (deltaTime, characters) {
    // 验证僵尸基本状态
    if (!this.hp || this.hp <= 0) {
        if (this.state !== ZOMBIE_STATE.DEAD) {
            console.log('僵尸生命值耗尽，设置死亡状态:', this.zombieType, this.id);
            this.state = ZOMBIE_STATE.DEAD;
            this.onEnterDead();
        }
        return;
    }

    // 验证僵尸坐标
    var mathUtils = UtilsManager.getMathUtils();
    if (!mathUtils.isValidNumber(this.x) || !mathUtils.isValidNumber(this.y)) {
        console.error('僵尸坐标无效，跳过更新:', this.zombieType, this.id, 'x:', this.x, 'y:', this.y);
        return;
    }

    // 性能优化：使用帧间隔更新，减少CPU负载
    if (!this._updateFrame) this._updateFrame = 0;
    this._updateFrame++;

    // 根据僵尸类型和状态决定更新频率
    var updateInterval = this.getUpdateInterval();
    if (this._updateFrame % updateInterval !== 0) {
        // 跳过这一帧的更新，只更新动画
        this.updateAnimation(deltaTime);
        return;
    }

    // 更新白天/夜晚状态
    this.updateDayNightState();

    // 寻找目标（使用优化的检测逻辑）
    this.findTarget(characters);

    // 根据状态执行相应行为
    switch (this.state) {
        case ZOMBIE_STATE.CHASING:
            this.chaseTarget(deltaTime);
            break;
        case ZOMBIE_STATE.ATTACKING:
            this.attackTarget(deltaTime);
            break;
        case ZOMBIE_STATE.WALKING:
            this.moveTowards(this.targetX, this.targetY, deltaTime);
            break;
        case ZOMBIE_STATE.IDLE:
            this.idleBehavior(deltaTime);
            break;
        case ZOMBIE_STATE.DEAD:
            this.updateDead(deltaTime);
            break;
        default:
            console.warn('僵尸状态未知，重置为待机:', this.zombieType, this.id, 'state:', this.state);
            this.state = ZOMBIE_STATE.IDLE;
            break;
    }

    // 更新动画
    this.updateAnimation(deltaTime);
};

// 获取僵尸更新间隔（性能优化）
Zombie.prototype.getUpdateInterval = function () {
    // 根据僵尸类型和状态决定更新频率
    switch (this.zombieType) {
        case ZOMBIE_STATE.FAST:
            return 1; // 快速僵尸每帧更新
        case ZOMBIE_STATE.BOSS:
            return 2; // Boss僵尸每2帧更新
        case ZOMBIE_STATE.TANK:
            return 3; // 坦克僵尸每3帧更新
        default:
            return 2; // 其他僵尸每2帧更新
    }
};

// 更新白天/夜晚状态
Zombie.prototype.updateDayNightState = function () {
    // 检查游戏时间系统
    if (window.gameEngine && window.gameEngine.getTimeInfo) {
        var timeInfo = window.gameEngine.getTimeInfo();
        if (timeInfo) {
            this.isDay = timeInfo.isDay;

            // 根据白天/夜晚调整移动速度
            if (this.isDay) {
                this.currentMoveSpeed = this.moveSpeed; // 白天正常速度
            } else {
                this.currentMoveSpeed = this.moveSpeed * 1.67; // 夜晚速度提升到3m/s (180 * 1.67 ≈ 300)
            }
        }
    } else {
        this.currentMoveSpeed = this.moveSpeed; // 默认速度
    }
};

// 进入死亡状态
Zombie.prototype.onEnterDead = function () {
    this.deathAnimationTime = 0; // 死亡动画计时器
    this.deathAnimationDuration = 2.0; // 死亡动画持续2秒

    // 停止移动
    this.isMoving = false;
    this.targetCharacter = null;

    // 概率掉落资源
    this.dropResources();

    console.log('僵尸进入死亡状态:', this.zombieType, this.id);
};

// 更新死亡状态
Zombie.prototype.updateDead = function (deltaTime) {
    this.deathAnimationTime += deltaTime;

    // 死亡动画持续2秒后销毁
    if (this.deathAnimationTime >= this.deathAnimationDuration) {
        console.log('僵尸死亡动画结束，准备销毁:', this.zombieType, this.id);
        this.destroy();
    }
};

// 概率掉落资源
Zombie.prototype.dropResources = function () {
    var dropChance = 0.3; // 30%概率掉落资源

    if (Math.random() < dropChance) {
        var resourceType = Math.random() < 0.6 ? 'food' : 'health'; // 60%概率口粮，40%概率血包

        // 创建资源对象（这里只是标记，实际资源管理需要单独的系统）
        this.droppedResource = {
            type: resourceType, x: this.x, y: this.y, value: resourceType === 'food' ? 1 : 20 // 口粮+1，血包+20
        };

        console.log('僵尸掉落资源:', resourceType, '位置:', this.x, this.y);
    }
};

// 销毁僵尸
Zombie.prototype.destroy = function () {
    console.log('僵尸销毁:', this.zombieType, this.id);

    // 从四叉树中移除
    if (window.collisionSystem && window.collisionSystem.destroyZombieObject) {
        window.collisionSystem.destroyZombieObject(this);
    }

    // 标记为已销毁
    this._destroyed = true;
};

// 寻找目标 - 使用工具类
Zombie.prototype.findTarget = function (characters) {
    // 首先检查当前目标是否仍然有效
    if (!this.isTargetValid()) {
        // 目标无效，寻找新的目标
        this.findNearestEnemy();
    }

    // 如果没有目标，尝试寻找新目标
    if (!this.targetCharacter) {
        this.findNearestEnemy();
    }

    // 根据目标距离决定状态
    if (this.targetCharacter) {
        var mathUtils = UtilsManager.getMathUtils();
        var distance = mathUtils.distance(this.x, this.y, this.targetCharacter.x, this.targetCharacter.y);

        if (distance <= this.attackRange) {
            // 在攻击范围内，切换到攻击状态
            if (this.state !== ZOMBIE_STATE.ATTACKING) {
                this.state = ZOMBIE_STATE.ATTACKING;
                console.log('僵尸', this.id, '切换到攻击状态，目标距离:', distance);
            }
        } else if (distance <= this.detectionRange) {
            // 在检测范围内，切换到追逐状态
            if (this.state !== ZOMBIE_STATE.CHASING) {
                this.state = ZOMBIE_STATE.CHASING;
                console.log('僵尸', this.id, '切换到追逐状态，目标距离:', distance);
            }
        } else {
            // 超出检测范围，切换到待机状态
            if (this.state !== ZOMBIE_STATE.IDLE) {
                this.state = ZOMBIE_STATE.IDLE;
                console.log('僵尸', this.id, '切换到待机状态，目标超出检测范围');
            }
        }
    } else {
        // 没有目标，切换到待机状态
        if (this.state !== ZOMBIE_STATE.IDLE) {
            this.state = ZOMBIE_STATE.IDLE;
            console.log('僵尸', this.id, '没有目标，切换到待机状态');
        }
    }
};

// 追击目标 - 使用工具类
Zombie.prototype.chaseTarget = function (deltaTime) {
    // 检查目标是否仍然有效
    if (!this.isTargetValid()) {
        // 目标无效，重新寻找目标
        this.findNearestEnemy();

        if (!this.targetCharacter) {
            this.state = ZOMBIE_STATE.IDLE;
            return;
        }
    }

    // 更新目标位置
    this.targetX = this.targetCharacter.x;
    this.targetY = this.targetCharacter.y;

    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.targetCharacter.x, this.targetCharacter.y);

    if (distance <= this.attackRange) {
        // 进入攻击范围，切换到攻击状态
        this.state = ZOMBIE_STATE.ATTACKING;
        console.log('僵尸', this.id, '进入攻击范围，切换到攻击状态');
        return;
    }

    if (distance > this.detectionRange) {
        // 超出检测范围，切换到待机状态
        this.state = ZOMBIE_STATE.IDLE;
        console.log('僵尸', this.id, '目标超出检测范围，切换到待机状态');
        return;
    }

    // 继续追逐目标
    this.moveTowards(this.targetX, this.targetY, deltaTime);
};

// 攻击目标
Zombie.prototype.attackTarget = function (deltaTime) {
    // 检查目标是否仍然有效
    if (!this.isTargetValid()) {
        // 目标无效，重新寻找目标
        this.findNearestEnemy();

        if (!this.targetCharacter) {
            this.state = ZOMBIE_STATE.IDLE;
            return;
        }
    }

    // 检查目标是否还在攻击范围内
    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.targetCharacter.x, this.targetCharacter.y);

    if (distance > this.attackRange) {
        // 目标超出攻击范围，切换到追击状态
        this.state = ZOMBIE_STATE.CHASING;
        console.log('僵尸', this.id, '目标超出攻击范围，切换到追击状态');
        return;
    }

    // 执行攻击
    var currentTime = Date.now();
    if (currentTime - this.lastAttackTime >= this.attackCooldown) {
        // 对目标造成伤害
        this.targetCharacter.takeDamage(this.attack);
        this.lastAttackTime = currentTime;

        console.log('僵尸', this.id, '攻击目标:', this.targetCharacter.role === 1 ? '主人物' : '伙伴', '造成伤害:', this.attack);

        // 播放攻击动画
        this.playAttackAnimation();
    }
};

// 播放攻击动画
Zombie.prototype.playAttackAnimation = function () {
    // 设置攻击动画帧
    this.animationFrame = 0;
    this.animationSpeed = 0.4; // 攻击动画速度

    console.log('僵尸播放攻击动画:', this.zombieType, this.id);
};

// 向目标移动 - 使用工具类
Zombie.prototype.moveTowards = function (targetX, targetY, deltaTime) {
    var mathUtils = UtilsManager.getMathUtils();
    var movementUtils = UtilsManager.getMovementUtils();
    var collisionConfig = ConfigManager.get('COLLISION');

    // 验证输入参数
    if (!mathUtils.isValidNumber(targetX) || !mathUtils.isValidNumber(targetY) || !mathUtils.isValidNumber(deltaTime) || !mathUtils.isValidNumber(this.x) || !mathUtils.isValidNumber(this.y)) {
        console.error('僵尸移动参数无效:', {
            targetX: targetX,
            targetY: targetY,
            deltaTime: deltaTime,
            currentX: this.x,
            currentY: this.y,
            zombieType: this.zombieType,
            zombieId: this.id
        });
        return;
    }

    // 计算到目标的距离
    var distanceToTarget = mathUtils.distance(this.x, this.y, targetX, targetY);

    // 如果距离目标很近（攻击范围内），停止移动
    if (distanceToTarget <= this.attackRange) {
        this.state = ZOMBIE_STATE.ATTACKING;
        return;
    }

    // 计算移动方向（始终朝向目标）
    this.direction = mathUtils.angle(this.x, this.y, targetX, targetY);

    // 使用当前移动速度（考虑白天/夜晚）
    var currentSpeed = this.currentMoveSpeed || this.moveSpeed;

    // 计算移动向量
    var moveVector = movementUtils.calculateMoveVector(this.x, this.y, targetX, targetY, currentSpeed, deltaTime);

    // 验证移动向量
    if (!moveVector || !mathUtils.isValidNumber(moveVector.x) || !mathUtils.isValidNumber(moveVector.y)) {
        console.error('僵尸移动向量无效:', {
            zombieType: this.zombieType,
            zombieId: this.id,
            fromX: this.x,
            fromY: this.y,
            toX: targetX,
            toY: targetY,
            moveSpeed: currentSpeed,
            deltaTime: deltaTime,
            moveVector: moveVector
        });
        return;
    }

    if (moveVector.distance > 0) {
        console.log('僵尸', this.zombieType, '移动计算:', '从', this.x, this.y, '到', this.x + moveVector.x, this.y + moveVector.y, '移动向量:', moveVector, '距离目标:', distanceToTarget, '当前速度:', currentSpeed);

        // 获取所有僵尸和人物列表（排除自己）
        var allZombies = [];
        var allCharacters = [];

        if (window.zombieManager && window.zombieManager.getAllZombies) {
            allZombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0 && z.id !== this.id);
        }

        if (window.characterManager && window.characterManager.getAllCharacters) {
            allCharacters = window.characterManager.getAllCharacters();
        }

        // 尝试移动到目标位置，如果失败则寻找替代位置
        var finalPosition = this.tryMoveToPosition(this.x, this.y, this.x + moveVector.x, this.y + moveVector.y, targetX, targetY, allZombies, allCharacters);

        if (finalPosition) {
            var oldX = this.x, oldY = this.y;
            this.x = finalPosition.x;
            this.y = finalPosition.y;

            // 通过四叉树更新位置
            if (window.collisionSystem && window.collisionSystem.updateZombiePosition) {
                window.collisionSystem.updateZombiePosition(this, oldX, oldY, this.x, this.y);
            } else if (window.collisionSystem && window.collisionSystem.updateDynamicObjectPosition) {
                // 兼容旧版本
                window.collisionSystem.updateDynamicObjectPosition(this, oldX, oldY, this.x, this.y);
            }

            console.log('僵尸移动成功:', this.zombieType, '位置:', this.x.toFixed(2), this.y.toFixed(2));
            this.state = ZOMBIE_STATE.WALKING;
        } else {
            // 无法移动，尝试绕行
            console.log('僵尸无法直接移动，尝试绕行');
            this.tryCircumventObstacle(targetX, targetY, allZombies, allCharacters);
        }
    }
};

// 尝试移动到指定位置
Zombie.prototype.tryMoveToPosition = function (fromX, fromY, toX, toY, targetX, targetY, allZombies, allCharacters) {
    if (!window.collisionSystem) {
        return {x: toX, y: toY};
    }

    // 首先检查建筑物碰撞
    var buildingSafePos = window.collisionSystem.getCircleSafeMovePosition(fromX, fromY, toX, toY, this.radius);

    if (!buildingSafePos) {
        return null; // 建筑物碰撞无法解决
    }

    // 检查是否与其他对象重叠
    var zombieOverlap = false;
    var characterOverlap = false;

    if (window.collisionSystem.isZombieOverlappingWithZombies) {
        zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(buildingSafePos.x, buildingSafePos.y, this.radius, allZombies, 0.1);
    }

    if (window.collisionSystem.isCharacterOverlappingWithZombies) {
        characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(buildingSafePos.x, buildingSafePos.y, this.radius, allCharacters, 0.1);
    }

    // 如果没有重叠，可以移动
    if (!zombieOverlap && !characterOverlap) {
        return buildingSafePos;
    }

    // 如果有重叠，尝试寻找附近的安全位置
    var nearbySafePos = this.findNearbySafePosition(buildingSafePos.x, buildingSafePos.y, allZombies, allCharacters);

    if (nearbySafePos) {
        return nearbySafePos;
    }

    // 如果找不到安全位置，返回原位置（不移动）
    return {x: fromX, y: fromY};
};

// 尝试绕行障碍物
Zombie.prototype.tryCircumventObstacle = function (targetX, targetY, allZombies, allCharacters) {
    // 计算到目标的方向
    var deltaX = targetX - this.x;
    var deltaY = targetY - this.y;
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance === 0) return;

    // 尝试多个角度的绕行路径
    var angles = [45, -45, 90, -90, 135, -135]; // 6个绕行角度
    var searchRadius = Math.min(distance * 0.3, 100); // 绕行半径

    for (var i = 0; i < angles.length; i++) {
        var angle = (angles[i] * Math.PI) / 180; // 转换为弧度
        var offsetX = this.x + Math.cos(angle) * searchRadius;
        var offsetY = this.y + Math.sin(angle) * searchRadius;

        // 检查绕行位置是否安全
        if (this.isPositionSafe(offsetX, offsetY, allZombies, allCharacters)) {
            // 尝试从绕行位置到目标
            var pathToTarget = this.tryMoveToPosition(offsetX, offsetY, targetX, targetY, targetX, targetY, allZombies, allCharacters);

            if (pathToTarget && pathToTarget.x !== offsetX && pathToTarget.y !== offsetY) {
                // 绕行成功，移动到绕行位置
                var oldX = this.x, oldY = this.y;
                this.x = offsetX;
                this.y = offsetY;

                // 通过四叉树更新位置
                if (window.collisionSystem && window.collisionSystem.updateZombiePosition) {
                    window.collisionSystem.updateZombiePosition(this, oldX, oldY, this.x, this.y);
                } else if (window.collisionSystem && window.collisionSystem.updateDynamicObjectPosition) {
                    // 兼容旧版本
                    window.collisionSystem.updateDynamicObjectPosition(this, oldX, oldY, this.x, this.y);
                }

                console.log('僵尸绕行成功:', this.zombieType, '绕行位置:', offsetX.toFixed(2), offsetY.toFixed(2));
                this.state = ZOMBIE_STATE.WALKING;
                return;
            }
        }
    }

    console.log('僵尸无法绕行，保持静止');
};

// 在周围寻找安全位置
Zombie.prototype.findNearbySafePosition = function (centerX, centerY, allZombies, allCharacters) {
    // 在目标位置周围寻找安全位置
    var searchRadius = this.radius * 2;
    var searchSteps = 6; // 6个方向

    for (var i = 0; i < searchSteps; i++) {
        var angle = (i / searchSteps) * Math.PI * 2;
        var testX = centerX + Math.cos(angle) * searchRadius;
        var testY = centerY + Math.sin(angle) * searchRadius;

        if (this.isPositionSafe(testX, testY, allZombies, allCharacters)) {
            return {x: testX, y: testY};
        }
    }

    return null;
};

// 检查位置是否安全
Zombie.prototype.isPositionSafe = function (x, y, allZombies, allCharacters) {
    if (!window.collisionSystem) return true;

    // 检查建筑物碰撞
    if (window.collisionSystem.isCircleCollidingWithBuildings) {
        if (window.collisionSystem.isCircleCollidingWithBuildings(x, y, this.radius)) {
            return false;
        }
    }

    // 检查僵尸重叠
    if (window.collisionSystem.isZombieOverlappingWithZombies) {
        if (window.collisionSystem.isZombieOverlappingWithZombies(x, y, this.radius, allZombies, null)) {
            return false;
        }
    }

    // 检查人物重叠
    if (window.collisionSystem.isCharacterOverlappingWithZombies) {
        if (window.collisionSystem.isCharacterOverlappingWithZombies(x, y, this.radius, allCharacters, null)) {
            return false;
        }
    }

    return true;
};

// 待机行为 - 使用工具类
Zombie.prototype.idleBehavior = function (deltaTime) {
    var mathUtils = UtilsManager.getMathUtils();
    var collisionConfig = ConfigManager.get('COLLISION');
    var detectionConfig = ConfigManager.get('DETECTION');

    // 从配置文件读取主人物优先检测范围（最高优先级）
    var mainCharacterPriorityRange = detectionConfig.SPECIAL_DETECTION.MAIN_CHARACTER_PRIORITY_RANGE;

    // 检查是否在主人物优先检测范围内（优先检测）
    if (window.characterManager && window.characterManager.getAllCharacters) {
        var allCharacters = window.characterManager.getAllCharacters();
        var mainCharacter = allCharacters.find(c => c.role === 1 && c.hp > 0);

        if (mainCharacter) {
            // 验证主人物坐标
            if (!mathUtils.isValidNumber(mainCharacter.x) || !mathUtils.isValidNumber(mainCharacter.y)) {
                console.error('待机检测中主人物坐标无效:', mainCharacter.x, mainCharacter.y);
                return;
            }

            var distance = mathUtils.distance(this.x, this.y, mainCharacter.x, mainCharacter.y);
            if (distance <= mainCharacterPriorityRange) {
                // 发现主人物，开始追逐
                this.targetCharacter = mainCharacter;
                this.targetX = mainCharacter.x;
                this.targetY = mainCharacter.y;
                this.state = ZOMBIE_STATE.CHASING;
                console.log('僵尸待机中发现主人物，开始追逐，距离:', distance, 'px，优先检测范围:', mainCharacterPriorityRange, 'px，目标位置:', this.targetX, this.targetY);
                return;
            }
        }
    }

    // 随机游荡（模拟"徘徊"）
    var detectionFrequency = detectionConfig.BEHAVIOR.DETECTION_FREQUENCY;
    if (Math.random() < detectionFrequency) { // 从配置读取检测频率
        this.direction = Math.random() * Math.PI * 2;
        var targetDistance = 50 + Math.random() * 100; // 50-150px随机距离
        this.targetX = this.x + Math.cos(this.direction) * targetDistance;
        this.targetY = this.y + Math.sin(this.direction) * targetDistance;

        // 检查目标位置是否安全（不在建筑物内，不与僵尸重叠）
        if (window.collisionSystem) {
            var allZombies = [];
            var allCharacters = [];

            if (window.zombieManager && window.zombieManager.getAllZombies) {
                allZombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0 && z.id !== this.id);
            }

            if (window.characterManager && window.characterManager.getAllCharacters) {
                allCharacters = window.characterManager.getAllCharacters();
            }

            // 使用新的专门优化方法检查目标位置是否安全
            var buildingCollision = window.collisionSystem.isCircleCollidingWithBuildings && window.collisionSystem.isCircleCollidingWithBuildings(this.targetX, this.targetY, this.radius);

            var zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies && window.collisionSystem.isZombieOverlappingWithZombies(this.targetX, this.targetY, this.radius, allZombies, null);

            var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies && window.collisionSystem.isCharacterOverlappingWithZombies(this.targetX, this.targetY, this.radius, allCharacters, null);

            if (buildingCollision || zombieOverlap || characterOverlap) {
                console.log('僵尸目标位置不安全，重新计算路径');
                this.calculateNewTarget();
                return;
            }
        }

        this.state = ZOMBIE_STATE.WALKING;
        console.log('僵尸开始随机游荡，目标位置:', this.targetX, this.targetY);
    }
};

// 计算新的游荡目标
Zombie.prototype.calculateNewTarget = function () {
    var attempts = 0;
    var maxAttempts = 10;

    while (attempts < maxAttempts) {
        this.direction = Math.random() * Math.PI * 2;
        var targetDistance = 50 + Math.random() * 100;
        this.targetX = this.x + Math.cos(this.direction) * targetDistance;
        this.targetY = this.y + Math.sin(this.direction) * targetDistance;

        // 检查新位置是否安全
        if (window.collisionSystem && window.collisionSystem.isCircleCollidingWithBuildings) {
            if (!window.collisionSystem.isCircleCollidingWithBuildings(this.targetX, this.targetY, this.radius)) {
                console.log('僵尸找到安全的游荡目标:', this.targetX, this.targetY);
                return;
            }
        } else {
            // 如果无法检查碰撞，直接使用
            return;
        }

        attempts++;
    }

    // 如果找不到安全位置，保持当前位置
    this.targetX = this.x;
    this.targetY = this.y;
    console.log('僵尸无法找到安全的游荡目标，保持当前位置');
};

// 更新动画 - 使用工具类
Zombie.prototype.updateAnimation = function (deltaTime) {
    var animationUtils = UtilsManager.getAnimationUtils();
    var animationConfig = ConfigManager.get('ANIMATION');

    if (this.state === ZOMBIE_STATE.WALKING || this.state === ZOMBIE_STATE.CHASING) {
        this.animationFrame = animationUtils.updateFrame(this.animationFrame, this.animationSpeed * deltaTime, animationConfig.MAX_ANIMATION_FRAMES);
    }
};

// 受到伤害
Zombie.prototype.takeDamage = function (damage) {
    var validationUtils = UtilsManager.getValidationUtils();

    // 验证伤害值
    if (!validationUtils.validateRange(damage, 0, 1000, '伤害值')) {
        console.warn('无效的伤害值:', damage);
        return this.hp;
    }

    // 检查僵尸是否已经死亡
    if (this.hp <= 0) {
        console.warn('僵尸已经死亡，无法再受伤:', this.zombieType, this.id);
        return this.hp;
    }

    // 记录受伤前的状态
    var oldHp = this.hp;
    var oldState = this.state;

    // 应用伤害
    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;

    console.log('僵尸受伤:', this.zombieType, this.id, 'hp:', oldHp, '->', this.hp, '伤害:', damage);

    // 如果僵尸死亡，设置状态为死亡
    if (this.hp <= 0) {
        this.state = ZOMBIE_STATE.DEAD;
        console.log('僵尸死亡:', this.zombieType, this.id);
        return this.hp;
    }

    // 受伤时短暂停止移动
    if (this.state === ZOMBIE_STATE.WALKING || this.state === ZOMBIE_STATE.CHASING) {
        this.state = ZOMBIE_STATE.IDLE;
        console.log('僵尸受伤停止移动:', this.zombieType, this.id, '状态:', oldState, '->', this.state);

        // 同步恢复移动状态
        if (this && this.hp > 0 && this.state !== ZOMBIE_STATE.DEAD) {
            this.state = ZOMBIE_STATE.CHASING;
            console.log('僵尸恢复移动:', this.zombieType, this.id, '状态:', this.state);
        } else {
            console.log('僵尸无法恢复移动:', this.zombieType, this.id, 'hp:', this.hp, 'state:', this.state);
        }
    }

    return this.hp;
};


// 渲染僵尸
Zombie.prototype.render = function (ctx, cameraX, cameraY) {
    if (this.hp <= 0) {
        // 死亡状态：只渲染死亡动画和资源掉落
        this.renderDead(ctx, cameraX, cameraY);
        return;
    }

    // 计算屏幕坐标
    var screenX = ctx.canvas.width / 2 + (this.x - cameraX) * 0.6;
    var screenY = ctx.canvas.height / 2 + (this.y - cameraY) * 0.6;

    // 检查是否在屏幕范围内
    if (screenX < -100 || screenX > ctx.canvas.width + 100 || screenY < -100 || screenY > ctx.canvas.height + 100) {
        return;
    }

    // 绘制阴影 - 改为椭圆形阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + this.size / 2 + 3, this.size / 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 绘制僵尸主体（圆形设计）
    var bodyY = screenY - this.size / 2;

    // 身体 - 改为圆形
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenX, bodyY + this.size / 2, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 头部 - 改为圆形
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(screenX, bodyY + this.size / 6, this.size / 3, 0, Math.PI * 2);
    ctx.fill();

    // 绘制图标
    ctx.font = Math.floor(this.size / 2) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(this.icon, screenX, bodyY + this.size / 2);

    // 绘制血条
    this.drawHealthBar(ctx, screenX, bodyY - 10);

    // 绘制状态指示器
    this.drawStateIndicator(ctx, screenX, bodyY - 7.5);

    // 绘制白天/夜晚状态指示
    this.drawDayNightIndicator(ctx, screenX, bodyY - 15);
};

// 渲染死亡状态的僵尸
Zombie.prototype.renderDead = function (ctx, cameraX, cameraY) {
    // 计算屏幕坐标
    var screenX = ctx.canvas.width / 2 + (this.x - cameraX) * 0.6;
    var screenY = ctx.canvas.height / 2 + (this.y - cameraY) * 0.6;

    // 检查是否在屏幕范围内
    if (screenX < -100 || screenX > ctx.canvas.width + 100 || screenY < -100 || screenY > ctx.canvas.height + 100) {
        return;
    }

    // 死亡动画：逐渐变透明
    var alpha = Math.max(0, 1 - (this.deathAnimationTime / this.deathAnimationDuration));
    ctx.globalAlpha = alpha;

    // 绘制死亡状态的僵尸（灰色）
    var bodyY = screenY - this.size / 2;

    // 身体 - 死亡状态为灰色
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.arc(screenX, bodyY + this.size / 2, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 头部 - 死亡状态为深灰色
    ctx.fillStyle = '#404040';
    ctx.beginPath();
    ctx.arc(screenX, bodyY + this.size / 6, this.size / 3, 0, Math.PI * 2);
    ctx.fill();

    // 绘制死亡图标
    ctx.font = Math.floor(this.size / 2) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText('💀', screenX, bodyY + this.size / 2);

    // 恢复透明度
    ctx.globalAlpha = 1.0;

    // 渲染掉落的资源
    if (this.droppedResource) {
        this.renderDroppedResource(ctx, screenX, screenY);
    }
};

// 渲染掉落的资源
Zombie.prototype.renderDroppedResource = function (ctx, screenX, screenY) {
    var resourceY = screenY + this.size + 10;

    // 资源图标
    var icon = this.droppedResource.type === 'food' ? '🍖' : '❤️';
    var color = this.droppedResource.type === 'food' ? '#FFD700' : '#FF0000';

    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(icon, screenX, resourceY);

    // 资源价值
    ctx.font = '12px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeText('+' + this.droppedResource.value, screenX, resourceY + 15);
    ctx.fillText('+' + this.droppedResource.value, screenX, resourceY + 15);
};

// 绘制状态指示器
Zombie.prototype.drawStateIndicator = function (ctx, x, y) {
    var indicatorSize = 4;

    switch (this.state) {
        case ZOMBIE_STATE.CHASING:
            ctx.fillStyle = '#FF0000'; // 红色：追击
            break;
        case ZOMBIE_STATE.ATTACKING:
            ctx.fillStyle = '#FF6600'; // 橙色：攻击
            break;
        case ZOMBIE_STATE.WALKING:
            ctx.fillStyle = '#FFFF00'; // 黄色：移动
            break;
        case ZOMBIE_STATE.IDLE:
            ctx.fillStyle = '#00FF00'; // 绿色：待机
            break;
        default:
            ctx.fillStyle = '#FFFFFF'; // 白色：未知状态
    }

    ctx.beginPath();
    ctx.arc(x, y, indicatorSize, 0, Math.PI * 2);
    ctx.fill();

    // 状态指示器边框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
};

// 绘制白天/夜晚状态指示
Zombie.prototype.drawDayNightIndicator = function (ctx, x, y) {
    if (this.isDay === undefined) return;
    // 白天/夜晚状态指示器
    var indicatorSize = 3;

    if (this.isDay) {
        // 白天：太阳图标
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x - 8, y, indicatorSize, 0, Math.PI * 2);
        ctx.fill();

        // 太阳光芒
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        for (var i = 0; i < 8; i++) {
            var angle = (i / 8) * Math.PI * 2;
            var startX = x - 8 + Math.cos(angle) * (indicatorSize + 2);
            var startY = y + Math.sin(angle) * (indicatorSize + 2);
            var endX = x - 8 + Math.cos(angle) * (indicatorSize + 5);
            var endY = y + Math.sin(angle) * (indicatorSize + 5);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    } else {
        // 夜晚：月亮图标
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.arc(x - 8, y, indicatorSize, 0, Math.PI * 2);
        ctx.fill();

        // 月亮阴影
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x - 8 + 1, y - 1, indicatorSize - 1, 0, Math.PI * 2);
        ctx.fill();
    }
};

// 绘制血条
Zombie.prototype.drawHealthBar = function (ctx, x, y) {
    var barWidth = this.size;
    var barHeight = 4;
    var healthPercent = this.hp / this.maxHp;

    // 血条背景
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    // 血条
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(x - barWidth / 2, y, barWidth * healthPercent, barHeight);

    // 血条边框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
};

// 僵尸管理器 - 重构版本：只负责游戏逻辑，四叉树负责对象管理
var ZombieManager = {
    maxZombies: ConfigManager.get('PERFORMANCE.MAX_ZOMBIES'), difficulty: 1,

    // 创建僵尸 - 通过四叉树管理
    createZombie: function (type, x, y) {
        var validationUtils = UtilsManager.getValidationUtils();
        var performanceUtils = UtilsManager.getPerformanceUtils();

        // 检查四叉树中的僵尸数量
        if (!window.collisionSystem) {
            console.error('碰撞系统未初始化，无法创建僵尸');
            return null;
        }

        var currentZombieCount = window.collisionSystem.getDynamicObjectCountByType('zombie');
        if (currentZombieCount >= this.maxZombies) {
            console.warn('僵尸数量已达上限:', this.maxZombies);
            return null;
        }

        // 如果没有传入坐标，生成随机坐标
        if (x === undefined || y === undefined) {
            console.log('僵尸创建未传入坐标，生成随机坐标');
            var randomPos = this.generateRandomSpawnPosition();
            if (randomPos) {
                x = randomPos.x;
                y = randomPos.y;
                console.log('生成随机坐标:', x, y);
            } else {
                console.error('无法生成随机坐标');
                return null;
            }
        }

        // 使用性能工具测量创建时间
        return performanceUtils.measureFunction('createZombie', function () {
            // 使用统一的生成位置验证机制
            var validatedPosition = this.validateSpawnPosition(x, y, type);
            if (!validatedPosition) {
                console.warn('无法找到有效的僵尸生成位置');
                return null;
            }

            x = validatedPosition.x;
            y = validatedPosition.y;

            var zombie = new Zombie(type, x, y);

            // 验证僵尸创建是否成功
            if (!zombie || zombie.hp === undefined || zombie.hp <= 0) {
                console.error('僵尸创建失败或生命值异常:', zombie);
                return null;
            }

            // 确保僵尸有正确的type属性
            if (!zombie.type || zombie.type !== 'zombie') {
                console.warn('僵尸type属性不正确，重新设置为zombie:', zombie.type);
                zombie.type = 'zombie'; // 确保type始终为'zombie'
            }

            // 确保zombieType属性正确
            if (!zombie.zombieType) {
                console.warn('僵尸zombieType属性缺失，设置为传入的类型:', type);
                zombie.zombieType = type;
            }

            // 添加详细的僵尸属性验证
            console.log('=== 僵尸属性验证 ===');
            console.log('type属性:', zombie.type, '(应该是zombie)');
            console.log('zombieType属性:', zombie.zombieType, '(应该是', type, ')');
            console.log('id属性:', zombie.id);
            console.log('位置属性:', zombie.x, zombie.y);
            console.log('生命值属性:', zombie.hp, zombie.maxHp);
            console.log('状态属性:', zombie.state);
            console.log('尺寸属性:', zombie.size, zombie.width, zombie.height);
            console.log('图标属性:', zombie.icon);
            console.log('==================');

            // 验证关键属性
            if (zombie.type !== 'zombie') {
                console.error('❌ 僵尸type属性错误:', zombie.type);
                return null;
            }

            if (!zombie.zombieType) {
                console.error('❌ 僵尸zombieType属性缺失');
                return null;
            }

            if (!zombie.id) {
                console.error('❌ 僵尸id属性缺失');
                return null;
            }

            if (zombie.x === undefined || zombie.y === undefined) {
                console.error('❌ 僵尸位置属性缺失:', zombie.x, zombie.y);
                return null;
            }

            console.log('僵尸创建成功:', zombie.zombieType, zombie.id, 'hp:', zombie.hp, 'maxHp:', zombie.maxHp, '位置:', x, y);
            console.log('僵尸完整属性:', {
                id: zombie.id,
                type: zombie.type,
                zombieType: zombie.zombieType,
                x: zombie.x,
                y: zombie.y,
                hp: zombie.hp,
                maxHp: zombie.maxHp,
                state: zombie.state,
                size: zombie.size,
                color: zombie.color,
                icon: zombie.icon
            });

            // 通过四叉树创建僵尸（四叉树负责对象管理）
            console.log('ZombieManager.createZombie: 准备通过四叉树创建僵尸');
            console.log('僵尸对象详情:', {
                id: zombie.id,
                type: zombie.type,
                zombieType: zombie.zombieType,
                x: zombie.x,
                y: zombie.y,
                hp: zombie.hp,
                state: zombie.state,
                icon: zombie.icon,
                hasQuadTreeId: !!zombie._quadTreeId
            });


            if (window.collisionSystem.createZombieObject) {
                console.log('ZombieManager.createZombie: 调用四叉树createZombieObject方法');
                var createdZombie = window.collisionSystem.createZombieObject(zombie);
                if (createdZombie) {
                    console.log('ZombieManager.createZombie: 四叉树创建僵尸成功:', zombie.zombieType, zombie.id);
                    console.log('创建后的僵尸对象:', {
                        id: createdZombie.id,
                        type: createdZombie.type,
                        zombieType: createdZombie.zombieType,
                        x: createdZombie.x,
                        y: createdZombie.y,
                        hp: createdZombie.hp,
                        hasQuadTreeId: !!createdZombie._quadTreeId,
                        quadTreeId: createdZombie._quadTreeId,
                        quadTreeType: createdZombie._quadTreeType
                    });

                    // 立即为僵尸设置目标，确保渲染正常
                    this.initializeZombieTarget(createdZombie);

                    return createdZombie;
                } else {
                    console.error('ZombieManager.createZombie: 四叉树创建僵尸失败:', zombie.zombieType, zombie.id);
                    console.error('失败原因: createZombieObject返回null或false');
                    return null;
                }
            } else {
                console.error('ZombieManager.createZombie: 四叉树不支持僵尸对象创建，可用方法:', Object.keys(window.collisionSystem));
                return null;
            }
        }.bind(this));
    },

    // 生成随机生成位置
    generateRandomSpawnPosition: function () {
        if (!window.collisionSystem) {
            console.warn('碰撞系统未初始化，使用默认位置');
            return {x: 1000, y: 1000};
        }

        // 获取地图尺寸
        var mapWidth = 10000; // 默认地图宽度
        var mapHeight = 10000; // 默认地图高度

        if (window.mapSystem) {
            mapWidth = window.mapSystem.mapWidth || mapWidth;
            mapHeight = window.mapSystem.mapHeight || mapHeight;
        }

        // 生成随机坐标（避开中心区域）
        var centerX = mapWidth / 2;
        var centerY = mapHeight / 2;
        var minDistance = 500; // 最小距离中心500px
        var maxDistance = Math.min(mapWidth, mapHeight) / 2 - 1000; // 最大距离边界1000px

        for (var attempt = 0; attempt < 50; attempt++) {
            var angle = Math.random() * Math.PI * 2;
            var distance = minDistance + Math.random() * (maxDistance - minDistance);

            var testX = centerX + Math.cos(angle) * distance;
            var testY = centerY + Math.sin(angle) * distance;

            // 检查位置是否在建筑物外
            if (window.collisionSystem.isCircleCollidingWithBuildings) {
                if (!window.collisionSystem.isCircleCollidingWithBuildings(testX, testY, 16)) {
                    console.log('找到随机生成位置:', testX, testY);
                    return {x: testX, y: testY};
                }
            } else {
                // 如果无法检查建筑物碰撞，直接返回
                return {x: testX, y: testY};
            }
        }

        console.warn('无法找到合适的随机位置，使用边缘位置');
        return {x: 1000, y: 1000};
    },

    // 初始化僵尸目标
    initializeZombieTarget: function (zombie) {
        if (!zombie) return;

        // 获取主人物位置作为目标
        var mainChar = null;
        if (window.characterManager && window.characterManager.getMainCharacter) {
            mainChar = window.characterManager.getMainCharacter();
        }

        if (mainChar && mainChar.hp > 0) {
            // 设置主人物为目标
            zombie.targetCharacter = mainChar;
            zombie.targetX = mainChar.x;
            zombie.targetY = mainChar.y;

            // 计算到目标的距离
            var distance = Math.sqrt(Math.pow(zombie.x - mainChar.x, 2) + Math.pow(zombie.y - mainChar.y, 2));

            if (distance <= zombie.attackRange) {
                zombie.state = ZOMBIE_STATE.ATTACKING;
            } else if (distance <= 700) { // 700px内开始追逐
                zombie.state = ZOMBIE_STATE.CHASING;
            } else {
                zombie.state = ZOMBIE_STATE.IDLE;
            }

            console.log('僵尸目标初始化完成:', {
                zombieId: zombie.id,
                zombieType: zombie.type,
                targetDistance: distance,
                state: zombie.state,
                targetX: zombie.targetX,
                targetY: zombie.targetY
            });
        } else {
            // 如果没有主人物，设置随机游荡目标
            var randomAngle = Math.random() * Math.PI * 2;
            var randomDistance = 200 + Math.random() * 300;

            zombie.targetX = zombie.x + Math.cos(randomAngle) * randomDistance;
            zombie.targetY = zombie.y + Math.sin(randomAngle) * randomDistance;
            zombie.state = ZOMBIE_STATE.IDLE;

            console.log('僵尸设置随机游荡目标:', {
                zombieId: zombie.id,
                zombieType: zombie.type,
                targetX: zombie.targetX,
                targetY: zombie.targetY,
                state: zombie.state
            });
        }
    },

    // 统一的生成位置验证机制
    validateSpawnPosition: function (x, y, zombieType) {
        var validationUtils = UtilsManager.getValidationUtils();
        var collisionConfig = ConfigManager.get('COLLISION');
        var detectionConfig = ConfigManager.get('DETECTION');

        if (!window.collisionSystem) {
            return {x: x, y: y};
        }

        var zombieWidth = 32; // 僵尸默认宽度
        var zombieHeight = 32; // 僵尸默认高度

        // 根据僵尸类型调整尺寸
        if (zombieType === 'fat' || zombieType === 'boss') {
            zombieWidth = 48;
            zombieHeight = 48;
        }

        // 验证步骤1：检查是否在建筑物内
        if (window.collisionSystem.isCircleCollidingWithBuildings && window.collisionSystem.isCircleCollidingWithBuildings(x, y, zombieWidth / 2)) {
            console.log('僵尸生成位置在建筑物内，寻找安全位置');
            var safePosition = window.collisionSystem.generateGameSafePosition(x, y, collisionConfig.SAFE_SPAWN_DISTANCE, detectionConfig.MAX_SPAWN_SEARCH_RADIUS, zombieWidth, zombieHeight);
            if (safePosition) {
                x = safePosition.x;
                y = safePosition.y;
            } else {
                console.warn('无法找到建筑物外的安全位置');
                return null;
            }
        }

        // 验证步骤2：检查是否与现有僵尸重叠
        if (window.collisionSystem.isZombieOverlappingWithZombies) {
            var zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(x, y, zombieWidth / 2, null, 0.2);
            if (zombieOverlap) {
                console.log('僵尸生成位置与现有僵尸重叠，寻找新位置');
                var safePosition = this.findNonOverlappingPosition(x, y, zombieWidth, zombieHeight);
                if (safePosition) {
                    x = safePosition.x;
                    y = safePosition.y;
                } else {
                    console.warn('无法找到不重叠的安全位置');
                    return null;
                }
            }
        }

        // 验证步骤3：检查是否与角色重叠（新增）
        if (window.characterManager && window.characterManager.getAllCharacters) {
            var characters = window.characterManager.getAllCharacters();
            var minSafeDistance = 100; // 与角色的最小安全距离

            for (var i = 0; i < characters.length; i++) {
                var char = characters[i];
                if (char && char.hp > 0) {
                    var distance = Math.sqrt(Math.pow(x - char.x, 2) + Math.pow(y - char.y, 2));

                    if (distance < minSafeDistance) {
                        console.log('僵尸生成位置与角色距离过近，寻找新位置');
                        // 计算远离角色的新位置
                        var angle = Math.atan2(y - char.y, x - char.x);
                        var newX = char.x + Math.cos(angle) * minSafeDistance;
                        var newY = char.y + Math.sin(angle) * minSafeDistance;

                        // 使用碰撞系统验证新位置
                        if (window.collisionSystem.generateGameSafePosition) {
                            var safePosition = window.collisionSystem.generateGameSafePosition(newX, newY, collisionConfig.SAFE_SPAWN_DISTANCE, detectionConfig.MAX_SPAWN_SEARCH_RADIUS, zombieWidth, zombieHeight);
                            if (safePosition) {
                                x = safePosition.x;
                                y = safePosition.y;
                                console.log('找到与角色安全距离的位置:', x, y);
                                break;
                            }
                        } else {
                            x = newX;
                            y = newY;
                            console.log('调整到与角色安全距离的位置:', x, y);
                            break;
                        }
                    }
                }
            }
        }

        // 验证步骤3：检查是否与人物重叠
        if (window.collisionSystem.isCharacterOverlappingWithZombies) {
            var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(x, y, zombieWidth / 2, null, 0.2);
            if (characterOverlap) {
                console.log('僵尸生成位置与人物重叠，寻找新位置');
                var safePosition = this.findNonOverlappingPosition(x, y, zombieWidth, zombieHeight);
                if (safePosition) {
                    x = safePosition.x;
                    y = safePosition.y;
                } else {
                    console.warn('无法找到不重叠的安全位置');
                    return null;
                }
            }
        }

        return {x: x, y: y};
    },

    // 寻找不重叠的位置
    findNonOverlappingPosition: function (baseX, baseY, width, height) {
        if (!window.collisionSystem) {
            return {x: baseX, y: baseY};
        }

        var searchRadius = 200;
        var maxAttempts = 20;
        var attempt = 0;

        while (attempt < maxAttempts) {
            var angle = (attempt * 137.5) * Math.PI / 180; // 黄金角螺旋
            var distance = searchRadius * (attempt / maxAttempts);
            var testX = baseX + Math.cos(angle) * distance;
            var testY = baseY + Math.sin(angle) * distance;

            // 检查建筑物碰撞
            var buildingCollision = false;
            if (window.collisionSystem.isCircleCollidingWithBuildings) {
                buildingCollision = window.collisionSystem.isCircleCollidingWithBuildings(testX, testY, width / 2);
            }

            // 检查僵尸重叠
            var zombieOverlap = false;
            if (window.collisionSystem.isZombieOverlappingWithZombies) {
                zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(testX, testY, width / 2, null, null);
            }

            // 检查人物重叠
            var characterOverlap = false;
            if (window.collisionSystem.isCharacterOverlappingWithZombies) {
                characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(testX, testY, width / 2, null, null);
            }

            // 如果位置安全，返回
            if (!buildingCollision && !zombieOverlap && !characterOverlap) {
                return {x: testX, y: testY};
            }

            attempt++;
        }

        console.warn('无法找到不重叠的位置，使用原始位置');
        return {x: baseX, y: baseY};
    },

    // 更新所有僵尸 - 通过四叉树获取僵尸列表
    updateAllZombies: function (characters, deltaTime) {
        var performanceUtils = UtilsManager.getPerformanceUtils();

        // 验证输入参数
        if (!Array.isArray(characters)) {
            console.error('角色列表无效:', characters);
            return;
        }

        if (!performanceUtils.isValidNumber(deltaTime) || deltaTime <= 0) {
            console.error('时间增量无效:', deltaTime);
            return;
        }

        // 从四叉树获取所有僵尸
        var zombies = [];
        if (window.collisionSystem && window.collisionSystem.getAllZombies) {
            zombies = window.collisionSystem.getAllZombies();
        } else {
            console.warn('无法从四叉树获取僵尸列表');
            return;
        }

        console.log('更新僵尸，数量:', zombies.length, '角色数量:', characters.length);

        // 使用性能工具测量更新时间
        performanceUtils.startTimer('updateAllZombies');

        // 更新僵尸
        zombies.forEach((zombie, index) => {
            // 检查僵尸对象有效性
            if (!zombie || typeof zombie !== 'object') {
                console.error('发现无效僵尸对象:', zombie, '索引:', index);
                return;
            }

            // 检查僵尸基本属性
            if (zombie.hp === undefined || zombie.state === undefined) {
                console.error('僵尸缺少基本属性:', zombie.type, zombie.id, 'hp:', zombie.hp, 'state:', zombie.state);
                return;
            }

            // 调试：记录僵尸的生命值状态
            if (zombie.hp <= 0) {
                console.log('僵尸生命值异常:', zombie.type, zombie.id, 'hp:', zombie.hp, 'maxHp:', zombie.maxHp, 'state:', zombie.state);
            }

            // 只更新活着的僵尸
            if (zombie.hp > 0 && zombie.state !== ZOMBIE_STATE.DEAD) {
                try {
                    zombie.update(deltaTime, characters);
                } catch (error) {
                    console.error('僵尸更新出错:', zombie.type, zombie.id, '错误:', error);
                    // 出错时设置为待机状态
                    zombie.state = ZOMBIE_STATE.IDLE;
                }
            }
        });

        // 清理死亡僵尸 - 通过四叉树管理
        var deadZombies = zombies.filter(zombie => zombie.hp <= 0 || zombie.state === ZOMBIE_STATE.DEAD);
        if (deadZombies.length > 0) {
            console.log('发现死亡僵尸，数量:', deadZombies.length);
            deadZombies.forEach(zombie => {
                console.log('死亡僵尸详情:', zombie.type, zombie.id, 'hp:', zombie.hp, 'maxHp:', zombie.maxHp, 'state:', zombie.state);

                // 通过四叉树销毁僵尸对象
                if (window.collisionSystem && window.collisionSystem.destroyZombieObject) {
                    try {
                        window.collisionSystem.destroyZombieObject(zombie);
                        console.log('死亡僵尸已通过四叉树销毁:', zombie.type, zombie.id);
                    } catch (error) {
                        console.error('四叉树销毁僵尸失败:', zombie.type, zombie.id, '错误:', error);
                    }
                } else {
                    console.error('四叉树不支持僵尸对象销毁');
                }
            });
        }

        var updateTime = performanceUtils.endTimer('updateAllZombies');
        if (updateTime > 16) { // 超过16ms（60fps）
            console.warn('僵尸更新耗时过长:', updateTime.toFixed(2), 'ms');
        }
    },

    // 获取所有僵尸 - 从四叉树获取
    getAllZombies: function () {
        console.log('ZombieManager.getAllZombies: 开始获取僵尸列表');

        if (!window.collisionSystem) {
            console.warn('ZombieManager.getAllZombies: 碰撞系统未初始化');
            return [];
        }

        if (!window.collisionSystem.getAllZombies) {
            console.warn('ZombieManager.getAllZombies: 四叉树不支持getAllZombies方法');
            return [];
        }

        var zombies = window.collisionSystem.getAllZombies();
        console.log('ZombieManager.getAllZombies: 从四叉树获取到僵尸数量:', zombies.length);

        if (zombies.length > 0) {
            zombies.forEach((zombie, index) => {
                console.log(`ZombieManager.getAllZombies: 僵尸 ${index}:`, {
                    id: zombie.id,
                    type: zombie.type,
                    x: zombie.x,
                    y: zombie.y,
                    hp: zombie.hp,
                    state: zombie.state,
                    hasQuadTreeId: !!zombie._quadTreeId
                });
            });
        } else {
            console.warn('ZombieManager.getAllZombies: 四叉树中没有找到僵尸，检查动态四叉树状态');
            if (window.collisionSystem.dynamicQuadTree) {
                var allObjects = window.collisionSystem.dynamicQuadTree.getAllObjects();
                console.log('ZombieManager.getAllZombies: 动态四叉树中的所有对象数量:', allObjects.length);

                if (allObjects.length > 0) {
                    console.log('🔍 动态四叉树中的所有对象详情:');
                    allObjects.forEach((obj, index) => {
                        console.log(`对象 ${index}:`, {
                            id: obj.id,
                            type: obj.type,
                            zombieType: obj.zombieType,
                            role: obj.role,
                            x: obj.x,
                            y: obj.y,
                            hp: obj.hp,
                            state: obj.state,
                            hasQuadTreeId: !!obj._quadTreeId,
                            quadTreeId: obj._quadTreeId,
                            quadTreeType: obj._quadTreeType
                        });

                        // 分析为什么这个对象不是僵尸
                        if (obj.type !== 'zombie') {
                            console.log(`对象 ${index} 不是僵尸的原因分析:`);
                            console.log('- type属性:', obj.type, '(期望: zombie)');
                            console.log('- zombieType属性:', obj.zombieType);
                            console.log('- role属性:', obj.role);
                            console.log('- 其他属性:', {
                                hp: obj.hp, state: obj.state, icon: obj.icon
                            });
                        }
                    });

                    // 统计对象类型
                    var typeStats = {};
                    allObjects.forEach(obj => {
                        var type = obj.type || 'unknown';
                        typeStats[type] = (typeStats[type] || 0) + 1;
                    });
                    console.log('对象类型统计:', typeStats);
                } else {
                    console.log('ZombieManager.getAllZombies: 动态四叉树中没有对象');
                }
            } else {
                console.error('ZombieManager.getAllZombies: 动态四叉树未初始化');
            }
        }

        return zombies;
    }
};

// 寻找最近的敌人（角色或伙伴）- 性能优化版本
Zombie.prototype.findNearestEnemy = function () {
    if (!window.characterManager) return;

    var allCharacters = window.characterManager.getAllCharacters().filter(c => c.hp > 0);
    if (allCharacters.length === 0) return;

    var mathUtils = UtilsManager.getMathUtils();
    var nearestEnemy = null;
    var nearestDistance = Infinity;

    // 性能优化：使用空间分区减少计算量
    var detectionRange = this.detectionRange || 700;
    var myX = this.x;
    var myY = this.y;

    // 快速预筛选：只检查在检测范围内的角色
    var candidates = [];
    for (var i = 0; i < allCharacters.length; i++) {
        var character = allCharacters[i];

        // 使用曼哈顿距离进行快速预筛选（比欧几里得距离快）
        var manhattanDistance = Math.abs(myX - character.x) + Math.abs(myY - character.y);
        if (manhattanDistance <= detectionRange * 1.5) { // 1.5倍作为预筛选范围
            candidates.push(character);
        }
    }

    // 如果预筛选后候选者很少，直接计算精确距离
    if (candidates.length <= 3) {
        for (var i = 0; i < candidates.length; i++) {
            var character = candidates[i];
            var distance = mathUtils.distance(myX, myY, character.x, character.y);

            // 优先选择主人物，其次是伙伴
            var priority = character.role === 1 ? 0 : 1;

            if (distance <= detectionRange && (distance < nearestDistance || (distance === nearestDistance && priority < (nearestEnemy ? (nearestEnemy.role === 1 ? 0 : 1) : 1)))) {
                nearestDistance = distance;
                nearestEnemy = character;
            }
        }
    } else {
        // 候选者较多时，使用分层检测策略
        var primaryCandidates = candidates.filter(c => c.role === 1); // 主人物优先
        var secondaryCandidates = candidates.filter(c => c.role !== 1); // 伙伴其次

        // 先检查主人物
        if (primaryCandidates.length > 0) {
            nearestEnemy = this.findNearestInGroup(primaryCandidates, myX, myY, detectionRange);
            if (nearestEnemy) {
                nearestDistance = mathUtils.distance(myX, myY, nearestEnemy.x, nearestEnemy.y);
            }
        }

        // 如果没有主人物，检查伙伴
        if (!nearestEnemy && secondaryCandidates.length > 0) {
            nearestEnemy = this.findNearestInGroup(secondaryCandidates, myX, myY, detectionRange);
        }
    }

    // 如果当前目标无效或不是最近的，更新目标
    if (!this.targetCharacter || this.targetCharacter.hp <= 0 || this.targetCharacter !== nearestEnemy) {

        this.targetCharacter = nearestEnemy;

        if (this.targetCharacter) {
            this.targetX = this.targetCharacter.x;
            this.targetY = this.targetCharacter.y;
            console.log('僵尸', this.id, '更新目标:', this.targetCharacter.role === 1 ? '主人物' : '伙伴', '距离:', nearestDistance);
        } else {
            console.log('僵尸', this.id, '没有找到有效的目标');
        }
    }
};

// 在指定组中寻找最近的敌人（性能优化）
Zombie.prototype.findNearestInGroup = function (characters, myX, myY, maxRange) {
    if (characters.length === 0) return null;

    var mathUtils = UtilsManager.getMathUtils();
    var nearest = null;
    var nearestDistance = Infinity;

    // 使用四叉树优化空间查询（如果可用）
    if (window.collisionSystem && window.collisionSystem.queryRange) {
        var nearbyObjects = window.collisionSystem.queryRange(myX, myY, maxRange);
        var nearbyCharacters = nearbyObjects.filter(obj => obj.type === 'character' && characters.some(c => c.id === obj.id));

        for (var i = 0; i < nearbyCharacters.length; i++) {
            var character = nearbyCharacters[i];
            var distance = mathUtils.distance(myX, myY, character.x, character.y);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = character;
            }
        }
    } else {
        // 回退到传统方法，但使用缓存优化
        for (var i = 0; i < characters.length; i++) {
            var character = characters[i];

            // 使用缓存的坐标（如果可用）
            var charX = character._cachedX !== undefined ? character._cachedX : character.x;
            var charY = character._cachedY !== undefined ? character._cachedY : character.y;

            var distance = mathUtils.distance(myX, myY, charX, charY);

            if (distance <= maxRange && distance < nearestDistance) {
                nearestDistance = distance;
                nearest = character;
            }

            // 缓存坐标（减少重复计算）
            character._cachedX = charX;
            character._cachedY = charY;
        }
    }

    return nearest;
};

// 检查当前目标是否仍然有效
Zombie.prototype.isTargetValid = function () {
    if (!this.targetCharacter) return false;

    // 检查目标是否还活着
    if (this.targetCharacter.hp <= 0) {
        console.log('僵尸', this.id, '目标已死亡，清除目标');
        this.targetCharacter = null;
        this.targetX = this.x;
        this.targetY = this.y;
        return false;
    }

    // 检查目标是否在检测范围内
    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distance(this.x, this.y, this.targetCharacter.x, this.targetCharacter.y);

    if (distance > this.detectionRange) {
        console.log('僵尸', this.id, '目标超出检测范围，距离:', distance, '检测范围:', this.detectionRange);
        this.targetCharacter = null;
        this.targetX = this.x;
        this.targetY = this.y;
        return false;
    }

    // 更新目标位置
    this.targetX = this.targetCharacter.x;
    this.targetY = this.targetCharacter.y;

    return true;
};

// 导出枚举和类
export {ZOMBIE_TYPE, ZOMBIE_STATE};
export {ZombieManager};
export default Zombie;

