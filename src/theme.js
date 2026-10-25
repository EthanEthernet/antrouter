// Colour theme: System, Light or Dark. Loaded in <head> (after storage.js) so the right theme paints first.
(function (A) {
  const CHOICES=['system','light','dark'], root=document.documentElement;
  function get(){const c=A.storage.get('theme','system');return CHOICES.includes(c)?c:'system'}
  function apply(c){if(c==='system')root.removeAttribute('data-theme');else root.setAttribute('data-theme',c)}
  function sync(){const c=get();document.querySelectorAll('[data-theme-choice]').forEach(b=>{const on=b.dataset.themeChoice===c;b.setAttribute('aria-checked',on);b.tabIndex=on?0:-1})}
  function set(c){if(!CHOICES.includes(c))return;A.storage.set('theme',c);apply(c);sync()}
  apply(get());
  document.addEventListener('DOMContentLoaded',()=>{
    const bs=[...document.querySelectorAll('[data-theme-choice]')];
    bs.forEach((b,i)=>{b.onclick=()=>set(b.dataset.themeChoice);
      b.onkeydown=e=>{const n=bs.length,j=e.key==='ArrowRight'?(i+1)%n:e.key==='ArrowLeft'?(i+n-1)%n:-1;if(j>=0){e.preventDefault();set(bs[j].dataset.themeChoice);bs[j].focus()}}});
    sync()});
  A.theme={get,set};
})(globalThis.AntRouter = globalThis.AntRouter || {});
