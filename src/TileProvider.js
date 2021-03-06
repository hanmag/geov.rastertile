import * as geov from 'geov';

export default {
    // register map provider
    setMapType: function (type) {
        this.type = type;
    },
    getTileUrl: function (level, row, column) {
        switch (this.type) {
            case 'bing':
                return this._getBingTileUrl(level, row, column);

            default:
                return null;
        }
    },
    // Bing Map
    _getBingTileUrl: function (level, row, column) {
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
        var url = `//ecn.t${serverIdx}.tiles.virtualearth.net/tiles/a${strMerge4}.jpeg?g=1239&mkt=en-us`;
        return url;
    }
}