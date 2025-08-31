/**
 * 渲染系统统一导出模块 (view/index.js)
 *
 * 功能描述：
 * - 统一导出所有渲染相关的模块
 * - 提供便捷的导入接口
 * - 保持向后兼容性
 */

// 导出主要渲染类
export { Camera } from './camera.js';
export { RenderManager, RENDER_CONFIG, ENTITY_TYPE, RENDER_STATE } from './render-manager.js';
export { ViewSystem } from './view-system.js';
export { MapRenderer } from './map-renderer.js';
export { MenuRenderer } from './menu-renderer.js';
export { EntityRenderer } from './entity-renderer.js';
export { UIRenderer } from './ui-renderer.js';

// 导出默认类（保持向后兼容）
export { default as Camera } from './camera.js';
export { default as RenderManager } from './render-manager.js';
export { default as ViewSystem } from './view-system.js';
export { default as MapRenderer } from './map-renderer.js';
export { default as MenuRenderer } from './menu-renderer.js';
export { default as EntityRenderer } from './entity-renderer.js';
export { default as UIRenderer } from './ui-renderer.js';

// 导出常量
export { RENDER_CONFIG, ENTITY_TYPE, RENDER_STATE } from './render-manager.js';

// 默认导出ViewSystem（保持向后兼容）
export { ViewSystem as default } from './view-system.js';
