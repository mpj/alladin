import events from 'events'
events.EventEmitter.prototype._maxListeners = 25;

require('source-map-support').install();

import mongodb from 'mongodb'
import mongo from './mongo'
import assert from 'assert'
import streamify from './utils/streamify'
import _ from 'highland'
import inspector from './utils/inspector-stream'
import deepMatches from 'mout/object/deepMatches'
import streamChecker from './utils/stream-checker'

let client = mongodb.MongoClient
import partial from 'mout/function/partial'

let checkStream = partial(streamChecker, 'it')
let ONLYcheckStream = partial(streamChecker, 'only')

let SERVER_URI = 'mongodb://localhost:27017/test-unit'
let whenDroppedWithAPI = (collection) =>
  _([{
    method: 'drop',
    collection,
    server: SERVER_URI
  }])
  .through(mongo())
  .errors((err, push) => {
    if(err.message !== 'ns not found') push(err)
    else push(null, true)
  })

let whenInsertedNatively = (collection, doc) =>
  streamify(client)
  .connect(SERVER_URI)
  .flatMap((db) =>
    streamify(db.collection(collection)).insert(
      doc,
      { w: 1 }
    )
  )


describe('mongo facade', () => {

  checkStream('inserts',
    whenDroppedWithAPI('stuff')
    .map(() => ({
      server: 'mongodb://localhost:27017/test-unit',
      method: 'insert',
      collection: 'stuff',
      doc: { waffles: 3 },
      opts: { w: 1, j: 1 }
    }))
    .through(mongo())
    .flatMap(() =>
      streamify(client)
        .connect('mongodb://localhost:27017/test-unit')
    )
    .flatMap((db) =>
      _(db.collection('stuff')
        .find({ waffles: 3 })
        .stream())
    ).filter((x) => deepMatches(x, {
      waffles: 3
    }))
  )

  checkStream('finds (all)',
    whenDroppedWithAPI('animals')
    .map(() => ({
      method: 'insert',
      collection: 'animals',
      doc: { horses: 7 },
      opts: { w: 1, j: 1 },
      server: 'mongodb://localhost:27017/test-unit',
    }))
    .through(mongo())
    .flatMap(() => _([{
        method: 'find',
        selector: {},
        collection: 'animals',
        server: 'mongodb://localhost:27017/test-unit',
      }])
      .through(mongo())
    )
    .collect()
    .filter((x) => deepMatches(x, [
      { horses: 7 }
    ]))
  )

  checkStream('drops collection',
    whenInsertedNatively('stuff', {
      pancakes: 8
    })
    .flatMap(() => streamify(client).connect(SERVER_URI))
    .flatMap((db) =>
      _([{
        server: 'mongodb://localhost:27017/test-unit',
        collection: 'stuff',
        method: 'drop'
      }])
      .through(mongo())
      .flatMap(() => streamify(db.collection('stuff')).count({}))
    )
    .filter((count) => count === 0)
  )

  checkStream('finds and modifies',
    whenDroppedWithAPI('articles')
    .flatMap(() => whenInsertedNatively('articles', { rutabaga: 3 }))
    .flatMap(() => whenInsertedNatively('articles', { rutabaga: 8 }))
    .map(() =>
      ({
        server: SERVER_URI,
        collection: 'articles',
        method: 'findAndModify',
        update: { $inc: { rutabaga: 3 } },
        selector: { rutabaga: 8 },
      })
    )
    .through(mongo())
    .flatMap(() => streamify(client).connect(SERVER_URI))
    .flatMap((db) => _(db.collection('articles').find({}).stream()))
    .collect()
    .filter((x) => deepMatches(x, [
      { rutabaga: 3 },
      { rutabaga: 11 }
    ]))
  )


})
