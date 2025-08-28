/**
 * 游戏工具模块 (utils.js)
 * 
 * 功能：
 * - 提供通用的数学计算方法
 * - 消除重复的距离计算、碰撞检测等逻辑
 * - 提供统一的工具函数接口
 * - 优化性能，减少重复计算
 */

// 数学工具类
const MathUtils = {
    // 计算两点间距离
    distance: function(x1, y1, x2, y2) {
        var deltaX = x2 - x1;
        var deltaY = y2 - y1;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    
    // 计算点到点的距离（对象版本）
    distanceBetween: function(obj1, obj2) {
        if (!obj1 || !obj2 || obj1.x === undefined || obj1.y === undefined || 
            obj2.x === undefined || obj2.y === undefined) {
            return Infinity;
        }
        return this.distance(obj1.x, obj1.y, obj2.x, obj2.y);
    },
    
    // 计算角度（弧度）
    angle: function(fromX, fromY, toX, toY) {
        return Math.atan2(toY - fromY, toX - fromX);
    },
    
    // 计算角度（对象版本）
    angleBetween: function(fromObj, toObj) {
        if (!fromObj || !toObj) return 0;
        return this.angle(fromObj.x, fromObj.y, toObj.x, toObj.y);
    },
    
    // 检查数值是否有效
    isValidNumber: function(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    },
    
    // 限制数值范围
    clamp: function(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    // 线性插值
    lerp: function(start, end, t) {
        return start + (end - start) * t;
    },
    
    // 平滑移动计算
    smoothMove: function(fromX, fromY, toX, toY, ratio) {
        return {
            x: this.lerp(fromX, toX, ratio),
            y: this.lerp(fromY, toY, ratio)
        };
    }
};

// 碰撞检测工具类
const CollisionUtils = {
    // 检查两个矩形是否重叠
    rectsOverlap: function(rect1, rect2) {
        return !(rect1.right <= rect2.left || rect1.left >= rect2.right || 
                rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
    },
    
    // 检查点是否在矩形内
    pointInRect: function(pointX, pointY, rect) {
        return pointX >= rect.left && pointX < rect.right && 
               pointY >= rect.top && pointY < rect.bottom;
    },
    
    // 获取对象的边界矩形
    getObjectBounds: function(obj, width, height) {
        if (!obj || !MathUtils.isValidNumber(obj.x) || !MathUtils.isValidNumber(obj.y)) {
            return null;
        }
        
        var w = width || obj.width || 32;
        var h = height || obj.height || 48;
        
        return {
            left: obj.x - w / 2,
            right: obj.x + w / 2,
            top: obj.y - h / 2,
            bottom: obj.y + h / 2
        };
    },
    
    // 检查两个对象是否碰撞
    objectsCollide: function(obj1, obj2) {
        var bounds1 = this.getObjectBounds(obj1);
        var bounds2 = this.getObjectBounds(obj2);
        
        if (!bounds1 || !bounds2) return false;
        
        return this.rectsOverlap(bounds1, bounds2);
    }
};

// 动画工具类
const AnimationUtils = {
    // 更新动画帧
    updateFrame: function(currentFrame, speed, maxFrames) {
        var newFrame = currentFrame + speed;
        if (newFrame >= maxFrames) {
            newFrame = 0;
        }
        return newFrame;
    },
    
    // 检查动画是否应该重置
    shouldResetAnimation: function(currentFrame, maxFrames) {
        return currentFrame >= maxFrames;
    },
    
    // 计算动画进度（0-1）
    getAnimationProgress: function(currentFrame, maxFrames) {
        return Math.min(currentFrame / maxFrames, 1);
    }
};

// 移动工具类
const MovementUtils = {
    // 计算移动向量 - 优化的固定速度移动，基于时间
    calculateMoveVector: function(fromX, fromY, toX, toY, speed, deltaTime = 1/60) {
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = MathUtils.distance(fromX, fromY, toX, toY);
        
        if (distance < 0.001) {
            return { x: 0, y: 0, distance: 0, reached: true };
        }
        
        // 固定速度移动：每帧移动固定的像素距离，基于时间
        var moveDistance = speed * deltaTime;
        
        // 确保每帧至少移动1像素，避免移动过慢
        if (moveDistance < 1) {
            moveDistance = 1;
        }
        
        // 计算移动方向（归一化）
        var directionX = deltaX / distance;
        var directionY = deltaY / distance;
        
        // 始终移动固定距离，除非目标就在移动距离内
        if (distance <= moveDistance) {
            // 目标很近，直接移动到目标
            return { x: deltaX, y: deltaY, distance: distance, reached: true };
        } else {
            // 目标较远，按固定速度移动
            var moveX = directionX * moveDistance;
            var moveY = directionY * moveDistance;
            return { x: moveX, y: moveY, distance: moveDistance, reached: false };
        }
    },
    
    // 检查移动路径是否有效
    isMovePathValid: function(fromX, fromY, toX, toY, width, height, collisionChecker) {
        if (!collisionChecker) return true;
        
        var steps = 10;
        for (var i = 1; i < steps; i++) {
            var t = i / steps;
            var testX = fromX + (toX - fromX) * t;
            var testY = fromY + (toY - fromY) * t;
            
            if (collisionChecker(testX, testY, width, height)) {
                return false;
            }
        }
        
        return true;
    },
    
    // 寻找安全的移动位置
    findSafePosition: function(fromX, fromY, toX, toY, width, height, collisionChecker) {
        if (!collisionChecker) return { x: toX, y: toY };
        
        // 检查目标位置是否安全
        if (!collisionChecker(toX, toY, width, height)) {
            return { x: toX, y: toY };
        }
        
        // 尝试多个距离的移动
        var ratios = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
        
        for (var i = 0; i < ratios.length; i++) {
            var ratio = ratios[i];
            var testX = fromX + (toX - fromX) * ratio;
            var testY = fromY + (toY - fromY) * ratio;
            
            if (!collisionChecker(testX, testY, width, height)) {
                return { x: testX, y: testY };
            }
        }
        
        return { x: fromX, y: fromY };
    }
};

// 验证工具类
const ValidationUtils = {
    // 验证位置参数
    validatePosition: function(x, y) {
        if (!MathUtils.isValidNumber(x) || !MathUtils.isValidNumber(y)) {
            console.warn('无效的位置参数:', x, y);
            return false;
        }
        
        // 检查坐标范围是否合理
        if (Math.abs(x) > 100000 || Math.abs(y) > 100000) {
            console.warn('位置参数超出合理范围:', x, y);
            return false;
        }
        
        return true;
    },
    
    // 验证对象参数
    validateObject: function(obj, requiredProps) {
        if (!obj || typeof obj !== 'object') {
            console.warn('无效的对象参数:', obj);
            return false;
        }
        
        if (requiredProps) {
            for (var i = 0; i < requiredProps.length; i++) {
                var prop = requiredProps[i];
                if (obj[prop] === undefined) {
                    console.warn('对象缺少必需属性:', prop, obj);
                    return false;
                }
            }
        }
        
        return true;
    },
    
    // 验证数值范围
    validateRange: function(value, min, max, name) {
        if (!MathUtils.isValidNumber(value)) {
            console.warn('无效的数值:', name, value);
            return false;
        }
        
        if (value < min || value > max) {
            console.warn('数值超出范围:', name, value, '应该在', min, '到', max, '之间');
            return false;
        }
        
        return true;
    },
    
    // 验证数组
    validateArray: function(arr, name) {
        if (!Array.isArray(arr)) {
            console.warn('无效的数组:', name, arr);
            return false;
        }
        return true;
    },
    
    // 验证函数
    validateFunction: function(func, name) {
        if (typeof func !== 'function') {
            console.warn('无效的函数:', name, func);
            return false;
        }
        return true;
    }
};

// 性能工具类
const PerformanceUtils = {
    // 性能计时器
    timers: {},
    
    // 开始计时
    startTimer: function(name) {
        this.timers[name] = performance.now();
    },
    
    // 结束计时并返回耗时
    endTimer: function(name) {
        if (this.timers[name]) {
            var duration = performance.now() - this.timers[name];
            delete this.timers[name];
            return duration;
        }
        return 0;
    },
    
    // 测量函数执行时间
    measureFunction: function(name, func, context) {
        this.startTimer(name);
        var result = func.call(context);
        var duration = this.endTimer(name);
        console.log('函数执行时间:', name, duration.toFixed(2), 'ms');
        return result;
    },
    
    // 验证数值是否有效
    isValidNumber: function(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    },
    
    // 验证时间增量
    validateDeltaTime: function(deltaTime) {
        if (!this.isValidNumber(deltaTime) || deltaTime <= 0) {
            console.warn('无效的时间增量:', deltaTime);
            return false;
        }
        
        // 检查时间增量是否过大（超过1秒）
        if (deltaTime > 1) {
            console.warn('时间增量过大，可能影响游戏性能:', deltaTime);
            return false;
        }
        
        return true;
    }
};

// 工具管理器
const UtilsManager = {
    // 获取所有工具类
    getMathUtils: function() { return MathUtils; },
    getCollisionUtils: function() { return CollisionUtils; },
    getAnimationUtils: function() { return AnimationUtils; },
    getMovementUtils: function() { return MovementUtils; },
    getValidationUtils: function() { return ValidationUtils; },
    getPerformanceUtils: function() { return PerformanceUtils; },
    
    // 获取所有工具
    getAll: function() {
        return {
            MathUtils: MathUtils,
            CollisionUtils: CollisionUtils,
            AnimationUtils: AnimationUtils,
            MovementUtils: MovementUtils,
            ValidationUtils: ValidationUtils,
            PerformanceUtils: PerformanceUtils
        };
    }
};

// 导出工具类
export { 
    MathUtils, 
    CollisionUtils, 
    AnimationUtils, 
    MovementUtils, 
    ValidationUtils, 
    PerformanceUtils,
    UtilsManager 
};
export default UtilsManager;
