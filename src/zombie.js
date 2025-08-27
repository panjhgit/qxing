/**
 * 僵尸模块 - 重构版本 (zombie.js)
 *
 * 重构内容：
 * - 使用ConfigManager统一管理配置
 * - 使用UtilsManager提供工具函数
 * - 消除重复的硬编码值
 * - 提高代码复用性和维护性
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
    this.targetX = x;
    this.targetY = y;
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

// 更新僵尸AI
Zombie.prototype.update = function (characters, deltaTime) {
    if (this.hp <= 0) {
        this.state = ZOMBIE_STATE.DEAD;
        return;
    }

    // 寻找目标
    this.findTarget(characters);

    // 根据状态执行行为
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
        var distance = mathUtils.distanceBetween(this, mainCharacter);

        // 使用配置的检测范围主动追击主人物
        if (distance <= this.mainCharacterDetectionRange) {
            this.targetCharacter = mainCharacter;
            this.targetX = mainCharacter.x;
            this.targetY = mainCharacter.y;

            if (distance <= this.attackRange) {
                this.state = ZOMBIE_STATE.ATTACKING;
            } else {
                this.state = ZOMBIE_STATE.CHASING;
            }

            console.log('僵尸', this.type, '发现主人物，距离:', distance, '状态:', this.state);
            return;
        }
    }

    // 如果没有主人物目标，寻找其他角色
    if (this.targetCharacter && this.targetCharacter.hp > 0) {
        var distance = mathUtils.distanceBetween(this, this.targetCharacter);
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
            var distance = mathUtils.distanceBetween(this, character);
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
    }
};

// 追击目标 - 使用工具类
Zombie.prototype.chaseTarget = function (deltaTime) {
    if (!this.targetCharacter || this.targetCharacter.hp <= 0) {
        this.state = ZOMBIE_STATE.IDLE;
        return;
    }

    // 更新目标位置
    this.targetX = this.targetCharacter.x;
    this.targetY = this.targetCharacter.y;

    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distanceBetween(this, this.targetCharacter);

    if (distance <= this.attackRange) {
        this.state = ZOMBIE_STATE.ATTACKING;
        return;
    }

    console.log('僵尸', this.type, '追击中，距离目标:', distance, '移动速度:', this.moveSpeed);

    // 移动向目标
    this.moveTowards(this.targetX, this.targetY, deltaTime);
};

// 攻击目标
Zombie.prototype.attackTarget = function (deltaTime) {
    if (!this.targetCharacter || this.targetCharacter.hp <= 0) {
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
    var mathUtils = UtilsManager.getMathUtils();
    var distance = mathUtils.distanceBetween(this, this.targetCharacter);
    if (distance > this.attackRange) {
        this.state = ZOMBIE_STATE.CHASING;
    }
};

// 向目标移动 - 使用工具类
Zombie.prototype.moveTowards = function (targetX, targetY, deltaTime) {
    var mathUtils = UtilsManager.getMathUtils();
    var movementUtils = UtilsManager.getMovementUtils();
    var collisionConfig = ConfigManager.get('COLLISION');
    
            // 使用移动工具计算移动向量 - 确保平滑移动
        var moveVector = movementUtils.calculateMoveVector(
            this.x, this.y, targetX, targetY, this.moveSpeed, deltaTime
        );
    
    if (moveVector.distance > 0 || moveVector.reached) {
        // 计算移动方向
        this.direction = mathUtils.angle(this.x, this.y, targetX, targetY);

        // 直接使用计算好的移动向量（已经是基于时间的匀速移动）
        console.log('僵尸', this.type, '移动计算:', '从', this.x, this.y, '到', 
                   this.x + moveVector.x, this.y + moveVector.y, '移动向量:', moveVector);

        // 使用简化的碰撞检测，支持墙体滑动
        // 获取所有僵尸和人物列表（排除自己）
        var allZombies = [];
        var allCharacters = [];

        // 从僵尸管理器获取所有僵尸（排除自己）
        if (window.zombieManager && window.zombieManager.getAllZombies) {
            allZombies = window.zombieManager.getAllZombies().filter(z => z.hp > 0 && z.id !== this.id);
        }

        // 从角色管理器获取所有人物
        if (window.characterManager && window.characterManager.getAllCharacters) {
            allCharacters = window.characterManager.getAllCharacters();
        }

        // 使用专门优化的碰撞检测方法
        var validPosition = null;
        
        if (window.collisionSystem.getCircleSafeMovePosition) {
            // 首先检查建筑物碰撞
            var buildingSafePos = window.collisionSystem.getCircleSafeMovePosition(
                this.x, this.y, this.x + moveVector.x, this.y + moveVector.y, this.radius
            );
            
            if (buildingSafePos && buildingSafePos.x === this.x + moveVector.x && buildingSafePos.y === this.y + moveVector.y) {
                // 建筑物碰撞检测通过，现在检查动态对象碰撞
                if (window.collisionSystem.isZombieOverlappingWithZombies && 
                    window.collisionSystem.isCharacterOverlappingWithZombies) {
                    
                    // 检查是否与僵尸重叠
                    var zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(
                        buildingSafePos.x, buildingSafePos.y, this.radius, allZombies, 0.1
                    );
                    
                    // 检查是否与人物重叠
                    var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(
                        buildingSafePos.x, buildingSafePos.y, this.radius, allCharacters, 0.1
                    );
                    
                    if (!zombieOverlap && !characterOverlap) {
                        validPosition = buildingSafePos;
                    }
                } else {
                    validPosition = buildingSafePos;
                }
            } else if (buildingSafePos && buildingSafePos.type && buildingSafePos.type.startsWith('slide')) {
                // 墙体滑动，也需要检查动态对象碰撞
                if (window.collisionSystem.isZombieOverlappingWithZombies && 
                    window.collisionSystem.isCharacterOverlappingWithZombies) {
                    
                    var zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(
                        buildingSafePos.x, buildingSafePos.y, this.radius, allZombies, 0.1
                    );
                    
                    var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(
                        buildingSafePos.x, buildingSafePos.y, this.radius, allCharacters, 0.1
                    );
                    
                    if (!zombieOverlap && !characterOverlap) {
                        validPosition = buildingSafePos;
                    }
                } else {
                    validPosition = buildingSafePos;
                }
            } else if (buildingSafePos) {
                // 非滑动移动，也需要检查动态对象碰撞
                if (window.collisionSystem.isZombieOverlappingWithZombies && 
                    window.collisionSystem.isCharacterOverlappingWithZombies) {
                    
                    var zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(
                        buildingSafePos.x, buildingSafePos.y, this.radius, allZombies, 0.1
                    );
                    
                    var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(
                        buildingSafePos.x, buildingSafePos.y, this.radius, allCharacters, 0.1
                    );
                    
                    if (!zombieOverlap && !characterOverlap) {
                        validPosition = buildingSafePos;
                    }
                } else {
                    validPosition = buildingSafePos;
                }
            }
        } else {
            // 如果新的碰撞检测方法不可用，停止移动
            console.warn('碰撞系统不支持新的碰撞检测方法，僵尸停止移动');
            validPosition = null;
        }

        // 如果位置安全，直接移动；如果不安全，尝试墙体滑动
        if (validPosition) {
            // 位置安全，可以移动
            var oldX = this.x, oldY = this.y;
            this.x = validPosition.x;
            this.y = validPosition.y;

            // 更新四叉树中的位置
            if (window.collisionSystem.updateDynamicObjectPosition) {
                window.collisionSystem.updateDynamicObjectPosition(this, oldX, oldY, this.x, this.y);
            }
            
            // 记录移动类型（用于调试）
            if (validPosition.type && validPosition.type.startsWith('slide')) {
                console.log('僵尸墙体滑动:', validPosition.type, '位置:', validPosition.x.toFixed(2), validPosition.y.toFixed(2));
            } else {
                console.log('僵尸正常移动:', validPosition.x.toFixed(2), validPosition.y.toFixed(2));
            }
        } else {
            // 位置不安全，停止移动
            console.log('僵尸移动被阻挡，停止移动');
        }

        this.state = ZOMBIE_STATE.WALKING;
    }
};

// 待机行为 - 使用工具类
Zombie.prototype.idleBehavior = function (deltaTime) {
    var mathUtils = UtilsManager.getMathUtils();
    var collisionConfig = ConfigManager.get('COLLISION');
    
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
                window.collisionSystem.isZombieOverlappingWithZombies(this.targetX, this.targetY, this.radius, allZombies, 0.1);
            
            var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies && 
                window.collisionSystem.isCharacterOverlappingWithZombies(this.targetX, this.targetY, this.radius, allCharacters, 0.1);
            
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
    
    if (!validationUtils.validateRange(damage, 0, 1000, '伤害值')) {
        console.warn('无效的伤害值:', damage);
        return this.hp;
    }
    
    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;

    // 受伤时短暂停止移动
    if (this.state === ZOMBIE_STATE.WALKING || this.state === ZOMBIE_STATE.CHASING) {
        this.state = ZOMBIE_STATE.IDLE;
        setTimeout(() => {
            if (this.hp > 0) {
                this.state = ZOMBIE_STATE.CHASING;
            }
        }, 500);
    }

    return this.hp;
};

// 获取到目标的距离 - 使用工具类
Zombie.prototype.getDistanceTo = function (target) {
    var mathUtils = UtilsManager.getMathUtils();
    return mathUtils.distanceBetween(this, target);
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

// 僵尸管理器
var ZombieManager = {
    zombies: [], 
    maxZombies: ConfigManager.get('PERFORMANCE.MAX_ZOMBIES'),
    difficulty: 1,

    // 创建僵尸
    createZombie: function (type, x, y) {
        var validationUtils = UtilsManager.getValidationUtils();
        var performanceUtils = UtilsManager.getPerformanceUtils();
        
        if (this.zombies.length >= this.maxZombies) {
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
            this.zombies.push(zombie);

            // 将僵尸添加到碰撞系统的动态四叉树
            if (window.collisionSystem && window.collisionSystem.addDynamicObject) {
                window.collisionSystem.addDynamicObject(zombie);
                console.log('僵尸已添加到碰撞系统动态四叉树:', zombie.type, zombie.id);
            }

            return zombie;
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
        var existingZombies = this.zombies.filter(z => z.hp > 0);
        if (existingZombies.length > 0) {
            if (window.collisionSystem && window.collisionSystem.isZombieOverlappingWithZombies) {
                var zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(x, y, zombieWidth/2, existingZombies, 0.1);
                if (zombieOverlap) {
                    console.log('僵尸生成位置与现有僵尸重叠，寻找新位置');
                    var safePosition = this.findNonOverlappingPosition(x, y, zombieWidth, zombieHeight, existingZombies);
                    if (safePosition) {
                        x = safePosition.x;
                        y = safePosition.y;
                    } else {
                        console.warn('无法找到不与僵尸重叠的位置');
                        return null;
                    }
                }
            } else {
                console.warn('碰撞系统不支持僵尸重叠检测，跳过重叠检查');
            }
        }

        // 验证步骤3：检查是否与人物重叠
        if (window.characterManager && window.characterManager.getAllCharacters) {
            var allCharacters = window.characterManager.getAllCharacters();
            if (allCharacters && allCharacters.length > 0) {
                if (window.collisionSystem && window.collisionSystem.isCharacterOverlappingWithZombies) {
                    var characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(x, y, zombieWidth/2, allCharacters, 0.1);
                    if (characterOverlap) {
                        console.log('僵尸生成位置与人物重叠，寻找远离人物的位置');
                        var safePosition = this.findCharacterSafePosition(x, y, zombieWidth, zombieHeight, allCharacters);
                        if (safePosition) {
                            x = safePosition.x;
                            y = safePosition.y;
                        } else {
                            console.warn('无法找到远离人物的安全位置');
                            return null;
                        }
                    }
                } else {
                    console.warn('碰撞系统不支持人物僵尸重叠检测，跳过重叠检查');
                }
            }
        }

        // 验证步骤4：最终安全检查
        if (window.collisionSystem.isCircleCollidingWithBuildings && 
            window.collisionSystem.isCircleCollidingWithBuildings(x, y, zombieWidth/2)) {
            console.warn('最终位置仍在建筑物内，生成失败');
            return null;
        }

        console.log('僵尸生成位置验证完成:', x, y, '类型:', zombieType);
        return {x: x, y: y};
    },

    // 寻找不与僵尸重叠的位置（使用新的专门优化方法）
    findNonOverlappingPosition: function (centerX, centerY, width, height, zombies) {
        var searchRadius = 100;
        var searchStep = 20;
        var maxAttempts = 50;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            var angle = (attempt * Math.PI * 2) / maxAttempts;
            var distance = searchRadius + (attempt % 5) * searchStep;

            var testX = centerX + Math.cos(angle) * distance;
            var testY = centerY + Math.sin(angle) * distance;

            // 使用新的专门优化方法检查位置是否安全
            var zombieOverlap = false;
            var buildingCollision = false;
            
            if (window.collisionSystem && window.collisionSystem.isZombieOverlappingWithZombies) {
                zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(testX, testY, width/2, zombies, 0.1);
            } else {
                console.warn('碰撞系统不支持僵尸重叠检测');
                return null;
            }
            
            if (window.collisionSystem && window.collisionSystem.isCircleCollidingWithBuildings) {
                buildingCollision = window.collisionSystem.isCircleCollidingWithBuildings(testX, testY, width/2);
            }
            
            if (!zombieOverlap && !buildingCollision) {
                return {x: testX, y: testY};
            }
        }

        return null;
    },

    // 寻找远离人物的安全位置（使用新的专门优化方法）
    findCharacterSafePosition: function (centerX, centerY, width, height, characters) {
        var searchRadius = 200;
        var searchStep = 30;
        var maxAttempts = 60;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            var angle = (attempt * Math.PI * 2) / maxAttempts;
            var distance = searchRadius + (attempt % 6) * searchStep;

            var testX = centerX + Math.cos(angle) * distance;
            var testY = centerY + Math.sin(angle) * distance;

            // 使用新的专门优化方法检查位置是否安全
            var characterOverlap = false;
            var zombieOverlap = false;
            var buildingCollision = false;
            
            if (window.collisionSystem && window.collisionSystem.isCharacterOverlappingWithZombies) {
                characterOverlap = window.collisionSystem.isCharacterOverlappingWithZombies(testX, testY, width/2, characters, 0.1);
            } else {
                console.warn('碰撞系统不支持人物僵尸重叠检测');
                return null;
            }
            
            if (window.collisionSystem && window.collisionSystem.isZombieOverlappingWithZombies) {
                zombieOverlap = window.collisionSystem.isZombieOverlappingWithZombies(testX, testY, width/2, this.zombies.filter(z => z.hp > 0), 0.1);
            } else {
                console.warn('碰撞系统不支持僵尸重叠检测');
                return null;
            }
            
            if (window.collisionSystem && window.collisionSystem.isCircleCollidingWithBuildings) {
                buildingCollision = window.collisionSystem.isCircleCollidingWithBuildings(testX, testY, width/2);
            }
            
            if (!characterOverlap && !zombieOverlap && !buildingCollision) {
                return {x: testX, y: testY};
            }
        }

        return null;
    },

    // 更新所有僵尸
    updateAllZombies: function (characters, deltaTime) {
        var performanceUtils = UtilsManager.getPerformanceUtils();
        
        console.log('更新僵尸，数量:', this.zombies.length, '角色数量:', characters.length);

        // 使用性能工具测量更新时间
        performanceUtils.startTimer('updateAllZombies');

        // 更新僵尸
        this.zombies.forEach(zombie => {
            zombie.update(characters, deltaTime);
        });

        // 清理死亡僵尸，并从碰撞系统中移除
        var deadZombies = this.zombies.filter(zombie => zombie.hp <= 0);
        if (deadZombies.length > 0 && window.collisionSystem && window.collisionSystem.removeDynamicObject) {
            deadZombies.forEach(zombie => {
                window.collisionSystem.removeDynamicObject(zombie);
                console.log('死亡僵尸已从碰撞系统移除:', zombie.type, zombie.id);
            });
        }

        this.zombies = this.zombies.filter(zombie => zombie.hp > 0);
        
        var updateTime = performanceUtils.endTimer('updateAllZombies');
        if (updateTime > 16) { // 超过16ms（60fps）
            console.warn('僵尸更新耗时过长:', updateTime.toFixed(2), 'ms');
        }
    },

    // 获取所有僵尸
    getAllZombies: function () {
        return this.zombies;
    }
};

// 导出枚举和类
export {ZOMBIE_TYPE, ZOMBIE_STATE};
export {ZombieManager};
export default Zombie;

