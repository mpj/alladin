import _ from 'highland'
import sourceMaps from 'source-map-support'
import constructor from './index'
import stubStream from './utils/stub-stream'
import inspector from './utils/inspector-stream'
import events from 'events'
import constant from 'mout/function/constant'
import {checkStream, ONLYcheckStream} from './utils/stream-checker'
import deepMatches from 'mout/object/deepMatches'

events.EventEmitter.prototype._maxListeners = 20;
sourceMaps.install();

describe('when we have an instance', function() {
  let instance;
  let mongoStream;
  beforeEach(function() {
    mongoStream = stubStream()
    let mongoConstructor = () => mongoStream;
    instance = constructor(mongoConstructor);
  })

  checkStream('pushes write to mongo', () =>
    mongoStream.stub({
      method: 'insert',
      collection: 'event-log',
      doc: { hello: 1 }
    })
    .map(constant({hello: 1}))
    .through(instance.pusher())
  )

  checkStream('reads (all)', () =>
    mongoStream.stub({
      method: 'find',
      collection: 'event-log',
      selector: {}
    }, _([
      { hello: 'a' },
      { hello: 'b' }
    ]))
    .flatMap(() => instance.read())
    .batch(2)
    .filter((x) => deepMatches(x, [
      { hello: 'a' },
      { hello: 'b' }
    ]))
  )

  checkStream('reads (filtered)', () =>
    mongoStream.stub({
      method: 'find',
      selector: {
        hello: 'b'
      }
    }, {hello: 'b'})
    .flatMap(() => instance.read({ hello: 'b'}))
    .filter((x) => deepMatches(x,
      { hello: 'b' }
    ))
  )

})
