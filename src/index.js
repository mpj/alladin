import _ from 'highland'
import inspector from './utils/inspector-stream'

let constructor = (mongo) => ({
  pusher: () =>_.pipeline(
    _.map((doc) => ({
      method: 'insert',
      collection: 'event-log',
      doc
    })),
    mongo(),
    _.map((x) => true)
  ),

  read: (selector) =>
    _([selector])
      .map((selector) => ({
        method: 'find',
        selector: selector || {},
        collection: 'event-log',
      }))
      .through(mongo())
})

export default constructor
