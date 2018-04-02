import TileLayer from '../TileLayer';

export default class VectorTileLayer extends TileLayer {
    // const group = new THREE.Group();
    // const layers = this.response;
    // for (const layerName in layers) {
    //     if (layers.hasOwnProperty(layerName)) {
    //         const layer = layers[layerName];
    //         if (layer.type != 'FeatureCollection') {
    //             console.warn('layer.type', layer.type);
    //             continue;
    //         }

    //         if (layer.features.length == 0) continue;

    //         layer.features.forEach(feature => {
    //             // 点线面 renderorder 不同
    //             if (feature.geometry.type == 'Point') {
    //                 if (feature.properties.kind != 'country')
    //                     return;
    //                 const geometry = new THREE.CircleBufferGeometry(36, 16);
    //                 const mesh = new THREE.Mesh(geometry, pointMaterial);
    //                 const position = GeoUtils.geoToSphere(_this.radius, feature.geometry.coordinates);
    //                 mesh.position.x = position.x;
    //                 mesh.position.y = position.y;
    //                 mesh.position.z = position.z;
    //                 mesh.lookAt(origin);
    //                 group.add(mesh);
    //             } else if (feature.geometry.type == 'LineString') {
    //                 const geometry = new THREE.Geometry();
    //                 feature.geometry.coordinates.forEach(p => {
    //                     geometry.vertices.push(
    //                         GeoUtils.geoToSphere(_this.radius, p)
    //                     );
    //                 });

    //                 const line = new THREE.Line(geometry, lineMaterial);
    //                 group.add(line);
    //             } else if (feature.geometry.type == 'Polygon') {
    //                 // 多边形曲面生成算法
    //                 // 1、判断是否为凹多边形，分解为一个或多个凸多边形。
    //                 // 2、三角化凸多边形，使用three.js中shapeutil提供的三角化方法。
    //                 // 3、在每个三角形中随机生成点，生成点的个数与三角形面积成正比，生成算法：矩形随机点=>两边中心点对称映射。
    //                 // 4、对每个三角形的所有点分别使用Delaunay三角剖分算法。
    //                 // 5、合并多个三角形、合并多个凸多边形。
    //                 // 6、得到所有三角面及其顶点。

    //                 // feature.geometry.coordinates.forEach(coord => {
    //                 //     const geometry = new THREE.Geometry();
    //                 //     coord.forEach(p => {
    //                 //         geometry.vertices.push(
    //                 //             GeoUtils.geoToSphere(_this.radius, p)
    //                 //         );
    //                 //     });

    //                 //     for (var i = 0; i < coord.length; i++) {
    //                 //         geometry.faces.push(new THREE.Face3(i, (i + 1) % coord.length, (i + 2) % coord.length));
    //                 //     }

    //                 //     const mesh = new THREE.Mesh(geometry, shapeMaterial);
    //                 //     group.add(mesh);
    //                 // });
    //             }
    //         });
    //     }




    //     getMapzenTileUrl: function (level, row, column) {
    //         return 'https://tile.mapzen.com/mapzen/vector/v1/512/all/' +
    //             level + '/' + column + '/' + row +
    //             '.json?api_key=' + 'mapzen-4SSs12o';
    //     }
};