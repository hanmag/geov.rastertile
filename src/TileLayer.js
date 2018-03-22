import * as geov from 'geov';
import * as THREE from 'three';
import TileGrid from './TileGrid';
import tileProvider from './TileProvider';

export class TileLayer extends geov.Layer {
    constructor(id, options) {
        super(id);

        this.tilesInScene = {};
        this.group = new THREE.Group();
        tileProvider.setMapType(options.type);
    }

    load() {
        this.tileGrid = new TileGrid(this.earth._radius);
        this.earth._scene.add(this.group);
        this.earth._controls.addEventListener('change', () => this._loadTiles());
        this.earth._controls.addEventListener('end', () => this._loadTiles(true));
        this._loadTiles();
    }

    _loadTiles(forceUpdate) {
        if (forceUpdate || (!this.needUpdate && !this.inControl)) {
            this.inControl = true;

            const zoom = this.earth.getZoom();
            const radian = this.earth.getRadian();
            const pitch = this.earth.getPitch();
            const bearing = this.earth.getBearing();
            const result = this.tileGrid.getVisibleTiles(Math.round(Math.max(zoom + 1, 2)),
                radian.y, radian.x, pitch, bearing);

            if (result) {
                if (this.tiles) {
                    // 尚未加载完成 且 移出视野范围 的切片 停止加载
                    const _self = this;
                    this.tiles.forEach(tile => {
                        if (!_self.tileGrid.isVisible(tile.id) && tile.state === 'loading') {
                            tile.abort();
                        }
                    });
                }

                this.tiles = result;

                this.needUpdate = true;
            }

            this.inControl = false;
        }
    }

    update() {
        if (!this.needUpdate) return;

        // add
        if (!this.tiles) return;
        let loadingCount = 0;
        this.tiles.forEach(tile => {
            if (tile.state === 'loading') {
                // when is loading ?
                loadingCount++;
            } else if (!tile.state) {
                tile.load();
                loadingCount++;
            }
        });

        if (loadingCount < this.tiles.length * 0.2) {
            this.tiles.forEach(tile => {
                if (!this.tilesInScene[tile.id] && tile.state === 'loaded') {
                    this.group.add(tile.mesh);
                    this.tilesInScene[tile.id] = tile.mesh;
                }
            });

            const _self = this;
            // remove all unvisible tiles when 80% loaded
            Object.keys(this.tilesInScene).forEach(tileId => {
                if (!_self.tileGrid.isVisible(tileId)) {
                    this.group.remove(_self.tilesInScene[tileId]);
                    delete _self.tilesInScene[tileId];
                }
            });
        }

        this.needUpdate = loadingCount > 0;
    }
}