require('source-map-support').install();
require("long-stack-traces")


import Promise from 'bluebird'
import mongodb from 'mongodb'
import mongo from './mongo'
import assert from 'assert'
let client = Promise.promisifyAll(mongodb.MongoClient)
import streamify from './utils/streamify'
import _ from 'highland'
import inspector from './utils/inspector-stream'
let throwAny = (x) => { throw x; }
import deepMatches from 'mout/object/deepMatches'


describe('mongo facade', () => {

  it('inserts', (done) => {
    let cmd = {
      server: 'mongodb://localhost:27017/test-unit',
      method: 'insert',
      collection: 'stuff',
      doc: { waffles: 3 },
      opts: { w: 1, j: 1 }
    }
    _([cmd])
      .through(mongo())
      .each(function() {
        client.connectAsync('mongodb://localhost:27017/test-unit').then((db) => {
          let coll = db.collection('stuff')
          Promise.promisifyAll(coll)
          coll.findAsync({waffles:3}).then(function(result) {
            assert(result)
            done()
          }).done()
        })
      })
  })

  it('finds (all)', (done) => {
    _([{
      server: 'mongodb://localhost:27017/test-unit',
      method: 'drop',
      collection: 'animals',
      opts: {}
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
        opts: {}
      }
      return _([cmd])
        .through(mongo())
    })
    .collect()
    .errors(throwAny)
    .each((x) => {
      assert(x.length === 1, 'too many items');
      assert(deepMatches(x, [
        {horses: 7}
      ]), 'did not match');
      done()
    })
  })

  it('drops collection', (done) => {
    streamify(client).connect('mongodb://localhost:27017/test-unit')
      .flatMap((db) =>
        streamify(db.collection('stuff')).insert({
          pancakes: 8
        })
        .map(() => ({
          server: 'mongodb://localhost:27017/test-unit',
          collection: 'stuff',
          method: 'drop',
          opts: {}
        }))
        .through(mongo())
        .flatMap(() => streamify(db.collection('stuff')).count({}))
      )
      .errors(done)
      .each((count) => {
        assert(count === 0, count +' items still in db')

        done()
      })

  })
})
