import TileLayer from '../TileLayer';
import tileProvider from '../TileProvider';

export default class RasterTileLayer extends TileLayer {
    constructor(id, options) {
        super(id);

        tileProvider.setMapType(options.type);
    }
};