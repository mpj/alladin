import Promise from 'bluebird'
import mongodb from 'mongodb'
import mongo from './mongo'
import assert from 'assert'
let client = Promise.promisifyAll(mongodb.MongoClient)
import _ from 'highland'


describe('mongo facade', () => {
  it('hello', (done) => {
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
})
