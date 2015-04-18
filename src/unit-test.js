import _ from 'highland'
import sourceMaps from 'source-map-support'
import constructor from './index'
import stubStream from './utils/stub-stream'
import inspector from './utils/inspector-stream'
import mapEnd from './utils/map-end'
import fi from './utils/fi'
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

  checkStream('flush', () => {
    // flush tries to synchronize the with the dispatch.
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

    return instance
      .flush()
      .filter((x) => x.ok)
      .through(mongoStream.checkAllReceived())
  })

  checkStream('populate', () => {

    // populate will fill up some placeholders.
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

    return instance
      .populate()
      .through(mongoStream.checkAllReceived())

  })

  checkStream('pusher', () => {

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

    return _([{
      hello: 1
    }])
    .through(instance.pusher())
    .filter((x) => x.ok)
    .through(mongoStream.checkAllReceived())


  })


  checkStream('pusher sends on errors', () => {

    mongoStream.stub({
      method: 'findAndModify',
      collection: 'event-log',
      selector: { is_placeholder: { $exists: true} },
      sort: { _id: 1 },
      update: { hello: 1 },
      opts: { w: 1, j: 1, wtimeout: 5000, new: true }
    }, null, new Error('wat'));


    return _([{
      hello: 1
    }])
    .through(instance.pusher())
    .errors((err,push) => fi(err.message === 'wat', () => push(null, true)))
    .through(mongoStream.checkAllReceived())
  })

  checkStream('flush coerces dupe insert errors to busy result', () => {

    // first part of dispatch sync also goes fine
    mongoStream.stub({
      method: 'find',
      collection: 'event-dispatch',
      sort: { '$natural': -1 }
    }, _([
      { _id: 67119 }
    ]))

    // getting the next few items goes fine
    mongoStream.stub({
      method: 'find',
      collection: 'event-log',
      selector: {
        _id : { '$gt': 67119 }
      }
    }, _([
      { waffles: 'no', _id: 67120 },
      { hello: 1, _id: 67121 }
    ]))

    // But the pusher tries to insert these items, another
    // pusher has already inserted the second item.
    mongoStream.stub({
      method: 'insert',
      collection: 'event-dispatch',
      doc: [
        { waffles: 'no', _id: 67120 },
        { hello: 1, _id: 67121 }
      ],
      opts: { ordered: true }
    }, null, (() => {
      let err = new Error('E11000 duplicate key error index: test-unit.events.$_id_ dup key: { : 67121 }')
      err.code = 11000;
      err.name = 'MongoError';
      return err;
    })())

    return instance
      .flush()
      .through(inspector('hmm'))
      .filter((x) => x.busy)
  })

  checkStream('flush does NOT coerce OTHER errors to busy result', () => {

    // finding dispatch goes fine
    mongoStream.stub({
      method: 'find',
      collection: 'event-dispatch',
      sort: { '$natural': -1 }
    }, _([
      { _id: 67119 }
    ]))

    // getting the next few items also goes fine
    mongoStream.stub({
      method: 'find',
      collection: 'event-log',
      selector: {
        _id : { '$gt': 67119 }
      }
    }, _([
      { waffles: 'no', _id: 67120 },
      { hello: 1, _id: 67121 }
    ]))

    // if inserting yields another error, it should NOT
    // ignored
    mongoStream.stub({
      method: 'insert',
      collection: 'event-dispatch',
      doc: [
        { waffles: 'no', _id: 67120 },
        { hello: 1, _id: 67121 }
      ],
      opts: { ordered: true }
    }, null, new Error('KABOOM'))

    return instance
      .flush()
      .errors((err,push) => fi(err.message === 'KABOOM', () => push(null, true)))
  })

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
