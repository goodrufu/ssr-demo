import { createApp } from './main.js'

export default content => {
  return new Promise((resolve, reject) => {
    const { app, router, store } = createApp()

    router.push(content.url)

    router.onReady(() => {
      const matchedComponents = router.getMatchedComponents()

      if (!matchedComponents.length) {
        return resolve(app)
      }

      Promise.all(matchedComponents.map(component => {
        if (component.asyncData) {
          return component.asyncData({ store, route: router.currentRoute })
        }
        return Promise.resolve()
      }))
        .then((arr) => {
          content.state = store.state
          resolve(app)
        })
        .catch(reject)
      resolve(app)
    }, reject)
  })
}
