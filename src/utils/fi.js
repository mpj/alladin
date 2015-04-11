let fi = (val, fnTrue, fnFalse) => {
  if(val) fnTrue(val);
  if(!val && fnFalse) fnFalse(val);
}
export default fi
