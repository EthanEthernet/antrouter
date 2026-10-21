// localStorage wrapper. Every key gets the "antrouter:" prefix; blocked storage (private mode, previews) fails quietly.
(function (A) {
  const PREFIX='antrouter:';
  function get(k,d){try{const v=localStorage.getItem(PREFIX+k);return v?JSON.parse(v):d}catch(e){return d}}
  function set(k,v){try{localStorage.setItem(PREFIX+k,JSON.stringify(v))}catch(e){}}
  function keys(){const o=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(PREFIX))o.push(k)}}catch(e){}return o}
  // Raw copies of every antrouter: key, so the tour can play on a sandbox and put the viewer's data back.
  function snapshot(){const o={};try{keys().forEach(k=>{o[k]=localStorage.getItem(k)})}catch(e){}return o}
  function restore(o){try{keys().forEach(k=>localStorage.removeItem(k));for(const k in o)localStorage.setItem(k,o[k])}catch(e){}}
  A.storage={get,set,snapshot,restore};
})(globalThis.AntRouter = globalThis.AntRouter || {});
