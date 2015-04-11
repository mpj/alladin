require('source-map-support').install();
require("long-stack-traces")

import assert from 'assert'
import constructor from './index'
import _ from 'highland'
import sinon from 'sinon'

describe('when we have an instance', function() {
  let instance;
  let mongoCommand;
  beforeEach(function() {
    mongoCommand = sinon.stub()
    instance = constructor(mongoCommand);
  })

  it('pushes write to mongo', () => {

    mongoCommand.withArgs({
      method: 'insert',
      doc: {hello: 1}
    }).returns(_([true]))

    _([{hello: 1}])
      .through(instance.pusher())
      .each((x) => assert(x === true))

  })

  it('reads (all)', () => {
    mongoCommand.withArgs({
      method: 'find',
      selector: {}
    }).returns(_([
      { hello: 'a' },
      { hello: 'b' }
    ]))

    _(instance.read())
      .batch(2)
      .each((x) => assert.deepEqual(x,
        [ { hello: 'a' }, { hello: 'b' } ]))
  })


})
