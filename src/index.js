import _ from 'highland'

import events from 'events'

events.EventEmitter.prototype._maxListeners = 20;

let errorThrower = (err) => {
  throw err
}

let constructor = (mongo) => ({
  pusher: () =>
    _.flatMap((doc) => mongo({
      method: 'insert',
      doc
    })),
  read: () =>
    _.flatMap((doc) => mongo({
      method: 'find',
      selector: {}
    })),


})

export default constructor
