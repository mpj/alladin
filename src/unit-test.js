require('source-map-support').install();

import assert from 'assert'
import constructor from './index'
import _ from 'highland'
import stubStream from './utils/stub-stream'
import events from 'events'

events.EventEmitter.prototype._maxListeners = 20;

describe('when we have an instance', function() {
  let instance;
  let mongoStream;
  beforeEach(function() {
    mongoStream = stubStream()
    let mongoCommand = () => mongoStream;
    instance = constructor(mongoCommand);
  })

  it('pushes write to mongo', (done) => {

    mongoStream.stub({
      method: 'insert',
      doc: { hello: 1 }
    })

    _([{hello: 1}])
      .through(instance.pusher())
      .each((x) => {
        assert(x === true)
        done()
      })

  })

  it('reads (all)', (done) => {

    mongoStream.stub({
      method: 'find',
      selector: {}
    }, _([
      { hello: 'a' },
      { hello: 'b' }
    ]))

    _(instance.read())
      .batch(2)
      .errors(console.warn)
      .each((x) => {
        assert.deepEqual(x,
        [ { hello: 'a' }, { hello: 'b' } ])
        done()
      })
  })


})
