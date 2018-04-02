import * as geov from 'geov';
import cache from './TileCache';
import Tile from './Tile';
import TileInfo from './TileInfo';

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

    return new TileInfo(zoom, size, col, row, width);
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
    while (col < 0) {
        col += size;
    }

    return [row, col];
}

// 计算当前可见切片范围，结果为行列号数组
function calcRange(centerTile, pitch, bearing) {
    // 纬度偏移量 ( 0 ~ 1 )，越靠近高纬度，可视切片数量越大
    const offsetY = Math.abs(((centerTile.r + 0.5) / centerTile.s) - 0.5) * 2;
    // 显示级别权值 ( 0 | 1 )，级别靠近最大或最小时为1
    const zoomRatio = centerTile.z < 4 ? 2 : centerTile.z / 15;
    // 倾斜度 ( 0 ~ 1 )，倾斜度越大，可视切片数量越大
    const pitchRatio = Math.min(90 / (90 - pitch), 2) - 1;
    // 转向角权值 ( 0 ~ 1 )，视线指向赤道时转向角权值小，视线指向两极时转向角权值大
    const bearingRatio = 0.5 + (Math.cos(bearing) * (0.5 - ((centerTile.r + 0.5) / centerTile.s)));
    // 可见行数
    const rowCount = Math.round(1 + (zoomRatio * 1) + (offsetY * 2) + (pitchRatio * 4) + (bearingRatio * 1.2) + (Math.abs(Math.sin(bearing)) * 1.2));
    // 可见列数
    const colCount = Math.round(1 + (zoomRatio * 1.5) + (offsetY * 2) + (pitchRatio * 3) + (bearingRatio * 1.2) + (Math.abs(Math.cos(bearing)) * 1.2));
    // 中心行列号
    const centerRow = centerTile.r;
    const centerCol = centerTile.c;
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
            pushRowCol(reviseRowAndCol(centerTile.s, centerRow + Math.min(rowCount, index), centerCol + Math.min(colCount, i)));
            pushRowCol(reviseRowAndCol(centerTile.s, centerRow + Math.min(rowCount, index), centerCol - Math.min(colCount, i)));
            pushRowCol(reviseRowAndCol(centerTile.s, centerRow - Math.min(rowCount, index), centerCol + Math.min(colCount, i)));
            pushRowCol(reviseRowAndCol(centerTile.s, centerRow - Math.min(rowCount, index), centerCol - Math.min(colCount, i)));
            pushRowCol(reviseRowAndCol(centerTile.s, centerRow + Math.min(rowCount, i), centerCol + Math.min(colCount, index)));
            pushRowCol(reviseRowAndCol(centerTile.s, centerRow + Math.min(rowCount, i), centerCol - Math.min(colCount, index)));
            pushRowCol(reviseRowAndCol(centerTile.s, centerRow - Math.min(rowCount, i), centerCol + Math.min(colCount, index)));
            pushRowCol(reviseRowAndCol(centerTile.s, centerRow - Math.min(rowCount, i), centerCol - Math.min(colCount, index)));
        }
    }
    // console.log(rowCount, colCount, row_cols.length);
    return row_cols;
}

// 根据可视范围获取切片
function makeTilesInfo(tileInfo, row_cols) {
    const tiles = {
        visibles: [],
        arounds: []
    };

    row_cols.forEach(row_col => {
        if (tiles.visibles.length + tiles.arounds.length > 100) return;

        const tile = tileInfo.clone();
        tile.c = row_col[1];
        tile.r = row_col[0];
        tile.computeId();

        if (tiles.visibles.length < 35) tiles.visibles.push(tile);
        else tiles.arounds.push(tile);
    });

    return tiles;
}

export default {

    isVisible: function (tileId) {
        return this.tilesInfo && this.tilesInfo.visibles.find(tile => tile.id === tileId);
    },

    isAround: function (tileId) {
        return this.tilesInfo && this.tilesInfo.arounds.find(tile => tile.id === tileId);
    },

    isInUse: function (tileId) {
        return this.isVisible(tileId) || this.isAround(tileId);
    },

    getTilesInfo: function (zoom, phi, theta, pitch, bearing) {
        const tileInfo = calcTileInfo(zoom, phi, theta);

        if (this._lastVisibleExtent && tileInfo.id === this._lastVisibleExtent.id &&
            Math.abs(pitch - this._lastVisibleExtent.pitch) < EPS &&
            Math.abs(bearing - this._lastVisibleExtent.bearing) < EPS) {
            return false;
        }

        this._lastVisibleExtent = {
            id: tileInfo.id,
            pitch: pitch,
            bearing: bearing
        };

        this.tilesInfo = makeTilesInfo(tileInfo, calcRange(tileInfo, pitch, bearing));
        return this.tilesInfo;
    },

    locateTileInTile: function (tileInfo) {

    }
}