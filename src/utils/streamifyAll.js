import isFunction from 'mout/lang/isFunction'
import _ from 'highland'

// Like bluebirds promisifyAll, but with highland streams
let streamifyAll = (obj) => {
  for(var key in obj) {
    if (isFunction(obj[key]))
      obj[key+'Streamed'] = _.wrapCallback(obj[key].bind(obj))
  }
  return obj
}

export default streamifyAll
