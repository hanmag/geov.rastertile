import * as THREE from 'three';
import Tile from '../Tile';
import {
    GeoUtils
} from 'geov';
import tileProvider from '../TileProvider';

export default class RasterTile extends Tile {

    constructor(tileInfo, rollback) {
        super(tileInfo, rollback);
        this._createGeometry();
        this.object = new THREE.Mesh();
        this.object.tileId = this.tileInfo.id;
        this.object.geometry = this.geometry;
        this.url = tileProvider.getTileUrl(tileInfo.z, tileInfo.r, tileInfo.c);
    }

    _createGeometry() {
        this.heightSegments = Math.max(12 - this.tileInfo.z, 4);
        this.widthSegments = this.tileInfo.z < 5 ? 12 : 3;
        this.geometry = new THREE.SphereBufferGeometry(GeoUtils.EarthRadius, this.widthSegments, this.heightSegments,
            this.tileInfo.c * this.tileInfo.w, this.tileInfo.w, this.phiStart, this.height);
    }

    _render() {
        this.geometry.removeAttribute('uv');
        const _mphiStart = Math.tan(this.phiStart - geov.MathUtils.HALFPI) / 2;
        const _mphiEnd = Math.tan(this.phiStart + this.height - geov.MathUtils.HALFPI) / 2;
        const quad_uvs = [];
        for (let heightIndex = 0; heightIndex <= this.heightSegments; heightIndex++) {
            const _phi = this.phiStart + (heightIndex / this.heightSegments * this.height);
            const _mphi = Math.tan(_phi - geov.MathUtils.HALFPI) / 2;
            const _y = (_mphiEnd - _mphi) / (_mphiEnd - _mphiStart);
            for (let widthIndex = 0; widthIndex <= this.widthSegments; widthIndex++) {
                quad_uvs.push(widthIndex / this.widthSegments);
                quad_uvs.push(_y);
            }
        }
        this.geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(quad_uvs), 2));

        this.object.material = this.material;
    }

    loadContent(loadedCallback) {
        const _this = this;
        this.request.open('GET', this.url, true);
        this.request.responseType = 'blob';
        this.request.onload = function () {
            const blob = this.response;
            const img = document.createElement('img');
            img.onload = function (e) {
                window.URL.revokeObjectURL(img.src); // 清除释放

                _this.texture = new THREE.Texture();
                _this.texture.image = img;
                _this.texture.format = THREE.RGBFormat;
                _this.texture.needsUpdate = true;

                _this.content = _this.material = new THREE.MeshLambertMaterial({
                    map: _this.texture,
                    side: THREE.FrontSide
                });

                _this._render();
                loadedCallback();
            };

            img.src = window.URL.createObjectURL(blob);
        };
        this.request.send();
    }

    fillContent() {}

}