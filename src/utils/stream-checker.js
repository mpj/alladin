import _ from 'highland'

import partial from 'mout/function/partial'

let throwAny = (x) => {
  console.warn("WARNING! Stream ended in error.")
  if (x.message)
    console.warn(x.message)
  if (x.stack)
    console.warn(x.stack)
}

let oldIt = it
let oldxit = xit
let streamChecker = (method, description, strm) => {

  if(!_.isStream(strm))  { throw new Error('not a stream'); }
  var fn;
  if (method === 'it')
    fn = oldIt;
  else if (method === 'only')
    fn = oldIt.only;
  else if(method === 'xit')
    fn = oldxit;
  else
    throw new Error('unsupported method');
  fn(description, (done) =>
    strm
      .errors(throwAny)
      .each(() => done())
  )
}

let checkStream = partial(streamChecker, 'it')
let ONLYcheckStream = partial(streamChecker, 'only')

export {checkStream, ONLYcheckStream}
