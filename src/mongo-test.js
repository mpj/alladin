require('source-map-support').install();
require("long-stack-traces")

import mongodb from 'mongodb'
import mongo from './mongo'
import assert from 'assert'
import streamify from './utils/streamify'
import _ from 'highland'
import inspector from './utils/inspector-stream'
import deepMatches from 'mout/object/deepMatches'
import streamIt from './utils/stream-it'

let client = mongodb.MongoClient

describe('mongo facade', () => {

  it('inserts',
    _([{
      server: 'mongodb://localhost:27017/test-unit',
      method: 'insert',
      collection: 'stuff',
      doc: { waffles: 3 },
      opts: { w: 1, j: 1 }
    }])
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

  it('finds (all)',
    _([{
      server: 'mongodb://localhost:27017/test-unit',
      method: 'drop',
      collection: 'animals',
    }])
    .through(mongo())
    .map(() => ({
      server: 'mongodb://localhost:27017/test-unit',
      method: 'insert',
      collection: 'animals',
      doc: { horses: 7 },
      opts: { w: 1, j: 1 }
    }))
    .through(mongo())
    .flatMap(() => {
      let cmd = {
        server: 'mongodb://localhost:27017/test-unit',
        method: 'find',
        selector: {},
        collection: 'animals',
      }
      return _([cmd])
        .through(mongo())
    })
    .collect()
    .filter((x) => deepMatches(x, [
      { horses: 7 }
    ]))
  )

  it('drops collection',
    streamify(client)
    .connect('mongodb://localhost:27017/test-unit')
    .flatMap((db) =>
      streamify(db.collection('stuff')).insert({
        pancakes: 8
      })
      .map(() => ({
        server: 'mongodb://localhost:27017/test-unit',
        collection: 'stuff',
        method: 'drop'
      }))
      .through(mongo())
      .flatMap(() => streamify(db.collection('stuff')).count({}))
    )
    .filter((count) => count === 0)
  )

})
