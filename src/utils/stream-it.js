import _ from 'highland'
import partial from 'mout/function/partial'

let throwAny = (x) => { throw x; }

let oldIt = it
let oldxit = xit
let streamIt = (method, description, strm) => {
  if(!_.isStream(strm)) throw new Error('not a stream');
  let fn;
  if (method === 'it')
    fn = oldIt;
  else if (method === 'only')
    fn = oldIt.only;
  else
    fn = oldxit;
  fn(description, (done) =>
    strm
      .errors(throwAny)
      .each(() => done())
  )
}

it = partial(streamIt, 'it')
it.only = partial(streamIt, 'only')
xit = partial(streamIt, 'xit')

export default streamIt
