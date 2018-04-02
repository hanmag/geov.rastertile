import * as THREE from 'three';
import * as geov from 'geov';
import tileGrid from './TileGrid';
import tileCache from './TileCache';

export default class Tile {
    constructor(tileInfo, rollback) {
        this.tileInfo = tileInfo;
        this.rollback = rollback;
        this.id = tileInfo.id;
        this.state = 0;
        this.phiStart = geov.MathUtils.HALFPI + Math.atan(((2 * tileInfo.r / tileInfo.s) - 1) * geov.MathUtils.PI);
        this.height = geov.MathUtils.HALFPI + Math.atan(((2 * (tileInfo.r + 1) / tileInfo.s) - 1) * geov.MathUtils.PI) - this.phiStart;
        this.request = new XMLHttpRequest();
        this.request.timeout = 10000;
        this.request.ontimeout = () => {
            this.state = 0;
            console.warn('Tile [%s] time out', this.tileInfo.id);
        };
        this.request.onerror = () => {
            this.state = 0;
        };
    }
    isUnload() {
        return this.state === 0;
    }
    isLoading() {
        return this.state === 1;
    }
    isLoaded() {
        return this.state === 2;
    }
    loaded() {
        this.content.zoom = this.tileInfo.z;
        if (this.content.zoom < 4)
            tileCache.save(this.content);
        else
            tileCache.add(this.content);

        this.state = 2;
    }
    load() {
        if (!this.isUnload()) return;

        this.state = 1;
        this.fill();

        if (!this.content || !this.rollback)
            this.loadContent(() => this.loaded());
        else if (this.content)
            this.loaded();
    }
    fill() {
        this.content = tileCache.get(this.tileInfo.id);
        let ti = this.tileInfo.getParent();
        while (ti && !this.content) {
            this.content = tileCache.get(ti.id);
            ti = ti.getParent();
        }

        if (this.content)
            this.fillContent();
    }
    abort() {
        if (this.request) {
            this.request.abort();
            this.request = null;
        }
        this.state = null;
    }
    dispose() {
        this.abort();
        // if (this.geometry)
        //     this.geometry.dispose();
        // this.geometry = null;
        // if (this.material) {
        //     this.material.dispose();
        //     this.texture.dispose();
        //     this.material = null;
        //     this.texture = null;
        // }
        // // this.mesh.dispose();
        // this.mesh = null;
    }
};