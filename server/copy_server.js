const fs = require('fs')
const path = require('path')

const resolve = (file) => path.resolve(__dirname, file)

const file = resolve('./server.js')
const fileName = path.basename(file)

fs.readFile(file, (err, data) => {
  if (err) throw err
  fs.writeFile(resolve(`../dist/${fileName}`), data, { encoding: 'utf-8' }, (err) => {
    if (err) throw err
    console.log('成功拷贝')
  })
})
