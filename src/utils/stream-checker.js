import _ from 'highland'

import partial from 'mout/function/partial'
import isFunction from 'mout/lang/isFunction'

let throwAny = (x) => {
  console.warn("WARNING! Stream ended in error.")
  if (x.stack)
    console.warn(x.stack)
  else if (x.message)
    console.warn(x.message)
}

let oldIt = it
let oldxit = xit
let streamChecker = (method, description, strm) => {


  var fn;
  if (method === 'it') {
    fn = oldIt;
  }
  else if (method === 'only') {
    console.warn("WARNING: Running single spec using ONLY prefix");
    fn = oldIt.only;
  }
  else if(method === 'xit') {
    fn = oldxit;
  } else {
    throw new Error('unsupported method');
  }
  if (!strm)
    fn(description)
  else
    fn(description, (done) => {

      if(isFunction(strm)) strm = strm();
      if(!_.isStream(strm))  { throw new Error('not a stream'); }
      strm
        .errors(throwAny)
        .each(() => done())
    })
}

let checkStream = partial(streamChecker, 'it')
let ONLYcheckStream = partial(streamChecker, 'only')

export {checkStream, ONLYcheckStream}
