var _ = require('highland')

// Like map, but is triggerd on the end value instead
// of the normal values. 
module.exports = _.curry(function mapEnd(fn, source) {
  return source.consume(function (err, x, push, next) {
      if (err) {
          push(err);
          next();
      }
      else if (x === _.nil) {
          push(null, fn());
      }
      else {
          push(null, x);
          next();
      }
  });
 })
