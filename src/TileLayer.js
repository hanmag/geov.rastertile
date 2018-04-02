import * as geov from 'geov';
import * as THREE from 'three';
import tileGrid from './TileGrid';
import tileProvider from './TileProvider';

export default class TileLayer extends geov.Layer {

    constructor(id, options) {
        super(id);

        tileProvider.setMapType(options.type);
    }

    // 图层初始化的起点
    _load() {
        this.group = new THREE.Group();
        this.group.name = this.id;
        this.earth._scene.add(this.group);

        this.earth._controls.addEventListener('change', () => this._loadTiles());
        this.earth._controls.addEventListener('end', () => this._loadTiles(true));
        this._loadPolar();
        this._loadTiles();
    }

    _loadTiles(forceUpdate) {
        if (forceUpdate || !this.isUpdating) {
            this.isUpdating = true;

            const zoom = this.earth.getZoom();
            const radian = this.earth.getRadian();
            const pitch = this.earth.getPitch();
            const bearing = this.earth.getBearing();

            // 计算当前视角的切片组合
            this.tilesInfo = tileGrid.getTilesInfo(this._mapZoomToTileZoom(zoom),
                radian.y, radian.x, pitch, bearing);
            if (!this.tilesInfo) {
                this.isUpdating = false;
                return;
            }

            if (this.tiles) {
                const _self = this;
                this.tiles.forEach(tile => {
                    // 尚未加载完成 且 移出视野范围 的切片 停止加载
                    if (!tileGrid.isVisible(tile.id) && tile.isLoading()) {
                        tile.abort();
                    }
                    // 删除不需要的切片
                    if (!tileGrid.isInUse(tile.id)) {
                        _self.group.remove(tile.object);
                        tile.dispose();
                        tile.isRendering = false;
                    }
                });
            }

            this.tiles = this._generateTiles();
            this.isUpdating = false;
            this.needsUpdate = this.needsUpdate || !!this.tiles;
        }
    }

    _update() {
        if (!this.needsUpdate) return;

        const _self = this;
        let loadingCount = 0;
        this.tiles.forEach(tile => {
            if (!tile.isLoaded()) {
                loadingCount++;
                tile.load();
            } else if (!tile.isRendering) {
                _self.group.add(tile.object);
                tile.isRendering = true;
            }
        });

        // if (loadingCount < this.tiles.length * 0.1) {
        //     this.tiles.forEach(tile => {
        //         if (!this.tilesInScene[tile.id] && tile.state === 'loaded') {
        //             this.group.add(tile.mesh);
        //             this.tilesInScene[tile.id] = tile.mesh;
        //         }
        //     });

        //     const _self = this;
        //     // remove all unvisible tiles when 90% loaded
        //     Object.keys(this.tilesInScene).forEach(tileId => {
        //         if (!_self.tileGrid.isVisible(tileId)) {
        //             this.group.remove(_self.tilesInScene[tileId]);
        //             delete _self.tilesInScene[tileId];
        //         }
        //     });
        // }

        this.needsUpdate = loadingCount > 0;
    }
}