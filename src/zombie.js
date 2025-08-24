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
            this.moveSpeed = 1.5;
            this.attackRange = 40;
            this.detectionRange = 200;
            this.icon = '🧟‍♂️';
            this.color = '#8B4513';
            this.size = 24;
            break;
            
        case ZOMBIE_TYPE.FAT:
            this.hp = 60;
            this.maxHp = 60;
            this.attack = 25;
            this.moveSpeed = 0.8;
            this.attackRange = 50;
            this.detectionRange = 180;
            this.icon = '🧟‍♂️';
            this.color = '#654321';
            this.size = 32;
            break;
            
        case ZOMBIE_TYPE.BOSS:
            this.hp = 200;
            this.maxHp = 200;
            this.attack = 50;
            this.moveSpeed = 1.2;
            this.attackRange = 80;
            this.detectionRange = 300;
            this.icon = '🧟‍♂️';
            this.color = '#8B0000';
            this.size = 48;
            break;
            
        case ZOMBIE_TYPE.FAST:
            this.hp = 20;
            this.maxHp = 20;
            this.attack = 10;
            this.moveSpeed = 3.0;
            this.attackRange = 30;
            this.detectionRange = 250;
            this.icon = '🧟‍♂️';
            this.color = '#228B22';
            this.size = 20;
            break;
            
        case ZOMBIE_TYPE.TANK:
            this.hp = 150;
            this.maxHp = 150;
            this.attack = 35;
            this.moveSpeed = 0.5;
            this.attackRange = 60;
            this.detectionRange = 150;
            this.icon = '🧟‍♂️';
            this.color = '#2F4F4F';
            this.size = 40;
            break;
            
        default:
            this.hp = 40;
            this.maxHp = 40;
            this.attack = 20;
            this.moveSpeed = 1.0;
            this.attackRange = 45;
            this.detectionRange = 200;
            this.icon = '🧟‍♂️';
            this.color = '#696969';
            this.size = 28;
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
            this.walkToTarget(deltaTime);
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
        
        // 移动
        var moveDistance = this.moveSpeed * deltaTime;
        if (moveDistance > distance) {
            moveDistance = distance;
        }
        
        this.x += (deltaX / distance) * moveDistance;
        this.y += (deltaY / distance) * moveDistance;
        
        this.state = ZOMBIE_STATE.WALKING;
    }
};

// 待机行为
Zombie.prototype.idleBehavior = function(deltaTime) {
    // 随机游荡
    if (Math.random() < 0.01) { // 1%概率改变方向
        this.direction = Math.random() * Math.PI * 2;
        this.targetX = this.x + Math.cos(this.direction) * 100;
        this.targetY = this.y + Math.sin(this.direction) * 100;
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
    spawnTimer: 0,
    spawnInterval: 5000, // 5秒生成一个僵尸
    maxZombies: 20,
    difficulty: 1,
    
    // 创建僵尸
    createZombie: function(type, x, y) {
        if (this.zombies.length >= this.maxZombies) {
            return null;
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
        console.log('生成僵尸:', randomType, '位置:', x, y);
    },
    
    // 更新所有僵尸
    updateAllZombies: function(characters, deltaTime) {
        // 生成新僵尸
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnRandomZombie(10000, 10000); // 地图尺寸
            this.spawnTimer = 0;
        }
        
        // 更新僵尸
        this.zombies.forEach(zombie => {
            zombie.update(characters, deltaTime);
        });
        
        // 清理死亡僵尸
        this.zombies = this.zombies.filter(zombie => zombie.hp > 0);
    },
    
    // 渲染所有僵尸
    renderAllZombies: function(ctx, cameraX, cameraY) {
        this.zombies.forEach(zombie => {
            zombie.render(ctx, cameraX, cameraY);
        });
    },
    
    // 获取僵尸数量
    getZombieCount: function() {
        return this.zombies.length;
    },
    
    // 清除所有僵尸
    clearAllZombies: function() {
        this.zombies = [];
    },
    
    // 调整难度
    adjustDifficulty: function(newDifficulty) {
        this.difficulty = newDifficulty;
        this.spawnInterval = Math.max(1000, 5000 - (newDifficulty - 1) * 500);
        this.maxZombies = Math.min(50, 20 + (newDifficulty - 1) * 5);
        console.log('僵尸难度调整:', newDifficulty, '生成间隔:', this.spawnInterval, '最大数量:', this.maxZombies);
    }
};

// 导出枚举和类
export { ZOMBIE_TYPE, ZOMBIE_STATE };
export { ZombieManager };
export default Zombie;

