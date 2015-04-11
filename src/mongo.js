import mongodb from 'mongodb'
import _ from 'highland'
import streamifyAll from './utils/streamifyAll'
import streamify from './utils/streamify'
let client = streamifyAll(mongodb.MongoClient);
let throwAny = (x) => { throw x; }

let fn = () => {
  return _.flatMap((cmd) => {
    if (!cmd) throw new Error('command missing.');
    if (!cmd.server)     throw new Error('server property missing.');
    if (!cmd.method)     throw new Error('method property missing.');
    if (!cmd.collection) throw new Error('collection property missing.');
    if (!cmd.opts)       throw new Error('opts property missing.');

    return client.connectStreamed(cmd.server)
      .flatMap((db) => {
        let coll = streamifyAll(db.collection(cmd.collection))
        switch(cmd.method) {
          case 'insert':
            if (!cmd.doc) throw new Error('doc property missing.');
            return coll.insertStreamed(cmd.doc, cmd.opts);

          case 'drop':
            return coll.dropStreamed()

          case 'find':
            if (!cmd.selector) throw new Error('selector property missing.');
            return _(coll.find(cmd.selector).stream())

          default:
            throw new Error('Does not understand method: ' + cmd.method)
        }

      })

  })


}

export default fn
