import mongodb from 'mongodb'
import _ from 'highland'
import streamifyAll from './utils/streamifyAll'
import streamify from './utils/streamify'
let client = streamifyAll(mongodb.MongoClient);
let throwAny = (x) => { throw x; }

import events from 'events'
events.EventEmitter.prototype._maxListeners = 25;

let fn = () => {
  return _.flatMap((cmd) => {
    if (!cmd) throw new Error('command missing.');
    if (!cmd.server)     throw new Error('server property missing.');
    if (!cmd.method)     throw new Error('method property missing.');
    if (!cmd.collection) throw new Error('collection property missing.');

    return client.connectStreamed(cmd.server)
      .flatMap((db) => {
        switch(cmd.method) {
          case 'insert':
            if (!cmd.opts) throw new Error('opts property missing.');
            if (!cmd.doc) throw new Error('doc property missing.');
            return streamify(db.collection(cmd.collection))
              .insert(cmd.doc, cmd.opts || {});

          case 'drop':
            return streamify(db.collection(cmd.collection))
              .drop()

          case 'find':
            if (!cmd.selector) throw new Error('selector property missing.');
            return _(db.collection(cmd.collection).find(cmd.selector).stream())

          case 'findAndModify':
            if (!cmd.selector) throw new Error('selector property missing.');
            if (!cmd.update) throw new Error('update property missing.');
            return _( streamify(db.collection(cmd.collection)).findAndModify(
              cmd.selector,
              {}, // sort,
              cmd.update,
              cmd.opts || {}
            ))

          default:
            throw new Error('Does not understand method: ' + cmd.method)
        }

      })

  })


}

export default fn
