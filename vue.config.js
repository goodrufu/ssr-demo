const { defineConfig } = require('@vue/cli-service')
const path = require('path')

const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')

const nodeExternals = require('webpack-node-externals')

const WEBPACK_TARGET = process.env.WEBPACK_TARGET === 'node'
const isDev = process.env.NODE_ENV === 'development'

const productionConfig = {
  transpileDependencies: true,

  configureWebpack: {
    entry: `./src/entry-${WEBPACK_TARGET ? 'server' : 'client'}.js`,
    devtool: isDev ? 'eval-source-map' : false,
    target: WEBPACK_TARGET ? 'node' : 'web',
    node: WEBPACK_TARGET ? undefined : false,
    output: {
      libraryTarget: WEBPACK_TARGET ? 'commonjs2' : undefined
    },
    externals: WEBPACK_TARGET ? nodeExternals({ allowlist: [/\.css$/] }) : undefined,
    optimization: {
      splitChunks: undefined
    },
    plugins: [WEBPACK_TARGET ? new VueSSRServerPlugin() : new VueSSRClientPlugin()]
  },

  chainWebpack: config => {
    if (WEBPACK_TARGET) {
      config.optimization.delete('splitChunks')
    }

    config.module
      .rule('vue')
      .use('vue-loader')
      .tap(options => {
        options.optimizaSSR = false
        return options
      })
  }
}

const developmentConfig = {
  transpileDependencies: true,
  configureWebpack: {
    output: {
      path: path.resolve(__dirname, '../dist'),
      publicPath: '/dist/'
    }
  }
}

// 开发环境webpack配置，需要新增东西，需自定义
const lastConfig = isDev ? developmentConfig : productionConfig

module.exports = defineConfig(lastConfig)
