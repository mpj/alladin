import _ from 'highland'
import sourceMaps from 'source-map-support'
import constructor from './index'
import stubStream from './utils/stub-stream'
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
      doc: { hello: 1 }
    })
    .map(constant({hello: 1}))
    .through(instance.pusher())
  )

  checkStream('reads (all)', () =>
    mongoStream.stub({
      method: 'find',
      selector: {}
    }, _([
      { hello: 'a' },
      { hello: 'b' }
    ]))
    .flatMap(() => instance.read())
    .batch(2)
    .errors(console.warn)
    .filter((x) => deepMatches(x, [
      { hello: 'a' },
      { hello: 'b' }
    ]))
  )

})
