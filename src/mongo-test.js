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
import constant from 'mout/function/constant'
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

let nativeInsert = (collection, doc) =>
  streamify(client)
  .connect(SERVER_URI)
  .flatMap((db) =>
    streamify(db.collection(collection)).insert(
      doc,
      { w: 1 }
    )
  )

let nativeFind = (collection, selector) =>
  streamify(client)
  .connect(SERVER_URI)
  .flatMap((db) =>
    _(db.collection(collection)
      .find(selector)
      .stream())
  )

let nativeCount = (collection, selector) =>
  streamify(client).connect(SERVER_URI)
    .flatMap((db) => streamify(db.collection(collection)).count(selector))

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
    .flatMap(() => nativeFind('stuff',{ waffles: 3 })
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
      server: SERVER_URI,
    }))
    .through(mongo())
    .flatMap(() => _([{
        method: 'find',
        selector: {},
        collection: 'animals',
        server: SERVER_URI,
      }])
      .through(mongo())
    )
    .collect()
    .filter((x) => deepMatches(x, [
      { horses: 7 }
    ]))
  )

  checkStream('drops collection',
    nativeInsert('stuff', {
      pancakes: 8
    })
    .flatMap(() =>
      _([{
        server: SERVER_URI,
        collection: 'stuff',
        method: 'drop'
      }])
      .through(mongo())
    )
    .flatMap(() => nativeCount('stuff'))
    .filter((count) => count === 0)
  )

  checkStream('finds and modifies',
    whenDroppedWithAPI('articles')
    .flatMap(() => nativeInsert('articles', { rutabaga: 3 }))
    .flatMap(() => nativeInsert('articles', { rutabaga: 8 }))
    .map(constant({
      server: SERVER_URI,
      collection: 'articles',
      method: 'findAndModify',
      update: { $inc: { rutabaga: 3 } },
      selector: { rutabaga: 8 },
    }))
    .through(mongo())
    .flatMap(() => nativeFind('articles', {}))
    .collect()
    .filter((x) => deepMatches(x, [
      { rutabaga: 3 },
      { rutabaga: 11 }
    ]))
  )

  checkStream('find and modifies, sorted',
    whenDroppedWithAPI('events')
    .flatMap(() => nativeInsert('events', { ordinal: 3 }))
    .flatMap(() => nativeInsert('events', { ordinal: 1 }))
    .map(constant({
      server: SERVER_URI,
      collection: 'events',
      method: 'findAndModify',
      sort: { ordinal: 1 },
      update: { $set: { rutabaga: 'yes' } },
      // no selector, only sort
    }))
    .through(mongo())
    .flatMap(() => nativeFind('events', {}))
    .collect()
    .filter((x) => deepMatches(x, [
      { ordinal: 1, rutabaga: 'yes'},
      { ordinal: 3 }
    ]))
  )


})
