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
        x = 100; y = 100; // 使用默认位置
    }
    
    if (!Object.values(ZOMBIE_TYPE).includes(type)) {
        console.error('无效的僵尸类型:', type);
        type = ZOMBIE_TYPE.SKINNY; // 使用默认类型
    }
    
    // 基础属性
    this.type = type;
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
    console.log('僵尸初始化完成:', this.type, this.id, 'hp:', this.hp, 'maxHp:', this.maxHp, '位置:', this.x, this.y);
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
    
    switch (this.type) {
        case ZOMBIE_TYPE.SKINNY:
            this.hp = Math.round(30 * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
            this.maxHp = this.hp;
            this.attack = Math.round(15 * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);
            this.moveSpeed = baseConfig.moveSpeed;
            this.attackRange = 40;
            this.detectionRange = baseConfig.detectionRange;
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
            this.attackRange = 50;
            this.detectionRange = baseConfig.detectionRange;
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
            this.attackRange = 80;
            this.detectionRange = 300;
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
            this.attackRange = 30;
            this.detectionRange = 250;
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
            this.attackRange = 60;
            this.detectionRange = 150;
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
            this.attackRange = 45;
            this.detectionRange = baseConfig.detectionRange;
            this.mainCharacterDetectionRange = baseConfig.mainCharacterDetectionRange;
            this.icon = baseConfig.icon;
            this.color = '#696969';
            this.size = objectSizes.DEFAULT.WIDTH;
            this.width = objectSizes.DEFAULT.WIDTH;
            this.height = objectSizes.DEFAULT.HEIGHT;
            this.radius = this.width / 2; // 碰撞半径（宽度的一半）
    }
};

// 更新僵尸状态 - 使用工具类
Zombie.prototype.update = function (deltaTime, characters) {
    // 验证僵尸基本状态
    if (!this.hp || this.hp <= 0) {
        if (this.state !== ZOMBIE_STATE.DEAD) {
            console.log('僵尸生命值耗尽，设置死亡状态:', this.type, this.id);
            this.state = ZOMBIE_STATE.DEAD;
        }
        return;
    }

    // 验证僵尸坐标
    var mathUtils = UtilsManager.getMathUtils();
    if (!mathUtils.isValidNumber(this.x) || !mathUtils.isValidNumber(this.y)) {
        console.error('僵尸坐标无效，跳过更新:', this.type, this.id, 'x:', this.x, 'y:', this.y);
        return;
    }

    // 寻找目标
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
            // 死亡状态不执行任何行为
            break;
        default:
            console.warn('僵尸状态未知，重置为待机:', this.type, this.id, 'state:', this.state);
            this.state = ZOMBIE_STATE.IDLE;
            break;
    }

    // 更新动画
    this.updateAnimation(deltaTime);
};

// 寻找目标 - 使用工具类
Zombie.prototype.findTarget = function (characters) {
    var mathUtils = UtilsManager.getMathUtils();
    var validationUtils = UtilsManager.getValidationUtils();
    
    // 寻找主人物作为目标
    var mainCharacter = null;
    characters.forEach(character => {
        if (validationUtils.validateObject(character, ['hp', 'role']) && 
            character.hp > 0 && character.role === 1) { // 主人物
            mainCharacter = character;
        }
    });

    if (mainCharacter) {
        // 验证主人物坐标
        if (!mathUtils.isValidNumber(mainCharacter.x) || !mathUtils.isValidNumber(mainCharacter.y)) {
            console.error('主人物坐标无效:', mainCharacter.x, mainCharacter.y);
            return;
        }
        
        var distance = mathUtils.distance(this.x, this.y, mainCharacter.x, mainCharacter.y);

        // 在700px范围内始终追逐主人物
        if (distance <= 700) {
            this.targetCharacter = mainCharacter;
            this.targetX = mainCharacter.x;
            this.targetY = mainCharacter.y;

            if (distance <= this.attackRange) {
                this.state = ZOMBIE_STATE.ATTACKING;
            } else {
                this.state = ZOMBIE_STATE.CHASING;
            }

            console.log('僵尸', this.type, '发现主人物，距离:', distance, '状态:', this.state, '目标位置:', this.targetX, this.targetY);
            return;
        }
    }

    // 如果没有主人物目标，寻找其他角色
    if (this.targetCharacter && this.targetCharacter.hp > 0) {
        // 验证目标角色坐标
        if (!mathUtils.isValidNumber(this.targetCharacter.x) || !mathUtils.isValidNumber(this.targetCharacter.y)) {
            console.error('目标角色坐标无效:', this.targetCharacter.x, this.targetCharacter.y);
            this.targetCharacter = null;
            return;
        }
        
        var distance = mathUtils.distance(this.x, this.y, this.targetCharacter.x, this.targetCharacter.y);
        if (distance <= this.detectionRange) {
            return; // 已有目标且在范围内
        }
    }

    // 寻找新目标
    this.targetCharacter = null;
    var closestDistance = Infinity;

    characters.forEach(character => {
        if (validationUtils.validateObject(character, ['hp', 'role']) && 
            character.hp > 0 && character.role !== 1) { // 不攻击主人物
            
            // 验证角色坐标
            if (!mathUtils.isValidNumber(character.x) || !mathUtils.isValidNumber(character.y)) {
                console.error('角色坐标无效:', character.x, character.y);
                return;
            }
            
            var distance = mathUtils.distance(this.x, this.y, character.x, character.y);
            if (distance <= this.detectionRange && distance < closestDistance) {
                closestDistance = distance;
                this.targetCharacter = character;
            }
        }
    });

    if (this.targetCharacter) {
        this.state = ZOMBIE_STATE.CHASING;
        this.targetX = this.targetCharacter.x;
        this.targetY = this.targetCharacter.y;
        console.log('僵尸', this.type, '设置新目标:', this.targetCharacter.role, '目标位置:', this.targetX, this.targetY);
    }
};

// 追击目标 - 使用工具类
Zombie.prototype.chaseTarget = function (deltaTime) {
    if (!this.targetCharacter || this.targetCharacter.hp <= 0) {
        this.state = ZOMBIE_STATE.IDLE;
        return;
    }

    // 验证目标角色坐标
    var mathUtils = UtilsManager.getMathUtils();
    if (!mathUtils.isValidNumber(this.targetCharacter.x) || !mathUtils.isValidNumber(this.targetCharacter.y)) {
        console.error('追击目标坐标无效:', this.targetCharacter.x, this.targetCharacter.y);
        this.state = ZOMBIE_STATE.IDLE;
        return;
    }

    // 更新目标位置
    this.targetX = this.targetCharacter.x;
    this.targetY = this.targetCharacter.y;

    var distance = mathUtils.distance(this.x, this.y, this.targetCharacter.x, this.targetCharacter.y);

    if (distance <= this.attackRange) {
        this.state = ZOMBIE_STATE.ATTACKING;
        return;
    }

    console.log('僵尸', this.type, '追击中，距离目标:', distance, '移动速度:', this.moveSpeed, '目标位置:', this.targetX, this.targetY);

    // 移动向目标
    this.moveTowards(this.targetX, this.targetY, deltaTime);
};

// 攻击目标
Zombie.prototype.attackTarget = function (deltaTime) {
    if (!this.targetCharacter || this.targetCharacter.hp <= 0) {
        this.state = ZOMBIE_STATE.IDLE;
        return;
    }

    // 验证目标角色坐标
    var mathUtils = UtilsManager.getMathUtils();
    if (!mathUtils.isValidNumber(this.targetCharacter.x) || !mathUtils.isValidNumber(this.targetCharacter.y)) {
        console.error('攻击目标坐标无效:', this.targetCharacter.x, this.targetCharacter.y);
        this.state = ZOMBIE_STATE.IDLE;
        return;
    }

    var currentTime = Date.now();
    if (currentTime - this.lastAttackTime >= this.attackCooldown) {
        // 执行攻击
        this.targetCharacter.takeDamage(this.attack);
        this.lastAttackTime = currentTime;

        console.log('僵尸攻击:', this.type, '造成伤害:', this.attack);
    }

    // 检查目标是否还在攻击范围内
    var distance = mathUtils.distance(this.x, this.y, this.targetCharacter.x, this.targetCharacter.y);
    if (distance > this.attackRange) {
        this.state = ZOMBIE_STATE.CHASING;
    }
};

// 向目标移动 - 使用工具类
Zombie.prototype.moveTowards = function (targetX, targetY, deltaTime) {
    var mathUtils = UtilsManager.getMathUtils();
    var movementUtils = UtilsManager.getMovementUtils();
    var collisionConfig = ConfigManager.get('COLLISION');
    
    // 验证输入参数
    if (!mathUtils.isValidNumber(targetX) || !mathUtils.isValidNumber(targetY) || 
        !mathUtils.isValidNumber(deltaTime) || !mathUtils.isValidNumber(this.x) || !mathUtils.isValidNumber(this.y)) {
        console.error('僵尸移动参数无效:', {
            targetX: targetX, targetY: targetY, deltaTime: deltaTime,
            currentX: this.x, currentY: this.y, zombieType: this.type, zombieId: this.id
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
    
    // 计算移动向量
    var moveVector = movementUtils.calculateMoveVector(
        this.x, this.y, targetX, targetY, this.moveSpeed, deltaTime
    );

    // 验证移动向量
    if (!moveVector || !mathUtils.isValidNumber(moveVector.x) || !mathUtils.isValidNumber(moveVector.y)) {
        console.error('僵尸移动向量无效:', {
            zombieType: this.type, zombieId: this.id,
            fromX: this.x, fromY: this.y, toX: targetX, toY: targetY,
            moveSpeed: this.moveSpeed, deltaTime: deltaTime,
            moveVector: moveVector,
            moveVectorType: typeof moveVector,
            moveVectorKeys: moveVector ? Object.keys(moveVector) : 'null'
        });
        return;
    }

    // 额外验证：检查移动向量的数值范围
    if (Math.abs(moveVector.x) > 1000 || Math.abs(moveVector.y) > 1000) {
        console.error('僵尸移动向量数值异常:', {
            zombieType: this.type, zombieId: this.id,
            moveVector: moveVector,
            moveSpeed: this.moveSpeed,
            deltaTime: deltaTime
        });
        return;
    }

    if (moveVector.distance > 0) {
        console.log('僵尸', this.type, '移动计算:', '从', this.x, this.y, '到', 
                   this.x + moveVector.x, this.y + moveVector.y, '移动向量:', moveVector, '距离目标:', distanceToTarget);

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
        var finalPosition = this.tryMoveToPosition(
            this.x, this.y, 
            this.x + moveVector.x, this.y + moveVector.y, 
            targetX, targetY,
            allZombies, allCharacters
        );

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
            
            console.log('僵尸移动成功:', this.type, '位置:', this.x.toFixed(2), this.y.toFixed(2));
            this.state = ZOMBIE_STATE.WALKING;
        } else {
            // 无法移动，尝试绕行
            console.log('僵尸无法直接移动，尝试绕行');
            this.tryCircumventObstacle(targetX, targetY, allZombies, allCharacters);
        }
    }
};

// 尝试移动到指定位置
Zombie.prototype.tryMoveToPosition = function(fromX, fromY, toX, toY, targetX, targetY, allZombies, allCharacters) {
    if (!window.collisionSystem) {
        return {x: toX, y: toY};
    }

    // 首先检查建筑物碰撞
    var buildingSafePos = window.collisionSystem.getCircleSafeMovePosition(
        fromX, fromY, toX, toY, this.radius
    );
    
    if (!buildingSafePos) {
        return null; // 建筑物碰撞无法解决
    }

    // 检查是否与其他对象重叠
    var zombieOverlap = false;
    var characterOverlap = false;
    
    if (window.collisionSystem.isZombieOverlappingWithZombies) {
        zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(
            buildingSafePos.x, buildingSafePos.y, this.radius, allZombies, 0.1
        );
    }

    if (window.collisionSystem.isCharacterOverlappingWithZombies) {
        characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(
            buildingSafePos.x, buildingSafePos.y, this.radius, allCharacters, 0.1
        );
    }

    // 如果没有重叠，可以移动
    if (!zombieOverlap && !characterOverlap) {
        return buildingSafePos;
    }

    // 如果有重叠，尝试寻找附近的安全位置
    var nearbySafePos = this.findNearbySafePosition(
        buildingSafePos.x, buildingSafePos.y, 
        allZombies, allCharacters
    );

    if (nearbySafePos) {
        return nearbySafePos;
    }

    // 如果找不到安全位置，返回原位置（不移动）
    return {x: fromX, y: fromY};
};

// 尝试绕行障碍物
Zombie.prototype.tryCircumventObstacle = function(targetX, targetY, allZombies, allCharacters) {
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
            var pathToTarget = this.tryMoveToPosition(
                offsetX, offsetY, targetX, targetY, targetX, targetY,
                allZombies, allCharacters
            );
            
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
                
                console.log('僵尸绕行成功:', this.type, '绕行位置:', offsetX.toFixed(2), offsetY.toFixed(2));
                this.state = ZOMBIE_STATE.WALKING;
                return;
            }
        }
    }
    
    console.log('僵尸无法绕行，保持静止');
};

// 在周围寻找安全位置
Zombie.prototype.findNearbySafePosition = function(centerX, centerY, allZombies, allCharacters) {
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
Zombie.prototype.isPositionSafe = function(x, y, allZombies, allCharacters) {
    if (!window.collisionSystem) return true;
    
    // 检查建筑物碰撞
    if (window.collisionSystem.isCircleCollidingWithBuildings) {
        if (window.collisionSystem.isCircleCollidingWithBuildings(x, y, this.radius)) {
            return false;
        }
    }
    
    // 检查僵尸重叠
    if (window.collisionSystem.isZombieOverlappingWithZombies) {
        if (window.collisionSystem.isZombieOverlappingWithZombies(x, y, this.radius, allZombies, 0.2)) {
            return false;
        }
    }
    
    // 检查人物重叠
    if (window.collisionSystem.isCharacterOverlappingWithZombies) {
        if (window.collisionSystem.isCharacterOverlappingWithZombies(x, y, this.radius, allCharacters, 0.2)) {
            return false;
        }
    }
    
    return true;
};

// 待机行为 - 使用工具类
Zombie.prototype.idleBehavior = function (deltaTime) {
    var mathUtils = UtilsManager.getMathUtils();
    var collisionConfig = ConfigManager.get('COLLISION');
    
    // 检查是否在700px范围内有主人物（优先检测）
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
            if (distance <= 700) {
                // 发现主人物，开始追逐
                this.targetCharacter = mainCharacter;
                this.targetX = mainCharacter.x;
                this.targetY = mainCharacter.y;
                this.state = ZOMBIE_STATE.CHASING;
                console.log('僵尸待机中发现主人物，开始追逐，距离:', distance, '目标位置:', this.targetX, this.targetY);
                return;
            }
        }
    }
    
    // 随机游荡
    if (Math.random() < 0.01) { // 1%概率改变方向
        this.direction = Math.random() * Math.PI * 2;
        var targetDistance = collisionConfig.SAFE_SPAWN_DISTANCE;
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
            var buildingCollision = window.collisionSystem.isCircleCollidingWithBuildings && 
                window.collisionSystem.isCircleCollidingWithBuildings(this.targetX, this.targetY, this.radius);
            
            var zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies && 
                window.collisionSystem.isZombieOverlappingWithZombies(this.targetX, this.targetY, this.radius, allZombies, 0.2);
            
            var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies && 
                window.collisionSystem.isCharacterOverlappingWithZombies(this.targetX, this.targetY, this.radius, allCharacters, 0.2);
            
            if (buildingCollision || zombieOverlap || characterOverlap) {
                console.log('僵尸目标位置不安全，重新计算路径');
                this.calculateNewTarget();
                return;
            }
        }

        this.state = ZOMBIE_STATE.WALKING;
    }
};

// 更新动画 - 使用工具类
Zombie.prototype.updateAnimation = function (deltaTime) {
    var animationUtils = UtilsManager.getAnimationUtils();
    var animationConfig = ConfigManager.get('ANIMATION');
    
    if (this.state === ZOMBIE_STATE.WALKING || this.state === ZOMBIE_STATE.CHASING) {
        this.animationFrame = animationUtils.updateFrame(
            this.animationFrame, 
            this.animationSpeed * deltaTime, 
            animationConfig.MAX_ANIMATION_FRAMES
        );
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
        console.warn('僵尸已经死亡，无法再受伤:', this.type, this.id);
        return this.hp;
    }
    
    // 记录受伤前的状态
    var oldHp = this.hp;
    var oldState = this.state;
    
    // 应用伤害
    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;

    console.log('僵尸受伤:', this.type, this.id, 'hp:', oldHp, '->', this.hp, '伤害:', damage);

    // 如果僵尸死亡，设置状态为死亡
    if (this.hp <= 0) {
        this.state = ZOMBIE_STATE.DEAD;
        console.log('僵尸死亡:', this.type, this.id);
        return this.hp;
    }

    // 受伤时短暂停止移动
    if (this.state === ZOMBIE_STATE.WALKING || this.state === ZOMBIE_STATE.CHASING) {
        this.state = ZOMBIE_STATE.IDLE;
        console.log('僵尸受伤停止移动:', this.type, this.id, '状态:', oldState, '->', this.state);
        
        // 同步恢复移动状态
        if (this && this.hp > 0 && this.state !== ZOMBIE_STATE.DEAD) {
            this.state = ZOMBIE_STATE.CHASING;
            console.log('僵尸恢复移动:', this.type, this.id, '状态:', this.state);
        } else {
            console.log('僵尸无法恢复移动:', this.type, this.id, 'hp:', this.hp, 'state:', this.state);
        }
    }

    return this.hp;
};



// 渲染僵尸
Zombie.prototype.render = function (ctx, cameraX, cameraY) {
    if (this.hp <= 0) return;

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

    // 绘制状态指示器 - 改为圆形
    if (this.state === ZOMBIE_STATE.CHASING) {
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(screenX, bodyY - 7.5, 4, 0, Math.PI * 2);
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
    maxZombies: ConfigManager.get('PERFORMANCE.MAX_ZOMBIES'),
    difficulty: 1,

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

        // 使用性能工具测量创建时间
        return performanceUtils.measureFunction('createZombie', function() {
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
            
            console.log('僵尸创建成功:', zombie.type, zombie.id, 'hp:', zombie.hp, 'maxHp:', zombie.maxHp, '位置:', x, y);
            
            // 通过四叉树创建僵尸（四叉树负责对象管理）
            console.log('ZombieManager.createZombie: 准备通过四叉树创建僵尸');
            
            if (window.collisionSystem.createZombieObject) {
                console.log('ZombieManager.createZombie: 调用四叉树createZombieObject方法');
                var createdZombie = window.collisionSystem.createZombieObject(zombie);
                if (createdZombie) {
                    console.log('ZombieManager.createZombie: 四叉树创建僵尸成功:', zombie.type, zombie.id);
                    return createdZombie;
                } else {
                    console.error('ZombieManager.createZombie: 四叉树创建僵尸失败:', zombie.type, zombie.id);
                    return null;
                }
            } else {
                console.error('ZombieManager.createZombie: 四叉树不支持僵尸对象创建，可用方法:', Object.keys(window.collisionSystem));
                return null;
            }
        }.bind(this));
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
        if (window.collisionSystem.isCircleCollidingWithBuildings && 
            window.collisionSystem.isCircleCollidingWithBuildings(x, y, zombieWidth/2)) {
            console.log('僵尸生成位置在建筑物内，寻找安全位置');
            var safePosition = window.collisionSystem.generateGameSafePosition(
                x, y, collisionConfig.SAFE_SPAWN_DISTANCE, 
                detectionConfig.MAX_SPAWN_SEARCH_RADIUS, zombieWidth, zombieHeight);
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
            var zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(x, y, zombieWidth/2, null, 0.2);
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

        // 验证步骤3：检查是否与人物重叠
        if (window.collisionSystem.isCharacterOverlappingWithZombies) {
            var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(x, y, zombieWidth/2, null, 0.2);
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
                buildingCollision = window.collisionSystem.isCircleCollidingWithBuildings(testX, testY, width/2);
            }

            // 检查僵尸重叠
            var zombieOverlap = false;
            if (window.collisionSystem.isZombieOverlappingWithZombies) {
                zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(testX, testY, width/2, null, 0.1);
            }

            // 检查人物重叠
            var characterOverlap = false;
            if (window.collisionSystem.isCharacterOverlappingWithZombies) {
                characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(testX, testY, width/2, null, 0.1);
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
                    state: zombie.state
                });
            });
        }
        
        return zombies;
    },

    // 获取僵尸数量 - 从四叉树获取
    getZombieCount: function () {
        if (window.collisionSystem && window.collisionSystem.getDynamicObjectCountByType) {
            return window.collisionSystem.getDynamicObjectCountByType('zombie');
        } else {
            console.warn('无法从四叉树获取僵尸数量');
            return 0;
        }
    },

    // 设置难度
    setDifficulty: function (difficulty) {
        this.difficulty = difficulty;
        console.log('僵尸难度已设置为:', difficulty);
    },

    // 获取当前难度
    getDifficulty: function () {
        return this.difficulty;
    }
};

// 导出枚举和类
export {ZOMBIE_TYPE, ZOMBIE_STATE};
export {ZombieManager};
export default Zombie;

