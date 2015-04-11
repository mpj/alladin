var _ = require('highland')
import isString from 'mout/lang/isString'
import deepMatches from 'mout/object/deepMatches'
import find from 'mout/array/find'
import fi from './fi'

let stubStream = function stubStream(source) {
  let stubs = [];
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
        let matchingStub = find(stubs, (stub) => deepMatches(x, stub.when))
        if (!matchingStub) {
          next();
        } else {

          if (_.isStream(matchingStub.then)) {

            matchingStub.then.each((x) => push(null, x))
            matchingStub.then.on('end', () => next())
          } else {
            push(null, matchingStub.then || null)
          }
        }
      }
    });
  }
  fn.stub = (when, then) => {
    stubs.push({when, then})
    return _([true])
  }
  return fn
 }

 export default stubStream;
