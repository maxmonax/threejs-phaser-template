const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/index.ts',

    output: {
        filename: 'game.bundle.js',
        path: path.resolve(__dirname, 'build'),
        publicPath: '/'
    },

    resolve: {
        extensions: ['.tsx', '.ts', '.js', 'd.ts']
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.(glsl|vs|fs)$/,
                loader: 'ts-shader-loader'
            }
        ]
    },

    watchOptions: {
        ignored: /node_modules/
    },

    devServer: {
        contentBase: path.join(__dirname, 'build'),
        compress: true,
        port: 9080,
        inline: true,
        watchOptions: {
            aggregateTimeout: 300,
            poll: true,
            ignored: /node_modules/
        },
        overlay: true
    },

}