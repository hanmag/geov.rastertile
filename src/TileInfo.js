export default class TileInfo {
    constructor(zoom, size, col, row, width) {
        this.z = zoom;
        this.s = size;
        this.c = col;
        this.r = row;
        this.w = width;
        this.computeId();
    }

    computeId() {
        this.id = this.z + '-' + this.c + '-' + this.r;
    }

    clone() {
        return new TileInfo(this.z, this.s, this.c, this.r, this.w);
    }

    getParent() {
        if (this.z <= 0) return null;
        return new TileInfo(this.z - 1, this.s / 2, this.c / 2, this.r / 2, this.w * 2);
    }
}