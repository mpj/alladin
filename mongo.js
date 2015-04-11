import Promise from 'bluebird'
import mongodb from 'mongodb'


let client = Promise.promisifyAll(mongodb.MongoClient)



let fn = (cmd) => {
  if (!cmd) throw new Error('command missing.');
  if (!cmd.server)     throw new Error('server property missing.');
  if (!cmd.method)     throw new Error('method property missing.');
  if (!cmd.collection) throw new Error('collection property missing.');
  if (!cmd.opts)       throw new Error('opts property missing.');

  return client.connectAsync(cmd.server).then((db) => {
    let coll = db.collection(cmd.collection)
    Promise.promisifyAll(coll)
    switch(cmd.method) {
      case 'insert':
        if (!cmd.doc) throw new Error('doc property missing.');
        return coll.insertAsync(cmd.doc, cmd.opts);
    }
  })
}

export default fn
