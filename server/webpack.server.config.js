const { merge } = require('webpack-merge')
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const nodeExternals = require('webpack-node-externals')

const webpackConfig = require('@vue/cli-service/webpack.config')

const config = merge(webpackConfig, {
  entry: './src/entry-server.js',
  devtool: 'eval-source-map',
  target: 'node',
  node: undefined,
  output: {
    libraryTarget: 'commonjs2'
  },
  externals: nodeExternals({ allowlist: [/\.css$/] }),
  optimization: {
    splitChunks: undefined
  },
  plugins: [new VueSSRServerPlugin()]
})

module.exports = config
