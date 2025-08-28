/**
 * 状态机基础框架
 * 管理游戏对象的状态转换和行为
 */

// 主人物状态枚举
const MAIN_CHARACTER_STATES = {
    IDLE: 'IDLE',           // 待机
    MOVE: 'MOVE',           // 移动
    ATTACK: 'ATTACK',       // 攻击
    DIE: 'DIE'              // 死亡
};

// 伙伴状态枚举
const PARTNER_STATES = {
    INIT: 'INIT',           // 初始状态
    IDLE: 'IDLE',           // 待机
    FOLLOW: 'FOLLOW',       // 跟随
    ATTACK: 'ATTACK',       // 攻击
    AVOID: 'AVOID',         // 避障
    DIE: 'DIE'              // 死亡
};

// 僵尸状态枚举
const ZOMBIE_STATES = {
    IDLE: 'IDLE',           // 待机
    CHASE: 'CHASE',         // 追击
    ATTACK: 'ATTACK',       // 攻击
    DIE: 'DIE'              // 死亡
};

// 状态机基类
class StateMachine {
    constructor(owner, initialState) {
        this.owner = owner;           // 状态机所属对象
        this.currentState = initialState; // 当前状态
        this.previousState = null;    // 前一个状态
        this.stateTime = 0;           // 当前状态持续时间
        this.stateData = {};          // 状态相关数据
        
        // 状态转换表
        this.transitions = new Map();
        
        // 状态行为表
        this.behaviors = new Map();
        
        // 初始化状态
        this.enterState(initialState);
    }
    
    // 添加状态转换规则
    addTransition(fromState, toState, condition) {
        if (!this.transitions.has(fromState)) {
            this.transitions.set(fromState, []);
        }
        this.transitions.get(fromState).push({
            toState: toState,
            condition: condition
        });
    }
    
    // 添加状态行为
    addBehavior(state, enterBehavior, updateBehavior, exitBehavior) {
        this.behaviors.set(state, {
            enter: enterBehavior,
            update: updateBehavior,
            exit: exitBehavior
        });
    }
    
    // 进入状态
    enterState(newState) {
        if (this.currentState === newState) return;
        
        // 退出当前状态
        if (this.currentState && this.behaviors.has(this.currentState)) {
            const currentBehavior = this.behaviors.get(this.currentState);
            if (currentBehavior.exit) {
                currentBehavior.exit.call(this.owner, this.stateData);
            }
        }
        
        // 记录状态转换
        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTime = 0;
        this.stateData = {};
        
        // 进入新状态
        if (this.behaviors.has(newState)) {
            const newBehavior = this.behaviors.get(newState);
            if (newBehavior.enter) {
                newBehavior.enter.call(this.owner, this.stateData);
            }
        }
        
        console.log(`${this.owner.constructor.name} 状态转换: ${this.previousState} -> ${this.currentState}`);
    }
    
    // 更新状态机
    update(deltaTime) {
        this.stateTime += deltaTime;
        
        // 检查状态转换
        this.checkTransitions();
        
        // 更新当前状态
        if (this.behaviors.has(this.currentState)) {
            const currentBehavior = this.behaviors.get(this.currentState);
            if (currentBehavior.update) {
                currentBehavior.update.call(this.owner, deltaTime, this.stateData);
            }
        }
    }
    
    // 检查状态转换条件
    checkTransitions() {
        if (!this.transitions.has(this.currentState)) return;
        
        const possibleTransitions = this.transitions.get(this.currentState);
        for (const transition of possibleTransitions) {
            if (transition.condition.call(this.owner, this.stateData)) {
                this.enterState(transition.toState);
                break; // 只执行第一个满足条件的转换
            }
        }
    }
    
    // 强制切换状态（用于特殊情况）
    forceState(newState) {
        this.enterState(newState);
    }
    
    // 获取当前状态信息
    getStateInfo() {
        return {
            currentState: this.currentState,
            previousState: this.previousState,
            stateTime: this.stateTime,
            stateData: this.stateData
        };
    }
    
    // 检查是否在指定状态
    isInState(state) {
        return this.currentState === state;
    }
    
    // 检查是否在多个状态中的任意一个
    isInAnyState(states) {
        return states.includes(this.currentState);
    }
}

// 导出
export { 
    StateMachine, 
    MAIN_CHARACTER_STATES, 
    PARTNER_STATES, 
    ZOMBIE_STATES 
};
export default StateMachine;
