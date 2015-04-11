import _ from 'highland'
import inspector from './utils/inspector-stream'


let errorThrower = (err) => {
  throw err
}

let constructor = (mongo) => ({
  pusher: () =>
    _.pipeline(_.map((doc) => ({
      method: 'insert',
      doc
    })),
    mongo(),
    _.map((x) => true)),

  read: (selector) =>
    _([selector])
      .map((selector) => ({
        method: 'find',
        selector: selector || {}
      }))
      .through(mongo())
})

export default constructor
