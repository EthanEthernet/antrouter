// The result card: who Mandu picked, why and how sure, reroute chips, Good route, second opinion and the hand-off link.
(function (A) {
  const {MODELS,OPEN}=A.models;
  const {TASKS,rankModels,allowedModels,secondOpinion}=A.router;
  function esc(x){return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  const SURE={clear:'Clear pick',likely:'Likely pick',close:'Close call'};
  // The prompt that "Open in…" sends: the original unless the user chose the adapter's version (or edited it).
  function sendText(current){const ad=current.ad;if(!ad||!current.useAdapted)return current.text;
    return current.edited!=null?current.edited:A.adapter.withChips(ad,current.chips||[])}
  // Only a real change or a vendor-specific suggested chip earns a panel; generic chips ride along inside it.
  const hasSuggestions=ad=>!!ad&&!ad.skip&&(ad.changes.length>0||ad.chips.some(c=>c.suggested));
  function adapterHTML(current){const ad=current.ad;if(!ad)return'';
    if(ad.skip)return`<p class="meta adapt-skip">Prompt adapter: no suggestions (${esc(ad.skip)}).</p>`;
    if(!hasSuggestions(ad))return'';
    const fam=current.chosen.fam,n=ad.changes.length,proposed=current.edited!=null?current.edited:A.adapter.withChips(ad,current.chips||[]);
    const title=n?`Mandu suggests ${n} tweak${n===1?'':'s'} for ${fam}`:`Optional additions for ${fam}`;
    const changes=n?`<ul class="adapt-why">${ad.changes.map(c=>`<li><b>${esc(c.label)}.</b> ${esc(c.why)}</li>`).join('')}</ul>`:'';
    const chips=ad.chips.length?`<div class="adapt-chips" role="group" aria-label="Optional additions">${ad.chips.map(c=>{const on=(current.chips||[]).includes(c.id);
      return`<button type="button" class="adapt-chip${c.suggested?' sug':''}" data-chip="${c.id}" aria-pressed="${on}" title="${esc(c.why)}">${on?'✓ ':'+ '}${esc(c.label)}${c.suggested?' <span class="sugtag">suggested</span>':''}</button>`}).join('')}</div>`:'';
    const diff=proposed!==current.text?`<pre class="adapt-diff" aria-label="Changes from your prompt">${A.adapter.diffLines(current.text,proposed).map(l=>
      `<span class="${l.t}">${l.t==='del'?'− ':l.t==='ins'?'+ ':'  '}${esc(l.s)||' '}</span>`).join('\n')}</pre>`:'<p class="meta">Turn on an addition above to see the suggested prompt.</p>';
    const edit=current.editing?`<label class="meta" for="adaptEdit">Edit the prompt that will be sent</label><textarea id="adaptEdit" rows="5">${esc(proposed)}</textarea>`:'';
    const use=!!current.useAdapted;
    return`<details class="adapt"${current.adaptOpen?' open':''}><summary>${title}</summary>
      ${changes}${chips}${current.editing?edit:diff}
      <div class="adapt-actions"><button type="button" id="useAdapted" aria-pressed="${use}">${use?'✓ ':''}Use suggested prompt</button><button type="button" id="useOriginal" aria-pressed="${!use}">${!use?'✓ ':''}Send my original</button>${current.editing?'':'<button type="button" id="editAdapted">Edit</button>'}</div>
      <p class="meta adapt-state">${chosenOpenLabel(current)} will send ${use?(current.edited!=null?'your edited prompt':'the suggested prompt'):'your original prompt'}.</p></details>`}
  const chosenOpenLabel=current=>'Open in '+OPEN[current.chosen.open].label;
  // opts: scores (Lv2 unlock), closecall (Lv3 unlock: free second opinion on close calls), secondCost and crumbs.
  function resultHTML(current,platformId,opts){
    opts=opts||{};
    const {d,chosen,rerouted}=current;const order=rankModels(d.final,platformId);const runner=order.find(m=>m.id!==chosen.id)||chosen;
    const o=OPEN[chosen.open],conf=d.confidence;
    let bars='';
    const fams=[...new Set(allowedModels(platformId).map(m=>m.fam))];
    fams.forEach(f=>{bars+=`<div class="fam">${f}${fams.length===1?' (you are in this app)':''}</div><div class="chips">`;MODELS.filter(m=>m.fam===f).forEach(m=>{
      const on=m.id===chosen.id;bars+=`<div class="chip${on?' on':''}" role="button" tabindex="0" data-id="${m.id}" aria-label="Reroute to ${m.name}" style="--c:${m.color}"><span class="sw" style="background:${m.color}"></span>${m.name}${opts.scores?`<span class="score">${d.final[m.id]}</span>`:''}</div>`});bars+='</div>'});
    const why=conf.level==='close'?(d.alt?` The prompt reads as both ${TASKS[d.task].label} and ${TASKS[d.alt].label}.`:` Only ${conf.margin} point${conf.margin===1?'':'s'} ahead of ${runner.name}.`):'';
    const freeSecond=opts.closecall&&conf.level==='close'&&!rerouted;
    let second='';
    if((current.second||freeSecond)&&runner!==chosen)second=`<div class="second"><b>Runner-up${freeSecond&&!current.second?' (close-call alert)':''}</b><p>${esc(secondOpinion(d,chosen,runner))}</p></div>`;
    else if(!rerouted&&runner!==chosen&&opts.secondCost)second=`<button id="second"${(opts.crumbs||0)<opts.secondCost?' disabled title="Not enough crumbs yet"':''}>Second opinion · ${opts.secondCost} crumbs</button>`;
    return `<div class="pick"><span class="meta">${rerouted?'You rerouted to':'Mandu picked'}</span>
      <h3><span class="sw" style="background:${chosen.color}"></span>${chosen.name}</h3>
      <div class="meta">Reads as ${TASKS[d.task].label}, complexity ${d.complexity<0.4?'low':d.complexity<0.7?'medium':'high'}. Runner-up: ${runner.name}.</div>
      ${rerouted?'':`<p class="sure ${conf.level}"><b>${SURE[conf.level]}.</b>${why}</p>`}
      <p class="reason">${rerouted?'Got it. Next time a '+TASKS[d.task].label+' prompt like this comes in, the trail to '+esc(chosen.name)+' will be a little stronger.':esc(d.reason)}</p>
      ${second}
      <div class="bars">${bars}</div>
      ${adapterHTML(current)}
      <div class="open"><a id="openLink" href="${esc(o.url(sendText(current)))}" target="_blank" rel="noopener">Open in ${o.label}</a>
      ${current.rated?'':'<button id="good">Good route</button>'}<span class="meta">Wrong trail? Tap another model above to reroute.</span></div>
      ${chosen.open==='gemini'?'<button id="copyBtn" type="button" style="margin-left:8px">Copy prompt</button><p class="meta" id="copyNote" style="margin-top:8px">Gemini can\'t receive a prompt through a link, so AntRouter copies it for you. Paste it into Gemini with Ctrl/Cmd+V.</p>':''}</div>`;
  }
  function bindResult(el,current,h){
    el.querySelectorAll('.chip').forEach(c=>{const go=()=>h.onReroute(c.dataset.id);c.onclick=go;c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
    el.querySelector('#openLink').onclick=()=>{if(current.chosen.open==='gemini')h.onCopy();if(h.onOpen)h.onOpen()};
    const cb=el.querySelector('#copyBtn');if(cb)cb.onclick=h.onCopy;
    const g=el.querySelector('#good');if(g)g.onclick=h.onGood;
    const s=el.querySelector('#second');if(s&&h.onSecond)s.onclick=h.onSecond;
    const ad=el.querySelector('details.adapt');if(!ad||!h.onAdapt)return;
    ad.ontoggle=()=>{current.adaptOpen=ad.open};
    ad.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>h.onAdapt('chip',b.dataset.chip));
    const on=(sel,what)=>{const b=ad.querySelector(sel);if(b)b.onclick=()=>h.onAdapt(what)};
    on('#useAdapted','use');on('#useOriginal','original');on('#editAdapted','edit');
    const ta=ad.querySelector('#adaptEdit');if(ta)ta.oninput=()=>h.onAdapt('edited',ta.value);
  }
  A.result={esc,resultHTML,bindResult,sendText,hasSuggestions};
})(globalThis.AntRouter = globalThis.AntRouter || {});
