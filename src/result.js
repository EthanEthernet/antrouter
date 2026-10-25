// The result card: who Mandu picked and why, reroute chips, Good route and the hand-off link.
(function (A) {
  const {MODELS,OPEN}=A.models;
  const {TASKS,rankModels,allowedModels}=A.router;
  function esc(x){return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function resultHTML(current,platformId){
    const {d,chosen,rerouted}=current;const order=rankModels(d.final,platformId);const runner=order.find(m=>m.id!==chosen.id)||chosen;
    const o=OPEN[chosen.open];
    let bars='';
    const fams=[...new Set(allowedModels(platformId).map(m=>m.fam))];
    fams.forEach(f=>{bars+=`<div class="fam">${f}${fams.length===1?' (you are in this app)':''}</div><div class="chips">`;MODELS.filter(m=>m.fam===f).forEach(m=>{
      const on=m.id===chosen.id;bars+=`<div class="chip${on?' on':''}" role="button" tabindex="0" data-id="${m.id}" aria-label="Reroute to ${m.name}" style="--c:${m.color}"><span class="sw" style="background:${m.color}"></span>${m.name}</div>`});bars+='</div>'});
    return `<div class="pick"><span class="meta">${rerouted?'You rerouted to':'Mandu picked'}</span>
      <h3><span class="sw" style="background:${chosen.color}"></span>${chosen.name}</h3>
      <div class="meta">Reads as ${TASKS[d.task].label}, complexity ${d.complexity<0.4?'low':d.complexity<0.7?'medium':'high'}. Runner-up: ${runner.name}.</div>
      <p class="reason">${rerouted?'Got it. Next time a '+TASKS[d.task].label+' prompt comes in, the trail to '+esc(chosen.name)+' will be a little stronger.':esc(d.reason)}</p>
      <div class="bars">${bars}</div>
      <div class="open"><a id="openLink" href="${o.url(current.text)}" target="_blank" rel="noopener">Open in ${o.label}</a>
      ${current.rated?'':'<button id="good">Good route</button>'}<span class="meta">Wrong trail? Tap another model above to reroute.</span></div>
      ${chosen.open==='gemini'?'<button id="copyBtn" type="button" style="margin-left:8px">Copy prompt</button><p class="meta" id="copyNote" style="margin-top:8px">Gemini can\'t receive a prompt through a link, so AntRouter copies it for you. Paste it into Gemini with Ctrl/Cmd+V.</p>':''}</div>`;
  }
  function bindResult(el,current,h){
    el.querySelectorAll('.chip').forEach(c=>{const go=()=>h.onReroute(c.dataset.id);c.onclick=go;c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
    el.querySelector('#openLink').onclick=()=>{if(current.chosen.open==='gemini')h.onCopy()};
    const cb=el.querySelector('#copyBtn');if(cb)cb.onclick=h.onCopy;
    const g=el.querySelector('#good');if(g)g.onclick=h.onGood;
  }
  A.result={esc,resultHTML,bindResult};
})(globalThis.AntRouter = globalThis.AntRouter || {});
