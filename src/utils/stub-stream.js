var _ = require('highland')
import isString from 'mout/lang/isString'
import deepMatches from 'mout/object/deepMatches'
import find from 'mout/array/find'
import some from 'mout/array/some'
import remove from 'mout/array/remove'
import fi from './fi'

let stubStream = function stubStream(source) {
  let stubs = [];
  let stubsNotMatched = [];
  let received = [];
  let receivedNotMatched = [];

  let fn = (source) => {
    return source.consume((err, x, push, next) => {
      if (err) {
          push(err);
          next();
      }
      else if (x === _.nil) {
          push(null, x);
      }
      else {
        received.push(x)

        let matchingStub = find(stubs, (stub) => deepMatches(x, stub.when))
        if (!matchingStub) {
          receivedNotMatched.push(x)
          next();
        } else {
          remove(stubsNotMatched, matchingStub)
          if (matchingStub.thenError) {
            push(matchingStub.thenError)
            next()
          } else if (_.isStream(matchingStub.then)) {
            matchingStub.then.on('end', () => next())
            matchingStub.then.each((x) => push(null, x))
          } else {
            push(null, matchingStub.then || null)
            next()
          }
        }
      }
    });
  }
  fn.didReceive = (pattern) =>
    find(received, (r) => deepMatches(r, pattern))
  fn.checkAllReceived = () => (source) =>
    source.consume((err, x, push, next) => {
      if (err) {
          push(err);
          next();
      }
      else {
        if(stubsNotMatched.length === 0)
          push(null, true)
        else
          push(new Error('The following stubs were not matched:' +
            JSON.stringify(stubsNotMatched, null, 2) +
            '\n\nDid receive the following that was not matched:\n' +
            JSON.stringify(receivedNotMatched, null, 2)
            )

          )
      }
    })
  fn.checkNotReceived = (pattern) => (source) =>
    source.consume((err, x, push, next) => {
      if (err) {
          push(err);
          next();
      } else {
        var match = find(received, (r) => deepMatches(r, pattern))
        if (!match)
          push(null, true)
        else
          push(new Error('The stub should not have received this:' +
            JSON.stringify(match, null, 2)
          ))
      }
    })


  fn.stub = (when, then, thenError) => {
    let stub = { when, then, thenError }
    stubs      .push(stub)
    stubsNotMatched .push(stub)
    return _([true])
  }
  return fn
 }

 export default stubStream;
