(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('geov'), require('three')) :
	typeof define === 'function' && define.amd ? define(['exports', 'geov', 'three'], factory) :
	(factory((global.geov = global.geov || {}),global.geov,global.THREE));
}(this, (function (exports,geov$1,THREE) { 'use strict';

// 切片缓存
var TILE_CACHE = {};
// 切片访问队列，记录切片访问次序
var TILEID_QUEUE = [];
// 最大可维护切片数量
var MAX_TILE_SIZE = 500;

// 更新最近访问列表顺序
function moveToEnd(tileId) {
    var index = TILEID_QUEUE.findIndex(function (ele) {
        return ele === tileId;
    });
    if (index < 0) return;
    TILEID_QUEUE = TILEID_QUEUE.concat(TILEID_QUEUE.splice(index, 1));
}

// 添加新的切片，删除最早访问的部分切片
function addToQueue(tileId) {
    TILEID_QUEUE.push(tileId);
    if (TILEID_QUEUE.length > MAX_TILE_SIZE) {
        for (var index = 0; index < MAX_TILE_SIZE * 0.3; index++) {
            var id = TILEID_QUEUE.shift();
            TILE_CACHE[id].dispose();
            delete TILE_CACHE[id];
        }
    }
}

var tileCache = {
    get: function get(tileId) {
        var tile = TILE_CACHE[tileId];
        if (tile) {
            moveToEnd(tileId);
        }
        return tile;
    },
    add: function add(tile) {
        addToQueue(tile.id);
        TILE_CACHE[tile.id] = tile;
    },
    save: function save(tile) {
        // 持久化存储
        TILE_CACHE[tile.id] = tile;
    },
    size: function size() {
        return TILEID_QUEUE.length;
    }
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Tile = function () {
    function Tile(tileInfo, rollback) {
        var _this = this;

        classCallCheck(this, Tile);

        this.tileInfo = tileInfo;
        this.rollback = rollback;
        this.id = tileInfo.id;
        this.state = 0;
        this.phiStart = geov$1.MathUtils.HALFPI + Math.atan((2 * tileInfo.r / tileInfo.s - 1) * geov$1.MathUtils.PI);
        this.height = geov$1.MathUtils.HALFPI + Math.atan((2 * (tileInfo.r + 1) / tileInfo.s - 1) * geov$1.MathUtils.PI) - this.phiStart;
        this.request = new XMLHttpRequest();
        this.request.timeout = 10000;
        this.request.ontimeout = function () {
            _this.state = 0;
            console.warn('Tile [%s] time out', _this.tileInfo.id);
        };
        this.request.onerror = function () {
            _this.state = 0;
        };
    }

    createClass(Tile, [{
        key: 'isUnload',
        value: function isUnload() {
            return this.state === 0;
        }
    }, {
        key: 'isLoading',
        value: function isLoading() {
            return this.state === 1;
        }
    }, {
        key: 'isLoaded',
        value: function isLoaded() {
            return this.state === 2;
        }
    }, {
        key: 'loaded',
        value: function loaded() {
            this.content.zoom = this.tileInfo.z;
            if (this.content.zoom < 4) tileCache.save(this.content);else tileCache.add(this.content);

            this.state = 2;
        }
    }, {
        key: 'load',
        value: function load() {
            var _this2 = this;

            if (!this.isUnload()) return;

            this.state = 1;
            this.fill();

            if (!this.content || !this.rollback) this.loadContent(function () {
                return _this2.loaded();
            });else if (this.content) this.loaded();
        }
    }, {
        key: 'fill',
        value: function fill() {
            this.content = tileCache.get(this.tileInfo.id);
            var ti = this.tileInfo.getParent();
            while (ti && !this.content) {
                this.content = tileCache.get(ti.id);
                ti = ti.getParent();
            }

            if (this.content) this.fillContent();
        }
    }, {
        key: 'abort',
        value: function abort() {
            if (this.request) {
                this.request.abort();
                this.request = null;
            }
            this.state = null;
        }
    }, {
        key: 'dispose',
        value: function dispose() {
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
    }]);
    return Tile;
}();

var TileInfo = function () {
    function TileInfo(zoom, size, col, row, width) {
        classCallCheck(this, TileInfo);

        this.z = zoom;
        this.s = size;
        this.c = col;
        this.r = row;
        this.w = width;
        this.computeId();
    }

    createClass(TileInfo, [{
        key: 'computeId',
        value: function computeId() {
            this.id = this.z + '-' + this.c + '-' + this.r;
        }
    }, {
        key: 'clone',
        value: function clone() {
            return new TileInfo(this.z, this.s, this.c, this.r, this.w);
        }
    }, {
        key: 'getParent',
        value: function getParent() {
            if (this.z <= 0) return null;
            return new TileInfo(this.z - 1, this.s / 2, this.c / 2, this.r / 2, this.w * 2);
        }
    }]);
    return TileInfo;
}();

var EPS = 0.001;

// 墨卡托投影球面纬度 转换为 正常球面纬度
// -atan(PI) < phi < atan(PI)
function webmercatorToGeoDegreePhi(phi) {
    if (phi < -geov$1.MathUtils.MAXPHI) return -geov$1.MathUtils.HALFPI + 0.00001;
    if (phi > geov$1.MathUtils.MAXPHI) return geov$1.MathUtils.HALFPI - 0.00001;
    return Math.tan(phi) / 2;
}

// 通过层级、横向/纵向角度定位切片
function calcTileInfo(zoom, phi, theta) {
    while (theta < 0) {
        theta += geov$1.MathUtils.PI2;
    }theta = theta % geov$1.MathUtils.PI2;

    phi -= geov$1.MathUtils.HALFPI;
    phi = webmercatorToGeoDegreePhi(phi) + geov$1.MathUtils.HALFPI;

    var size = Math.pow(2, zoom);
    var unit = geov$1.MathUtils.PI / size;
    var col = Math.floor(theta / (2 * unit));
    var row = Math.floor(phi / unit);
    var width = 2 * unit;

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
    var offsetY = Math.abs((centerTile.r + 0.5) / centerTile.s - 0.5) * 2;
    // 显示级别权值 ( 0 | 1 )，级别靠近最大或最小时为1
    var zoomRatio = centerTile.z < 4 ? 2 : centerTile.z / 15;
    // 倾斜度 ( 0 ~ 1 )，倾斜度越大，可视切片数量越大
    var pitchRatio = Math.min(90 / (90 - pitch), 2) - 1;
    // 转向角权值 ( 0 ~ 1 )，视线指向赤道时转向角权值小，视线指向两极时转向角权值大
    var bearingRatio = 0.5 + Math.cos(bearing) * (0.5 - (centerTile.r + 0.5) / centerTile.s);
    // 可见行数
    var rowCount = Math.round(1 + zoomRatio * 1 + offsetY * 2 + pitchRatio * 4 + bearingRatio * 1.2 + Math.abs(Math.sin(bearing)) * 1.2);
    // 可见列数
    var colCount = Math.round(1 + zoomRatio * 1.5 + offsetY * 2 + pitchRatio * 3 + bearingRatio * 1.2 + Math.abs(Math.cos(bearing)) * 1.2);
    // 中心行列号
    var centerRow = centerTile.r;
    var centerCol = centerTile.c;
    var row_cols = [[centerRow, centerCol]];
    var tileIds = [centerRow + '-' + centerCol];
    var pushRowCol = function pushRowCol(row_col) {
        if (tileIds.indexOf(row_col[0] + '-' + row_col[1]) < 0) {
            tileIds.push(row_col[0] + '-' + row_col[1]);
            row_cols.push(row_col);
        }
    };
    for (var index = 1; index <= Math.max(rowCount, colCount); index++) {
        for (var i = index; i > -1; i--) {
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
    var tiles = {
        visibles: [],
        arounds: []
    };

    row_cols.forEach(function (row_col) {
        if (tiles.visibles.length + tiles.arounds.length > 100) return;

        var tile = tileInfo.clone();
        tile.c = row_col[1];
        tile.r = row_col[0];
        tile.computeId();

        if (tiles.visibles.length < 35) tiles.visibles.push(tile);else tiles.arounds.push(tile);
    });

    return tiles;
}

var tileGrid = {

    isVisible: function isVisible(tileId) {
        return this.tilesInfo && this.tilesInfo.visibles.find(function (tile) {
            return tile.id === tileId;
        });
    },

    isAround: function isAround(tileId) {
        return this.tilesInfo && this.tilesInfo.arounds.find(function (tile) {
            return tile.id === tileId;
        });
    },

    isInUse: function isInUse(tileId) {
        return this.isVisible(tileId) || this.isAround(tileId);
    },

    getTilesInfo: function getTilesInfo(zoom, phi, theta, pitch, bearing) {
        var tileInfo = calcTileInfo(zoom, phi, theta);

        if (this._lastVisibleExtent && tileInfo.id === this._lastVisibleExtent.id && Math.abs(pitch - this._lastVisibleExtent.pitch) < EPS && Math.abs(bearing - this._lastVisibleExtent.bearing) < EPS) {
            return false;
        }

        this._lastVisibleExtent = {
            id: tileInfo.id,
            pitch: pitch,
            bearing: bearing
        };

        this.tilesInfo = makeTilesInfo(tileInfo, calcRange(tileInfo, pitch, bearing));
        return this.tilesInfo;
    }
};

var tileProvider = {
    // register map provider
    setMapType: function setMapType(type) {
        this.type = type;
    },
    getTileUrl: function getTileUrl(level, row, column) {
        switch (this.type) {
            case 'bing':
                return this._getBingTileUrl(level, row, column);

            default:
                return null;
        }
    },
    // Bing Map
    _getBingTileUrl: function _getBingTileUrl(level, row, column) {
        var tileX = column;
        var tileY = row;
        var strTileX2 = tileX.toString(2);
        var strTileY2 = tileY.toString(2);
        var delta = strTileX2.length - strTileY2.length;
        var i = 0;
        if (delta > 0) {
            for (i = 0; i < delta; i++) {
                strTileY2 = '0' + strTileY2;
            }
        } else if (delta < 0) {
            delta = -delta;
            for (i = 0; i < delta; i++) {
                strTileX2 = '0' + strTileX2;
            }
        }
        var strMerge2 = "";
        for (i = 0; i < strTileY2.length; i++) {
            var charY = strTileY2[i];
            var charX = strTileX2[i];
            strMerge2 += charY + charX;
        }
        var strMerge4 = geov$1.MathUtils.numerationSystemTo10(2, strMerge2).toString(4);
        if (strMerge4.length < level) {
            delta = level - strMerge4.length;
            for (i = 0; i < delta; i++) {
                strMerge4 = '0' + strMerge4;
            }
        }
        var sum = level + row + column;
        var serverIdx = sum % 8; //0,1,2,3,4,5,6,7
        //var styles = ['a','r','h']
        var url = '//ecn.t' + serverIdx + '.tiles.virtualearth.net/tiles/a' + strMerge4 + '.jpeg?g=1239&mkt=en-us';
        return url;
    }
};

var TileLayer = function (_geov$Layer) {
    inherits(TileLayer, _geov$Layer);

    function TileLayer(id, options) {
        classCallCheck(this, TileLayer);

        var _this = possibleConstructorReturn(this, (TileLayer.__proto__ || Object.getPrototypeOf(TileLayer)).call(this, id));

        tileProvider.setMapType(options.type);
        return _this;
    }

    // 图层初始化的起点


    createClass(TileLayer, [{
        key: '_load',
        value: function _load() {
            var _this2 = this;

            this.group = new THREE.Group();
            this.group.name = this.id;
            this.earth._scene.add(this.group);

            this.earth._controls.addEventListener('change', function () {
                return _this2._loadTiles();
            });
            this.earth._controls.addEventListener('end', function () {
                return _this2._loadTiles(true);
            });
            this._loadPolar();
            this._loadTiles();
        }
    }, {
        key: '_loadTiles',
        value: function _loadTiles(forceUpdate) {
            if (forceUpdate || !this.isUpdating) {
                this.isUpdating = true;

                var zoom = this.earth.getZoom();
                var radian = this.earth.getRadian();
                var pitch = this.earth.getPitch();
                var bearing = this.earth.getBearing();

                // 计算当前视角的切片组合
                this.tilesInfo = tileGrid.getTilesInfo(this._mapZoomToTileZoom(zoom), radian.y, radian.x, pitch, bearing);
                if (!this.tilesInfo) {
                    this.isUpdating = false;
                    return;
                }

                if (this.tiles) {
                    var _self = this;
                    this.tiles.forEach(function (tile) {
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
    }, {
        key: '_update',
        value: function _update() {
            if (!this.needsUpdate) return;

            var _self = this;
            var loadingCount = 0;
            this.tiles.forEach(function (tile) {
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
    }]);
    return TileLayer;
}(geov$1.Layer);

var RasterTile = function (_Tile) {
    inherits(RasterTile, _Tile);

    function RasterTile(tileInfo, rollback) {
        classCallCheck(this, RasterTile);

        var _this2 = possibleConstructorReturn(this, (RasterTile.__proto__ || Object.getPrototypeOf(RasterTile)).call(this, tileInfo, rollback));

        _this2._createGeometry();
        _this2.object = new THREE.Mesh();
        _this2.object.tileId = _this2.tileInfo.id;
        _this2.object.geometry = _this2.geometry;
        _this2.url = tileProvider.getTileUrl(tileInfo.z, tileInfo.r, tileInfo.c);
        return _this2;
    }

    createClass(RasterTile, [{
        key: '_createGeometry',
        value: function _createGeometry() {
            this.heightSegments = Math.max(12 - this.tileInfo.z, 4);
            this.widthSegments = this.tileInfo.z < 5 ? 12 : 3;
            this.geometry = new THREE.SphereBufferGeometry(geov$1.GeoUtils.EarthRadius, this.widthSegments, this.heightSegments, this.tileInfo.c * this.tileInfo.w, this.tileInfo.w, this.phiStart, this.height);
        }
    }, {
        key: '_render',
        value: function _render() {
            this.geometry.removeAttribute('uv');
            var _mphiStart = Math.tan(this.phiStart - geov.MathUtils.HALFPI) / 2;
            var _mphiEnd = Math.tan(this.phiStart + this.height - geov.MathUtils.HALFPI) / 2;
            var quad_uvs = [];
            for (var heightIndex = 0; heightIndex <= this.heightSegments; heightIndex++) {
                var _phi = this.phiStart + heightIndex / this.heightSegments * this.height;
                var _mphi = Math.tan(_phi - geov.MathUtils.HALFPI) / 2;
                var _y = (_mphiEnd - _mphi) / (_mphiEnd - _mphiStart);
                for (var widthIndex = 0; widthIndex <= this.widthSegments; widthIndex++) {
                    quad_uvs.push(widthIndex / this.widthSegments);
                    quad_uvs.push(_y);
                }
            }
            this.geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(quad_uvs), 2));

            this.object.material = this.material;
        }
    }, {
        key: 'loadContent',
        value: function loadContent(loadedCallback) {
            var _this = this;
            this.request.open('GET', this.url, true);
            this.request.responseType = 'blob';
            this.request.onload = function () {
                var blob = this.response;
                var img = document.createElement('img');
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
    }, {
        key: 'fillContent',
        value: function fillContent() {}
    }]);
    return RasterTile;
}(Tile);

var RasterTileLayer = function (_TileLayer) {
    inherits(RasterTileLayer, _TileLayer);

    function RasterTileLayer() {
        classCallCheck(this, RasterTileLayer);
        return possibleConstructorReturn(this, (RasterTileLayer.__proto__ || Object.getPrototypeOf(RasterTileLayer)).apply(this, arguments));
    }

    createClass(RasterTileLayer, [{
        key: '_mapZoomToTileZoom',
        value: function _mapZoomToTileZoom(mapZoom) {
            return Math.round(Math.max(2, Math.min(18, mapZoom)));
        }
    }, {
        key: '_generateTiles',
        value: function _generateTiles() {
            // 计算并更新 scene 中的 tiles
            var tiles = [];
            this.tilesInfo.visibles.forEach(function (tileInfo) {
                tiles.push(new RasterTile(tileInfo, false));
            });
            this.tilesInfo.arounds.forEach(function (tileInfo) {
                tiles.push(new RasterTile(tileInfo, true));
            });
            return tiles;
        }
    }, {
        key: '_loadPolar',
        value: function _loadPolar() {}
    }]);
    return RasterTileLayer;
}(TileLayer);

var VectorTileLayer = function (_TileLayer) {
    inherits(VectorTileLayer, _TileLayer);

    function VectorTileLayer() {
        classCallCheck(this, VectorTileLayer);
        return possibleConstructorReturn(this, (VectorTileLayer.__proto__ || Object.getPrototypeOf(VectorTileLayer)).apply(this, arguments));
    }

    return VectorTileLayer;
}(TileLayer);

exports.RasterTileLayer = RasterTileLayer;
exports.VectorTileLayer = VectorTileLayer;

Object.defineProperty(exports, '__esModule', { value: true });

})));
