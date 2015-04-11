import isFunction from 'mout/lang/isFunction'
import _ from 'highland'

let streamify = (obj) => {
  let wrapper = {}
  for(var key in obj) {
    if (isFunction(obj[key]))
      wrapper[key] = _.wrapCallback(obj[key].bind(obj))
  }
  return wrapper
}

export default streamify
