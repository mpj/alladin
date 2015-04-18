import _ from 'highland'
import inspector from './utils/inspector-stream'
import range from 'mout/array/range'
import constant from 'mout/function/constant'
import fi from './utils/fi'

let constructor = (mongo) => {

  let setup = () => {}
    /*
      create event-store
      create placeholders
      create event-dispatch

      Change: No inital event
    */


  return {

    flush: () =>

      // Start sync with dispatch, begin with fetching
      // latest ordinal
      _([{
        method: 'find',
        collection: 'event-dispatch',
        sort: { '$natural': -1 },
        limit: 1
      }])
      .through(mongo())
      .map((lastDispatchedEvent) => ({
        method: 'find',
        collection: 'event-log',
        selector: {
          _id : { '$gt': lastDispatchedEvent._id },
          is_placeholder: { '$exists': false }
        },
        sort: { id: 1 }
      }))
      .through(mongo())
      .collect()
      .map((eventsNotDispatched) => ({
        method: 'insert',
        collection: 'event-dispatch',
        doc: eventsNotDispatched,
        opts: { ordered: true }
      }))
      .through(mongo())
      .map(constant({
        ok: true
      }))
      .errors((err, push) => fi(
        err.code === 11000,
        () => push(null, { busy: true }),
        () => push(err))
      )

    ,

    populate: () =>
      _([{
        method: 'count',
        collection: 'event-log',
        selector: { is_placeholder: true },
      }])
      .through(mongo())
      .flatMap((numberOfPlaceHolders) => {
        var placeHolderBuffer = 10000

        return _([{
          method:     'find',
          collection: 'event-log',
          selector:   { is_placeholder: true },
          sort:       { _id: -1 },
          limit:      1
        }])
        .through(mongo())
        .pluck('_id')
        .map((latestPlaceHolderOrdinal) => ({
          method:     'insert',
          collection: 'event_log',
          doc:        range(
                        latestPlaceHolderOrdinal + 1,
                        latestPlaceHolderOrdinal
                          + placeHolderBuffer
                          - numberOfPlaceHolders
                          + 1
                      ).map((i) => ({
                        _id: i,
                        is_placeholder: true
                      })),
          opts:       {
                        ordered: true
                      }
        }))
      })
      .through(mongo())
    ,

    pusher: () =>
      _.pipeline(
        _.map((doc) => ({
          method: 'findAndModify',
          selector: { is_placeholder: { $exists: true} },
          sort: { _id: 1 },
          collection: 'event-log',
          update: doc,
          opts: { w: 1, wtimeout: 5000, new: true }
        })),
        mongo(),
        _.map(constant({
          ok: true
        }))
      ),

    read: (selector) =>
      _([selector])
        .map((selector) => ({
          method: 'find',
          selector: selector || {},
          collection: 'event-log',
        }))
        .through(mongo())
  }

}

export default constructor
