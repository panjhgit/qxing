/**
 * 僵尸模块 (zombie.js)
 * 
 * 功能描述：
 * - 基础僵尸类：生命值、攻击力、移动速度等基本属性
 * - 僵尸类型：瘦僵尸、胖僵尸、僵尸Boss等不同类型
 * - 僵尸AI：寻路、攻击、群体行为等智能系统
 * - 僵尸管理器：生成、更新、销毁僵尸的统一管理
 * - 僵尸渲染：不同类型僵尸的视觉表现
 * - 难度调节：根据游戏进度调整僵尸强度和数量
 */

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
var Zombie = function(type, x, y) {
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
    this.lastAttackTime = 0;
    this.attackCooldown = 1000; // 攻击冷却时间（毫秒）
    
    // 动画属性
    this.animationFrame = 0;
    this.animationSpeed = 0.1;
    this.direction = 0; // 朝向角度
};

// 设置僵尸属性
Zombie.prototype.setupProperties = function() {
    switch(this.type) {
        case ZOMBIE_TYPE.SKINNY:
            this.hp = 30;
            this.maxHp = 30;
            this.attack = 15;
            this.moveSpeed = 120; // 与人物相同的移动速度 (2 * 60帧)
            this.attackRange = 40;
            this.detectionRange = 200;
            this.mainCharacterDetectionRange = 1000; // 对主人物的检测范围
            this.icon = '🧟‍♂️';
            this.color = '#8B4513';
            this.size = 24;
            this.width = 24;
            this.height = 24;
            break;
            
        case ZOMBIE_TYPE.FAT:
            this.hp = 60;
            this.maxHp = 60;
            this.attack = 25;
            this.moveSpeed = 120; // 与人物相同的移动速度 (2 * 60帧)
            this.attackRange = 50;
            this.detectionRange = 180;
            this.mainCharacterDetectionRange = 1000; // 对主人物的检测范围
            this.icon = '🧟‍♂️';
            this.color = '#654321';
            this.size = 32;
            this.width = 32;
            this.height = 32;
            break;
            
        case ZOMBIE_TYPE.BOSS:
            this.hp = 200;
            this.maxHp = 200;
            this.attack = 50;
            this.moveSpeed = 120; // 与人物相同的移动速度 (2 * 60帧)
            this.attackRange = 80;
            this.detectionRange = 300;
            this.mainCharacterDetectionRange = 1000; // 对主人物的检测范围
            this.icon = '🧟‍♂️';
            this.color = '#8B0000';
            this.size = 48;
            this.width = 48;
            this.height = 48;
            break;
            
        case ZOMBIE_TYPE.FAST:
            this.hp = 20;
            this.maxHp = 20;
            this.attack = 10;
            this.moveSpeed = 120; // 与人物相同的移动速度 (2 * 60帧)
            this.attackRange = 30;
            this.detectionRange = 250;
            this.mainCharacterDetectionRange = 1000; // 对主人物的检测范围
            this.icon = '🧟‍♂️';
            this.color = '#228B22';
            this.size = 20;
            this.width = 20;
            this.height = 20;
            break;
            
        case ZOMBIE_TYPE.TANK:
            this.hp = 150;
            this.maxHp = 150;
            this.attack = 35;
            this.moveSpeed = 120; // 与人物相同的移动速度 (2 * 60帧)
            this.attackRange = 60;
            this.detectionRange = 150;
            this.mainCharacterDetectionRange = 1000; // 对主人物的检测范围
            this.icon = '🧟‍♂️';
            this.color = '#2F4F4F';
            this.size = 40;
            this.width = 40;
            this.height = 40;
            break;
            
        default:
            this.hp = 40;
            this.maxHp = 40;
            this.attack = 20;
            this.moveSpeed = 120; // 与人物相同的移动速度 (2 * 60帧)
            this.attackRange = 45;
            this.detectionRange = 200;
            this.mainCharacterDetectionRange = 1000; // 对主人物的检测范围
            this.icon = '🧟‍♂️';
            this.color = '#696969';
            this.size = 28;
            this.width = 28;
            this.height = 28;
    }
};

// 更新僵尸AI
Zombie.prototype.update = function(characters, deltaTime) {
    if (this.hp <= 0) {
        this.state = ZOMBIE_STATE.DEAD;
        return;
    }
    
    // 寻找目标
    this.findTarget(characters);
    
    // 根据状态执行行为
    switch(this.state) {
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

// 寻找目标
Zombie.prototype.findTarget = function(characters) {
    // 寻找主人物作为目标
    var mainCharacter = null;
    characters.forEach(character => {
        if (character.hp > 0 && character.role === 1) { // 主人物
            mainCharacter = character;
        }
    });
    
    if (mainCharacter) {
        var distance = this.getDistanceTo(mainCharacter);
        
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
        var distance = this.getDistanceTo(this.targetCharacter);
        if (distance <= this.detectionRange) {
            return; // 已有目标且在范围内
        }
    }
    
    // 寻找新目标
    this.targetCharacter = null;
    var closestDistance = Infinity;
    
    characters.forEach(character => {
        if (character.hp > 0 && character.role !== 1) { // 不攻击主人物
            var distance = this.getDistanceTo(character);
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

// 追击目标
Zombie.prototype.chaseTarget = function(deltaTime) {
    if (!this.targetCharacter || this.targetCharacter.hp <= 0) {
        this.state = ZOMBIE_STATE.IDLE;
        return;
    }
    
    // 更新目标位置
    this.targetX = this.targetCharacter.x;
    this.targetY = this.targetCharacter.y;
    
    var distance = this.getDistanceTo(this.targetCharacter);
    
    if (distance <= this.attackRange) {
        this.state = ZOMBIE_STATE.ATTACKING;
        return;
    }
    
    console.log('僵尸', this.type, '追击中，距离目标:', distance, '移动速度:', this.moveSpeed);
    
    // 移动向目标
    this.moveTowards(this.targetX, this.targetY, deltaTime);
};

// 攻击目标
Zombie.prototype.attackTarget = function(deltaTime) {
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
    var distance = this.getDistanceTo(this.targetCharacter);
    if (distance > this.attackRange) {
        this.state = ZOMBIE_STATE.CHASING;
    }
};

// 向目标移动
Zombie.prototype.moveTowards = function(targetX, targetY, deltaTime) {
    var deltaX = targetX - this.x;
    var deltaY = targetY - this.y;
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > 0) {
        // 计算移动方向
        this.direction = Math.atan2(deltaY, deltaX);
        
        // 计算目标位置
        var moveDistance = this.moveSpeed * deltaTime;
        if (moveDistance > distance) {
            moveDistance = distance;
        }
        
        var newX = this.x + (deltaX / distance) * moveDistance;
        var newY = this.y + (deltaY / distance) * moveDistance;
        
        console.log('僵尸', this.type, '移动计算:', '从', this.x, this.y, '到', newX, newY, '移动距离:', moveDistance);
        
        // 使用碰撞检测获取有效移动位置，实现平滑绕开障碍物
        if (window.collisionSystem && window.collisionSystem.getZombieValidMovePosition) {
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
            
            // 获取避免重叠的移动位置，启用平滑移动
            var validPosition = window.collisionSystem.getZombieValidMovePosition(
                this, newX, newY, allZombies, allCharacters
            );
            
            // 如果位置有调整，说明发生了碰撞，尝试平滑绕开
            if (validPosition.x !== newX || validPosition.y !== newY) {
                console.log('僵尸碰撞检测调整:', this.type, '从', newX, newY, '到', validPosition.x, validPosition.y);
                
                // 尝试寻找平滑的绕行路径
                if (window.collisionSystem.findNearestSafePosition) {
                    var smoothPosition = window.collisionSystem.findNearestSafePosition(
                        this.x, this.y, newX, newY, this.width, this.height
                    );
                    
                    if (smoothPosition && smoothPosition.x !== this.x && smoothPosition.y !== this.y) {
                        // 使用平滑位置
                        this.x = smoothPosition.x;
                        this.y = smoothPosition.y;
                        console.log('僵尸平滑绕行到:', smoothPosition.x, smoothPosition.y);
                        return;
                    }
                }
            }
            
            // 移动到有效位置
            this.x = validPosition.x;
            this.y = validPosition.y;
        } else {
            // 如果没有碰撞检测系统，直接移动
            this.x = newX;
            this.y = newY;
        }
        
        this.state = ZOMBIE_STATE.WALKING;
    }
};

// 待机行为
Zombie.prototype.idleBehavior = function(deltaTime) {
    // 随机游荡
    if (Math.random() < 0.01) { // 1%概率改变方向
        this.direction = Math.random() * Math.PI * 2;
        var targetDistance = 100;
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
            
            // 如果目标位置不安全，寻找安全位置
            if (window.collisionSystem.isObjectInBuilding(this.targetX, this.targetY, 32, 32) ||
                window.collisionSystem.isObjectOverlappingWithList(this.targetX, this.targetY, 32, 32, allZombies)) {
                
                var safePos = window.collisionSystem.findSafePosition(this.x, this.y, 50, 150, 32, 32);
                this.targetX = safePos.x;
                this.targetY = safePos.y;
            }
        }
        
        this.state = ZOMBIE_STATE.WALKING;
    }
};

// 更新动画
Zombie.prototype.updateAnimation = function(deltaTime) {
    if (this.state === ZOMBIE_STATE.WALKING || this.state === ZOMBIE_STATE.CHASING) {
        this.animationFrame += this.animationSpeed * deltaTime;
        if (this.animationFrame >= 4) {
            this.animationFrame = 0;
        }
    }
};

// 受到伤害
Zombie.prototype.takeDamage = function(damage) {
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

// 获取到目标的距离
Zombie.prototype.getDistanceTo = function(target) {
    var deltaX = this.x - target.x;
    var deltaY = this.y - target.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
};

// 渲染僵尸
Zombie.prototype.render = function(ctx, cameraX, cameraY) {
    if (this.hp <= 0) return;
    
    // 计算屏幕坐标
    var screenX = ctx.canvas.width / 2 + (this.x - cameraX) * 0.6;
    var screenY = ctx.canvas.height / 2 + (this.y - cameraY) * 0.6;
    
    // 检查是否在屏幕范围内
    if (screenX < -100 || screenX > ctx.canvas.width + 100 || 
        screenY < -100 || screenY > ctx.canvas.height + 100) {
        return;
    }
    
    // 绘制阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(screenX - this.size/2, screenY + this.size/2, this.size, 6);
    
    // 绘制僵尸主体
    var bodyY = screenY - this.size/2;
    
    // 身体
    ctx.fillStyle = this.color;
    ctx.fillRect(screenX - this.size/2, bodyY + this.size/3, this.size, this.size * 2/3);
    
    // 头部
    ctx.fillStyle = '#654321';
    ctx.fillRect(screenX - this.size/3, bodyY, this.size * 2/3, this.size/3);
    
    // 绘制图标
    ctx.font = Math.floor(this.size/2) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(this.icon, screenX, bodyY + this.size/2);
    
    // 绘制血条
    this.drawHealthBar(ctx, screenX, bodyY - 10);
    
    // 绘制状态指示器
    if (this.state === ZOMBIE_STATE.CHASING) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(screenX - 4, bodyY - 15, 8, 4);
    }
};

// 绘制血条
Zombie.prototype.drawHealthBar = function(ctx, x, y) {
    var barWidth = this.size;
    var barHeight = 4;
    var healthPercent = this.hp / this.maxHp;
    
    // 血条背景
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x - barWidth/2, y, barWidth, barHeight);
    
    // 血条
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(x - barWidth/2, y, barWidth * healthPercent, barHeight);
    
    // 血条边框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barWidth/2, y, barWidth, barHeight);
};

// 僵尸管理器
var ZombieManager = {
    zombies: [],
    maxZombies: 100,     // 最大僵尸数量
    difficulty: 1,
    
    // 创建僵尸
    createZombie: function(type, x, y) {
        if (this.zombies.length >= this.maxZombies) {
            return null;
        }
        
        // 检查生成位置是否与其他僵尸重叠
        if (window.collisionSystem && window.collisionSystem.isObjectOverlappingWithList) {
            var zombieWidth = 32; // 僵尸默认宽度
            var zombieHeight = 32; // 僵尸默认高度
            
            // 获取所有现有僵尸
            var existingZombies = this.zombies.filter(z => z.hp > 0);
            
            // 检查是否与现有僵尸重叠
            if (window.collisionSystem.isObjectOverlappingWithList(x, y, zombieWidth, zombieHeight, existingZombies)) {
                console.log('僵尸生成位置重叠，寻找新位置');
                
                // 寻找不重叠的生成位置
                var safePosition = window.collisionSystem.findSafePosition(x, y, 50, 200, zombieWidth, zombieHeight);
                
                // 再次检查是否与僵尸重叠
                if (window.collisionSystem.isObjectOverlappingWithList(safePosition.x, safePosition.y, zombieWidth, zombieHeight, existingZombies)) {
                    // 如果还是重叠，尝试更远的位置
                    safePosition = window.collisionSystem.findSafePosition(x, y, 100, 300, zombieWidth, zombieHeight);
                }
                
                x = safePosition.x;
                y = safePosition.y;
                console.log('僵尸新生成位置:', x, y);
            }
        }
        
        var zombie = new Zombie(type, x, y);
        this.zombies.push(zombie);
        return zombie;
    },
    
    // 随机生成僵尸
    spawnRandomZombie: function(mapWidth, mapHeight) {
        if (this.zombies.length >= this.maxZombies) return;
        
        // 随机选择僵尸类型
        var types = Object.values(ZOMBIE_TYPE);
        var randomType = types[Math.floor(Math.random() * types.length)];
        
        // 随机位置（地图边缘）
        var side = Math.floor(Math.random() * 4);
        var x, y;
        
        switch(side) {
            case 0: // 上边
                x = Math.random() * mapWidth;
                y = -50;
                break;
            case 1: // 右边
                x = mapWidth + 50;
                y = Math.random() * mapHeight;
                break;
            case 2: // 下边
                x = Math.random() * mapWidth;
                y = mapHeight + 50;
                break;
            case 3: // 左边
                x = -50;
                y = Math.random() * mapHeight;
                break;
        }
        
        this.createZombie(randomType, x, y);
    },
    
    // 更新所有僵尸
    updateAllZombies: function(characters, deltaTime) {
        console.log('更新僵尸，数量:', this.zombies.length, '角色数量:', characters.length);
        
        // 更新僵尸
        this.zombies.forEach(zombie => {
            zombie.update(characters, deltaTime);
        });
        
        // 清理死亡僵尸
        this.zombies = this.zombies.filter(zombie => zombie.hp > 0);
    },
    

    
    // 获取僵尸数量
    getZombieCount: function() {
        return this.zombies.length;
    },
    
    // 获取所有僵尸
    getAllZombies: function() {
        return this.zombies;
    },
    
    // 清除所有僵尸
    clearAllZombies: function() {
        this.zombies = [];
    },
    
    // 调整难度
    adjustDifficulty: function(newDifficulty) {
        this.difficulty = newDifficulty;
        this.maxZombies = Math.min(50, 20 + (newDifficulty - 1) * 5);
    }
};

// 导出枚举和类
export { ZOMBIE_TYPE, ZOMBIE_STATE };
export { ZombieManager };
export default Zombie;

