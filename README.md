抖音小游戏开发规范
一、小游戏文件结构
以下三个文件为小游戏的必要文件，开发者若有其他资源，可在根目录下自由建立 js、audio、images 等目录，规范开发文件：
game.js：小游戏入口文件
game.json：小游戏配置文件
project.config.json：工程配置文件
二、引入模块
1. 语法格式
   通过 any require(string path) 语法引入模块，该语法返回模块通过 module.exports 或 exports 暴露的接口。
2. 代码示例
   在 game.js 中引入模块：
   var common = require("./common/common.js");
   在 common.js 中暴露接口：
   function sayHello(name) {
   console.log(`Hello ${name} !`);
   }
   function sayGoodbye(name) {
   console.log(`Goodbye ${name} !`);
   }
   module.exports.sayHello = sayHello;
   exports.sayGoodbye = sayGoodbye;
   三、TTWebAssembly 支持
1. 基础说明
   抖音小游戏在 JS 线程和 Worker 线程中提供全局的 TTWebAssembly 对象，支持加载包内经过 brotli 压缩的 wasm 文件（文件后缀为 *.wasm.br）。TTWebAssembly 与 Web 标准的 WebAssembly 类似，在执行计算密集型任务时，相比 JavaScript 能提供更好的性能表现。
2. 平台差异
   iOS 平台目前不支持 SIMD 等 WebAssembly 提案特性。
3. API 参考
   （1）TTWebAssembly.compile(path)
   功能：编译指定的 WebAssembly 模块。
   参数：path {string}，必须为包内 wasm 文件路径。
   返回值：返回 Promise 对象
   成功时 resolve 一个 TTWebAssembly.Module 实例
   失败时 reject（文件读取失败或编译错误）
   （2）TTWebAssembly.instantiate(path, importObject)
   功能：创建 WebAssembly 实例。
   参数：
   path {string}：必须为包内 wasm 文件路径
   importObject {Object}：可选导入对象
   返回值：返回 Promise 对象
   成功时 resolve 包含以下属性的对象：
   module：TTWebAssembly.Module 实例
   instance：TTWebAssembly.Instance 实例
   失败时 reject（文件读取失败、编译错误或导入对象不匹配）
4. 核心类
   （1）TTWebAssembly.Module
   通过 TTWebAssembly.compile 方法构造，功能与 WebAssembly 标准保持一致。
   （2）TTWebAssembly.Global
   用于在 JavaScript 和 Instance 之间传递全局状态，实现与 WebAssembly 标准相同。
   （3）TTWebAssembly.Table
   用于实现不同 Instance 之间的动态链接，功能与 WebAssembly 标准一致。
   （4）TTWebAssembly.Memory
   用于在 JavaScript 和 Instance 之间共享内存，实现与 WebAssembly 标准相同。
   （5）TTWebAssembly.Instance
   构造方式：
   TTWebAssembly.instantiate 方法
   new TTWebAssembly.Instance (module, importObject) 构造函数
   属性：exports，包含实例导出的 Table、Global、Memory 或函数
   四、tt API
1. 基础说明
   本平台只能使用 JavaScript 编写小游戏，小游戏的运行环境是一个绑定了部分方法的 JavaScript VM。与浏览器不同，该运行环境无 BOM 和 DOM API，仅提供 tt 系列 API。
2. 核心功能实现
   （1）创建 Canvas
   语法：var canvas = tt.createCanvas();
   说明：调用 tt.createCanvas () 接口可创建 Canvas 对象。用户首次调用时，获取到的是上屏 Canvas，该 Canvas 已显示在屏幕上，且与屏幕等宽等高；小游戏运行期间，有且仅有一个上屏 Canvas。
   （2）绘制
   代码示例：
   var context = canvas.getContext("2d");
   context.fillStyle = "#ff00ff";
   context.fillRect(0, 0, 100, 100);
   （3）触摸事件
   平台提供以下监听触摸事件的 API：
   tt.onTouchStart()
   tt.onTouchMove()
   tt.onTouchEnd()
   tt.onTouchCancel()
   （4）动画能力
   开发者可利用以下定时器相关 API 实现动画效果：
   setTimeout
   setInterval
   requestAnimationFrame
   clearTimeout
   clearInterval
   cancelAnimationFrame
   五、渲染
1. 画布类型说明
   抖音小游戏采用单上屏画布 + 多离屏画布的设计模式，代码示例：
   // 创建画布对象（首个创建默认为上屏画布）
   const mainCanvas = tt.createCanvas();

// 后续创建均为离屏画布
const offscreenCanvas1 = tt.createCanvas();
const offscreenCanvas2 = tt.createCanvas();
2. 绘图上下文
   通过 Canvas.getContext 可创建绘图上下文，返回的具体绘图上下文类型可参考 RenderingContext，代码示例：
   // 获取2D绘图上下文
   const ctx = mainCanvas.getContext('2d');

// 获取WebGL上下文（需基础库1.31.0+）
const gl = mainCanvas.getContext('webgl');


3. 锁帧
   使用 tt.setPreferredFramesPerSecond 接口可实现锁帧，代码示例：
   // 设置目标帧率（30/60fps）
   tt.setPreferredFramesPerSecond(60);