var _ = require('highland')
module.exports = function inspector(name, thunk) {
  name = name || 'untitled';
  var thr = _()
  thr[thunk ? 'fork' : 'observe']().each(function(x) {
    console.log("[INSPECTING / " + name + "]", x)
  })
  return thr;
}
