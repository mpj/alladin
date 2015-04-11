import Promise from 'bluebird'
import mongodb from 'mongodb'
import _ from 'highland'

let client = mongodb.MongoClient;
let throwAny = (x) => { throw x; }

let fn = () => {
  return _.flatMap((cmd) => {
    if (!cmd) throw new Error('command missing.');
    if (!cmd.server)     throw new Error('server property missing.');
    if (!cmd.method)     throw new Error('method property missing.');
    if (!cmd.collection) throw new Error('collection property missing.');
    if (!cmd.opts)       throw new Error('opts property missing.');

    let out = _()

    return _.wrapCallback(client.connect.bind(client))(cmd.server)
      .flatMap((db) => {
        let coll = db.collection(cmd.collection)
        switch(cmd.method) {
          case 'insert':
            if (!cmd.doc) throw new Error('doc property missing.');
            let insert = _.wrapCallback(coll.insert.bind(coll))
            return insert(cmd.doc, cmd.opts);
        }
      })
      .errors(throwAny)

    return out;

  })


}

export default fn
