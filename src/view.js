/**
 * 渲染系统兼容性包装模块 (view.js)
 *
 * 功能描述：
 * - 保持向后兼容性，重新导出新的view模块
 * - 确保现有代码无需修改即可使用新的模块化结构
 */

// 重新导出新的view模块
export { ViewSystem, Camera, RenderManager, MapRenderer, MenuRenderer, EntityRenderer, UIRenderer } from './view/index.js';
export { RENDER_CONFIG, ENTITY_TYPE, RENDER_STATE } from './view/index.js';

// 默认导出ViewSystem
export { ViewSystem as default } from './view/index.js';
