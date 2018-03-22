(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('geov'), require('three')) :
	typeof define === 'function' && define.amd ? define(['exports', 'geov', 'three'], factory) :
	(factory((global.geov = global.geov || {}),global.geov,global.THREE));
}(this, (function (exports,geov,THREE) { 'use strict';

// 切片缓存
var TILE_CACHE = {};
// 切片访问队列，记录切片访问次序
var TILEID_QUEUE = [];
// 最大可维护切片数量
var MAX_TILE_SIZE = 900;

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

var cache = {
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

var tileProvider = {
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
        var url = "";
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
        var strMerge4 = geov.MathUtils.numerationSystemTo10(2, strMerge2).toString(4);
        if (strMerge4.length < level) {
            delta = level - strMerge4.length;
            for (i = 0; i < delta; i++) {
                strMerge4 = '0' + strMerge4;
            }
        }
        var sum = level + row + column;
        var serverIdx = sum % 8; //0,1,2,3,4,5,6,7
        //var styles = ['a','r','h']
        url = '//ecn.t' + serverIdx + '.tiles.virtualearth.net/tiles/a' + strMerge4 + '.jpeg?g=1239&mkt=en-us';
        return url;
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
    function Tile(radius, zoom, size, col, row, width) {
        classCallCheck(this, Tile);

        this.id = zoom + '-' + col + '-' + row;
        this.radius = radius;
        this.zoom = zoom;
        this.size = size;
        this.row = row;
        this.col = col;
        this.width = width;

        this.phiStart = row === 0 ? 0 : geov.MathUtils.HALFPI + Math.atan((2 * row / size - 1) * geov.MathUtils.PI);
        this.height = row === size - 1 ? geov.MathUtils.PI - this.phiStart : geov.MathUtils.HALFPI + Math.atan((2 * (row + 1) / size - 1) * geov.MathUtils.PI) - this.phiStart;

        this.url = tileProvider.getTileUrl(this.zoom, this.row, this.col);
        // this.load();
    }

    createClass(Tile, [{
        key: 'load',
        value: function load() {
            if (this.state) return;

            if (!this.request) {
                this.request = new XMLHttpRequest();
                this.request.timeout = 10000; // time in milliseconds
            }

            var _this = this;
            this.state = 'loading';
            this.request.open('GET', this.url, true);
            this.request.responseType = 'blob';
            this.request.onload = function () {
                var blob = this.response;
                var img = document.createElement('img');
                img.onload = function (e) {
                    window.URL.revokeObjectURL(img.src); // 清除释放

                    _this.heightSegments = Math.max(12 - _this.zoom, 5);
                    _this.widthSegments = _this.zoom < 5 ? 12 : 3;
                    _this.geometry = new THREE.SphereBufferGeometry(_this.radius, _this.widthSegments, _this.heightSegments, _this.col * _this.width, _this.width, _this.phiStart, _this.height);

                    if (_this.zoom < 12 && _this.row > 0 && _this.row < _this.size - 1) {
                        _this.geometry.removeAttribute('uv');
                        var _mphiStart = Math.tan(_this.phiStart - geov.MathUtils.HALFPI) / 2;
                        var _mphiEnd = Math.tan(_this.phiStart + _this.height - geov.MathUtils.HALFPI) / 2;
                        var quad_uvs = [];
                        for (var heightIndex = 0; heightIndex <= _this.heightSegments; heightIndex++) {
                            var _phi = _this.phiStart + heightIndex / _this.heightSegments * _this.height;
                            var _mphi = Math.tan(_phi - geov.MathUtils.HALFPI) / 2;
                            var _y = (_mphiEnd - _mphi) / (_mphiEnd - _mphiStart);
                            for (var widthIndex = 0; widthIndex <= _this.widthSegments; widthIndex++) {
                                quad_uvs.push(widthIndex / _this.widthSegments);
                                quad_uvs.push(_y);
                            }
                        }
                        _this.geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(quad_uvs), 2));
                    }
                    _this.texture = new THREE.Texture();
                    _this.texture.image = img;
                    _this.texture.format = THREE.RGBFormat;
                    _this.texture.needsUpdate = true;

                    _this.material = new THREE.MeshLambertMaterial({
                        map: _this.texture,
                        side: THREE.FrontSide
                    });
                    _this.mesh = new THREE.Mesh(_this.geometry, _this.material);
                    _this.mesh.tileId = _this.id;
                    _this.state = 'loaded';
                };

                img.src = window.URL.createObjectURL(blob);
            };
            this.request.ontimeout = function () {
                _this.state = null;
                console.warn('Tile [%s] time out', _this.id);
            };
            this.request.onerror = function () {
                _this.state = null;
            };
            this.request.send();
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
            if (this.geometry) this.geometry.dispose();
            this.geometry = null;
            if (this.material) {
                this.material.dispose();
                this.texture.dispose();
                this.material = null;
                this.texture = null;
            }
            // this.mesh.dispose();
            this.mesh = null;
        }
    }]);
    return Tile;
}();

var EPS = 0.001;

// 墨卡托投影球面纬度 转换为 正常球面纬度
// -atan(PI) < phi < atan(PI)
function webmercatorToGeoDegreePhi(phi) {
    if (phi < -geov.MathUtils.MAXPHI) return -geov.MathUtils.HALFPI + 0.00001;
    if (phi > geov.MathUtils.MAXPHI) return geov.MathUtils.HALFPI - 0.00001;
    return Math.tan(phi) / 2;
}

// 通过层级、横向/纵向角度定位切片
function calcTileInfo(zoom, phi, theta) {
    while (theta < 0) {
        theta += geov.MathUtils.PI2;
    }theta = theta % geov.MathUtils.PI2;

    phi -= geov.MathUtils.HALFPI;
    phi = webmercatorToGeoDegreePhi(phi) + geov.MathUtils.HALFPI;

    var size = Math.pow(2, zoom);
    var unit = geov.MathUtils.PI / size;
    var col = Math.floor(theta / (2 * unit));
    var row = Math.floor(phi / unit);
    var width = 2 * unit;

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
    var offsetY = Math.abs((centerTile.row + 0.5) / centerTile.size - 0.5) * 2;
    // 显示级别权值 ( 0 | 1 )，级别靠近最大或最小时为1
    var zoomRatio = centerTile.zoom < 4 ? 1 : centerTile.zoom / 15;
    // 倾斜度 ( 0 ~ 1 )，倾斜度越大，可视切片数量越大
    var pitchRatio = Math.min(90 / (90 - pitch), 2) - 1;
    // 转向角权值 ( 0 ~ 1 )，视线指向赤道时转向角权值小，视线指向两极时转向角权值大
    var bearingRatio = 0.5 + Math.cos(bearing) * (0.5 - (centerTile.row + 0.5) / centerTile.size);
    // 可见行数
    var rowCount = Math.round(1 + zoomRatio * 2 + offsetY * 4 + pitchRatio * 4 + bearingRatio * 1.2 + Math.abs(Math.sin(bearing)) * 1.2);
    // 可见列数
    var colCount = Math.round(1 + zoomRatio * 2.5 + offsetY * 4 + pitchRatio * 3 + bearingRatio * 1.2 + Math.abs(Math.cos(bearing)) * 1.2);
    // 中心行列号
    var centerRow = centerTile.row;
    var centerCol = centerTile.col;
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

var TileGrid = function () {
    function TileGrid(earthRadius) {
        classCallCheck(this, TileGrid);

        this._radius = earthRadius;
    }

    createClass(TileGrid, [{
        key: 'getVisibleTiles',
        value: function getVisibleTiles(zoom, phi, theta, pitch, bearing) {
            var tileInfo = calcTileInfo(zoom, phi, theta);
            var tile = this._makeTile(tileInfo);

            if (this._lastVisibleExtent && tile.id === this._lastVisibleExtent.id && Math.abs(pitch - this._lastVisibleExtent.pitch) < EPS && Math.abs(bearing - this._lastVisibleExtent.bearing) < EPS) {
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

    }, {
        key: '_makeTile',
        value: function _makeTile(tileInfo) {
            var tileId = tileInfo.z + '-' + tileInfo.c + '-' + tileInfo.r;
            var tile = cache.get(tileId);
            if (!tile) {
                tile = new Tile(this._radius, tileInfo.z, tileInfo.s, tileInfo.c, tileInfo.r, tileInfo.w);
                if (tile.zoom < 4) cache.save(tile);else cache.add(tile);
            }

            return tile;
        }

        // 根据可视范围获取切片

    }, {
        key: '_makeRoundTiles',
        value: function _makeRoundTiles(tileInfo, row_cols) {
            var _self = this;
            return row_cols.map(function (row_col) {
                return _self._makeTile({
                    z: tileInfo.z,
                    s: tileInfo.s,
                    c: row_col[1],
                    r: row_col[0],
                    w: tileInfo.w
                });
            });
        }
    }, {
        key: 'isVisible',
        value: function isVisible(tileId) {
            return this.visibleTiles && this.visibleTiles.find(function (tile) {
                return tile.id === tileId;
            });
        }
    }]);
    return TileGrid;
}();

var TileLayer = function (_geov$Layer) {
    inherits(TileLayer, _geov$Layer);

    function TileLayer(id, options) {
        classCallCheck(this, TileLayer);

        var _this = possibleConstructorReturn(this, (TileLayer.__proto__ || Object.getPrototypeOf(TileLayer)).call(this, id));

        _this.tilesInScene = {};
        _this.group = new THREE.Group();
        tileProvider.setMapType(options.type);
        return _this;
    }

    createClass(TileLayer, [{
        key: 'load',
        value: function load() {
            var _this2 = this;

            this.tileGrid = new TileGrid(this.earth._radius);
            this.earth._scene.add(this.group);
            this.earth._controls.addEventListener('change', function () {
                return _this2._loadTiles();
            });
            this.earth._controls.addEventListener('end', function () {
                return _this2._loadTiles(true);
            });
            this._loadTiles();
        }
    }, {
        key: '_loadTiles',
        value: function _loadTiles(forceUpdate) {
            if (forceUpdate || !this.needUpdate && !this.inControl) {
                this.inControl = true;

                var zoom = this.earth.getZoom();
                var radian = this.earth.getRadian();
                var pitch = this.earth.getPitch();
                var bearing = this.earth.getBearing();
                var result = this.tileGrid.getVisibleTiles(Math.round(Math.max(zoom + 1, 2)), radian.y, radian.x, pitch, bearing);

                if (result) {
                    if (this.tiles) {
                        // 尚未加载完成 且 移出视野范围 的切片 停止加载
                        var _self = this;
                        this.tiles.forEach(function (tile) {
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
    }, {
        key: 'update',
        value: function update() {
            var _this3 = this;

            if (!this.needUpdate) return;

            // add
            if (!this.tiles) return;
            var loadingCount = 0;
            this.tiles.forEach(function (tile) {
                if (tile.state === 'loading') {
                    // when is loading ?
                    loadingCount++;
                } else if (!tile.state) {
                    tile.load();
                    loadingCount++;
                }
            });

            if (loadingCount < this.tiles.length * 0.2) {
                this.tiles.forEach(function (tile) {
                    if (!_this3.tilesInScene[tile.id] && tile.state === 'loaded') {
                        _this3.group.add(tile.mesh);
                        _this3.tilesInScene[tile.id] = tile.mesh;
                    }
                });

                var _self = this;
                // remove all unvisible tiles when 80% loaded
                Object.keys(this.tilesInScene).forEach(function (tileId) {
                    if (!_self.tileGrid.isVisible(tileId)) {
                        _this3.group.remove(_self.tilesInScene[tileId]);
                        delete _self.tilesInScene[tileId];
                    }
                });
            }

            this.needUpdate = loadingCount > 0;
        }
    }]);
    return TileLayer;
}(geov.Layer);

exports.TileLayer = TileLayer;

Object.defineProperty(exports, '__esModule', { value: true });

})));
