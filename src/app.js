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

  const game=A.game.createGame(S), sfx=A.audio.createAudio(S);
  let bias=S.get('bias',{}), ledger=S.get('ledger',{routes:0,reroutes:0,spent:0,flag:0});
  let platform=S.get('platform','any');if(!PLATFORMS.some(p=>p.id===platform))platform='any';
  let current=null, newQ=null, clearNewQ, routeLock=0;
  const TABS=['route','trails','progress','shop','about'];
  const LOOP=[['ask','Ask'],['route','Route'],['reveal','Reveal'],['steer','Steer'],['learn','Learn'],['reward','Reward'],['customize','Customize']];
  const HINTS={ask:'<b>Ask:</b> press Route prompt (or Ctrl/Cmd+Enter) to send it to Mandu.',
   route:'<b>Route:</b> Mandu is reading your prompt and following the trail…',
   reveal:'<b>Reveal:</b> agree with the pick? Press <b>Good route</b>. Disagree? Tap another model to <b>Steer</b>.',
   steer:'<b>Steer:</b> got it. Mandu is updating his trails…',
   learn:'<b>Learn:</b> that trail is stronger now. See the <b>Trails</b> tab.',
   reward:'<b>Reward:</b> XP and crumbs earned. To finish the loop, press <b>Good route</b> or tap another model to <b>Steer</b>.',
   lap:'<b>Loop complete!</b> Spend crumbs in the <b>Shop</b> to <b>Customize</b> Mandu, or ask another prompt to go again.',
   customize:'<b>Customize:</b> looking sharp. Ask another prompt to go around the loop again.'};
  let loopDone=new Set(), loopOn=null, lapCounted=false;

  const getWorn=id=>game.wearing(id);
  const getHud=()=>{const l=game.levelInfo();return{index:l.index,name:l.name,fill:Math.round(l.progress*8),crumbs:game.state().crumbs}};
  const mandu=A.mandu.createMandu({screen:$('screen'),status:$('status'),reduce,store:S,maxFont:POPUP?5:13,getWorn,getHud,
    // Good route or a reroute already lit Steer, Learn and Reward, so the landing shouldn't jump the strip back to Reveal
    onLanded:()=>{sfx.play('gulp');if(current&&current.rated)return;loopStep('reveal');setTimeout(()=>loopStep('reward'),900)},
    onBellyChange:()=>renderTrails()});

  // ---- tabs ----
  function showTab(id,focus){
    TABS.forEach(t=>{const on=t===id,b=$('tab-'+t);b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;$('panel-'+t).hidden=!on;if(on){b.classList.remove('has-news');if(t==='progress')b.removeAttribute('aria-label')}});
    S.set('tab',id);if(focus)$('tab-'+id).focus()}
  TABS.forEach((t,i)=>{const b=$('tab-'+t);b.onclick=()=>{sfx.play('tap');showTab(t)};
    b.onkeydown=e=>{const n=TABS.length,j=e.key==='ArrowRight'?(i+1)%n:e.key==='ArrowLeft'?(i+n-1)%n:e.key==='Home'?0:e.key==='End'?n-1:-1;if(j>=0){e.preventDefault();showTab(TABS[j],true)}}});
  function flagProgress(){if($('tab-progress').getAttribute('aria-selected')!=='true'){$('tab-progress').classList.add('has-news');$('tab-progress').setAttribute('aria-label','Progress (new)')}}

  // ---- chat ----
  function renderPlat(){const box=$('plat');box.querySelectorAll('button').forEach(b=>b.remove());
    PLATFORMS.forEach(pl=>{const b=document.createElement('button');b.textContent=pl.label;b.setAttribute('aria-pressed',platform===pl.id);b.onclick=()=>{sfx.play('tap');platform=pl.id;S.set('platform',platform);renderPlat();mandu.setStatus(pl.fam?'working inside '+pl.label:'free to roam any app')};box.appendChild(b)})}
  function clickPlat(label){[...$('plat').querySelectorAll('button')].find(b=>b.textContent===label)?.click()}
  function zot(){if(screenOpen)return;sfx.play('zot');mandu.zot();game.zotted()}
  function doRoute(){
    const text=$('prompt').value.trim();
    if(!text){showTab('route');$('result').innerHTML='<p class="empty">Type a prompt or tap a sample first.</p>';sfx.play('nope');return}
    // One prompt at a time: Mandu has to finish the trail before the next route counts.
    if(mandu.busy()||Date.now()<routeLock){mandu.setStatus('still on the trail, one prompt at a time');sfx.play('nope');return}
    routeLock=Date.now()+600;
    const d=R.decide(text,platform,bias);
    current={text,d,chosen:d.order[0],original:d.order[0],rerouted:false,rated:false};
    ledger.routes++;ledger.spent+=current.chosen.cost;ledger.flag+=30;S.set('ledger',ledger);
    mandu.routeTo(current.chosen);mandu.queueEat(current.chosen.fam);sfx.play('route');
    showTab('route');renderResult();renderTrails();
    loopStep('ask');loopStep('route');if(reduce){loopStep('reveal');loopStep('reward')}
    game.routed(current.chosen.fam,{platform,task:d.task});
  }
  function reroute(id){
    if(!current||current.chosen.id===id||!R.allowedModels(platform).some(m=>m.id===id))return;
    const m=MODELS.find(x=>x.id===id),task=current.d.task,first=!current.rerouted,from=current.chosen.fam;
    // Learn from the final choice only: put this task's trails back as they were before this result, then apply it.
    if(first)current.biasBefore=JSON.parse(JSON.stringify(bias[task]||{}));
    bias[task]=JSON.parse(JSON.stringify(current.biasBefore));
    if(id!==current.original.id){R.nudge(bias,task,id,0.08);R.nudge(bias,task,current.original.id,-0.04)}
    S.set('bias',bias);
    ledger.reroutes++;ledger.spent+=m.cost-current.chosen.cost;S.set('ledger',ledger);
    mandu.queueEat(m.fam,from);
    current.chosen=m;current.rerouted=true;current.rated=true;
    mandu.puzzle(m);renderResult();renderTrails();sfx.play('hmm');
    loopDone.add('reveal');loopStep('steer');setTimeout(()=>loopStep('learn'),700);setTimeout(()=>loopStep('reward'),1400);
    game.rerouted(m.fam,{first,from});
  }
  function good(){R.nudge(bias,current.d.task,current.chosen.id,0.03);S.set('bias',bias);current.rated=true;mandu.pet();renderResult();renderTrails();sfx.play('good');
    loopDone.add('reveal');loopStep('steer');setTimeout(()=>loopStep('learn'),700);setTimeout(()=>loopStep('reward'),1400);game.ratedGood()}
  function copyPrompt(){const txt=current.text;let ok=false;try{const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove()}catch(e){}try{navigator.clipboard&&navigator.clipboard.writeText(txt).then(()=>{},()=>{})}catch(e){}const n=$('copyNote');if(n)n.textContent=ok?'Prompt copied. Paste it into Gemini with Ctrl/Cmd+V.':'Copy the prompt from the box above, then paste it into Gemini.'}
  function renderResult(){$('result').innerHTML=A.result.resultHTML(current,platform);A.result.bindResult($('result'),current,{onReroute:reroute,onGood:good,onCopy:copyPrompt})}

  // ---- trails tab ----
  function renderTrails(){
    const b=mandu.belly(),total=FAMILIES.reduce((a,f)=>a+b[f],0);
    $('bellySplit').innerHTML=total?FAMILIES.map(f=>`<span class="pill" style="--c:${FAMILY_COLORS[f]}"><span class="sw" style="background:${FAMILY_COLORS[f]}"></span>${f} ${Math.round(b[f]/total*100)}%</span>`).join('')+`<span class="meta">${total} routed</span>`:'<span class="meta">Belly empty: route a prompt to feed Mandu.</span>';
    const items=[];for(const tk in bias)for(const id in bias[tk]){const v=bias[tk][id];if(Math.abs(v)>0.001)items.push({tk,id,v})}
    items.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
    $('learned').innerHTML=(items.length?items.slice(0,6).map(i=>{const m=MODELS.find(x=>x.id===i.id);return `<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${m.color};margin-right:8px"></span>${R.TASKS[i.tk].label}: ${i.v>0?'stronger trail to':'weaker trail to'} ${m.name} (${i.v>0?'+':''}${Math.round(i.v*100)})</div>`}).join(''):'Nothing learned yet. Tap a different model on a result to reroute, and the trail to it gets stronger.')+(items.length||total?'<button id="resetT" style="margin-top:10px;padding:7px 12px;font-size:13px">Reset trails and belly</button>':'');
    const r=$('resetT');if(r)r.onclick=()=>armed(r,resetTrails);
  }
  function resetTrails(){bias={};ledger={routes:0,reroutes:0,spent:0,flag:0};S.set('bias',bias);S.set('ledger',ledger);mandu.resetBelly();renderTrails()}
  // Destructive buttons need a second click within 3 seconds.
  function armed(btn,fn){if(btn.dataset.armed){delete btn.dataset.armed;clearTimeout(btn._t);btn.textContent=btn._label;fn();return}
    btn._label=btn.textContent;btn.dataset.armed='1';btn.textContent='Click again to confirm';sfx.play('nope');
    btn._t=setTimeout(()=>{delete btn.dataset.armed;btn.textContent=btn._label},3000)}

  // ---- core-loop strip ----
  function renderLoop(){$('steps').innerHTML=LOOP.map(([id,n],i)=>`<span class="st${loopOn===id?' on':loopDone.has(id)?' done':''}">${i+1} ${n}</span>`+(i<LOOP.length-1?'<span class="arr">→</span>':'<span class="arr">↺</span>')).join('');
    const laps=game.state().laps;$('laps').textContent=laps+' loop'+(laps===1?'':'s')+' completed'}
  // A lap needs a decision: Route, Reveal and Steer (Good route or a reroute), then it pays out at Reward.
  function loopStep(id){
    if(id==='ask'&&loopOn==='ask')return;
    if(id==='ask'&&loopDone.has('route')){loopDone=new Set();lapCounted=false}
    loopOn=id;loopDone.add(id);let hint=HINTS[id];
    if(id==='reward'){
      if(!lapCounted&&['route','reveal','steer'].every(s=>loopDone.has(s))){lapCounted=true;hint=HINTS.lap;game.addLap();sfx.play('lap');toast('Loop complete!  +3 crumbs')}
      else if(lapCounted)hint=HINTS.lap}
    $('hint').innerHTML=hint;renderLoop()}
  function loopReset(){loopDone=new Set();loopOn=null;lapCounted=false;$('hint').innerHTML='<b>Start here:</b> type a prompt above, or tap a sample.';renderLoop()}

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
    $('shop').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const it=SHOP.find(x=>x.id===b.dataset.buy);toast('Bought '+it.name+'! Mandu is wearing it.');if(!game.buy(it.id))return;sfx.play('coin');mandu.pet();loopStep('customize')});
    $('shop').querySelectorAll('[data-wear]').forEach(b=>b.onclick=()=>{const on=game.toggleWear(b.dataset.wear);loopStep('customize');if(on)mandu.pet()});
  }
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('on'),2600)}

  // ---- terminal window buttons ----
  const term=$('term'), shadeEl=$('shade');
  function setMax(on){term.classList.toggle('max',on);shadeEl.classList.toggle('on',on);$('wMax').setAttribute('aria-label',on?'Restore size':'Expand');$('wMax').title=on?'Restore':'Expand';$('wMax').textContent=on?'−':'+';mandu.fit()}
  function setMin(on){term.classList.toggle('min',on);if(on){setMax(false);mandu.stop();mandu.setStatus('minimized (click yellow to restore)')}else{mandu.start();mandu.idleStatus()}}

  // ---- launch and exit screens ----
  // Both are modal: the page behind is inert and the main Mandu pauses. Each screen gets a fresh Mandu so it shows today's belly and gear.
  const wrap=document.querySelector('.wrap');
  let screenOpen=null, screenMandu=null;
  function openScreen(id){
    if(screenMandu)screenMandu.stop();
    const old=$(id).querySelector('.screen-term pre'),pre=document.createElement('pre');pre.setAttribute('aria-hidden','true');old.replaceWith(pre);
    ['launch','exit'].forEach(s=>{$(s).hidden=s!==id});wrap.inert=true;screenOpen=id;
    setMax(false);mandu.stop();
    screenMandu=A.mandu.createMandu({screen:pre,status:{textContent:''},reduce,store:S,maxFont:POPUP?4:8,getWorn,getHud});
    screenMandu.nap();
  }
  function closeScreen(){if(screenMandu)screenMandu.stop();['launch','exit'].forEach(s=>{$(s).hidden=true});wrap.inert=false;screenOpen=null;
    if(!term.classList.contains('min'))mandu.start();mandu.fit()}
  function showLaunch(){
    const p=game.state(),l=game.levelInfo(),has=p.xp>0||p.routes>0;
    $('launchSave').textContent=has?`Welcome back: Mandu is a Lv${l.index+1} ${l.name} with ${p.crumbs} crumbs and ${p.laps} loop${p.laps===1?'':'s'} completed.`:'Mandu is napping. Press Start to wake the little anteater up.';
    $('launchStart').textContent=has?'Continue':'Start';$('launchNew').hidden=!has;
    openScreen('launch');$('launchStart').focus()}
  function showExit(){
    const s=game.sessionSummary(),b=s.belly,tot=FAMILIES.reduce((a,f)=>a+b[f],0),esc=A.result.esc;
    const mins=Math.floor(s.ms/60000),secs=Math.floor(s.ms/1000)%60;
    const cell=(k,v)=>`<div><dt>${k}</dt><dd>${v}</dd></div>`;
    $('recap').innerHTML=cell('Time played',mins+':'+String(secs).padStart(2,'0'))+cell('Prompts routed',s.routes)+cell('Loops completed',s.laps)
      +cell('Reroutes',s.reroutes)+cell('Good routes',s.goods)+cell('Level',s.levelFrom===s.levelTo?s.levelTo:s.levelFrom+' → '+s.levelTo)
      +cell('XP earned','+'+s.xp)+cell('Crumbs earned','+'+s.earned)+cell('Crumbs spent',s.spent);
    const fav=tot?FAMILIES.slice().sort((x,y)=>b[y]-b[x])[0]:null;
    $('recapNote').innerHTML=(tot?`Favorite trail today: <b>${fav}</b>, ${Math.round(b[fav]/tot*100)}% of ${tot} ant${tot===1?'':'s'}.`:"Nothing routed this session, so Mandu is still hungry.")
      +(s.badges.length?' New badges: '+s.badges.map(esc).join(', ')+'.':'');
    sfx.play('end');openScreen('exit');$('exitResume').focus()}
  function renderSound(){document.querySelectorAll('[data-sound]').forEach(b=>{b.textContent='Sound: '+(sfx.muted()?'off':'on')})}

  // ---- tour hooks ----
  function resetForTour(){bias={};ledger={routes:0,reroutes:0,spent:0,flag:0};mandu.resetBelly();game.reset();loopReset();
    platform='any';renderPlat();current=null;$('result').innerHTML='<p class="empty">Tour in progress…</p>';renderTrails()}

  // ---- events ----
  game.on('change',()=>{renderHeader();renderProg();renderQuests();renderLoop();mandu.refresh()});
  game.on('toast',toast);
  game.on('levelup',e=>{sfx.play('levelup');mandu.levelUp(e.name);toast('Level up! Mandu is now a '+e.name+(e.unlocked.length?'. New in the shop: '+e.unlocked.join(', '):''))});
  game.on('quest',e=>{sfx.play('quest');newQ=e.next;clearTimeout(clearNewQ);clearNewQ=setTimeout(()=>{newQ=null},700);flagProgress()});
  game.on('badge',()=>{sfx.play('badge');flagProgress()});
  R.SAMPLES.forEach(x=>{const b=document.createElement('button');b.textContent=x;b.onclick=()=>{$('prompt').value=x;doRoute()};$('samples').appendChild(b)});
  $('go').onclick=()=>doRoute();
  $('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))doRoute()});
  $('prompt').addEventListener('input',e=>{if(/(^|[^a-z])zot!?$/i.test(e.target.value))zot();if(e.target.value.trim())loopStep('ask')});
  let keys='';window.addEventListener('keydown',e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key.length!==1)return;keys=(keys+e.key.toLowerCase()).slice(-3);if(keys==='zot')zot()});
  $('zot').onclick=zot;$('pet').onclick=()=>{sfx.play('pet');mandu.pet()};$('nap').onclick=()=>{sfx.play('nap');mandu.nap()};$('wake').onclick=()=>{sfx.play('tap');mandu.wake()};
  $('resetProg').onclick=()=>armed($('resetProg'),()=>{game.reset();toast('Progress reset')});
  $('wMax').onclick=()=>{if(term.classList.contains('min'))setMin(false);setMax(!term.classList.contains('max'))};
  $('wMin').onclick=()=>setMin(!term.classList.contains('min'));
  $('wQuit').onclick=showExit;$('endBtn').onclick=showExit;
  shadeEl.onclick=()=>setMax(false);
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(screenOpen==='exit')closeScreen();else if(term.classList.contains('max'))setMax(false)});
  $('tourBtn').onclick=()=>A.tour.run({stopMandu:()=>mandu.stop(),resetForTour,doRoute,showTab,clickPlat,game});
  $('tourStop').onclick=()=>A.tour.stop();
  document.querySelectorAll('[data-sound]').forEach(b=>b.onclick=()=>{sfx.setMuted(!sfx.muted());renderSound();sfx.play('tap')});
  $('launchStart').onclick=()=>{game.startSession();sfx.play('start');screenMandu.wake();setTimeout(closeScreen,reduce?0:450)};
  $('launchTour').onclick=()=>{closeScreen();$('tourBtn').click()};
  $('launchNew').onclick=()=>armed($('launchNew'),()=>{game.reset();resetTrails();loopReset();showLaunch()});
  $('exitResume').onclick=()=>{sfx.play('tap');closeScreen()};
  $('exitBack').onclick=()=>{sfx.play('tap');showLaunch()};

  // ---- first paint ----
  const saved=S.get('tab','route');
  showTab(TABS.includes(saved)?saved:'route');
  renderPlat();renderHeader();renderProg();renderQuests();renderLoop();renderTrails();renderSound();
  // The extension popup and the reload after the tour skip the title screen.
  let skipLaunch=POPUP;try{if(sessionStorage.getItem('antrouter-skip-launch')){sessionStorage.removeItem('antrouter-skip-launch');skipLaunch=true}}catch(e){}
  if(!skipLaunch)showLaunch();
})(globalThis.AntRouter = globalThis.AntRouter || {});
