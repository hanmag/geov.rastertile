import babel from 'rollup-plugin-babel';
import localResolve from 'rollup-plugin-local-resolve';

export default {
    input: 'src/TileLayer.js',
    globals: {
        three: 'THREE',
        geov: 'geov'
    },
    external: [
        'geov', 'three'
    ],
    output: [{
        format: 'umd',
        name: 'geov',
        file: 'build/geov.rastertile.js',
        sourcemap: false,
        extend: true
    }],
    plugins: [
        localResolve(),
        babel({
            "exclude": "node_modules/**",
            "presets": [
                [
                    "env",
                    {
                        "modules": false
                    }
                ]
            ],
            "plugins": [
                "external-helpers",
                'transform-proto-to-assign'
            ]
        })
    ]
};