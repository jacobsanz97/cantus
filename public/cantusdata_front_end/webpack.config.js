"use strict";

var path = require('path'),
    _ = require('underscore'),
    webpack = require('webpack');

var APP_DIR = path.resolve(__dirname, 'public/js/app'),
    LIB_DIR = path.resolve(__dirname, 'public/js/libs');

/**
 * Return the absolute path to a library file
 *
 * @param lib
 * @returns {string}
 */
function libPath(lib)
{
    return path.resolve(LIB_DIR, lib);
}

module.exports = {
    context: APP_DIR,

    entry: {
        cantus: './init/Init.js'
    },

    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, '../cantusdata/static/js/app'),
        publicPath: '/static/js/app/'
    },

    resolve: {
        root: [APP_DIR, LIB_DIR],

        alias: _.mapObject({
            marionette: 'backbone.marionette.js',
            bootstrap: 'bootstrap/bootstrap.js',

            // All the Diva things
            "diva": "diva/diva",
            "diva-utils": "diva/utils",
            "diva-annotate": "diva/plugins/annotate",
            "diva-canvas": "diva/plugins/canvas",
            "diva-download": "diva/plugins/download",
            "diva-highlight": "diva/plugins/highlight",
            "diva-pagealias": "diva/plugins/pagealias"
        }, libPath)
    },

    module: {
        loaders: [
            // Export the Diva global, which for mysterious
            // reasons is defined in the utils file. This export
            // complements the ProvidePlugin injection below.
            {
                include: [libPath('diva/utils.js')],
                loader: 'exports?diva'
            }
        ]
    },

    plugins: [
        // Inject globals that various things rely on (grrrr...)
        new webpack.ProvidePlugin({
            diva: 'diva-utils',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
            $: 'jquery',
            _: 'underscore'
        }),

        // For now we only want a single file. Since we're using AMD
        // modules, this requires explicit configuration.
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        }),

        // Minify source
        // TODO(wabain): add a command-line switch to disable this for development
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        })
    ]
};
