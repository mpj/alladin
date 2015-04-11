let fi = (bool, fnTrue, fnFalse) => {
  if(bool) fnTrue();
  if(!bool && fnFalse) fnFalse();
}
export default fi
