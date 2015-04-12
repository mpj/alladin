import _ from 'highland'
import sourceMaps from 'source-map-support'
import constructor from './index'
import stubStream from './utils/stub-stream'
import inspector from './utils/inspector-stream'
import mapEnd from './utils/map-end'
import events from 'events'
import constant from 'mout/function/constant'
import {checkStream, ONLYcheckStream} from './utils/stream-checker'
import deepMatches from 'mout/object/deepMatches'

process.setMaxListeners(100);
sourceMaps.install();

describe('when we have an instance', function() {
  let instance;
  let mongoStream;
  beforeEach(function() {
    mongoStream = stubStream()
    let mongoConstructor = () => mongoStream;
    instance = constructor(mongoConstructor);
  })

  checkStream('pushes write to event-log', () => {

    mongoStream.stub({
      method: 'findAndModify',
      collection: 'event-log',
      selector: { is_placeholder: { $exists: true} },
      sort: { _id: 1 },
      update: { hello: 1 },
      opts: { w: 1, j: 1, wtimeout: 5000, new: true }
    },{
      value: { hello: 1, _id: 67121 },
      ok: 1
    })

    // Once the document has been safely inserted,
    // the pusher tries to synchronize the with the dispatch.
    // It will check what the latest ordinal on the dispatch is...

    mongoStream.stub({
      method: 'find',
      collection: 'event-dispatch',
      sort: { '$natural': -1 },
      limit: 1
    }, _([
      { rutabaga: 'yes', _id: 67119 }
    ]))

    // ... in the above case, the dispatch is just two ordinals
    // behind. The pusher will request the non-placehoder events
    // in the log that have a higher ordinal than the latest dispatch ...

    mongoStream.stub({
      method: 'find',
      collection: 'event-log',
      selector: {
        _id : { '$gt': 67119 },
        is_placeholder: { '$exists': false }
      },
      sort: { id: 1 }
    }, _([
      { waffles: 'no', _id: 67120 },
      { hello: 1, _id: 67121 }
    ]))

    // ... the pusher will try to insert these items into the
    // dispatch, in order ...

    mongoStream.stub({
      method: 'insert',
      collection: 'event-dispatch',
      doc: [
        { waffles: 'no', _id: 67120 },
        { hello: 1, _id: 67121 }
      ],
      opts: { ordered: true }
    },{
      result: { ok: 1, n: 2 }
    })

    // ... afterwards, the pusher will fill up some placeholders.
    // It will begin by figuring out how many placeholders we have ...

    mongoStream.stub({
      method: 'count',
      collection: 'event-log',
      selector: { is_placeholder: true },
    }, 9991)

    // ... pusher wants there to be 10000 placeholders, so we're
    // lacking 9. It will create 9 placeholders and insert them
    // in order (this is very important, so that we don't create
    // holes in the id chain)



    // The pusher will need to figure out what ordinal
    // the latest placeholder has.
    mongoStream.stub({
      method: 'find',
      collection: 'event-log',
      selector: { is_placeholder: true },
      sort: { _id: -1 },
      limit: 1
    }, {
      _id: 67121 + 9991,
      is_placeholder: true
    })


    mongoStream.stub({
      method: 'insert',
      collection: 'event_log',
      doc: [
        { _id: 67121 + 9991 + 1, is_placeholder: true },
        { _id: 67121 + 9991 + 1 + 9, is_placeholder: true }
      ],
      opts: { ordered: true }
    },{
      result: { ok: 1, n: 9 }
    })

    return _([{
      hello: 1
    }])
    .through(instance.pusher())
    .through(mongoStream.checkAllReceived())
  })


  checkStream('Handle log insert errors')
  checkStream('Handle dispatch insert errors')

  checkStream('Ensure index on is_placeholder')
  checkStream('Setup event-dispatch')
  checkStream('Setup placeholders')

  checkStream('Add case for max insertion of placholders')
  checkStream('Add case for 0 placeholders')
  checkStream('Add case for enough placeholders')
  checkStream('Add case for placeholder insertion failure')


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

  checkStream('inserts as NumberLong')
  checkStream('fails the insert due to no placeholders')



})
