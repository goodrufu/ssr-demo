const express = require('express')
const path = require('path')
const fs = require('fs')

const webpack = require('webpack')
const { createFsFromVolume, Volume } = require('memfs')

const app = express()

const resolve = file => path.resolve(__dirname, file)

const readFileByMemfs = (fs, file) => {
  try {
    return fs.readFileSync(path.join(wpClientConfig.output.path, file), 'utf-8')
  } catch (err) {
    console.error('func rreadFileByMemfs error:', err)
  }
}

let clientManifest
let bundle
let renderer

let ready
/** 添加promise，等待webpack构建完成 */
const readyPromise = new Promise(r => { ready = r })

/** 引入vue的服务端渲染函数 */
const { createBundleRenderer } = require('vue-server-renderer')

/** 引入模板文件，用于插入服务端渲染函数，渲染完成的html字符串 */
const templatePath = resolve('../public/index.template.html')
const template = fs.readFileSync(templatePath, 'utf-8')

/**
 * 每次热更新：webpack-hot-middleware， webpack服务：webpack-dev-middleware更新都会触发该函数，
 * 用于确定manifest.json和bundle.json是否已经处理好，处理好之后再转交给vue-server-renderer生产html
 */
const update = () => {
  if (bundle && clientManifest) { ready() }
  renderer = createBundleRenderer(bundle, {
    runInNewContext: false,
    template,
    clientManifest
  })
}

/** 引入client的webpack配置，并更改相关的webpack配置 */
const wpClientConfig = require('./webpack.client.config')

/**
 * 如果需要更改，提供热更新服务，意思是在执行webpack.entry之前执行：webpack-hot-middleware/client代码，
 * 注意：这里并不是热更新，热更新中间件需要app.use才是使用，这里仅仅是热更新需要的代码
 * */
wpClientConfig.entry = ['webpack-hot-middleware/client', wpClientConfig.entry]
wpClientConfig.output.filename = '[name].js'
/** 官方要求的相关插件 */
wpClientConfig.plugins.push(
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoEmitOnErrorsPlugin()
)

/** 上面已经准备好client的webpack配置，以下开始执行 */
const wpClienetCompiler = webpack(wpClientConfig)
const wpDevServer = require('webpack-dev-middleware')(wpClienetCompiler, {
  publicPath: wpClientConfig.output.publicPath,
  stats: 'errors-warnings'
})
app.use(wpDevServer)

/** webpack Compiler完成后的hooks */
wpClienetCompiler.hooks.done.tap('vue-server-renderer/client-plugin', stats => {
  const statsJson = stats.toJson() /** 转换格式 */

  /** 异常处理 */
  statsJson.errors.forEach(err => console.error(err))
  statsJson.warnings.forEach(err => console.warn(err))

  if (statsJson.errors.length) return

  /** 获取生成后的manifest.json文件 */
  clientManifest = JSON.parse(readFileByMemfs(wpClienetCompiler.outputFileSystem, 'vue-ssr-client-manifest.json'))
  update()
})

/** use热更新代码以及相关的配置，具体可查看官方配置 */
app.use(require('webpack-hot-middleware')(wpClienetCompiler, {
  heartbeat: 5000,
  log: false,
  path: '/__webpack_hmr',
  timeout: 2000,
  overlay: false,
  reload: true
}))

/** 引入server相关的webpack配置，并执行webpack配置 */
const wpServerConfig = require('./webpack.server.config')
const wpServerCompiler = webpack(wpServerConfig)

/** 将编译的内容存放在内存，提升速度 */
const serverFs = createFsFromVolume(new Volume())
wpServerCompiler.outputFileSystem = serverFs

/** watch代码更改 */
wpServerCompiler.watch({}, (err, stats) => {
  if (err || stats.hasErrors()) {
    console.error(err || 'webpack watch error!')
    return
  }

  const statsJson = stats.toJson() /** 格式转换 */

  /** 异常处理 */
  statsJson.errors.forEach(err => console.error(err))
  statsJson.warnings.forEach(err => console.warn(err))

  if (statsJson.errors.length) return

  /** 读取生产后的bundle.json文件，这时两个关键文件已经生成 */
  bundle = JSON.parse(readFileByMemfs(serverFs, 'vue-ssr-server-bundle.json'))
  update()
})

/** 通过上面webpack生成的manifest.json、bundle.json 通过renderToString生成html代码 */
/** 以下node静态资源服务代码 */
function renderToString (content) {
  return new Promise((resolve, reject) => {
    renderer.renderToString(content, (err, html) => {
      err ? reject(err) : resolve(html)
    })
  })
}

// const serve = (path) => express.static(resolve(path), { maxAge: 0 })

// app.use('/dist', serve('./dist'))
// app.use('/public', serve('./public'))
// app.use('/manifest.json', serve('./manifest.json'))

function render (req, res) {
  const s = Date.now()

  res.setHeader('Content-Type', 'text/html')

  const handleError = err => {
    if (err.url) {
      res.redirect(err.url)
    } else if (err.code === 404) {
      res.status(404).send('404 | url找不到')
    } else {
      // Render Error Page or Redirect
      res.status(500).send('500 | Internal Server Error')
      console.error(`ender 错误: ${req.url}`)
      console.error(err.stack)
    }
  }

  const context = {
    title: 'vue ssr',
    description: 'vue2 ssr服务端渲染',
    keyword: 'vue2，ssr',
    url: req.url
  }
  renderToString(context, (err, html) => {
    if (err) {
      return handleError(err)
    }
    res.send(html)
    console.log(`whole request: ${Date.now() - s}ms`)
  })
}

app.get('*', (req, res) => {
  readyPromise.then(() => render(req, res))
})

const port = 8080
app.listen(port, () => {
  console.log(`server is running in localhost:${port}`)
})
