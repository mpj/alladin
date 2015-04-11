require('source-map-support').install();

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

    _([{hello: 1}])
      .through(instance.pusher())
      .each((x) => assert(x === true))

    sinon.assert.calledWith(mongoCommand, {
      action: 'insert'
    })



  })

  it('terminate')
})
