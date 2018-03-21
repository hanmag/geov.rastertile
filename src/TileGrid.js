import * as geov from 'geov';
import cache from './TileCache';
import Tile from './Tile';

const EPS = 0.001;

// 墨卡托投影球面纬度 转换为 正常球面纬度
// -atan(PI) < phi < atan(PI)
function webmercatorToGeoDegreePhi(phi) {
    if (phi < -geov.MathUtils.MAXPHI) return -geov.MathUtils.HALFPI + 0.00001;
    if (phi > geov.MathUtils.MAXPHI) return geov.MathUtils.HALFPI - 0.00001;
    return Math.tan(phi) / 2;
}

// 通过层级、横向/纵向角度定位切片
function calcTileInfo(zoom, phi, theta) {
    while (theta < 0)
        theta += geov.MathUtils.PI2;
    theta = theta % geov.MathUtils.PI2;

    phi -= geov.MathUtils.HALFPI;
    phi = webmercatorToGeoDegreePhi(phi) + geov.MathUtils.HALFPI;

    const size = Math.pow(2, zoom);
    const unit = geov.MathUtils.PI / size;
    const col = Math.floor(theta / (2 * unit));
    const row = Math.floor(phi / unit);
    const width = 2 * unit;

    return {
        z: zoom,
        s: size,
        c: col,
        r: row,
        w: width
    };
}

// 换算成规范行列号
function reviseRowAndCol(size, row, col) {
    var size2 = size * 2;
    var sizeh = Math.floor(size / 2);
    if (row < 0) {
        row = -1 - row;
        col += sizeh;
    }
    row = (row + size2) % size2;
    if (row > size - 1) {
        row = size2 - row - 1;
        col += sizeh;
    }
    col = (col + size2) % size;

    return [row, col];
}

// 计算当前可见切片范围，结果为行列号数组
function calcRange(centerTile, pitch, bearing) {
    // 纬度偏移量 ( 0 ~ 1 )，越靠近高纬度，可视切片数量越大
    const offsetY = Math.abs(((centerTile.row + 0.5) / centerTile.size) - 0.5) * 2;
    // 显示级别权值 ( 0 | 1 )，级别靠近最大或最小时为1
    const zoomRatio = centerTile.zoom < 4 || centerTile.zoom > 15 ? 1 : 0;
    // 倾斜度 ( 0 ~ 1 )，倾斜度越大，可视切片数量越大
    const pitchRatio = Math.min(90 / (90 - pitch), 2) - 1;
    // 转向角权值 ( 0 ~ 1 )，视线指向赤道时转向角权值小，视线指向两极时转向角权值大
    const bearingRatio = 0.5 + (Math.cos(bearing) * (0.5 - ((centerTile.row + 0.5) / centerTile.size)));
    // 可见行数
    const rowCount = Math.round(0.5 + (zoomRatio * 2) + (offsetY * 5) + (pitchRatio * 4) + (bearingRatio * 1.2) + (Math.abs(Math.sin(bearing)) * 1.2));
    // 可见列数
    const colCount = Math.round(0.5 + (zoomRatio * 2) + (offsetY * 5) + (pitchRatio * 3) + (bearingRatio * 1.2) + (Math.abs(Math.cos(bearing)) * 1.2));
    // 中心行列号
    const centerRow = centerTile.row;
    const centerCol = centerTile.col;
    let row_cols = [
        [centerRow, centerCol]
    ];
    let tileIds = [centerRow + '-' + centerCol];
    let pushRowCol = function (row_col) {
        if (tileIds.indexOf(row_col[0] + '-' + row_col[1]) < 0) {
            tileIds.push(row_col[0] + '-' + row_col[1]);
            row_cols.push(row_col);
        }
    };
    for (let index = 1; index <= Math.max(rowCount, colCount); index++) {
        for (let i = index; i > -1; i--) {
            pushRowCol(reviseRowAndCol(centerTile.size, centerRow + Math.min(rowCount, index), centerCol + Math.min(colCount, i)));
            pushRowCol(reviseRowAndCol(centerTile.size, centerRow + Math.min(rowCount, index), centerCol - Math.min(colCount, i)));
            pushRowCol(reviseRowAndCol(centerTile.size, centerRow - Math.min(rowCount, index), centerCol + Math.min(colCount, i)));
            pushRowCol(reviseRowAndCol(centerTile.size, centerRow - Math.min(rowCount, index), centerCol - Math.min(colCount, i)));
            pushRowCol(reviseRowAndCol(centerTile.size, centerRow + Math.min(rowCount, i), centerCol + Math.min(colCount, index)));
            pushRowCol(reviseRowAndCol(centerTile.size, centerRow + Math.min(rowCount, i), centerCol - Math.min(colCount, index)));
            pushRowCol(reviseRowAndCol(centerTile.size, centerRow - Math.min(rowCount, i), centerCol + Math.min(colCount, index)));
            pushRowCol(reviseRowAndCol(centerTile.size, centerRow - Math.min(rowCount, i), centerCol - Math.min(colCount, index)));
        }
    }
    // console.log(rowCount, colCount, row_cols.length);
    return row_cols;
}

export default class TileGrid {

    constructor(earthRadius) {
        this._radius = earthRadius;
    }

    getVisibleTiles(zoom, phi, theta, pitch, bearing) {
        const tileInfo = calcTileInfo(zoom, phi, theta);
        const tile = this._makeTile(tileInfo);

        if (this._lastVisibleExtent && tile.id === this._lastVisibleExtent.id &&
            Math.abs(pitch - this._lastVisibleExtent.pitch) < EPS &&
            Math.abs(bearing - this._lastVisibleExtent.bearing) < EPS) {
            return false;
        }

        this._lastVisibleExtent = {
            id: tile.id,
            pitch: pitch,
            bearing: bearing
        };

        this.visibleTiles = this._makeRoundTiles(tileInfo, calcRange(tile, pitch, bearing));
        return this.visibleTiles;
    }

    // 获取缓存切片或创建新切片
    _makeTile(tileInfo) {
        const tileId = tileInfo.z + '-' + tileInfo.c + '-' + tileInfo.r;
        let tile = cache.get(tileId);
        if (!tile) {
            tile = new Tile(this._radius, tileInfo.z, tileInfo.s, tileInfo.c, tileInfo.r, tileInfo.w);
            if (tile.zoom < 4)
                cache.save(tile);
            else
                cache.add(tile);
        }

        return tile;
    }

    // 根据可视范围获取切片
    _makeRoundTiles(tileInfo, row_cols) {
        const _self = this;
        return row_cols.map(row_col =>
            _self._makeTile({
                z: tileInfo.z,
                s: tileInfo.s,
                c: row_col[1],
                r: row_col[0],
                w: tileInfo.w
            })
        );
    }

    isVisible(tileId) {
        return this.visibleTiles && this.visibleTiles.find(tile => tile.id === tileId);
    }
}