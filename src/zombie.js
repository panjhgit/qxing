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

// 僵尸配置模板
const ZOMBIE_CONFIGS = {
    [ZOMBIE_TYPE.SKINNY]: { hp: 30, attack: 15, size: 32, color: '#8B4513', attackRange: 40, detectionRange: 200 },
    [ZOMBIE_TYPE.FAT]: { hp: 60, attack: 25, size: 48, color: '#654321', attackRange: 50, detectionRange: 200 },
    [ZOMBIE_TYPE.BOSS]: { hp: 200, attack: 50, size: 48, color: '#8B0000', attackRange: 80, detectionRange: 300 },
    [ZOMBIE_TYPE.FAST]: { hp: 20, attack: 10, size: 32, color: '#228B22', attackRange: 30, detectionRange: 250 },
    [ZOMBIE_TYPE.TANK]: { hp: 150, attack: 35, size: 48, color: '#2F4F4F', attackRange: 60, detectionRange: 150 }
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
    
    // 性能相关
    this.isActive = false;
    this.updateInterval = 1;
    
    // 战斗属性
    var combatConfig = ConfigManager.get('COMBAT');
    this.lastAttackTime = 0;
    this.attackCooldown = combatConfig.DEFAULT_ATTACK_COOLDOWN;
    
    // 动画属性
    var animationConfig = ConfigManager.get('ANIMATION');
    this.animationFrame = 0;
    this.animationSpeed = animationConfig.DEFAULT_FRAME_RATE;
    this.direction = 0;
};

// 设置僵尸属性 - 使用配置模板
Zombie.prototype.setupProperties = function() {
    var difficultyConfig = ConfigManager.getDifficultyConfig();
    var config = ZOMBIE_CONFIGS[this.zombieType] || ZOMBIE_CONFIGS[ZOMBIE_TYPE.SKINNY];
    
    // 应用难度系数
    this.hp = Math.round(config.hp * difficultyConfig.ZOMBIE_HP_MULTIPLIER);
    this.maxHp = this.hp;
    this.attack = Math.round(config.attack * difficultyConfig.ZOMBIE_ATTACK_MULTIPLIER);
    
    // 基础属性
    this.size = config.size;
    this.width = config.size;
    this.height = config.size;
    this.radius = this.size / 2;
    this.color = config.color;
    this.icon = '🧟‍♂️';
    
    // 移动和检测
    var movementConfig = ConfigManager.get('MOVEMENT');
    // 移动速度已固定为5px，不再需要动态配置
    
    // 攻击和检测范围
    this.attackRange = config.attackRange + this.radius + 16 + Math.round(config.attackRange * 0.1);
    
    // 使用config.js中的检测范围配置，而不是模板中的值
    var detectionConfig = ConfigManager.get('DETECTION');
    this.detectionRange = detectionConfig.ZOMBIE_DETECTION_RANGE; // 使用700px的配置
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
    
    // 活性检查
    if (characters && characters.length > 0) {
        var mainCharacter = characters.find(c => c.role === 1);
        if (mainCharacter && !this.updateActivationStatus(mainCharacter.x, mainCharacter.y)) {
            return false;
        }
    }
    
    // 帧间隔更新
    if (!this._updateFrame) this._updateFrame = 0;
    this._updateFrame++;
    
    if (this._updateFrame % this.updateInterval !== 0) {
        this.updateAnimation(deltaTime);
        return false;
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
    
    this.updateAnimation(deltaTime);
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
        
        if (distance <= this.attackRange) {
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
    
    if (distance <= this.attackRange) {
        this.state = ZOMBIE_STATE.ATTACKING;
        return;
    }
    
    if (distance > this.detectionRange) {
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
    
    if (distance > this.attackRange) {
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
    
    if (distanceToTarget <= this.attackRange) {
        this.state = ZOMBIE_STATE.ATTACKING;
        return;
    }
    
    this.direction = Math.atan2(targetY - this.y, targetX - this.x);
    
    // 每帧直接移动，从配置文件读取僵尸移动速度
    var movementConfig = ConfigManager.get('MOVEMENT');
    var moveSpeed = movementConfig ? movementConfig.ZOMBIE_MOVE_SPEED : 5; // 从配置读取僵尸移动速度
    var newX = this.x + Math.cos(this.direction) * moveSpeed;
    var newY = this.y + Math.sin(this.direction) * moveSpeed;
    
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
        var moveSpeed = window.ConfigManager ? window.ConfigManager.get('MOVEMENT.ZOMBIE_MOVE_SPEED') : 4;
        var safePos = window.collisionSystem.getWallFollowingPosition(
            fromX, fromY, toX, toY, this.radius || 16, moveSpeed
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
    
    // 随机游荡
    if (Math.random() < 0.1) {
        this.direction = Math.random() * Math.PI * 2;
        var targetDistance = 50 + Math.random() * 100;
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
    this.isActive = distance <= 1200;
    
    if (this.isActive) {
        this.updateInterval = 1;
        if (this.state === ZOMBIE_STATE.IDLE && this.targetCharacter) {
            this.state = ZOMBIE_STATE.CHASING;
        }
        return true;
    } else {
        this.updateInterval = 5;
        return false;
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
    
    // 🔴 核心：内部存储的僵尸列表 - 僵尸业务逻辑的唯一数据源
    zombies: [],
    
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
        
        // 重置性能相关
        zombie._updateFrame = 0;
        zombie._destroyed = false;
        
        console.log('✅ 僵尸状态重置完成:', zombie.id);
    },
    
    // 🔴 核心：创建僵尸 - 添加到内部存储
    createZombie: function(type, x, y) {
        if (!window.collisionSystem) {
            console.error('碰撞系统未初始化');
            return null;
        }
        
        // 🔴 核心：使用僵尸管理器自己的计数方法（遵循职责分离）
        var currentZombieCount = this.zombies.filter(z => z && z.hp > 0).length;
        if (currentZombieCount >= this.maxZombies) {
    
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
        
        // 🔴 核心：添加到内部存储 - 僵尸业务逻辑的唯一数据源
        this.zombies.push(zombie);
        
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
            
            if (distance <= zombie.attackRange) {
                zombie.state = ZOMBIE_STATE.ATTACKING;
            } else if (distance <= 700) {
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
    
    // 🔴 核心：获取所有僵尸 - 从内部存储获取（遵循职责分离）
    getAllZombies: function() {
        return this.zombies.filter(zombie => zombie && zombie.hp > 0);
    },
    
    // 🔴 核心：获取活跃僵尸 - 从内部存储获取
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
    
    // 🔴 核心：获取批次信息 - 从内部存储获取
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
        
        // 🔴 核心：从僵尸列表中移除 - 僵尸业务逻辑的唯一数据源
        var index = this.zombies.indexOf(zombie);
        if (index > -1) {
            this.zombies.splice(index, 1);
            console.log('✅ 僵尸已从列表移除:', zombie.id);
        }
    }
};

// 导出
export {ZOMBIE_TYPE, ZOMBIE_STATE};
export {ZombieManager};
export default Zombie;

