import mongodb from 'mongodb'
import _ from 'highland'
import streamify from './utils/streamify'
import fi from './utils/fi'
import matches from 'mout/object/matches'
import events from 'events'

events.EventEmitter.prototype._maxListeners = 25;

let client = mongodb.MongoClient;

let ensureProperties = (obj, props) =>
  props.forEach((prop) =>
    fi(!obj[prop], () => { throw new Error(prop + ' property missing') }))

let fn = () => {
  return _.flatMap((cmd) => {
    if (!cmd) throw new Error('command missing.');
    ensureProperties(cmd, ['server', 'method', 'collection'])
    return streamify(client).connect(cmd.server)
      .flatMap((db) => {
        switch(cmd.method) {
          case 'insert':
            ensureProperties(cmd, ['opts', 'doc'])
            return streamify(db.collection(cmd.collection))
              .insert(cmd.doc, cmd.opts || {});

          case 'drop':
            return streamify(db.collection(cmd.collection))
              .drop()

          case 'find':
            ensureProperties(cmd, ['selector'])
            return _(db.collection(cmd.collection).find(cmd.selector).stream())

          case 'findAndModify':
            ensureProperties(cmd, ['update'])
            return _( streamify(db.collection(cmd.collection)).findAndModify(
              cmd.selector,
              cmd.sort,
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
