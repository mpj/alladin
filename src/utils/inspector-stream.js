var _ = require('highland')

module.exports = _.curry(function inspector(name, source) {
  return source.consume(function (err, x, push, next) {
      if (err) {
          console.log("[INSPECTING / " + name + "] ERROR", err)
          push(err);
          next();
      }
      else if (x === _.nil) {
          console.log("[INSPECTING / " + name + "] STREAM ENDED!")
          push(null, x);
      }
      else {
          console.log("[INSPECTING / " + name + "]", x)
          push(null, x);
          next();
      }
  });
 })
