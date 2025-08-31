/**
 * 僵尸模块 - 优化版本 (zombie.js)
 * 
 * 优化内容：
 * - 合并重复的属性设置逻辑
 * - 删除未使用的工具方法
 * - 简化性能优化逻辑
 * - 统一距离计算和状态管理
 */

import ConfigManager from './config.js';

// 僵尸类型枚举
const ZOMBIE_TYPE = {
    SKINNY: 'skinny',
    FAT: 'fat',
    BOSS: 'boss',
    FAST: 'fast',
    TANK: 'tank'
};

// 僵尸状态枚举
const ZOMBIE_STATE = {
    IDLE: 'idle',
    WALKING: 'walking',
    ATTACKING: 'attacking',
    DEAD: 'dead',
    CHASING: 'chasing'
};

// 僵尸配置模板 - 完全从config.js获取
const ZOMBIE_CONFIGS = {
    [ZOMBIE_TYPE.SKINNY]: 'SKINNY',
    [ZOMBIE_TYPE.FAT]: 'FAT',
    [ZOMBIE_TYPE.BOSS]: 'BOSS',
    [ZOMBIE_TYPE.FAST]: 'FAST',
    [ZOMBIE_TYPE.TANK]: 'TANK'
};

// 基础僵尸类
var Zombie = function(type, x, y) {
    // 验证参数
    if (!Object.values(ZOMBIE_TYPE).includes(type)) {
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
    
    // 性能相关 - 从config.js获取
    this.isActive = false;
    var zombieBehaviorConfig = ConfigManager.get('ZOMBIE.BEHAVIOR');
    this.updateInterval = zombieBehaviorConfig.ACTIVE_UPDATE_INTERVAL;
    
    // 战斗属性 - 从config.js获取
    this.lastAttackTime = 0;
    var combatConfig = ConfigManager.get('COMBAT');
    this.attackCooldown = combatConfig.ZOMBIE_ATTACK_COOLDOWN || 500; // 从配置获取攻击冷却时间
    
    // 动画属性
    var animationConfig = ConfigManager.get('ANIMATION');
    this.animationFrame = 0;
    this.animationSpeed = animationConfig.DEFAULT_FRAME_RATE;
    this.direction = 0;
};

// 设置僵尸属性 - 完全使用config.js中的配置
Zombie.prototype.setupProperties = function() {
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
    
    // 移动速度 - 从config.js获取并应用类型倍数
    var movementConfig = ConfigManager.get('MOVEMENT');
    this.moveSpeed = movementConfig.ZOMBIE_MOVE_SPEED * zombieTypeConfig.SPEED_MULTIPLIER;
    
    // 攻击范围 - 从config.js获取
    var combatConfig = ConfigManager.get('COMBAT');
    this.attackRange = combatConfig.ZOMBIE_ATTACK_RANGE;
    
    // 检测范围 - 从config.js获取
    var detectionConfig = ConfigManager.get('DETECTION');
    this.detectionRange = detectionConfig.ZOMBIE_DETECTION_RANGE;
    this.mainCharacterDetectionRange = detectionConfig.MAIN_CHARACTER_DETECTION;
};

// 统一的僵尸更新方法
Zombie.prototype.update = function(deltaTime, characters, currentFrame = 0) {
    // 检查死亡状态
    if (this.hp <= 0) {
        if (this.state !== ZOMBIE_STATE.DEAD) {
            this.state = ZOMBIE_STATE.DEAD;
            this.onEnterDead();
        }
        return false;
    }
    
    // 活性检查 - 但不要完全跳过更新
    if (characters && characters.length > 0) {
        var mainCharacter = characters.find(c => c.role === 1);
        if (mainCharacter) {
            this.updateActivationStatus(mainCharacter.x, mainCharacter.y);
        }
    }
    
    // 帧间隔更新 - 只影响AI逻辑，不影响动画
    if (!this._updateFrame) this._updateFrame = 0;
    this._updateFrame++;
    
    // 🔴 修复：减少更新间隔对AI的影响
    var shouldUpdateAI = this._updateFrame % this.updateInterval === 0;
    
    // 总是更新动画
    this.updateAnimation(deltaTime);
    
    // 如果不在更新间隔，只更新动画
    if (!shouldUpdateAI) {
        return true;
    }
    
    // 寻找目标
    this.findTarget(characters);
    
    // 执行状态行为
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
    }
    
    return true;
};


// 进入死亡状态
Zombie.prototype.onEnterDead = function() {
    this.deathAnimationTime = 0;
    this.deathAnimationDuration = 2.0;
    this.isMoving = false;
    this.targetCharacter = null;
};

// 更新死亡状态
Zombie.prototype.updateDead = function(deltaTime) {
    this.deathAnimationTime += deltaTime;
    if (this.deathAnimationTime >= this.deathAnimationDuration) {
        this.destroy();
    }
};

// 销毁僵尸
Zombie.prototype.destroy = function() {
    // 🔴 协调僵尸管理器：让僵尸管理器处理销毁逻辑
    if (window.zombieManager && window.zombieManager.destroyZombie) {
        window.zombieManager.destroyZombie(this);
        return;
    }
    
    // 备用方案：直接归还到对象池
    if (window.zombieManager && window.zombieManager.objectPool) {
        if (window.zombieManager.objectPool.return(this)) {
            console.log('✅ 僵尸已归还到对象池:', this.id);
            return;
        }
    }
    
    this._destroyed = true;
};

// 寻找目标
Zombie.prototype.findTarget = function(characters) {
    if (!this.isTargetValid()) {
        this.findNearestEnemy();
    }
    
    if (this.targetCharacter) {
        var distance = this.getDistanceTo(this.targetCharacter.x, this.targetCharacter.y);
        var attackJudgmentConfig = ConfigManager.get('COMBAT.ATTACK_JUDGMENT');
        var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;
        
        if (distance <= effectiveAttackRange) { // 使用带缓冲的攻击范围
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
Zombie.prototype.chaseTarget = function(deltaTime) {
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
    
    if (distance <= effectiveAttackRange) { // 使用带缓冲的攻击范围
        this.state = ZOMBIE_STATE.ATTACKING;
        return;
    }
    
    // 🔴 修复：增加更宽松的检测范围检查，避免僵尸轻易丢失目标
    var extendedDetectionRange = this.detectionRange * 1.5; // 扩展检测范围50%
    
    if (distance > extendedDetectionRange) {
        // 只有在距离很远时才清除目标
        this.targetCharacter = null;
        this.targetX = this.x;
        this.targetY = this.y;
        this.state = ZOMBIE_STATE.IDLE;
        return;
    }
    
    this.moveTowards(this.targetX, this.targetY, deltaTime);
};

// 攻击目标
Zombie.prototype.attackTarget = function(deltaTime) {
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
    
    if (distance > effectiveAttackRange) { // 使用带缓冲的攻击范围
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
Zombie.prototype.moveTowards = function(targetX, targetY, deltaTime) {
    var distanceToTarget = this.getDistanceTo(targetX, targetY);
    var attackJudgmentConfig = ConfigManager.get('COMBAT.ATTACK_JUDGMENT');
    var effectiveAttackRange = this.attackRange + attackJudgmentConfig.RANGE_BUFFER;
    
    if (distanceToTarget <= effectiveAttackRange) { // 使用带缓冲的攻击范围
        this.state = ZOMBIE_STATE.ATTACKING;
        return;
    }
    
    this.direction = Math.atan2(targetY - this.y, targetX - this.x);
    
    // 使用从config.js获取的移动速度
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
        
        this.state = ZOMBIE_STATE.WALKING;
    }
};

// 检查碰撞 - 优化版本，支持贴着建筑物移动
Zombie.prototype.checkCollision = function(fromX, fromY, toX, toY) {
    if (!window.collisionSystem) {
        return {x: toX, y: toY};
    }
    
    // 🔴 优化：使用贴着建筑物移动算法
    if (window.collisionSystem.getWallFollowingPosition) {
        var safePos = window.collisionSystem.getWallFollowingPosition(
            fromX, fromY, toX, toY, this.radius || 16, this.moveSpeed
        );
        
        if (safePos) {
            return safePos;
        }
    }
    
    // 备用方案：直接检查目标位置是否可行走
    if (window.collisionSystem.isPositionWalkable && window.collisionSystem.isPositionWalkable(toX, toY)) {
        return {x: toX, y: toY};
    }
    
    // 如果目标位置不可行走，返回起始位置
    return {x: fromX, y: fromY};
};

// 待机行为
Zombie.prototype.idleBehavior = function(deltaTime) {
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
    
    // 随机游荡 - 从config.js获取配置
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
        
        this.state = ZOMBIE_STATE.WALKING;
    }
};

// 更新动画
Zombie.prototype.updateAnimation = function(deltaTime) {
    if (this.state === ZOMBIE_STATE.WALKING || this.state === ZOMBIE_STATE.CHASING) {
        var animationConfig = ConfigManager.get('ANIMATION');
        this.animationFrame += this.animationSpeed * deltaTime;
        if (this.animationFrame >= animationConfig.MAX_ANIMATION_FRAMES) {
            this.animationFrame = 0;
        }
    }
};

// 受到伤害
Zombie.prototype.takeDamage = function(damage) {
    if (this.hp <= 0) return this.hp;
    
    var oldState = this.state;
    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;
    
    if (this.hp <= 0) {
        this.state = ZOMBIE_STATE.DEAD;
        return this.hp;
    }
    
    // 受伤时短暂停止移动
    if (this.state === ZOMBIE_STATE.WALKING || this.state === ZOMBIE_STATE.CHASING) {
        this.state = ZOMBIE_STATE.IDLE;
        
        // 延迟恢复移动
        setTimeout(() => {
            if (this.hp > 0 && this.state !== ZOMBIE_STATE.DEAD) {
                this.state = ZOMBIE_STATE.CHASING;
            }
        }, 500);
    }
    
    return this.hp;
};

// 寻找最近的敌人
Zombie.prototype.findNearestEnemy = function() {
    if (!window.characterManager) return;
    
    var allCharacters = window.characterManager.getAllCharacters().filter(c => c.hp > 0);
    if (allCharacters.length === 0) return;
    
    var nearestEnemy = null;
    var nearestDistance = Infinity;
    
    for (var i = 0; i < allCharacters.length; i++) {
        var character = allCharacters[i];
        var distance = this.getDistanceTo(character.x, character.y);
        
        var priority = character.role === 1 ? 0 : 1;
        
        if (distance <= this.detectionRange && 
            (distance < nearestDistance || 
             (distance === nearestDistance && priority < (nearestEnemy ? (nearestEnemy.role === 1 ? 0 : 1) : 1)))) {
            nearestDistance = distance;
            nearestEnemy = character;
        }
    }
    
    if (this.targetCharacter !== nearestEnemy) {
        this.targetCharacter = nearestEnemy;
        if (this.targetCharacter) {
            this.targetX = this.targetCharacter.x;
            this.targetY = this.targetCharacter.y;
        }
    }
};

// 检查目标是否有效
Zombie.prototype.isTargetValid = function() {
    if (!this.targetCharacter) return false;
    
    if (this.targetCharacter.hp <= 0) {
        this.targetCharacter = null;
        this.targetX = this.x;
        this.targetY = this.y;
        return false;
    }
    
    var distance = this.getDistanceTo(this.targetCharacter.x, this.targetCharacter.y);
    
    if (distance > this.detectionRange) {
        this.targetCharacter = null;
        this.targetX = this.x;
        this.targetY = this.y;
        return false;
    }
    
    this.targetX = this.targetCharacter.x;
    this.targetY = this.targetCharacter.y;
    return true;
};

// 更新活性状态
Zombie.prototype.updateActivationStatus = function(playerX, playerY) {
    var distance = this.getDistanceTo(playerX, playerY);
    var zombieBehaviorConfig = ConfigManager.get('ZOMBIE.BEHAVIOR');
    var wasActive = this.isActive;
    this.isActive = distance <= zombieBehaviorConfig.ACTIVATION_DISTANCE;
    
    if (this.isActive) {
        this.updateInterval = zombieBehaviorConfig.ACTIVE_UPDATE_INTERVAL;
        // 🔴 修复：只有在状态变化时才切换状态，避免频繁切换
        if (this.state === ZOMBIE_STATE.IDLE && this.targetCharacter && !wasActive) {
            this.state = ZOMBIE_STATE.CHASING;
            console.log('🧟‍♂️ 僵尸激活，开始追击:', this.id);
        }
        return true;
    } else {
        this.updateInterval = zombieBehaviorConfig.IDLE_UPDATE_INTERVAL;
        // 🔴 修复：即使未激活也保持当前状态，不要强制切换到IDLE
        return true; // 改为true，让僵尸继续更新
    }
};

// 工具方法
Zombie.prototype.getDistanceTo = function(targetX, targetY) {
    var dx = this.x - targetX;
    var dy = this.y - targetY;
    return Math.sqrt(dx * dx + dy * dy);
};

// 僵尸管理器
var ZombieManager = {
    maxZombies: ConfigManager.get('PERFORMANCE.MAX_ZOMBIES'),
    
    // 对象池引用
    objectPool: null,
    
    // 🔴 重构：移除内部存储，使用对象管理器作为唯一数据源
    // zombies: [], // 已移除，现在使用对象管理器
    
    // 初始化对象池
    initObjectPool: function() {
        if (!window.objectPoolManager) {
    
            return;
        }
        
        // 创建僵尸对象池
        this.objectPool = window.objectPoolManager.createPool('zombie', 
            // 创建函数
            () => new Zombie('skinny', 0, 0),
            // 重置函数
            (zombie) => this.resetZombie(zombie)
        );
        
        console.log('✅ 僵尸对象池初始化完成');
    },
    
    // 重置僵尸状态（对象池复用）
    resetZombie: function(zombie) {
        if (!zombie) return;
        
        // 重置基础属性
        zombie.hp = zombie.maxHp || 30;
        zombie.state = ZOMBIE_STATE.IDLE;
        zombie.targetX = zombie.x;
        zombie.y = zombie.y;
        zombie.targetCharacter = null;
        zombie.isActive = false;
        zombie.updateInterval = 1;
        zombie.lastAttackTime = 0;
        zombie.animationFrame = 0;
        zombie.direction = 0;
        
        // 🔴 修复：重新设置移动速度，确保从对象池复用的僵尸有正确的速度
        var movementConfig = window.ConfigManager ? window.ConfigManager.get('MOVEMENT') : null;
        var zombieConfig = window.ConfigManager ? window.ConfigManager.get('ZOMBIE') : null;
        var expectedSpeed = 5; // 默认基础速度
        
        if (movementConfig && zombieConfig && zombieConfig.TYPES && zombie.zombieType) {
            var zombieTypeConfig = zombieConfig.TYPES[zombie.zombieType.toUpperCase()];
            if (zombieTypeConfig) {
                expectedSpeed = movementConfig.ZOMBIE_MOVE_SPEED * zombieTypeConfig.SPEED_MULTIPLIER;
            } else {
                expectedSpeed = movementConfig.ZOMBIE_MOVE_SPEED; // 默认速度
            }
        } else {
            expectedSpeed = 5; // 备用默认速度
        }
        
        zombie.moveSpeed = expectedSpeed;
        
        // 🔴 新增：验证移动速度
        if (zombie.moveSpeed !== expectedSpeed) {
            console.warn('⚠️ 僵尸移动速度不一致:', zombie.moveSpeed, 'vs', expectedSpeed, '类型:', zombie.zombieType);
            zombie.moveSpeed = expectedSpeed;
        }
        
        // 重置性能相关
        zombie._updateFrame = 0;
        zombie._destroyed = false;
        
        console.log('✅ 僵尸状态重置完成:', zombie.id, '类型:', zombie.zombieType, '移动速度:', zombie.moveSpeed);
    },
    
            // 🔴 重构：创建僵尸 - 注册到对象管理器
        createZombie: function(type, x, y) {
        if (!window.collisionSystem) {
            console.error('碰撞系统未初始化');
            return null;
        }
        
        // 🔴 重构：使用对象管理器的计数方法
        if (!window.objectManager) {
            throw new Error('对象管理器未初始化');
        }
        
        var currentZombieCount = window.objectManager.getObjectCount('zombie');
        if (currentZombieCount >= this.maxZombies) {
            console.log('达到最大僵尸数量限制:', currentZombieCount, '/', this.maxZombies);
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
        
        // 🔴 协调对象池：优先使用对象池获取对象
        if (this.objectPool) {
            zombie = this.objectPool.get();
            if (zombie) {
                // 重新初始化僵尸属性
                zombie.zombieType = type;
                zombie.x = x;
                zombie.y = y;
                zombie.setupProperties();
                
                console.log('✅ 从对象池获取僵尸:', zombie.zombieType, '位置:', x, y);
            }
        }
        
        // 对象池不可用时，使用传统创建方式
        if (!zombie) {
            zombie = new Zombie(type, x, y);
            console.log('✅ 传统方式创建僵尸:', zombie.zombieType, '位置:', x, y);
        }
        
        // 🔴 重构：不再添加到内部存储，只注册到对象管理器
        
        // 🔴 协调对象管理器：注册新创建的僵尸
        if (zombie && window.objectManager) {
            window.objectManager.registerObject(zombie, 'zombie', zombie.id);
            console.log('✅ 僵尸已注册到对象管理器:', zombie.id);
        } else {
            throw new Error('对象管理器未初始化或僵尸创建失败');
        }
        
        // 🔴 协调四叉树：四叉树只负责空间索引，不管理对象生命周期
        if (window.collisionSystem && window.collisionSystem.addToSpatialIndex) {
            console.log('🔍 僵尸创建: 碰撞系统状态检查 - 僵尸ID:', zombie.id, '类型:', zombie.type, '位置:', zombie.x, zombie.y);
            console.log('🔍 碰撞系统状态:', {
                hasCollisionSystem: !!window.collisionSystem,
                hasAddToSpatialIndex: !!window.collisionSystem.addToSpatialIndex,
                hasDynamicQuadTree: !!window.collisionSystem.dynamicQuadTree,
                dynamicQuadTreeObjects: window.collisionSystem.dynamicQuadTree ? window.collisionSystem.dynamicQuadTree.getAllObjects().length : 'N/A'
            });
            
            var spatialIndexResult = window.collisionSystem.addToSpatialIndex(zombie);
            if (spatialIndexResult) {
                console.log('✅ 僵尸已添加到空间索引:', zombie.id);
                // 给僵尸添加空间索引ID标识
                zombie._spatialIndexId = Date.now() + Math.random();
            }
        }
        
        this.initializeZombieTarget(zombie);
        
        // 🔴 重构：不再添加到内部存储，对象管理器作为唯一数据源
        console.log('✅ 僵尸创建完成，已注册到对象管理器:', zombie.id);
        
        return zombie;
    },
    
    // 生成随机生成位置
    generateRandomSpawnPosition: function() {
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
        
        // 使用碰撞系统的安全位置生成方法
        if (window.collisionSystem && window.collisionSystem.generateGameSafePosition) {
            var safePosition = window.collisionSystem.generateGameSafePosition(
                centerX, centerY, minDistance, maxDistance, 32, 48, true
            );
            if (safePosition && safePosition.success) {
                return {x: safePosition.x, y: safePosition.y};
            }
        }
        
        // 备用方案：直接返回边缘位置
        return {x: 1000, y: 1000};
    },
    
    // 初始化僵尸目标
    initializeZombieTarget: function(zombie) {
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
            
            if (distance <= effectiveAttackRange) { // 使用带缓冲的攻击范围
                zombie.state = ZOMBIE_STATE.ATTACKING;
            } else if (distance <= zombie.detectionRange) { // 使用从config.js获取的检测范围
                zombie.state = ZOMBIE_STATE.CHASING;
            } else {
                zombie.state = ZOMBIE_STATE.IDLE;
            }
        } else {
            var randomAngle = Math.random() * Math.PI * 2;
            var randomDistance = 200 + Math.random() * 300;
            
            zombie.targetX = zombie.x + Math.cos(randomAngle) * randomDistance;
            zombie.targetY = zombie.y + Math.sin(randomAngle) * randomDistance;
            zombie.state = ZOMBIE_STATE.IDLE;
        }
    },
    
    // 验证生成位置
    validateSpawnPosition: function(x, y, zombieType) {
        if (!window.collisionSystem) {
            return {x: x, y: y};
        }
        
        var zombieWidth = zombieType === 'fat' || zombieType === 'boss' ? 48 : 32;
        var zombieHeight = zombieWidth;
        
        // 检查建筑物碰撞
        if (window.collisionSystem.isPositionWalkable && 
            !window.collisionSystem.isPositionWalkable(x, y)) {
            var collisionConfig = ConfigManager.get('COLLISION');
            var detectionConfig = ConfigManager.get('DETECTION');
            var safePosition = window.collisionSystem.generateGameSafePosition(
                x, y, collisionConfig.SAFE_SPAWN_DISTANCE, 
                detectionConfig.MAX_SPAWN_SEARCH_RADIUS, zombieWidth, zombieHeight
            );
            if (safePosition) {
                x = safePosition.x;
                y = safePosition.y;
            } else {
                return null;
            }
        }
        
        // 检查与角色距离
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
                            var safePosition = window.collisionSystem.generateGameSafePosition(
                                newX, newY, collisionConfig.SAFE_SPAWN_DISTANCE, 
                                detectionConfig.MAX_SPAWN_SEARCH_RADIUS, zombieWidth, zombieHeight
                            );
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
    updateAllZombies: function(characters, deltaTime, currentFrame = 0) {
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
        
        // 🔴 核心：从内部存储获取僵尸列表
        var zombies = this.getAllZombies();
        
        var activeZombies = zombies.filter(zombie => 
            zombie && zombie.hp > 0 && zombie.state !== ZOMBIE_STATE.DEAD
        );
        
        var currentBatch = currentFrame % 2; // 简化为2个批次
        var zombiesToUpdate = activeZombies.filter((zombie, index) => 
            index % 2 === currentBatch
        );
        
        var updatedCount = 0;
        zombiesToUpdate.forEach(zombie => {
            if (zombie.update(deltaTime, characters, currentFrame)) {
                updatedCount++;
            }
        });
        
        // 清理死亡僵尸
        var deadZombies = zombies.filter(zombie => zombie.hp <= 0 || zombie.state === ZOMBIE_STATE.DEAD);
        deadZombies.forEach(zombie => {
            // 🔴 协调对象池：优先使用对象池归还
            if (this.objectPool) {
                if (this.objectPool.return(zombie)) {
                    console.log('✅ 死亡僵尸已归还到对象池:', zombie.id);
                    return; // 使用return而不是continue
                }
            }
            
            // 对象池不可用时，使用传统销毁方式
            if (window.collisionSystem && window.collisionSystem.destroyZombieObject) {
                window.collisionSystem.destroyZombieObject(zombie);
            }
        });
    },
    
    // 🔴 重构：从对象管理器获取所有僵尸 - 对象管理器作为唯一数据源
    getAllZombies: function() {
        if (!window.objectManager) {
            throw new Error('对象管理器未初始化');
        }
        
        return window.objectManager.getAllZombies();
    },
    
    // 🔴 重构：从对象管理器获取活跃僵尸
    getActiveZombies: function(mainCharacter, maxDistance = 1000) {
        if (!mainCharacter) return [];
        
        var allZombies = this.getAllZombies();
        return allZombies.filter(zombie => {
            if (!zombie || zombie.hp <= 0 || zombie.state === ZOMBIE_STATE.DEAD || !zombie.isActive) {
                return false;
            }
            
            // 计算距离
            var distance = Math.sqrt(Math.pow(zombie.x - mainCharacter.x, 2) + Math.pow(zombie.y - mainCharacter.y, 2));
            return distance <= maxDistance;
        });
    },
    
    // 🔴 重构：从对象管理器获取批次信息
    getBatchInfo: function(currentFrame) {
        var allZombies = this.getAllZombies();
        var activeZombies = allZombies.filter(zombie => 
            zombie && zombie.hp > 0 && zombie.state !== ZOMBIE_STATE.DEAD
        );
        
        var currentBatch = currentFrame % 2;
        
        return {
            totalActive: activeZombies.length,
            currentBatch: currentBatch,
            nextBatch: (currentBatch + 1) % 2,
            batchSize: 2
        };
    },
    
    // 🔴 核心：销毁僵尸 - 从内部存储移除，协调对象池和四叉树
    destroyZombie: function(zombie) {
        if (!zombie) return;
        
        console.log('🗑️ 销毁僵尸:', zombie.id, '类型:', zombie.zombieType);
        
        // 🔴 协调对象管理器：从对象管理器中移除
        if (window.objectManager) {
            const destroyResult = window.objectManager.destroyObject(zombie.id);
            if (destroyResult) {
                console.log('✅ 僵尸已从对象管理器移除:', zombie.id);
            } else {
                console.warn('⚠️ 僵尸从对象管理器移除失败:', zombie.id);
            }
        }
        
        // 🔴 协调四叉树：从空间索引中移除（不管理对象生命周期）
        if (window.collisionSystem && window.collisionSystem.removeFromSpatialIndex) {
            var removeResult = window.collisionSystem.removeFromSpatialIndex(zombie);
            if (removeResult) {
                console.log('✅ 僵尸已从空间索引移除:', zombie.id);
            }
        }
        
        // 🔴 协调对象池：使用对象池管理对象生命周期
        if (this.objectPool) {
            // 重置僵尸状态
            zombie.hp = 0;
            zombie.state = 'dead';
            zombie.isActive = false;
            
            // 归还到对象池
            this.objectPool.return(zombie);
            console.log('✅ 僵尸已归还到对象池:', zombie.id);
        } else {
            // 对象池不可用时，直接删除引用
            zombie.isActive = false;
            console.log('✅ 僵尸已标记为非活跃:', zombie.id);
        }
        
        // 🔴 重构：对象已通过对象管理器销毁，无需从内部列表移除
        console.log('✅ 僵尸已通过对象管理器销毁:', zombie.id);
    }
};

// 导出
export {ZOMBIE_TYPE, ZOMBIE_STATE};
export {ZombieManager};
export default Zombie;

