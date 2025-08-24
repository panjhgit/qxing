# 模块加载问题解决方案

## 问题描述
在抖音小游戏环境中，`game.js` 文件在 `input.js`、`menu.js` 和 `map.js` 之前执行，导致这些模块还没有被加载，出现以下错误：
- `inputPrototype 模块未加载`
- `menuPrototype 模块未加载`
- `mapPrototype 模块未加载`

## 解决方案

### 1. 修改 game.json 文件
在 `game.json` 文件中添加 `scripts` 数组，明确指定JavaScript文件的加载顺序：

```json
{
    "deviceOrientation": "portrait",
    "scripts": [
        "src/menu.js",
        "src/map.js", 
        "src/input.js",
        "game.js"
    ]
}
```

### 2. 模块加载顺序说明
- `src/menu.js` - 菜单系统，提供首页渲染功能
- `src/map.js` - 地图系统，提供6000x6000像素的地图
- `src/input.js` - 输入系统，处理触摸事件
- `game.js` - 主游戏文件，引用其他模块

### 3. 模块导出方式
所有模块都使用 `prototype` 对象的方式导出，与抖音小游戏环境兼容：

```javascript
// 在 menu.js 中
var menuPrototype = {};
// ... 定义方法 ...
if (typeof window !== 'undefined') {
    window.menuPrototype = menuPrototype;
}

// 在 map.js 中
var mapPrototype = {};
// ... 定义方法 ...
if (typeof window !== 'undefined') {
    window.mapPrototype = mapPrototype;
}

// 在 input.js 中
var inputPrototype = {};
// ... 定义方法 ...
if (typeof window !== 'undefined') {
    window.inputPrototype = inputPrototype;
}
```

### 4. 在 game.js 中使用模块
```javascript
// 检查模块是否可用
if (typeof inputPrototype !== 'undefined') {
    inputSystem = Object.create(inputPrototype);
    inputSystem.init(canvas, gameState);
    inputSystem.bindTouchEvents();
    console.log('输入系统初始化成功');
} else {
    console.error('inputPrototype 模块未加载');
}
```

## 测试方法

### 1. 使用测试文件
运行 `test_modules.html` 文件来验证所有模块是否正确加载。

### 2. 检查控制台输出
在抖音小游戏环境中查看控制台，应该看到：
- `输入系统初始化成功`
- `菜单系统可用`
- `地图系统可用`
- `游戏初始化完成`

### 3. 功能测试
- 点击"开始游戏"按钮应该切换到地图视图
- 在地图中可以拖动查看不同区域
- 点击建筑物应该显示建筑物信息
- 点击"返回首页"按钮应该返回首页

## 常见问题

### Q: 模块仍然未加载怎么办？
A: 检查 `game.json` 中的 `scripts` 数组顺序是否正确，确保依赖模块在 `game.js` 之前。

### Q: 为什么使用 prototype 对象而不是 ES6 类？
A: 在抖音小游戏环境中，使用 `prototype` 对象的方式更稳定，兼容性更好。

### Q: 如何添加新的模块？
A: 1. 创建新的 `.js` 文件
    2. 使用 `prototype` 对象方式定义
    3. 在 `game.json` 的 `scripts` 数组中添加
    4. 在 `game.js` 中检查和使用

## 文件结构
```
qxing/
├── game.json          # 游戏配置文件，包含脚本加载顺序
├── game.js            # 主游戏文件
├── src/
│   ├── menu.js        # 菜单系统
│   ├── map.js         # 地图系统
│   └── input.js       # 输入系统
└── test_modules.html  # 模块测试文件
```

## 总结
通过正确配置 `game.json` 中的 `scripts` 数组，可以确保所有模块按正确顺序加载，解决模块未加载的问题。这种方式与抖音小游戏环境的模块加载机制完全兼容。
