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
    distance: function (x1, y1, x2, y2) {
        var deltaX = x2 - x1;
        var deltaY = y2 - y1;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },

    // 计算角度（弧度）
    angle: function (fromX, fromY, toX, toY) {
        return Math.atan2(toY - fromY, toX - fromX);
    },


    // 检查数值是否有效
    isValidNumber: function (value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
};

// 碰撞检测工具类
const CollisionUtils = {};

// 动画工具类
const AnimationUtils = {
    // 更新动画帧
    updateFrame: function (currentFrame, speed, maxFrames) {
        var newFrame = currentFrame + speed;
        if (newFrame >= maxFrames) {
            newFrame = 0;
        }
        return newFrame;
    },

    // 检查动画是否应该重置
    shouldResetAnimation: function (currentFrame, maxFrames) {
        return currentFrame >= maxFrames;
    }
};

// 移动工具类
const MovementUtils = {
    // 计算移动向量 - 平滑的匀速移动
    calculateMoveVector: function (fromX, fromY, toX, toY, deltaTime = 1/60) {
        var deltaX = toX - fromX;
        var deltaY = toY - fromY;
        var distance = MathUtils.distance(fromX, fromY, toX, toY);

        if (distance < 0.001) {
            return {x: 0, y: 0, distance: 0, reached: true};
        }

        // 平滑移动：每帧移动固定距离，不受目标距离影响
        var moveDistance = 50 * deltaTime; // 50px/秒 × deltaTime秒
        
        // 确保每帧至少移动一个最小距离，避免卡顿
        var minMoveDistance = 0.5; // 每帧最小移动0.5像素
        if (moveDistance < minMoveDistance) {
            moveDistance = minMoveDistance;
        }

        // 计算移动方向（归一化）
        var directionX = deltaX / distance;
        var directionY = deltaY / distance;

        // 始终按固定速度移动，除非目标就在移动距离内
        if (distance <= moveDistance) {
            // 目标很近，直接移动到目标
            return {x: deltaX, y: deltaY, distance: distance, reached: true};
        } else {
            // 目标较远，按固定速度移动
            var moveX = directionX * moveDistance;
            var moveY = directionY * moveDistance;
            return {x: moveX, y: moveY, distance: moveDistance, reached: false};
        }
    }
};

// 验证工具类
const ValidationUtils = {
    // 验证位置参数
    validatePosition: function (x, y) {
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
    validateObject: function (obj, requiredProps) {
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
    validateRange: function (value, min, max, name) {
        if (!MathUtils.isValidNumber(value)) {
            console.warn('无效的数值:', name, value);
            return false;
        }

        if (value < min || value > max) {
            console.warn('数值超出范围:', name, value, '应该在', min, '到', max, '之间');
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
    startTimer: function (name) {
        this.timers[name] = performance.now();
    },

    // 结束计时并返回耗时
    endTimer: function (name) {
        if (this.timers[name]) {
            var duration = performance.now() - this.timers[name];
            delete this.timers[name];
            return duration;
        }
        return 0;
    },

    // 测量函数执行时间
    measureFunction: function (name, func, context) {
        this.startTimer(name);
        var result = func.call(context);
        var duration = this.endTimer(name);
        console.log('函数执行时间:', name, duration.toFixed(2), 'ms');
        return result;
    },

    // 验证数值是否有效
    isValidNumber: function (value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
};

// 工具管理器
const UtilsManager = {
    // 获取所有工具类
    getMathUtils: function () {
        return MathUtils;
    }, getCollisionUtils: function () {
        return CollisionUtils;
    }, getAnimationUtils: function () {
        return AnimationUtils;
    }, getMovementUtils: function () {
        return MovementUtils;
    }, getValidationUtils: function () {
        return ValidationUtils;
    }, getPerformanceUtils: function () {
        return PerformanceUtils;
    },

    // 获取所有工具
    getAll: function () {
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
    MathUtils, CollisionUtils, AnimationUtils, MovementUtils, ValidationUtils, PerformanceUtils, UtilsManager
};
export default UtilsManager;
