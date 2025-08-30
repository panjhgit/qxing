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
import UtilsManager from './utils.js';

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
    this.moveSpeed = movementConfig.ZOMBIE_MOVE_SPEED;
    this.currentMoveSpeed = this.moveSpeed;
    
    // 攻击和检测范围
    this.attackRange = config.attackRange + this.radius + 16 + Math.round(config.attackRange * 0.1);
    this.detectionRange = config.detectionRange;
    
    var detectionConfig = ConfigManager.get('DETECTION');
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

// 获取更新间隔
Zombie.prototype.getUpdateInterval = function() {
    return 1; // 所有僵尸每帧更新，提高响应性
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
    if (window.collisionSystem && window.collisionSystem.destroyZombieObject) {
        window.collisionSystem.destroyZombieObject(this);
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
    var moveDistance = this.currentMoveSpeed * deltaTime;
    
    if (moveDistance > 0) {
        var newX = this.x + Math.cos(this.direction) * moveDistance;
        var newY = this.y + Math.sin(this.direction) * moveDistance;
        
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
    }
};

// 检查碰撞
Zombie.prototype.checkCollision = function(fromX, fromY, toX, toY) {
    if (!window.collisionSystem) {
        return {x: toX, y: toY};
    }
    
    var buildingSafePos = window.collisionSystem.getCircleSafeMovePosition(fromX, fromY, toX, toY, this.radius);
    return buildingSafePos || {x: fromX, y: fromY};
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
        
        if (window.collisionSystem && window.collisionSystem.isCircleCollidingWithBuildings) {
            if (window.collisionSystem.isCircleCollidingWithBuildings(this.targetX, this.targetY, this.radius)) {
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
    
    // 创建僵尸
    createZombie: function(type, x, y) {
        if (!window.collisionSystem) {
            console.error('碰撞系统未初始化');
            return null;
        }
        
        var currentZombieCount = window.collisionSystem.getDynamicObjectCountByType('zombie');
        if (currentZombieCount >= this.maxZombies) {
            console.warn('僵尸数量已达上限');
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
        
        var zombie = new Zombie(type, x, y);
        
        if (window.collisionSystem.createZombieObject) {
            var createdZombie = window.collisionSystem.createZombieObject(zombie);
            if (createdZombie) {
                this.initializeZombieTarget(createdZombie);
                return createdZombie;
            }
        }
        
        return null;
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
        if (window.collisionSystem.isCircleCollidingWithBuildings && 
            window.collisionSystem.isCircleCollidingWithBuildings(x, y, zombieWidth / 2)) {
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
        
        var zombies = [];
        if (window.collisionSystem && window.collisionSystem.getAllZombies) {
            zombies = window.collisionSystem.getAllZombies();
        } else {
            return;
        }
        
        var activeZombies = zombies.filter(zombie => 
            zombie && zombie.hp > 0 && zombie.state !== ZOMBIE_STATE.DEAD
        );
        
        var currentBatch = currentFrame % 2; // 简化为2个批次
        var zombiesToUpdate = activeZombies.filter((zombie, index) => 
            index % 2 === currentBatch
        );
        
        var updatedCount = 0;
        zombiesToUpdate.forEach(zombie => {
            try {
                if (zombie.update(deltaTime, characters, currentFrame)) {
                    updatedCount++;
                }
            } catch (error) {
                console.error('僵尸更新出错:', zombie.type, zombie.id, '错误:', error);
                zombie.state = ZOMBIE_STATE.IDLE;
            }
        });
        
        // 清理死亡僵尸
        var deadZombies = zombies.filter(zombie => zombie.hp <= 0 || zombie.state === ZOMBIE_STATE.DEAD);
        deadZombies.forEach(zombie => {
            if (window.collisionSystem && window.collisionSystem.destroyZombieObject) {
                try {
                    window.collisionSystem.destroyZombieObject(zombie);
                } catch (error) {
                    console.error('销毁僵尸失败:', zombie.type, zombie.id, '错误:', error);
                }
            }
        });
    },
    
    // 获取所有僵尸
    getAllZombies: function() {
        if (!window.collisionSystem) {
            return [];
        }
        
        if (!window.collisionSystem.getAllZombies) {
            return [];
        }
        
        return window.collisionSystem.getAllZombies();
    },
    
    // 获取活跃僵尸
    getActiveZombies: function(mainCharacter) {
        if (!mainCharacter) return [];
        
        var allZombies = this.getAllZombies();
        return allZombies.filter(zombie => 
            zombie && 
            zombie.hp > 0 && 
            zombie.state !== ZOMBIE_STATE.DEAD &&
            zombie.isActive
        );
    },
    
    // 获取批次信息
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
    }
};

// 导出
export {ZOMBIE_TYPE, ZOMBIE_STATE};
export {ZombieManager};
export default Zombie;

