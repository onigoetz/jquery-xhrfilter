
var webpack = require('webpack');

module.exports = {
    entry: "./lib/XHRFilter.js",
    output: {
        path: __dirname + "/dist",
        filename: "XHRFilter.min.js"
    },
    module: {
        loaders: [{
            test: /\.jsx?$/, exclude: /(node_modules|bower_components)/, loader: 'babel?optional[]=runtime'
        }]
    },
    plugins: [
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': '"production"',
            __DEV__: false
        }),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({
            compress: {warnings: true}
        }),
        new webpack.optimize.AggressiveMergingPlugin()
    ]
};
