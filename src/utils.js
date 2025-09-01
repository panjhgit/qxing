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

// 验证工具类
const ValidationUtils = {
    // 验证位置参数
    validatePosition: function (x, y) {
        if (!MathUtils.isValidNumber(x) || !MathUtils.isValidNumber(y)) {
            throw new Error('无效的位置参数: ' + x + ', ' + y);
        }

        // 检查坐标范围是否合理
        if (Math.abs(x) > 100000 || Math.abs(y) > 100000) {
            throw new Error('位置参数超出合理范围: ' + x + ', ' + y);
        }

        return true;
    },

    // 验证数值范围
    validateRange: function (value, min, max, name) {
        if (!MathUtils.isValidNumber(value)) {
            throw new Error('无效的数值: ' + name + ' = ' + value);
        }

        if (value < min || value > max) {
            throw new Error('数值超出范围: ' + name + ' = ' + value + ' 应该在 ' + min + ' 到 ' + max + ' 之间');
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
    }
};

// 工具管理器
const UtilsManager = {
    // 获取所有工具类
    getMathUtils: function () {
        return MathUtils;
    }, getAnimationUtils: function () {
        return AnimationUtils;
    }, getValidationUtils: function () {
        return ValidationUtils;
    }, getPerformanceUtils: function () {
        return PerformanceUtils;
    }
};

// 导出工具类
export {
    MathUtils, CollisionUtils, AnimationUtils, MovementUtils, ValidationUtils, PerformanceUtils, UtilsManager
};
export default UtilsManager;
