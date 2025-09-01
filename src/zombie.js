/**
 * 僵尸模块 - 优化版本 (zombie.js)
 */

import ConfigManager from './config.js';

// 僵尸类型枚举
const ZOMBIE_TYPE = {
    SKINNY: 'skinny', FAT: 'fat', BOSS: 'boss', FAST: 'fast', TANK: 'tank'
};

// 导入统一的状态枚举
import { ZOMBIE_STATES } from './state-machine.js';

// 使用统一的状态枚举，保持向后兼容
const ZOMBIE_STATE = ZOMBIE_STATES;

// 僵尸配置模板 - 完全从config.js获取
const ZOMBIE_CONFIGS = {
    [ZOMBIE_TYPE.SKINNY]: 'SKINNY',
    [ZOMBIE_TYPE.FAT]: 'FAT',
    [ZOMBIE_TYPE.BOSS]: 'BOSS',
    [ZOMBIE_TYPE.FAST]: 'FAST',
    [ZOMBIE_TYPE.TANK]: 'TANK'
};

// 基础僵尸类
var Zombie = function (type, x, y) {
    // 验证参数
    var validTypes = [ZOMBIE_TYPE.SKINNY, ZOMBIE_TYPE.FAT, ZOMBIE_TYPE.BOSS, ZOMBIE_TYPE.FAST, ZOMBIE_TYPE.TANK];
    if (!validTypes.includes(type)) {
        type = ZOMBIE_TYPE.SKINNY;
    }

    // 基础属性
    this.type = 'zombie';
    this.zombieType = type;
    this.x = x || 100;
    this.y = y || 100;
    this.id = Date.now() + Math.random();

    // 设置属性
    this.setupProperties();

    // AI状态
    this.state = ZOMBIE_STATE.IDLE;
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetCharacter = null;
    
    // 目标锁定相关属性
    this.targetLockTime = null;
    this.targetLockDuration = null;

    // 性能相关
    this.isActive = false;
    var zombieBehaviorConfig = ConfigManager.get('ZOMBIE.BEHAVIOR');
    this.updateInterval = zombieBehaviorConfig.ACTIVE_UPDATE_INTERVAL;

    // 战斗属性
    this.lastAttackTime = 0;
    var combatConfig = ConfigManager.get('COMBAT');
    this.attackCooldown = combatConfig.ZOMBIE_ATTACK_COOLDOWN || 500;

    // 动画属性
    var animationConfig = ConfigManager.get('ANIMATION');
    this.animationFrame = 0;
    this.animationSpeed = animationConfig.DEFAULT_FRAME_RATE;
    this.direction = 0;
};

// 设置僵尸属性
Zombie.prototype.setupProperties = function () {
    var zombieTypeKey = ZOMBIE_CONFIGS[this.zombieType] || 'SKINNY';

    // 从config.js获取僵尸基础属性
    var zombieConfig = ConfigManager.get('ZOMBIE');
    var zombieTypeConfig = zombieConfig.TYPES[zombieTypeKey];
    var difficultyConfig = ConfigManager.getDifficultyConfig();

    // 基础属性
    this.hp = Math.round(zombieConfig.BASE_HP * zombieTypeConfig.HP_MULTIPLIER * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
    this.maxHp = this.hp;
    this.attack = Math.round(zombieConfig.BASE_ATTACK * zombieTypeConfig.ATTACK_MULTIPLIER * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);

    // 尺寸和外观
    this.size = zombieTypeConfig.SIZE;
    this.width = this.size;
    this.height = this.size;
    this.radius = this.size / 2;
    this.color = zombieTypeConfig.COLOR;
    this.icon = '🧟‍♂️';

    // 移动速度
    var movementConfig = ConfigManager.get('MOVEMENT');
    this.moveSpeed = movementConfig.ZOMBIE_MOVE_SPEED * zombieTypeConfig.SPEED_MULTIPLIER;

    // 攻击范围
    var combatConfig = ConfigManager.get('COMBAT');
    this.attackRange = combatConfig.ZOMBIE_ATTACK_RANGE;

    // 检测范围
    var detectionConfig = ConfigManager.get('DETECTION');
    this.detectionRange = detectionConfig.ZOMBIE_DETECTION_RANGE;
    this.mainCharacterDetectionRange = detectionConfig.MAIN_CHARACTER_DETECTION;

    // 重置状态相关属性
    this.state = ZOMBIE_STATE.IDLE;
    this.targetCharacter = null;
    this.targetX = this.x;
    this.targetY = this.y;
    this.isActive = false;
    this.isMoving = false;
    this.lastAttackTime = 0;
    this.animationFrame = 0;
    this.direction = 0;
    this._updateFrame = 0;
    this._destroyed = false;
};

// 统一的僵尸更新方法
Zombie.prototype.update = function (deltaTime, characters, currentFrame = 0) {
    // 检查死亡状态
    if (this.hp <= 0) {
        if (this.state !== ZOMBIE_STATE.DIE) {
            this.state = ZOMBIE_STATE.DIE;
            this.onEnterDead();
        }
        return false;
    }

    // 更新活性状态
    if (characters && characters.length > 0) {
        var mainCharacter = characters.find(c => c.role === 1);
        if (mainCharacter) {
            this.updateActivationStatus(mainCharacter.x, mainCharacter.y);
        }
    }

    // 更新帧计数
    if (!this._updateFrame) this._updateFrame = 0;
    this._updateFrame++;

    // 更新动画
    this.updateAnimation(deltaTime);

    // 寻找目标
    this.findTarget(characters);

    // 执行状态行为
    switch (this.state) {
        case ZOMBIE_STATE.CHASING:
            this.chaseTarget(deltaTime);
            break;
        case ZOMBIE_STATE.ATTACK:
            this.attackTarget(deltaTime);
            break;
        case ZOMBIE_STATE.CHASE:
            this.moveTowards(this.targetX, this.targetY, deltaTime);
            break;
        case ZOMBIE_STATE.IDLE:
            this.idleBehavior(deltaTime);
            break;
        case ZOMBIE_STATE.DIE:
            this.updateDead(deltaTime);
            break;
    }

    return true;
};

// 进入死亡状态
Zombie.prototype.onEnterDead = function () {
    this.deathAnimationTime = 0;
    this.deathAnimationDuration = 2.0;
    this.isMoving = false;
    this.targetCharacter = null;
};

// 更新死亡状态
Zombie.prototype.updateDead = function (deltaTime) {
    this.deathAnimationTime += deltaTime;
    var gameplayConfig = window.ConfigManager ? window.ConfigManager.get('GAMEPLAY') : null;
    var deathDuration = gameplayConfig ? gameplayConfig.DEATH.ANIMATION_DURATION : 2.0;
    
    if (this.deathAnimationTime >= deathDuration) {
        this.destroy();
    }
};

// 销毁僵尸
Zombie.prototype.destroy = function () {
    if (window.zombieManager && window.zombieManager.destroyZombie) {
        window.zombieManager.destroyZombie(this);
        return;
    }

    if (window.zombieManager && window.zombieManager.objectPool) {
        if (window.zombieManager.objectPool.return(this)) {
            return;
        }
    }

    this._destroyed = true;
};

// 寻找目标
Zombie.prototype.findTarget = function (characters) {
    if (!this.isTargetValid()) {
        this.findNearestEnemy();
    }

    if (this.targetCharacter) {
        var distance = this.getDistanceTo(this.targetCharacter.x, this.targetCharacter.y);
        var attackJudgmentConfig = ConfigManager.get('COMBAT.ATTACK_JUDGMENT');
        var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;

        if (distance <= effectiveAttackRange) {
            this.state = ZOMBIE_STATE.ATTACKING;
        } else if (distance <= this.detectionRange) {
            this.state = ZOMBIE_STATE.CHASING;
        } else {
            this.state = ZOMBIE_STATE.IDLE;
        }
    } else {
        this.state = ZOMBIE_STATE.IDLE;
    }
};

// 追击目标
Zombie.prototype.chaseTarget = function (deltaTime) {
    if (!this.isTargetValid()) {
        this.findNearestEnemy();
        if (!this.targetCharacter) {
            this.state = ZOMBIE_STATE.IDLE;
            return;
        }
    }

    this.targetX = this.targetCharacter.x;
    this.targetY = this.targetCharacter.y;

    var distance = this.getDistanceTo(this.targetCharacter.x, this.targetCharacter.y);
    var attackJudgmentConfig = ConfigManager.get('COMBAT.ATTACK_JUDGMENT');
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;

    if (distance <= effectiveAttackRange) {
        this.state = ZOMBIE_STATE.ATTACK;
        return;
    }

    if (distance > this.detectionRange) {
        this.state = ZOMBIE_STATE.IDLE;
        return;
    }

    this.moveTowards(this.targetX, this.targetY, deltaTime);
};

// 攻击目标
Zombie.prototype.attackTarget = function (deltaTime) {
    if (!this.isTargetValid()) {
        this.findNearestEnemy();
        if (!this.targetCharacter) {
            this.state = ZOMBIE_STATE.IDLE;
            return;
        }
    }

    var distance = this.getDistanceTo(this.targetCharacter.x, this.targetCharacter.y);
    var attackJudgmentConfig = ConfigManager.get('COMBAT.ATTACK_JUDGMENT');
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;

    if (distance > effectiveAttackRange) {
        this.state = ZOMBIE_STATE.CHASING;
        return;
    }

    var currentTime = Date.now();
    if (currentTime - this.lastAttackTime >= this.attackCooldown) {
        this.targetCharacter.takeDamage(this.attack);
        this.lastAttackTime = currentTime;
    }
};

// 向目标移动
Zombie.prototype.moveTowards = function (targetX, targetY, deltaTime) {
    var distanceToTarget = this.getDistanceTo(targetX, targetY);
    var attackJudgmentConfig = ConfigManager.get('COMBAT.ATTACK_JUDGMENT');
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;

    if (distanceToTarget <= effectiveAttackRange) {
        this.state = ZOMBIE_STATE.ATTACK;
        return;
    }

    this.direction = Math.atan2(targetY - this.y, targetX - this.x);

    var newX = this.x + Math.cos(this.direction) * this.moveSpeed;
    var newY = this.y + Math.sin(this.direction) * this.moveSpeed;

    // 检查碰撞
    var finalPosition = this.checkCollision(this.x, this.y, newX, newY);
    if (finalPosition) {
        var oldX = this.x, oldY = this.y;
        this.x = finalPosition.x;
        this.y = finalPosition.y;

        // 更新四叉树位置
        if (window.collisionSystem && window.collisionSystem.updateDynamicObjectPosition) {
            window.collisionSystem.updateDynamicObjectPosition(this, oldX, oldY, this.x, this.y);
        }

        this.state = ZOMBIE_STATE.CHASE;
    }
};

// 检查碰撞
Zombie.prototype.checkCollision = function (fromX, fromY, toX, toY) {
    if (!window.collisionSystem) {
        return {x: toX, y: toY};
    }

    if (window.collisionSystem.getWallFollowingPosition) {
        var safePos = window.collisionSystem.getWallFollowingPosition(fromX, fromY, toX, toY, this.radius || 16, this.moveSpeed);
        if (safePos) {
            return safePos;
        }
    }

    if (window.collisionSystem.isPositionWalkable && window.collisionSystem.isPositionWalkable(toX, toY)) {
        return {x: toX, y: toY};
    }

    return {x: fromX, y: fromY};
};

// 待机行为
Zombie.prototype.idleBehavior = function (deltaTime) {
    var detectionConfig = ConfigManager.get('DETECTION');
    var mainCharacterPriorityRange = detectionConfig.SPECIAL_DETECTION.MAIN_CHARACTER_PRIORITY_RANGE;

    // 检查主人物
    if (window.characterManager && window.characterManager.getAllCharacters) {
        var allCharacters = window.characterManager.getAllCharacters();
        var mainCharacter = allCharacters.find(c => c.role === 1 && c.hp > 0);

        if (mainCharacter) {
            var distance = this.getDistanceTo(mainCharacter.x, mainCharacter.y);
            if (distance <= mainCharacterPriorityRange) {
                this.targetCharacter = mainCharacter;
                this.targetX = mainCharacter.x;
                this.targetY = mainCharacter.y;
                this.state = ZOMBIE_STATE.CHASING;
                return;
            }
        }
    }

    // 随机游荡
    var zombieBehaviorConfig = ConfigManager.get('ZOMBIE.BEHAVIOR');
    if (Math.random() < zombieBehaviorConfig.RANDOM_WALK_PROBABILITY) {
        this.direction = Math.random() * Math.PI * 2;
        var targetDistance = zombieBehaviorConfig.RANDOM_WALK_DISTANCE + Math.random() * 100;
        this.targetX = this.x + Math.cos(this.direction) * targetDistance;
        this.targetY = this.y + Math.sin(this.direction) * targetDistance;

        if (window.collisionSystem && window.collisionSystem.isPositionWalkable) {
            if (!window.collisionSystem.isPositionWalkable(this.targetX, this.targetY)) {
                this.targetX = this.x;
                this.targetY = this.y;
                return;
            }
        }

        this.state = ZOMBIE_STATE.CHASE;
    }
};

// 更新动画
Zombie.prototype.updateAnimation = function (deltaTime) {
    if (this.state === ZOMBIE_STATE.CHASE) {
        var animationConfig = ConfigManager.get('ANIMATION');
        this.animationFrame += this.animationSpeed * deltaTime;
        if (this.animationFrame >= animationConfig.MAX_ANIMATION_FRAMES) {
            this.animationFrame = 0;
        }
    }
};

// 受到伤害
Zombie.prototype.takeDamage = function (damage) {
    if (this.hp <= 0) return this.hp;

    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;

    if (this.hp <= 0) {
        this.state = ZOMBIE_STATE.DIE;
        return this.hp;
    }

    // 受伤时短暂停止移动
    if (this.state === ZOMBIE_STATE.CHASE) {
        this.state = ZOMBIE_STATE.IDLE;

        var gameplayConfig = window.ConfigManager ? window.ConfigManager.get('GAMEPLAY') : null;
        var resetDelay = gameplayConfig ? gameplayConfig.STUCK_DETECTION.RESET_DELAY * 1000 : 500;
        
        setTimeout(() => {
            if (this.hp > 0 && this.state !== ZOMBIE_STATE.DIE) {
                this.state = ZOMBIE_STATE.CHASE;
            }
        }, resetDelay);
    }

    return this.hp;
};

// 寻找最近的敌人
Zombie.prototype.findNearestEnemy = function () {
    if (this.isTargetLocked()) {
        return;
    }

    var allTargets = this.getAllValidTargets();
    if (allTargets.length === 0) return;

    var nearestEnemy = null;
    var nearestDistance = Infinity;

    for (var i = 0; i < allTargets.length; i++) {
        var target = allTargets[i];
        var distance = this.getDistanceTo(target.x, target.y);
        var priority = this.calculateTargetPriority(target, distance);

        if (distance <= this.detectionRange && (distance < nearestDistance || (distance === nearestDistance && priority < (nearestEnemy ? this.calculateTargetPriority(nearestEnemy, nearestDistance) : Infinity)))) {
            nearestDistance = distance;
            nearestEnemy = target;
        }
    }

    if (this.targetCharacter !== nearestEnemy) {
        this.targetCharacter = nearestEnemy;
        if (this.targetCharacter) {
            this.targetX = this.targetCharacter.x;
            this.targetY = this.targetCharacter.y;
            this.lockTarget();
        }
    }
};

// 获取所有有效目标
Zombie.prototype.getAllValidTargets = function () {
    var allTargets = [];

    if (window.characterManager) {
        var mainCharacters = window.characterManager.getAllCharacters().filter(c => c.hp > 0);
        allTargets = allTargets.concat(mainCharacters);
    }

    if (window.objectManager) {
        var partners = window.objectManager.getAllPartners().filter(p => 
            p.hp > 0 && 
            p.status !== 'INIT' && 
            !p.isInitialState
        );
        allTargets = allTargets.concat(partners);
    }

    return allTargets;
};

// 计算目标优先级
Zombie.prototype.calculateTargetPriority = function (target, distance) {
    var basePriority = distance;
    var typePriority = target.type === 'character' ? 0 : 100;
    var healthPriority = target.hp / target.maxHp * 50;
    
    return basePriority + typePriority + healthPriority;
};

// 目标锁定机制
Zombie.prototype.lockTarget = function () {
    if (!this.targetCharacter) return;
    
    var zombieConfig = ConfigManager.get('ZOMBIE');
    var lockDuration = zombieConfig ? zombieConfig.TARGET_LOCK_DURATION : 1000;
    
    this.targetLockTime = Date.now();
    this.targetLockDuration = lockDuration;
};

// 检查目标是否被锁定
Zombie.prototype.isTargetLocked = function () {
    if (!this.targetCharacter || !this.targetLockTime) {
        return false;
    }
    
    var currentTime = Date.now();
    var lockElapsed = currentTime - this.targetLockTime;
    
    if (lockElapsed < this.targetLockDuration) {
        return true;
    }
    
    this.targetLockTime = null;
    this.targetLockDuration = null;
    return false;
};

// 检查目标是否有效
Zombie.prototype.isTargetValid = function () {
    if (!this.targetCharacter) return false;

    if (!this.isTargetStillExists()) {
        this.clearTarget();
        return false;
    }

    if (this.targetCharacter.hp <= 0) {
        this.clearTarget();
        return false;
    }

    var distance = this.getDistanceTo(this.targetCharacter.x, this.targetCharacter.y);

    if (distance > this.detectionRange) {
        this.clearTarget();
        return false;
    }

    this.targetX = this.targetCharacter.x;
    this.targetY = this.targetCharacter.y;
    return true;
};

// 检查目标是否仍然存在
Zombie.prototype.isTargetStillExists = function () {
    if (!this.targetCharacter) return false;
    
    if (this.targetCharacter.type === 'character' && window.characterManager) {
        var characters = window.characterManager.getAllCharacters();
        return characters.some(c => c.id === this.targetCharacter.id);
    }
    
    if (this.targetCharacter.type === 'partner' && window.objectManager) {
        var partners = window.objectManager.getAllPartners();
        return partners.some(p => 
            p.id === this.targetCharacter.id && 
            p.status !== 'INIT' && 
            !p.isInitialState
        );
    }
    
    return false;
};

// 清除目标
Zombie.prototype.clearTarget = function () {
    this.targetCharacter = null;
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetLockTime = null;
    this.targetLockDuration = null;
};

// 更新活性状态
Zombie.prototype.updateActivationStatus = function (playerX, playerY) {
    var distance = this.getDistanceTo(playerX, playerY);
    var zombieBehaviorConfig = ConfigManager.get('ZOMBIE.BEHAVIOR');
    this.isActive = distance <= zombieBehaviorConfig.ACTIVATION_DISTANCE;

    if (this.isActive) {
        this.updateInterval = zombieBehaviorConfig.ACTIVE_UPDATE_INTERVAL;
        if (this.state === ZOMBIE_STATE.IDLE && this.targetCharacter) {
            this.state = ZOMBIE_STATE.CHASING;
        }
        return true;
    } else {
        this.updateInterval = zombieBehaviorConfig.IDLE_UPDATE_INTERVAL;
        return false;
    }
};

// 工具方法
Zombie.prototype.getDistanceTo = function (targetX, targetY) {
    var dx = this.x - targetX;
    var dy = this.y - targetY;
    return Math.sqrt(dx * dx + dy * dy);
};

// 僵尸管理器
var ZombieManager = {
    maxZombies: ConfigManager.get('PERFORMANCE.MAX_ZOMBIES'),
    objectPool: null,

    // 初始化对象池
    initObjectPool: function () {
        if (!window.objectPoolManager) {
            return;
        }

        this.objectPool = window.objectPoolManager.createPool('zombie',
            () => new Zombie('skinny', 0, 0),
            (zombie) => this.resetZombie(zombie));
    },

    // 重置僵尸状态
    resetZombie: function (zombie) {
        if (!zombie) return;

        zombie.hp = zombie.maxHp || 30;
        zombie.state = ZOMBIE_STATES.IDLE;
        zombie.targetX = zombie.x;
        zombie.y = zombie.y;
        zombie.targetCharacter = null;
        zombie.isActive = false;
        zombie.updateInterval = 1;
        zombie.lastAttackTime = 0;
        zombie.animationFrame = 0;
        zombie.direction = 0;
        zombie.targetLockTime = null;
        zombie.targetLockDuration = null;

        // 重新设置移动速度
        var movementConfig = window.ConfigManager ? window.ConfigManager.get('MOVEMENT') : null;
        var zombieConfig = window.ConfigManager ? window.ConfigManager.get('ZOMBIE') : null;
        var expectedSpeed = 2;

        if (movementConfig && zombieConfig && zombieConfig.TYPES && zombie.zombieType) {
            var zombieTypeConfig = zombieConfig.TYPES[zombie.zombieType.toUpperCase()];
            if (zombieTypeConfig) {
                expectedSpeed = movementConfig.ZOMBIE_MOVE_SPEED * zombieTypeConfig.SPEED_MULTIPLIER;
            } else {
                expectedSpeed = movementConfig.ZOMBIE_MOVE_SPEED;
            }
        }

        zombie.moveSpeed = expectedSpeed;

        zombie._updateFrame = 0;
        zombie._destroyed = false;

        if (!zombie.id) {
            zombie.id = Date.now() + Math.random();
        }
    },

    // 创建僵尸
    createZombie: function (type, x, y) {
        if (!window.collisionSystem) {
            console.warn('碰撞系统未初始化');
            return null;
        }

        if (!window.objectManager) {
            throw new Error('对象管理器未初始化');
        }

        var currentZombieCount = window.objectManager.getObjectCount('zombie');
        if (currentZombieCount >= this.maxZombies) {
            console.warn('达到最大僵尸数量限制:', currentZombieCount, '/', this.maxZombies);
            return null;
        }

        if (x === undefined || y === undefined) {
            var randomPos = this.generateRandomSpawnPosition();
            if (randomPos) {
                x = randomPos.x;
                y = randomPos.y;
            } else {
                return null;
            }
        }

        var validatedPosition = this.validateSpawnPosition(x, y, type);
        if (!validatedPosition) {
            return null;
        }

        x = validatedPosition.x;
        y = validatedPosition.y;

        var zombie = null;

        if (this.objectPool) {
            zombie = this.objectPool.get();
            if (zombie) {
                zombie.zombieType = type;
                zombie.x = x;
                zombie.y = y;
                zombie.setupProperties();
            }
        }

        if (!zombie) {
            zombie = new Zombie(type, x, y);
        }

        if (zombie && window.objectManager) {
            window.objectManager.registerObject(zombie, 'zombie', zombie.id);
        } else {
            throw new Error('对象管理器未初始化或僵尸创建失败');
        }

        if (window.collisionSystem && window.collisionSystem.addToSpatialIndex) {
            var spatialIndexResult = window.collisionSystem.addToSpatialIndex(zombie);
            if (spatialIndexResult) {
                zombie._spatialIndexId = spatialIndexResult;
            }
        }

        this.initializeZombieTarget(zombie);

        return zombie;
    },

    // 生成随机生成位置
    generateRandomSpawnPosition: function () {
        var mapWidth = 10000;
        var mapHeight = 10000;

        if (window.mapSystem) {
            mapWidth = window.mapSystem.mapWidth || mapWidth;
            mapHeight = window.mapSystem.mapHeight || mapHeight;
        }

        var centerX = mapWidth / 2;
        var centerY = mapHeight / 2;
        var minDistance = 500;
        var maxDistance = Math.min(mapWidth, mapHeight) / 2 - 1000;

        if (window.collisionSystem && window.collisionSystem.generateGameSafePosition) {
            var safePosition = window.collisionSystem.generateGameSafePosition(centerX, centerY, minDistance, maxDistance, 32, 48, true);
            if (safePosition && safePosition.success) {
                return {x: safePosition.x, y: safePosition.y};
            }
        }

        return {x: 1000, y: 1000};
    },

    // 初始化僵尸目标
    initializeZombieTarget: function (zombie) {
        if (!zombie) return;

        var mainChar = null;
        if (window.characterManager && window.characterManager.getMainCharacter) {
            mainChar = window.characterManager.getMainCharacter();
        }

        if (mainChar && mainChar.hp > 0) {
            zombie.targetCharacter = mainChar;
            zombie.targetX = mainChar.x;
            zombie.targetY = mainChar.y;

            var distance = Math.sqrt(Math.pow(zombie.x - mainChar.x, 2) + Math.pow(zombie.y - mainChar.y, 2));
            var attackJudgmentConfig = ConfigManager.get('COMBAT.ATTACK_JUDGMENT');
            var effectiveAttackRange = zombie.attackRange + attackJudgmentConfig.RANGE_BUFFER;

            if (distance <= effectiveAttackRange) {
                zombie.state = ZOMBIE_STATE.ATTACKING;
            } else if (distance <= zombie.detectionRange) {
                zombie.state = ZOMBIE_STATE.CHASING;
            } else {
                zombie.state = ZOMBIE_STATES.IDLE;
            }
        } else {
            var randomAngle = Math.random() * Math.PI * 2;
            var randomDistance = 200 + Math.random() * 300;

            zombie.targetX = zombie.x + Math.cos(randomAngle) * randomDistance;
            zombie.targetY = zombie.y + Math.sin(randomAngle) * randomDistance;
            zombie.state = ZOMBIE_STATES.IDLE;
        }
    },

    // 验证生成位置
    validateSpawnPosition: function (x, y, zombieType) {
        if (!window.collisionSystem) {
            return {x: x, y: y};
        }

        var zombieWidth = zombieType === 'fat' || zombieType === 'boss' ? 48 : 32;
        var zombieHeight = zombieWidth;

        if (window.collisionSystem.isPositionWalkable && !window.collisionSystem.isPositionWalkable(x, y)) {
            var collisionConfig = ConfigManager.get('COLLISION');
            var detectionConfig = ConfigManager.get('DETECTION');
            var safePosition = window.collisionSystem.generateGameSafePosition(x, y, collisionConfig.SAFE_SPAWN_DISTANCE, detectionConfig.MAX_SPAWN_SEARCH_RADIUS, zombieWidth, zombieHeight);
            if (safePosition) {
                x = safePosition.x;
                y = safePosition.y;
            } else {
                return null;
            }
        }

        if (window.characterManager && window.characterManager.getAllCharacters) {
            var characters = window.characterManager.getAllCharacters();
            var minSafeDistance = 100;

            for (var i = 0; i < characters.length; i++) {
                var char = characters[i];
                if (char && char.hp > 0) {
                    var distance = Math.sqrt(Math.pow(x - char.x, 2) + Math.pow(y - char.y, 2));

                    if (distance < minSafeDistance) {
                        var angle = Math.atan2(y - char.y, x - char.x);
                        var newX = char.x + Math.cos(angle) * minSafeDistance;
                        var newY = char.y + Math.sin(angle) * minSafeDistance;

                        if (window.collisionSystem.generateGameSafePosition) {
                            var collisionConfig = ConfigManager.get('COLLISION');
                            var detectionConfig = ConfigManager.get('DETECTION');
                            var safePosition = window.collisionSystem.generateGameSafePosition(newX, newY, collisionConfig.SAFE_SPAWN_DISTANCE, detectionConfig.MAX_SPAWN_SEARCH_RADIUS, zombieWidth, zombieHeight);
                            if (safePosition) {
                                x = safePosition.x;
                                y = safePosition.y;
                                break;
                            }
                        } else {
                            x = newX;
                            y = newY;
                            break;
                        }
                    }
                }
            }
        }

        return {x: x, y: y};
    },

    // 更新所有僵尸
    updateAllZombies: function (characters, deltaTime, currentFrame = 0) {
        if (!Array.isArray(characters)) {
            return;
        }

        var mainCharacter = characters.find(c => c.role === 1);
        if (!mainCharacter) {
            if (window.characterManager && window.characterManager.getMainCharacter) {
                mainCharacter = window.characterManager.getMainCharacter();
            }
        }

        if (!mainCharacter) {
            return;
        }

        var zombies = this.getAllZombies();
        var activeZombies = zombies.filter(zombie => zombie && zombie.hp > 0 && zombie.state !== ZOMBIE_STATE.DIE);

        activeZombies.forEach(zombie => {
            zombie.update(deltaTime, characters, currentFrame);
        });

        // 清理死亡僵尸
        var deadZombies = zombies.filter(zombie => zombie.hp <= 0 || zombie.state === ZOMBIE_STATE.DIE);
        deadZombies.forEach(zombie => {
            if (this.objectPool) {
                if (this.objectPool.return(zombie)) {
                    return;
                }
            }

            if (window.collisionSystem && window.collisionSystem.destroyZombieObject) {
                window.collisionSystem.destroyZombieObject(zombie);
            }
        });
    },

    // 获取所有僵尸
    getAllZombies: function () {
        if (!window.objectManager) {
            throw new Error('对象管理器未初始化');
        }

        return window.objectManager.getAllZombies();
    },

    // 获取批次信息
    getBatchInfo: function (currentFrame) {
        var allZombies = this.getAllZombies();
        var activeZombies = allZombies.filter(zombie => zombie && zombie.hp > 0 && zombie.state !== ZOMBIE_STATE.DIE);

        var currentBatch = currentFrame % 2;

        return {
            totalActive: activeZombies.length,
            currentBatch: currentBatch,
            nextBatch: (currentBatch + 1) % 2,
            batchSize: 2
        };
    },

    // 销毁僵尸
    destroyZombie: function (zombie) {
        if (!zombie) return;

        if (window.objectManager) {
            const destroyResult = window.objectManager.destroyObject(zombie.id);
            if (!destroyResult) {
                console.warn('⚠️ 僵尸从对象管理器移除失败:', zombie.id);
            }
        }

        if (this.objectPool) {
            zombie.hp = 0;
            zombie.state = ZOMBIE_STATES.DIE;
            zombie.isActive = false;
            this.objectPool.return(zombie);
        } else {
            zombie.isActive = false;
        }
    }
};

// 导出
export {ZOMBIE_TYPE, ZOMBIE_STATE};
export {ZombieManager};
export default Zombie;

