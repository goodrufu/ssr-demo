const fs = require('fs')
const path = require('path')

const Koa = require('koa')
const send = require('koa-send')
const compress = require('koa-compress')

const app = new Koa()
const resolve = file => path.resolve(__dirname, file)

// 第 2 步：获得一个createBundleRenderer
const template = fs.readFileSync(resolve('./index.template.html'), 'utf-8')
const { createBundleRenderer } = require('vue-server-renderer')
const bundle = require(resolve('./vue-ssr-server-bundle.json'))
const clientManifest = require(resolve('./vue-ssr-client-manifest.json'))

const renderer = createBundleRenderer(bundle, {
  runInNewContext: false,
  template,
  clientManifest
})

function renderToString (content) {
  return new Promise((resolve, reject) => {
    renderer.renderToString(content, (err, html) => {
      err ? reject(err) : resolve(html)
    })
  })
}

// 注入变量
app.use(async (ctx, next) => {
  ctx.ssrContext = {
    url: ctx.path + ctx.search,
    title: '魅族科技',
    description: '魅族科技服务端渲染',
    keyword: '魅族,前端'
  }

  await next()
})

// 第 3 步：添加一个中间件来处理所有请求
app.use(async (ctx, next) => {
  const url = ctx.path
  if (/[.](js|css|jpg|jpeg|png|gif|map|ico|cur|json|html|txt|svg|font|woff|ttf)$/.test(url)) {
    await send(ctx, url, { root: path.resolve(__dirname, './') })
    return
  }

  ctx.res.setHeader('Content-Type', 'text/html')
  try {
    const html = await renderToString(ctx.ssrContext)
    ctx.body = html
  } catch (res) {
    console.log(
      `服务器catch异常：${
        res instanceof Error ? res.stack : JSON.stringify(res)
      }`
    )
    ctx.response.redirect(`/error/${res.code ? res.code : 500}`)
  }
  next()
})

app.use(compress({ threshold: 2048 }))

const port = 8080
app.listen(port, function () {
  console.log(`server started at localhost:${port}`)
})
