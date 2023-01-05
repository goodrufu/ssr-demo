const { merge } = require('webpack-merge')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')
const localIpAddr = require('ip').address()

const webpackConfig = require('@vue/cli-service/webpack.config')

const config = merge(webpackConfig, {
  entry: './src/entry-client.js',
  devtool: 'eval-source-map',
  target: 'web',
  node: false,
  devServer: {
    static: '/dist',
    hot: true
  },
  output: {
    libraryTarget: undefined,
    publicPath: `http://${localIpAddr}:8080/`
  },
  externals: undefined,
  optimization: {
    splitChunks: undefined
  },
  plugins: [new VueSSRClientPlugin()]
})

module.exports = config
