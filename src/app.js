// Page wiring: chat box, tabs, result card, trails, progress, shop, toasts and the terminal buttons.
// The logic lives in the modules this file connects; this is the only file that knows the page layout.
(function (A) {
  const {MODELS,PLATFORMS,FAMILIES,FAMILY_COLORS}=A.models;
  const R=A.router, S=A.storage;
  const $=id=>document.getElementById(id);
  const UBLUE='#2F8FE0', UGOLD='#FFD200';
  const POPUP=new URLSearchParams(location.search).has('popup')||location.protocol==='chrome-extension:';
  if(POPUP)document.documentElement.classList.add('popup');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const game=A.game.createGame(S);
  let bias=S.get('bias',{}), ledger=S.get('ledger',{routes:0,reroutes:0,spent:0,flag:0});
  let platform=S.get('platform','any');if(!PLATFORMS.some(p=>p.id===platform))platform='any';
  let current=null, newQ=null, clearNewQ;
  const TABS=['route','trails','progress','shop','about'];
  const LOOP=[['ask','Ask'],['route','Route'],['reveal','Reveal'],['steer','Steer'],['learn','Learn'],['reward','Reward'],['customize','Customize']];
  const HINTS={ask:'<b>Ask:</b> press Route prompt (or Ctrl/Cmd+Enter) to send it to Mandu.',
   route:'<b>Route:</b> Mandu is reading your prompt and following the trail…',
   reveal:'<b>Reveal:</b> agree with the pick? Press <b>Good route</b>. Disagree? Tap another model to <b>Steer</b>.',
   steer:'<b>Steer:</b> got it. Mandu is updating his trails…',
   learn:'<b>Learn:</b> that trail is stronger now. See the <b>Trails</b> tab.',
   reward:'<b>Reward:</b> XP and crumbs earned. Spend them in the <b>Shop</b> to <b>Customize</b> Mandu, or ask another prompt.',
   customize:'<b>Customize:</b> looking sharp. Ask another prompt to go around the loop again.'};
  let loopDone=new Set(), loopOn=null;

  const mandu=A.mandu.createMandu({screen:$('screen'),status:$('status'),reduce,store:S,maxFont:POPUP?7:13,
    getWorn:id=>game.wearing(id),
    getHud:()=>{const l=game.levelInfo();return{index:l.index,name:l.name,fill:Math.round(l.progress*8),crumbs:game.state().crumbs}},
    onLanded:()=>{loopStep('reveal');setTimeout(()=>loopStep('reward'),900)},
    onBellyChange:()=>renderTrails()});

  // ---- tabs ----
  function showTab(id,focus){
    TABS.forEach(t=>{const on=t===id,b=$('tab-'+t);b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;$('panel-'+t).hidden=!on;if(on)b.classList.remove('has-news')});
    S.set('tab',id);if(focus)$('tab-'+id).focus()}
  TABS.forEach((t,i)=>{const b=$('tab-'+t);b.onclick=()=>showTab(t);
    b.onkeydown=e=>{const n=TABS.length,j=e.key==='ArrowRight'?(i+1)%n:e.key==='ArrowLeft'?(i+n-1)%n:e.key==='Home'?0:e.key==='End'?n-1:-1;if(j>=0){e.preventDefault();showTab(TABS[j],true)}}});
  function flagProgress(){if($('tab-progress').getAttribute('aria-selected')!=='true')$('tab-progress').classList.add('has-news')}

  // ---- chat ----
  function renderPlat(){const box=$('plat');box.querySelectorAll('button').forEach(b=>b.remove());
    PLATFORMS.forEach(pl=>{const b=document.createElement('button');b.textContent=pl.label;b.setAttribute('aria-pressed',platform===pl.id);b.onclick=()=>{platform=pl.id;S.set('platform',platform);renderPlat();mandu.setStatus(pl.fam?'working inside '+pl.label:'free to roam any app')};box.appendChild(b)})}
  function clickPlat(label){[...$('plat').querySelectorAll('button')].find(b=>b.textContent===label)?.click()}
  function zot(){mandu.zot();game.zotted()}
  function doRoute(){
    const text=$('prompt').value.trim();
    if(!text){showTab('route');$('result').innerHTML='<p class="empty">Type a prompt or tap a sample first.</p>';return}
    const d=R.decide(text,platform,bias);
    current={text,d,chosen:d.order[0],original:d.order[0],rerouted:false,rated:false};
    ledger.routes++;ledger.spent+=current.chosen.cost;ledger.flag+=30;S.set('ledger',ledger);
    mandu.routeTo(current.chosen);mandu.queueEat(current.chosen.fam);
    showTab('route');renderResult();renderTrails();
    loopStep('route');if(reduce){loopStep('reveal');loopStep('reward')}
    game.routed(current.chosen.fam,{platform,task:d.task});
  }
  function reroute(id){
    if(!current||current.chosen.id===id||!R.allowedModels(platform).some(m=>m.id===id))return;
    const m=MODELS.find(x=>x.id===id);
    R.nudge(bias,current.d.task,id,0.08);R.nudge(bias,current.d.task,current.original.id,-0.04);S.set('bias',bias);
    ledger.reroutes++;ledger.spent+=m.cost-current.chosen.cost;S.set('ledger',ledger);
    mandu.queueEat(m.fam,current.chosen.fam);
    current.chosen=m;current.rerouted=true;current.rated=true;
    mandu.puzzle(m);renderResult();renderTrails();
    loopStep('steer');setTimeout(()=>loopStep('learn'),700);setTimeout(()=>loopStep('reward'),1400);
    game.rerouted(m.fam);
  }
  function good(){R.nudge(bias,current.d.task,current.chosen.id,0.03);S.set('bias',bias);current.rated=true;mandu.pet();renderResult();renderTrails();
    loopStep('steer');setTimeout(()=>loopStep('learn'),700);setTimeout(()=>loopStep('reward'),1400);game.ratedGood()}
  function copyPrompt(){const txt=current.text;let ok=false;try{const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove()}catch(e){}try{navigator.clipboard&&navigator.clipboard.writeText(txt).then(()=>{},()=>{})}catch(e){}const n=$('copyNote');if(n)n.textContent=ok?'Prompt copied. Paste it into Gemini with Ctrl/Cmd+V.':'Copy the prompt from the box above, then paste it into Gemini.'}
  function renderResult(){$('result').innerHTML=A.result.resultHTML(current,platform);A.result.bindResult($('result'),current,{onReroute:reroute,onGood:good,onCopy:copyPrompt})}

  // ---- trails tab ----
  function renderTrails(){
    const b=mandu.belly(),total=FAMILIES.reduce((a,f)=>a+b[f],0);
    $('bellySplit').innerHTML=total?FAMILIES.map(f=>`<span class="pill" style="--c:${FAMILY_COLORS[f]}"><span class="sw" style="background:${FAMILY_COLORS[f]}"></span>${f} ${Math.round(b[f]/total*100)}%</span>`).join('')+`<span class="meta">${total} routed</span>`:'<span class="meta">Belly empty: route a prompt to feed Mandu.</span>';
    const items=[];for(const tk in bias)for(const id in bias[tk]){const v=bias[tk][id];if(Math.abs(v)>0.001)items.push({tk,id,v})}
    items.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
    $('learned').innerHTML=items.length?items.slice(0,6).map(i=>{const m=MODELS.find(x=>x.id===i.id);return `<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${m.color};margin-right:8px"></span>${R.TASKS[i.tk].label}: ${i.v>0?'stronger trail to':'weaker trail to'} ${m.name} (${i.v>0?'+':''}${Math.round(i.v*100)})</div>`}).join('')+'<button id="resetT" style="margin-top:10px;padding:7px 12px;font-size:13px">Reset trails and belly</button>':'Nothing learned yet. Tap a different model on a result to reroute, and the trail to it gets stronger.';
    const r=$('resetT');if(r)r.onclick=()=>{bias={};ledger={routes:0,reroutes:0,spent:0,flag:0};S.set('bias',bias);S.set('ledger',ledger);mandu.resetBelly();renderTrails()};
  }

  // ---- core-loop strip ----
  function renderLoop(){$('steps').innerHTML=LOOP.map(([id,n],i)=>`<span class="st${loopOn===id?' on':loopDone.has(id)?' done':''}">${i+1} ${n}</span>`+(i<LOOP.length-1?'<span class="arr">→</span>':'<span class="arr">↺</span>')).join('');
    const laps=game.state().laps;$('laps').textContent=laps+' loop'+(laps===1?'':'s')+' completed'}
  function loopStep(id){
    if(id==='ask'&&loopOn==='ask')return;
    if(id==='ask'&&loopDone.has('route')&&loopDone.has('reveal')&&loopDone.has('reward')){game.addLap();loopDone=new Set()}
    if(id==='route'&&!loopDone.has('ask'))loopDone.add('ask');
    loopOn=id;loopDone.add(id);$('hint').innerHTML=HINTS[id];renderLoop()}
  function loopReset(){loopDone=new Set();loopOn=null;$('hint').innerHTML='<b>Start here:</b> type a prompt above, or tap a sample.';renderLoop()}

  // ---- progress and shop tabs ----
  function renderHeader(){const l=game.levelInfo();$('hdrStats').textContent='Lv'+(l.index+1)+' '+l.name+' · '+game.state().crumbs+' crumbs'}
  function renderQuests(){const p=game.state(),Q0=A.game.QUESTS;$('qdone').textContent=p.qdone+' quest'+(p.qdone===1?'':'s')+' done';
    $('quests').innerHTML=p.quests.map(q=>{const Q=Q0[q.id];const pct=Math.min(100,Math.round(q.n/Q.goal*100));
      return `<div class="q${newQ===q.id?' new':''}"><b>${Q.t}</b><div class="qbar"><span style="width:${pct}%"></span></div><div class="meta"><span>${Math.min(q.n,Q.goal)} / ${Q.goal}</span><span>+${Q.rw} crumbs</span></div></div>`}).join('')}
  function renderProg(){
    const l=game.levelInfo(),p=game.state(),li=l.index,{LEVELS,SHOP,BADGES}=A.game,esc=A.result.esc;
    $('lvName').textContent='Lv'+(li+1)+' '+l.name;
    $('lvNext').textContent=l.next?'next: '+l.next.n+' at '+l.next.xp+' XP':'max level';
    $('xpFill').style.width=Math.round(l.progress*100)+'%';
    $('xpText').textContent=p.xp+' XP';
    $('crumbs').textContent=p.crumbs+' crumbs';
    $('badges').innerHTML=BADGES.map(b=>`<span class="badge${p.badges.includes(b.id)?' on':''}">${p.badges.includes(b.id)?'★ ':'☆ '}${b.n}</span>`).join('');
    $('shop').innerHTML=SHOP.map(it=>{const own=p.owned.includes(it.id),locked=li+1<it.lvl,afford=p.crumbs>=it.cost;
      const btn=own?`<button data-wear="${it.id}">${game.wearing(it.id)?'Take off':'Wear'}</button>`:locked?`<button disabled>Unlocks at Lv${it.lvl} ${LEVELS[it.lvl-1].n}</button>`:`<button data-buy="${it.id}" ${afford?'':'disabled'}>Buy for ${it.cost} crumbs</button>`;
      return `<div class="item${game.wearing(it.id)?' worn':''}"><div class="ico" style="color:${it.id==='bandana'?UBLUE:it.id==='gold'?UGOLD:it.id==='shades'?'#8B96AE':'#FF6FA3'}">${esc(it.ico)}</div><b>${it.name}</b><span class="meta">${it.desc}</span>${btn}</div>`}).join('');
    $('shop').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const it=SHOP.find(x=>x.id===b.dataset.buy);if(!game.buy(it.id))return;mandu.pet();toast('Bought '+it.name+'! Mandu is wearing it.');loopStep('customize')});
    $('shop').querySelectorAll('[data-wear]').forEach(b=>b.onclick=()=>{const on=game.toggleWear(b.dataset.wear);loopStep('customize');if(on)mandu.pet()});
  }
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('on'),2600)}

  // ---- terminal window buttons ----
  const term=$('term'), shadeEl=$('shade');
  function setMax(on){term.classList.toggle('max',on);shadeEl.classList.toggle('on',on);$('wMax').setAttribute('aria-label',on?'Restore size':'Expand');$('wMax').title=on?'Restore':'Expand';$('wMax').textContent=on?'−':'+';mandu.fit()}
  function setMin(on){term.classList.toggle('min',on);if(on){setMax(false);mandu.stop();mandu.setStatus('minimized (click yellow to restore)')}else{mandu.start();mandu.idleStatus()}}

  // ---- tour hooks ----
  function resetForTour(){bias={};ledger={routes:0,reroutes:0,spent:0,flag:0};mandu.resetBelly();game.reset();loopReset();
    platform='any';renderPlat();current=null;$('result').innerHTML='<p class="empty">Tour in progress…</p>';renderTrails()}

  // ---- events ----
  game.on('change',()=>{renderHeader();renderProg();renderQuests();renderLoop()});
  game.on('toast',toast);
  game.on('levelup',e=>{mandu.levelUp(e.name);toast('Level up! Mandu is now a '+e.name+(e.unlocked.length?'. New in the shop: '+e.unlocked.join(', '):''))});
  game.on('quest',e=>{newQ=e.next;clearTimeout(clearNewQ);clearNewQ=setTimeout(()=>{newQ=null},700);flagProgress()});
  game.on('badge',flagProgress);
  R.SAMPLES.forEach(x=>{const b=document.createElement('button');b.textContent=x;b.onclick=()=>{$('prompt').value=x;doRoute()};$('samples').appendChild(b)});
  $('go').onclick=()=>doRoute();
  $('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))doRoute()});
  $('prompt').addEventListener('input',e=>{if(/(^|[^a-z])zot!?$/i.test(e.target.value))zot();if(e.target.value.trim())loopStep('ask')});
  let keys='';window.addEventListener('keydown',e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key.length!==1)return;keys=(keys+e.key.toLowerCase()).slice(-3);if(keys==='zot')zot()});
  $('zot').onclick=zot;$('pet').onclick=()=>mandu.pet();$('nap').onclick=()=>mandu.nap();$('wake').onclick=()=>mandu.wake();
  $('resetProg').onclick=()=>{game.reset();toast('Progress reset')};
  $('wMax').onclick=()=>{if(term.classList.contains('quit'))return;if(term.classList.contains('min'))setMin(false);setMax(!term.classList.contains('max'))};
  $('wMin').onclick=()=>{if(term.classList.contains('quit'))return;setMin(!term.classList.contains('min'))};
  $('wQuit').onclick=()=>{setMax(false);term.classList.remove('min');term.classList.add('quit');mandu.stop();mandu.setStatus('exited')};
  $('wRelaunch').onclick=()=>{term.classList.remove('quit');mandu.relaunch();$('wRelaunch').blur()};
  shadeEl.onclick=()=>setMax(false);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&term.classList.contains('max'))setMax(false)});
  $('tourBtn').onclick=()=>A.tour.run({resetForTour,doRoute,showTab,clickPlat,game});
  $('tourStop').onclick=()=>A.tour.stop();

  // ---- first paint ----
  const saved=S.get('tab','route');
  showTab(TABS.includes(saved)?saved:'route');
  renderPlat();renderHeader();renderProg();renderQuests();renderLoop();renderTrails();
})(globalThis.AntRouter = globalThis.AntRouter || {});
