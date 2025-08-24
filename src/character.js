// 角色枚举
const ROLE = {
    MAIN: 1,      // 主人物
    POLICE: 2,    // 警察
    CIVILIAN: 3,  // 平民
    DOCTOR: 4,    // 医生
    NURSE: 5,     // 护士
    CHEF: 6       // 厨师
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
    FOLLOW: 'FOLLOW',    // 跟随
    IDLE: 'IDLE'         // 静止
};

// 人物类
var Character = function(role, x, y) {
    // 基础属性
    this.role = role;        // 角色
    this.x = x;              // X坐标
    this.y = y;              // Y坐标
    this.status = STATUS.IDLE; // 状态：跟随/静止
    
    // 2.5D模型属性
    this.width = 32;         // 模型宽度
    this.height = 48;        // 模型高度
    this.depth = 16;         // 模型深度（Z轴）
    this.rotationY = 0;      // Y轴旋转角度
    this.animationFrame = 0; // 动画帧
    this.animationSpeed = 0.1; // 动画速度
    this.isMoving = false;   // 是否在移动
    this.moveSpeed = 2;      // 移动速度
    this.targetX = x;        // 目标X坐标
    this.targetY = y;        // 目标Y坐标
    
    // 根据角色设置属性
    switch(role) {
        case ROLE.MAIN: // 主人物
            this.hp = 100;           // 血量
            this.attack = 10;        // 攻击力
            this.weapon = WEAPON.NONE; // 武器
            this.attackRange = 150;  // 攻击距离
            this.icon = '👤';        // 图标
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
            this.attackRange = 50;
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

// 获取人物信息
Character.prototype.getInfo = function() {
    return {
        role: this.role,
        hp: this.hp,
        attack: this.attack,
        weapon: this.weapon,
        attackRange: this.attackRange,
        icon: this.icon,
        position: {x: this.x, y: this.y},
        status: this.status
    };
};

// 受到攻击
Character.prototype.takeDamage = function(damage) {
    this.hp -= damage;
    if (this.hp < 0) this.hp = 0;
    return this.hp;
};

// 攻击其他人物
Character.prototype.attackTarget = function(target) {
    var distance = Math.sqrt(Math.pow(this.x - target.x, 2) + Math.pow(this.y - target.y, 2));
    
    if (distance <= this.attackRange) {
        target.takeDamage(this.attack);
        return true;
    }
    return false;
};

// 移动
Character.prototype.move = function(newX, newY) {
    this.x = newX;
    this.y = newY;
};

// 设置移动目标
Character.prototype.setMoveTarget = function(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.isMoving = true;
    
    // 计算朝向角度
    var deltaX = targetX - this.x;
    var deltaY = targetY - this.y;
    this.rotationY = Math.atan2(deltaX, deltaY);
};

// 更新移动
Character.prototype.updateMovement = function() {
    if (!this.isMoving) return;
    
    var deltaX = this.targetX - this.x;
    var deltaY = this.targetY - this.y;
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < this.moveSpeed) {
        // 到达目标位置
        this.x = this.targetX;
        this.y = this.targetY;
        this.isMoving = false;
        this.status = STATUS.IDLE;
    } else {
        // 继续移动
        var moveX = (deltaX / distance) * this.moveSpeed;
        var moveY = (deltaY / distance) * this.moveSpeed;
        this.x += moveX;
        this.y += moveY;
        this.status = STATUS.FOLLOW;
    }
    
    // 更新动画帧
    if (this.isMoving) {
        this.animationFrame += this.animationSpeed;
        if (this.animationFrame >= 4) {
            this.animationFrame = 0;
        }
    }
};


// 获取身体颜色
Character.prototype.getBodyColor = function() {
    switch(this.role) {
        case ROLE.MAIN: return '#4a90e2';      // 主人物蓝色
        case ROLE.POLICE: return '#2c3e50';    // 警察深蓝
        case ROLE.CIVILIAN: return '#95a5a6';  // 平民灰色
        case ROLE.DOCTOR: return '#e74c3c';    // 医生红色
        case ROLE.NURSE: return '#e91e63';     // 护士粉色
        case ROLE.CHEF: return '#f39c12';      // 厨师橙色
        default: return '#95a5a6';
    }
};

// 获取头部颜色
Character.prototype.getHeadColor = function() {
    return '#fdbcb4'; // 肤色
};

// 改变状态
Character.prototype.changeStatus = function(newStatus) {
    this.status = newStatus;
};


// 角色管理器
var CharacterManager = {
    characters: [], // 存储所有角色
    
    // 创建主人物
    createMainCharacter: function(x, y) {
        var mainChar = new Character(ROLE.MAIN, x, y);
        this.characters.push(mainChar);
        return mainChar;
    },
    
    // 创建伙伴
    createPartner: function(role, x, y) {
        var partner = new Character(role, x, y);
        this.characters.push(partner);
        return partner;
    },
    
    // 获取主人物
    getMainCharacter: function() {
        return this.characters.find(char => char.role === ROLE.MAIN);
    },
    
    // 获取所有角色
    getAllCharacters: function() {
        return this.characters;
    },
    
    // 更新所有角色
    updateAllCharacters: function() {
        this.characters.forEach(char => {
            char.updateMovement();
        });
    },
    
    // 清除所有角色
    clearAllCharacters: function() {
        this.characters = [];
    }

};

// 导出枚举
export { ROLE, WEAPON, STATUS };

// 导出角色管理器和角色类
export { CharacterManager };
export default Character;