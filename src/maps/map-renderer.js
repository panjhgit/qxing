/**
 * 地图渲染器 - 适配新的模块化地图系统
 * 替代旧的 mapSystem 渲染功能
 */


 import MapManager from './map-manager.js';

/**
 * 地图渲染器类
 * 负责渲染地图、建筑物、可通行区域等
 */
export class MapRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.currentMap = null;
        this.mapId = 'city'; // 默认地图
        
        // 渲染配置
        this.showGrid = false;
        this.showDebug = false;
        this.zoom = 0.6;
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化渲染器
     */
    init() {
        try {
            // 直接使用ES6导入的MapManager
            this.currentMap = MapManager.getCurrentMap();
            if (this.currentMap) {
                console.log('✅ 从地图管理器获取地图:', this.currentMap.name);
                return;
            }
            
            console.warn('无法获取当前地图，使用默认配置');
            this.useDefaultMap();
        } catch (error) {
            console.error('❌ 地图渲染器初始化失败:', error);
            this.useDefaultMap();
        }
    }
    
    /**
     * 使用默认地图配置
     */
    useDefaultMap() {
        // 先设置基本配置
        const defaultConfig = {
            name: '默认地图',
            type: 'matrix',
            width: 4000,
            height: 4000,
            cellSize: 100,
            gridCols: 40,
            gridRows: 40
        };
        
        // 生成建筑物和可通行区域
        const buildings = this.generateDefaultBuildings(defaultConfig);
        const walkableAreas = this.generateDefaultWalkableAreas(defaultConfig);
        
        // 设置完整的地图配置
        this.currentMap = {
            ...defaultConfig,
            buildings: buildings,
            walkableAreas: walkableAreas
        };
        
        console.log('✅ 默认地图配置已生成:', this.currentMap.name);
    }
    
    /**
     * 生成默认建筑物
     */
    generateDefaultBuildings(config) {
        const buildings = [];
        const cellSize = config.cellSize;
        const gridCols = config.gridCols;
        const gridRows = config.gridRows;
        
        // 生成4x4单元格的建筑物
        for (let col = 0; col < gridCols - 3; col += 4) {
            for (let row = 0; row < gridRows - 3; row += 4) {
                const buildingX = (col + 2) * cellSize + cellSize / 2;
                const buildingY = (row + 2) * cellSize + cellSize / 2;
                const buildingWidth = 4 * cellSize;
                const buildingHeight = 4 * cellSize;
                
                buildings.push({
                    x: buildingX,
                    y: buildingY,
                    width: buildingWidth,
                    height: buildingHeight,
                    type: '民房',
                    color: '#8B4513',
                    bounds: {
                        left: buildingX - buildingWidth / 2,
                        right: buildingX + buildingWidth / 2,
                        top: buildingY - buildingHeight / 2,
                        bottom: buildingY + buildingHeight / 2
                    }
                });
            }
        }
        
        return buildings;
    }
    
    /**
     * 生成默认可通行区域
     */
    generateDefaultWalkableAreas(config) {
        const areas = [];
        const cellSize = config.cellSize;
        const gridRows = config.gridRows;
        
        // 生成街道区域（建筑物之间的空隙）
        for (let col = 0; col <= gridCols; col++) {
            for (let row = 0; row <= gridRows; row++) {
                const areaX = col * cellSize;
                const areaY = row * cellSize;
                const areaWidth = cellSize;
                const areaHeight = cellSize;
                
                areas.push({
                    x: areaX,
                    y: areaY,
                    width: areaWidth,
                    height: areaHeight,
                    type: 'street',
                    bounds: {
                        left: areaX,
                        right: areaX + areaWidth,
                        top: areaY,
                        bottom: areaY + areaHeight
                    }
                });
            }
        }
        
        return areas;
    }
    
    /**
     * 切换地图
     */
    switchMap(mapId) {
        try {
            this.mapId = mapId;
            this.currentMap = MapManager.switchMap(mapId);
            console.log('✅ 地图切换成功:', this.currentMap.name);
            return true;
        } catch (error) {
            console.error('❌ 地图切换失败:', error);
            return false;
        }
    }
    
    /**
     * 渲染地图（主要渲染方法）
     */
    render() {
        if (!this.currentMap) {
            console.warn('没有可渲染的地图');
            return;
        }
        
        // 渲染地图背景
        this.renderBackground();
        
        // 渲染可通行区域
        this.renderWalkableAreas();
        
        // 渲染建筑物
        this.renderBuildings();
        
        // 渲染地图边界
        this.renderBoundaries();
        
        // 渲染网格（可选）
        if (this.showGrid) {
            this.renderGrid();
        }
        
        // 渲染调试信息
        if (this.showDebug) {
            this.renderDebugInfo();
        }
    }
    
    /**
     * 渲染地图背景
     */
    renderBackground() {
        this.ctx.fillStyle = '#F0F8FF'; // 浅蓝色背景
        this.ctx.fillRect(0, 0, this.currentMap.width, this.currentMap.height);
    }
    
    /**
     * 渲染可通行区域（街道）
     */
    renderWalkableAreas() {
        if (!this.currentMap.walkableAreas) return;
        
        this.ctx.fillStyle = '#FFFFFF'; // 白色街道
        this.ctx.strokeStyle = '#E0E0E0'; // 浅灰色边框
        this.ctx.lineWidth = 1;
        
        for (const area of this.currentMap.walkableAreas) {
            if (!area || !area.bounds) continue;
            
            const { left, top, right, bottom } = area.bounds;
            const width = right - left;
            const height = bottom - top;
            
            // 填充街道
            this.ctx.fillRect(left, top, width, height);
            
            // 绘制边框
            this.ctx.strokeRect(left, top, width, height);
        }
    }
    
    /**
     * 渲染建筑物
     */
    renderBuildings() {
        if (!this.currentMap.buildings) return;
        
        for (const building of this.currentMap.buildings) {
            if (!building || !building.bounds) continue;
            
            this.renderBuilding(building);
        }
    }
    
    /**
     * 渲染单个建筑物
     */
    renderBuilding(building) {
        const { left, top, right, bottom } = building.bounds;
        const width = right - left;
        const height = bottom - top;
        
        // 建筑物主体
        this.ctx.fillStyle = building.color || '#8B4513';
        this.ctx.fillRect(left, top, width, height);
        
        // 建筑物边框
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(left, top, width, height);
        
        // 建筑物标签
        if (building.type) {
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(building.type, building.x, building.y);
        }
    }
    
    /**
     * 渲染地图边界
     */
    renderBoundaries() {
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(0, 0, this.currentMap.width, this.currentMap.height);
    }
    
    /**
     * 渲染网格
     */
    renderGrid() {
        if (!this.currentMap.cellSize) return;
        
        this.ctx.strokeStyle = '#CCCCCC';
        this.ctx.lineWidth = 1;
        
        const cellSize = this.currentMap.cellSize;
        const gridCols = this.currentMap.gridCols;
        const gridRows = this.currentMap.gridRows;
        
        // 绘制垂直线
        for (let col = 0; col <= gridCols; col++) {
            const x = col * cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.currentMap.height);
            this.ctx.stroke();
        }
        
        // 绘制水平线
        for (let row = 0; row <= gridRows; row++) {
            const y = row * cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.currentMap.width, y);
            this.ctx.stroke();
        }
    }
    
    /**
     * 渲染调试信息
     */
    renderDebugInfo() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 300, 150);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        let y = 30;
        this.ctx.fillText(`地图: ${this.currentMap.name}`, 15, y); y += 15;
        this.ctx.fillText(`类型: ${this.currentMap.type}`, 15, y); y += 15;
        this.ctx.fillText(`尺寸: ${this.currentMap.width} x ${this.currentMap.height}`, 15, y); y += 15;
        this.ctx.fillText(`网格: ${this.currentMap.gridCols} x ${this.currentMap.gridRows}`, 15, y); y += 15;
        this.ctx.fillText(`单元格: ${this.currentMap.cellSize}px`, 15, y); y += 15;
        this.ctx.fillText(`建筑物: ${this.currentMap.buildings?.length || 0}`, 15, y); y += 15;
        this.ctx.fillText(`可通行区域: ${this.currentMap.walkableAreas?.length || 0}`, 15, y);
    }
    
    /**
     * 获取地图信息
     */
    getMapInfo() {
        return {
            name: this.currentMap.name,
            type: this.currentMap.type,
            width: this.currentMap.width,
            height: this.currentMap.height,
            cellSize: this.currentMap.cellSize,
            gridCols: this.currentMap.gridCols,
            gridRows: this.currentMap.gridRows,
            buildings: this.currentMap.buildings,
            walkableAreas: this.currentMap.walkableAreas
        };
    }
    
    /**
     * 切换网格显示
     */
    toggleGrid() {
        this.showGrid = !this.showGrid;
    }
    
    /**
     * 切换调试信息显示
     */
    toggleDebug() {
        this.showDebug = !this.showDebug;
    }
    
    /**
     * 设置缩放
     */
    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(2.0, zoom));
    }
    
    /**
     * 检查点是否在建筑物内
     */
    isPointInBuilding(x, y) {
        if (!this.currentMap.buildings) return false;
        
        for (const building of this.currentMap.buildings) {
            if (!building.bounds) continue;
            
            const { left, right, top, bottom } = building.bounds;
            if (x >= left && x < right && y >= top && y < bottom) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 检查点是否在可通行区域内
     */
    isPointWalkable(x, y) {
        if (!this.currentMap.walkableAreas) return true; // 默认可通行
        
        for (const area of this.currentMap.walkableAreas) {
            if (!area.bounds) continue;
            
            const { left, right, top, bottom } = area.bounds;
            if (x >= left && x < right && y >= top && y < bottom) {
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== 兼容性方法 ====================
    // 这些方法是为了与现有的游戏系统兼容
    
    /**
     * 获取地图宽度（兼容性）
     */
    get mapWidth() {
        return this.currentMap ? this.currentMap.width : 4000;
    }
    
    /**
     * 获取地图高度（兼容性）
     */
    get mapHeight() {
        return this.currentMap ? this.currentMap.height : 4000;
    }
    
    /**
     * 获取单元格大小（兼容性）
     */
    get cellSize() {
        return this.currentMap ? this.currentMap.cellSize : 100;
    }
    
    /**
     * 获取网格列数（兼容性）
     */
    get gridCols() {
        return this.currentMap ? this.currentMap.gridCols : 40;
    }
    
    /**
     * 获取网格行数（兼容性）
     */
    get gridRows() {
        return this.currentMap ? this.currentMap.gridRows : 40;
    }
    
    /**
     * 获取建筑物列表（兼容性）
     */
    get buildings() {
        return this.currentMap ? this.currentMap.buildings : [];
    }
    
    /**
     * 获取可通行区域列表（兼容性）
     */
    get walkableAreas() {
        return this.currentMap ? this.currentMap.walkableAreas : [];
    }
    
    /**
     * 设置角色管理器（兼容性）
     */
    setCharacterManager(characterManager) {
        this.characterManager = characterManager;
    }
    
    /**
     * 移动地图视图（兼容性）
     */
    moveMap(deltaX, deltaY) {
        // 这里可以实现地图视图移动逻辑
        console.log('地图视图移动:', deltaX, deltaY);
    }
    
    /**
     * 检查建筑物点击（兼容性）
     */
    checkBuildingClick(x, y) {
        if (!this.currentMap.buildings) return null;
        
        for (const building of this.currentMap.buildings) {
            if (!building.bounds) continue;
            
            const { left, right, top, bottom } = building.bounds;
            if (x >= left && x < right && y >= top && y < bottom) {
                return building;
            }
        }
        
        return null;
    }
    
    /**
     * 获取建筑物信息（兼容性）
     */
    getBuildingInfo(building) {
        if (!building) return null;
        
        return {
            type: building.type,
            position: { x: building.x, y: building.y },
            size: { width: building.width, height: building.height },
            color: building.color
        };
    }
}

// 导出
export default MapRenderer;
