import TileLayer from '../TileLayer';
import RasterTile from './RasterTile';

export default class RasterTileLayer extends TileLayer {
    
    _mapZoomToTileZoom(mapZoom) {
        return Math.round(Math.max(2, Math.min(18, mapZoom)));
    }

    _generateTiles() {
        // 计算并更新 scene 中的 tiles
        const tiles = [];
        this.tilesInfo.visibles.forEach(tileInfo => {
            tiles.push(new RasterTile(tileInfo, false));
        });
        this.tilesInfo.arounds.forEach(tileInfo => {
            tiles.push(new RasterTile(tileInfo, true));
        });
        return tiles;
    }

    _loadPolar() {}
};