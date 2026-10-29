// Page wiring: chat box, tabs, result card, trails, progress, shop, toasts, settings and the terminal buttons.
// The logic lives in the modules this file connects; this is the only file that knows the page layout.
(function (A) {
  const {MODELS,PLATFORMS,FAMILIES,FAMILY_COLORS}=A.models;
  const R=A.router, S=A.storage;
  const $=id=>document.getElementById(id);
  const UBLUE='#2F8FE0', UGOLD='#FFD200';
  const POPUP=new URLSearchParams(location.search).has('popup')||location.protocol==='chrome-extension:';
  if(POPUP)document.documentElement.classList.add('popup');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SECOND_COST=6, FORGET_COST=5;

  const game=A.game.createGame(S), sfx=A.audio.createAudio(S);
  let bias, ledger, platform;
  // Trails saved before learning was split by difficulty are dropped once.
  function loadState(){const raw=S.get('bias',{});bias=R.migrateBias(raw);if(Object.keys(raw).length!==Object.keys(bias).length)S.set('bias',bias);
    ledger=S.get('ledger',{routes:0,reroutes:0,spent:0,flag:0});
    platform=S.get('platform','any');if(!PLATFORMS.some(p=>p.id===platform))platform='any'}
  loadState();
  let current=null, newQ=null, clearNewQ, routeLock=0;
  // Settings: Calm mode (still Mandu, fewer pop-ups and sounds, no zot shortcut) and the zot shortcut itself.
  let calm=!!S.get('calm',false), zotOn=S.get('zot',true)!==false;
  document.documentElement.classList.toggle('calm',calm);
  const CALM_SOUNDS=['levelup','lap','nope','start','end'];
  const play=name=>{if(calm&&!CALM_SOUNDS.includes(name))return;sfx.play(name)};
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
  const mandu=A.mandu.createMandu({screen:$('screen'),status:$('status'),reduce,calm,store:S,maxFont:POPUP?5:13,getWorn,getHud,
    // Good route or a reroute already lit Steer, Learn and Reward, so the landing shouldn't jump the strip back to Reveal
    onLanded:()=>{play('gulp');explainLanding();if(current&&current.rated)return;loopStep('reveal');setTimeout(()=>loopStep('reward'),900)},
    onBellyChange:()=>renderTrails()});
  // Mandu's status line says how sure the pick was, so his reaction carries the result, not just decoration.
  function explainLanding(){if(!current)return;const name=current.chosen.name.toLowerCase(),c=current.d.confidence;
    if(current.rerouted)return mandu.setStatus('okay, '+name+' it is. trail updated');
    const run=current.d.order.find(m=>m.id!==current.chosen.id);
    mandu.setStatus(c.level==='close'&&run?'found '+name+', but it was a close call with '+run.name.toLowerCase():'found '+name+': a '+(c.level==='clear'?'clear':'likely')+' pick')}

  // ---- tabs ----
  function showTab(id,focus){
    TABS.forEach(t=>{const on=t===id,b=$('tab-'+t);b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;$('panel-'+t).hidden=!on;if(on){b.classList.remove('has-news');if(t==='progress')b.removeAttribute('aria-label')}});
    S.set('tab',id);if(focus)$('tab-'+id).focus()}
  TABS.forEach((t,i)=>{const b=$('tab-'+t);b.onclick=()=>showTab(t);
    b.onkeydown=e=>{const n=TABS.length,j=e.key==='ArrowRight'?(i+1)%n:e.key==='ArrowLeft'?(i+n-1)%n:e.key==='Home'?0:e.key==='End'?n-1:-1;if(j>=0){e.preventDefault();showTab(TABS[j],true)}}});
  function flagProgress(){if($('tab-progress').getAttribute('aria-selected')!=='true'){$('tab-progress').classList.add('has-news');$('tab-progress').setAttribute('aria-label','Progress (new)')}}

  // ---- chat ----
  function renderPlat(){const box=$('plat');box.querySelectorAll('button').forEach(b=>b.remove());
    PLATFORMS.forEach(pl=>{const b=document.createElement('button');b.textContent=pl.label;b.setAttribute('aria-pressed',platform===pl.id);b.onclick=()=>{platform=pl.id;S.set('platform',platform);renderPlat();mandu.setStatus(pl.fam?'working inside '+pl.label:'free to roam any app')};box.appendChild(b)})}
  function clickPlat(label){[...$('plat').querySelectorAll('button')].find(b=>b.textContent===label)?.click()}
  function zot(){if(screenOpen)return;play('zot');mandu.zot();game.zotted()}
  const zotShortcut=()=>zotOn&&!calm;
  // Priority dials (Trailblazer unlock): 0-10 each, turned into router weights.
  let dials=S.get('dials',{Q:6,S:2,C:2});
  function weights(){if(!game.has('dials'))return null;const t=dials.Q+dials.S+dials.C;return t?{Q:dials.Q/t,S:dials.S/t,C:dials.C/t}:null}
  function doRoute(){
    const text=$('prompt').value.trim();
    if(!text){showTab('route');$('result').innerHTML='<p class="empty">Type a prompt or tap a sample first.</p>';play('nope');return}
    // One prompt at a time: Mandu has to finish the trail before the next route counts.
    if(mandu.busy()||Date.now()<routeLock){mandu.setStatus('still on the trail, one prompt at a time');play('nope');return}
    routeLock=Date.now()+600;
    const d=R.decide(text,platform,bias,weights());
    current={text,d,chosen:d.order[0],original:d.order[0],rerouted:false,rated:false,second:false,opened:false};
    ledger.routes++;ledger.spent+=current.chosen.cost;ledger.flag+=30;S.set('ledger',ledger);
    mandu.routeTo(current.chosen);mandu.queueEat(current.chosen.fam);play('route');
    showTab('route');renderResult();renderTrails();
    loopStep('ask');loopStep('route');if(reduce){loopStep('reveal');loopStep('reward');explainLanding()}
    game.routed(current.chosen.fam,{platform,task:d.task});
  }
  function reroute(id){
    if(!current||current.chosen.id===id||!R.allowedModels(platform).some(m=>m.id===id))return;
    const m=MODELS.find(x=>x.id===id),key=current.d.key,first=!current.rerouted,from=current.chosen.fam;
    // Learn from the final choice only: put this trail back as it was before this result, then apply it.
    if(first)current.biasBefore=JSON.parse(JSON.stringify(bias[key]||{}));
    bias[key]=JSON.parse(JSON.stringify(current.biasBefore));
    if(id!==current.original.id){R.nudge(bias,key,id,0.08);R.nudge(bias,key,current.original.id,-0.04)}
    S.set('bias',bias);
    ledger.reroutes++;ledger.spent+=m.cost-current.chosen.cost;S.set('ledger',ledger);
    mandu.queueEat(m.fam,from);
    current.chosen=m;current.rerouted=true;current.rated=true;
    mandu.puzzle(m);renderResult();renderTrails();play('hmm');
    loopDone.add('reveal');loopStep('steer');setTimeout(()=>loopStep('learn'),700);setTimeout(()=>loopStep('reward'),1400);
    game.rerouted(m.fam,{first,from});
  }
  function good(){R.nudge(bias,current.d.key,current.chosen.id,0.03);S.set('bias',bias);current.rated=true;mandu.pet();renderResult();renderTrails();play('good');
    loopDone.add('reveal');loopStep('steer');setTimeout(()=>loopStep('learn'),700);setTimeout(()=>loopStep('reward'),1400);game.ratedGood()}
  function secondOpinion(){if(!current||current.second||!game.spend(SECOND_COST))return;current.second=true;play('coin');renderResult()}
  function opened(){if(!current||current.opened)return;current.opened=true;game.opened()}
  function copyPrompt(){const txt=current.text;let ok=false;try{const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');ta.remove()}catch(e){}try{navigator.clipboard&&navigator.clipboard.writeText(txt).then(()=>{},()=>{})}catch(e){}const n=$('copyNote');if(n)n.textContent=ok?'Prompt copied. Paste it into Gemini with Ctrl/Cmd+V.':'Copy the prompt from the box above, then paste it into Gemini.'}
  function renderResult(){if(!current)return;
    $('result').innerHTML=A.result.resultHTML(current,platform,{scores:game.has('scores'),closecall:game.has('closecall'),secondCost:SECOND_COST,crumbs:game.state().crumbs});
    A.result.bindResult($('result'),current,{onReroute:reroute,onGood:good,onCopy:copyPrompt,onSecond:secondOpinion,onOpen:opened})}

  // ---- trails tab ----
  function renderTrails(){
    const b=mandu.belly(),total=FAMILIES.reduce((a,f)=>a+b[f],0);
    $('bellySplit').innerHTML=total?FAMILIES.map(f=>`<span class="pill" style="--c:${FAMILY_COLORS[f]}"><span class="sw" style="background:${FAMILY_COLORS[f]}"></span>${f} ${Math.round(b[f]/total*100)}%</span>`).join('')+`<span class="meta">${total} routed</span>`:'<span class="meta">Belly empty: route a prompt to feed Mandu.</span>';
    const items=[];for(const k in bias)for(const id in bias[k]){const v=bias[k][id];if(Math.abs(v)>0.001)items.push({k,id,v})}
    items.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
    const cr=game.state().crumbs;
    $('learned').innerHTML=(items.length?items.slice(0,8).map(i=>{const m=MODELS.find(x=>x.id===i.id);
      return `<div class="trail"><span class="sw" style="background:${m.color}"></span><span>${R.trailLabel(i.k)}: ${i.v>0?'stronger trail to':'weaker trail to'} ${m.name} (${i.v>0?'+':''}${Math.round(i.v*100)})</span><button data-forget="${i.k}|${i.id}"${cr<FORGET_COST?' disabled title="Not enough crumbs yet"':''}>Forget · ${FORGET_COST} crumbs</button></div>`}).join(''):'Nothing learned yet. Tap a different model on a result to reroute, and the trail to it gets stronger.')
      +(items.length||total?'<button id="resetT" style="margin-top:10px;padding:7px 12px;font-size:13px">Reset all trails and belly (free)</button>':'');
    $('learned').querySelectorAll('[data-forget]').forEach(btn=>btn.onclick=()=>{const [k,id]=btn.dataset.forget.split('|');if(!game.spend(FORGET_COST))return;
      delete bias[k][id];if(!Object.keys(bias[k]).length)delete bias[k];S.set('bias',bias);play('coin');toast('Forgot that trail.',true);renderTrails()});
    const r=$('resetT');if(r)r.onclick=()=>armed(r,resetTrails);
  }
  function resetTrails(){bias={};ledger={routes:0,reroutes:0,spent:0,flag:0};S.set('bias',bias);S.set('ledger',ledger);mandu.resetBelly();renderTrails()}
  // Destructive buttons need a second click within 3 seconds.
  function armed(btn,fn){if(btn.dataset.armed){delete btn.dataset.armed;clearTimeout(btn._t);btn.textContent=btn._label;fn();return}
    btn._label=btn.textContent;btn.dataset.armed='1';btn.textContent='Click again to confirm';play('nope');
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
      if(!lapCounted&&['route','reveal','steer'].every(s=>loopDone.has(s))){lapCounted=true;hint=HINTS.lap;game.addLap();play('lap');toast('Loop complete!  +3 crumbs')}
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
    $('unlocks').innerHTML=LEVELS.filter(L=>L.unlock).map((L,i)=>`<li class="${game.has(L.feature)?'on':''}">${game.has(L.feature)?'✓':'🔒'} <b>Lv${i+2} ${L.n}:</b> ${esc(L.unlock)}</li>`).join('');
    $('crumbs').textContent=p.crumbs+' crumbs';
    $('badges').innerHTML=BADGES.map(b=>`<span class="badge${p.badges.includes(b.id)?' on':''}">${p.badges.includes(b.id)?'★ ':'☆ '}${b.n}</span>`).join('');
    $('shop').innerHTML=SHOP.map(it=>{const own=p.owned.includes(it.id),locked=li+1<it.lvl,afford=p.crumbs>=it.cost;
      const btn=own?`<button data-wear="${it.id}">${game.wearing(it.id)?'Take off':'Wear'}</button>`:locked?`<button disabled>Unlocks at Lv${it.lvl} ${LEVELS[it.lvl-1].n}</button>`:`<button data-buy="${it.id}" ${afford?'':'disabled'}>Buy for ${it.cost} crumbs</button>`;
      return `<div class="item${game.wearing(it.id)?' worn':''}"><div class="ico" style="color:${it.id==='bandana'?UBLUE:it.id==='gold'?UGOLD:it.id==='shades'?'#8B96AE':'#FF6FA3'}">${esc(it.ico)}</div><b>${it.name}</b><span class="meta">${it.desc}</span>${btn}</div>`}).join('');
    $('shop').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const it=SHOP.find(x=>x.id===b.dataset.buy);if(!game.canBuy(it.id))return;
      // toast first so a badge earned by the purchase shows on top of it
      toast('Bought '+it.name+'! Mandu is wearing it.',true);game.buy(it.id);play('coin');mandu.pet();loopStep('customize')});
    $('shop').querySelectorAll('[data-wear]').forEach(b=>b.onclick=()=>{const on=game.toggleWear(b.dataset.wear);loopStep('customize');if(on)mandu.pet()});
    renderDials();
  }
  function renderDials(){const on=game.has('dials');$('dials').hidden=!on;if(!on)return;
    ['Q','S','C'].forEach(k=>{$('dial'+k).value=dials[k];$('dial'+k+'Out').textContent=dials[k]})}
  ['Q','S','C'].forEach(k=>{$('dial'+k).oninput=e=>{dials[k]=+e.target.value;S.set('dials',dials);$('dial'+k+'Out').textContent=dials[k]}});
  // In Calm mode only toasts the player caused directly (important) show; quest and badge news waits in the Progress tab.
  function toast(msg,important){if(calm&&!important)return;const el=$('toast');el.textContent=msg;el.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('on'),2600)}

  // ---- terminal window buttons ----
  const term=$('term'), shadeEl=$('shade');
  function setMax(on){term.classList.toggle('max',on);shadeEl.classList.toggle('on',on);$('wMax').setAttribute('aria-label',on?'Restore size':'Expand');$('wMax').title=on?'Restore':'Expand';$('wMax').textContent=on?'−':'+';mandu.fit()}
  function setMin(on){term.classList.toggle('min',on);if(on){setMax(false);mandu.stop();mandu.setStatus('minimized (click yellow to restore)')}else{mandu.start();mandu.idleStatus()}}
  // The red light hides Mandu; the session keeps going. End session is the way out.
  function setAway(on,quiet){$('side').classList.toggle('away',on);S.set('away',on);if(on){setMax(false);mandu.stop();if(!quiet)$('wBack').focus()}else{if(!term.classList.contains('min'))mandu.start();mandu.fit();$('wQuit').focus()}}

  // ---- launch and exit screens ----
  // Both are modal: the page behind is inert, Tab stays inside, and the main Mandu pauses. Each screen gets a fresh Mandu so it shows today's belly and gear.
  const wrap=document.querySelector('.wrap');
  let screenOpen=null, screenMandu=null;
  function openScreen(id){
    if(screenMandu)screenMandu.stop();
    const old=$(id).querySelector('.screen-term pre'),pre=document.createElement('pre');pre.setAttribute('aria-hidden','true');old.replaceWith(pre);
    ['launch','exit'].forEach(s=>{$(s).hidden=s!==id});wrap.inert=true;screenOpen=id;
    setMax(false);mandu.stop();
    screenMandu=A.mandu.createMandu({screen:pre,status:{textContent:''},reduce,calm,store:S,maxFont:POPUP?4:8,getWorn,getHud});
    screenMandu.nap();
  }
  function closeScreen(){if(screenMandu)screenMandu.stop();['launch','exit'].forEach(s=>{$(s).hidden=true});wrap.inert=false;screenOpen=null;
    if(!term.classList.contains('min')&&!$('side').classList.contains('away'))mandu.start();mandu.fit()}
  document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!screenOpen)return;
    const f=[...$(screenOpen).querySelectorAll('button:not([hidden]):not([disabled]),a[href]')].filter(x=>x.offsetParent!==null);if(!f.length)return;
    const i=f.indexOf(document.activeElement);
    if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&(i===-1||i===f.length-1)){e.preventDefault();f[0].focus()}});
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
    play('end');music.pause();openScreen('exit');$('exitResume').focus()}

  // ---- sound and music ----
  function renderSound(){document.querySelectorAll('[data-sound]').forEach(b=>{b.textContent='Effects: '+(sfx.muted()?'off':'on')})}
  // Background music ("Carefree" by Kevin MacLeod, CC BY 4.0). Off by default; the choice and volume are saved and Start resumes it.
  const music=$('bgMusic');
  let musicOn=!!S.get('music',false), musicVol=+S.get('musicVol',0.2)||0.2;music.volume=musicVol;
  function renderMusic(){document.querySelectorAll('[data-music]').forEach(b=>{b.textContent='Music: '+(musicOn?'on':'off');b.setAttribute('aria-pressed',musicOn)})}
  function playMusic(){if(!musicOn)return;music.play().catch(()=>{musicOn=false;renderMusic();toast("Music couldn't start. Check that Carefree.mp3 sits next to index.html.",true)})}
  function setMusicOn(on){musicOn=on;S.set('music',musicOn);renderMusic();if(musicOn)playMusic();else music.pause()}

  // ---- settings dialog ----
  const dlg=$('settings');
  function syncSettings(){$('setCalm').checked=calm;$('setZot').checked=zotOn;$('setZot').disabled=calm;
    const mv=musicOn?Math.round(musicVol*100):0,sv=sfx.muted()?0:Math.round(sfx.volume()*100);
    $('setMusic').value=mv;$('setMusicOut').textContent=mv?mv+'%':'off';$('setSfx').value=sv;$('setSfxOut').textContent=sv?sv+'%':'off'}
  function setCalm(on){calm=on;S.set('calm',calm);document.documentElement.classList.toggle('calm',calm);mandu.setCalm(calm);if(screenMandu)screenMandu.setCalm(calm);syncSettings()}
  $('settingsBtn').onclick=()=>{syncSettings();$('saveNote').textContent='';dlg.showModal()};
  $('setCalm').onchange=e=>setCalm(e.target.checked);
  $('setZot').onchange=e=>{zotOn=e.target.checked;S.set('zot',zotOn)};
  $('setMusic').oninput=e=>{const v=+e.target.value/100;if(v>0){musicVol=v;music.volume=v;S.set('musicVol',v);if(!musicOn)setMusicOn(true)}else if(musicOn)setMusicOn(false);syncSettings()};
  $('setSfx').oninput=e=>{const v=+e.target.value/100;if(v>0){sfx.setVolume(v);if(sfx.muted())sfx.setMuted(false)}else sfx.setMuted(true);renderSound();syncSettings()};
  $('saveCopy').onclick=()=>{const code=S.exportSave();$('saveCode').value=code;$('saveCode').select();let ok=false;
    try{ok=document.execCommand('copy')}catch(e){}try{navigator.clipboard&&navigator.clipboard.writeText(code).then(()=>{},()=>{})}catch(e){}
    $('saveNote').textContent=(ok?'Copied. ':'Select the code above and copy it. ')+'Paste it into Settings on the other copy of AntRouter.'};
  $('saveLoad').onclick=()=>{if(!S.importSave($('saveCode').value)){$('saveNote').textContent="That isn't an AntRouter save code. It starts with ANTROUTER1:";play('nope');return}
    restoreAll();$('saveNote').textContent='Save loaded: Mandu is a Lv'+(game.levelInfo().index+1)+' '+game.levelInfo().name+' with '+game.state().crumbs+' crumbs.'};

  // ---- tour hooks ----
  function resetForTour(){bias={};ledger={routes:0,reroutes:0,spent:0,flag:0};mandu.resetBelly();game.reset();loopReset();
    platform='any';renderPlat();current=null;$('result').innerHTML='<p class="empty">Tour in progress…</p>';renderTrails()}
  // After the tour or loading a save code: re-read everything from storage in place, no page reload.
  function restoreAll(){loadState();game.reload();mandu.loadBelly();loopReset();current=null;
    calm=!!S.get('calm',false);zotOn=S.get('zot',true)!==false;dials=S.get('dials',{Q:6,S:2,C:2});setCalm(calm);
    $('result').innerHTML='<p class="empty">Route a prompt and Mandu will follow the trail to the best model among Claude, GPT and Gemini.</p>';
    renderPlat();renderHeader();renderProg();renderQuests();renderLoop();renderTrails();renderSound();renderMusic();showTab('route');mandu.idleStatus()}

  // ---- events ----
  game.on('change',()=>{renderHeader();renderProg();renderQuests();renderLoop();renderResult();mandu.refresh()});
  game.on('toast',m=>toast(m));
  game.on('levelup',e=>{play('levelup');mandu.levelUp(e.name);toast('Level up! Mandu is now a '+e.name+'.'+(e.feature?' Unlocked: '+e.feature.split(':')[0]+'.':'')+(e.unlocked.length?' New in the shop: '+e.unlocked.join(', '):''),true);renderTrails()});
  game.on('quest',e=>{play('quest');newQ=e.next;clearTimeout(clearNewQ);clearNewQ=setTimeout(()=>{newQ=null},700);flagProgress()});
  game.on('badge',()=>{play('badge');flagProgress()});
  R.SAMPLES.forEach(x=>{const b=document.createElement('button');b.textContent=x;b.onclick=()=>{$('prompt').value=x;doRoute()};$('samples').appendChild(b)});
  $('go').onclick=()=>doRoute();
  if(/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent))$('kbdMod').textContent='⌘';
  $('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))doRoute()});
  $('prompt').addEventListener('input',e=>{if(zotShortcut()&&/(^|[^a-z])zot!?$/i.test(e.target.value))zot();if(e.target.value.trim())loopStep('ask')});
  let keys='';window.addEventListener('keydown',e=>{if(!zotShortcut()||(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName)))return;if(e.key.length!==1)return;keys=(keys+e.key.toLowerCase()).slice(-3);if(keys==='zot')zot()});
  $('zot').onclick=zot;$('pet').onclick=()=>{play('pet');mandu.pet()};$('nap').onclick=()=>{play('nap');mandu.nap()};$('wake').onclick=()=>mandu.wake();
  $('resetProg').onclick=()=>armed($('resetProg'),()=>{game.reset();toast('Progress reset',true)});
  $('wMax').onclick=()=>{if(term.classList.contains('min'))setMin(false);setMax(!term.classList.contains('max'))};
  $('wMin').onclick=()=>setMin(!term.classList.contains('min'));
  $('wQuit').onclick=()=>setAway(true);$('wBack').onclick=()=>setAway(false);$('endBtn').onclick=showExit;
  shadeEl.onclick=()=>setMax(false);
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(screenOpen==='exit')closeScreen();else if(term.classList.contains('max'))setMax(false)});
  $('tourBtn').onclick=()=>A.tour.run({resetForTour,restoreAll,doRoute,showTab,clickPlat,game});
  $('tourStop').onclick=()=>A.tour.stop();$('tourPause').onclick=()=>A.tour.pause();$('tourNext').onclick=()=>A.tour.next();
  document.querySelectorAll('[data-sound]').forEach(b=>b.onclick=()=>{sfx.setMuted(!sfx.muted());renderSound()});
  document.querySelectorAll('[data-music]').forEach(b=>b.onclick=()=>setMusicOn(!musicOn));
  $('launchStart').onclick=()=>{game.startSession();play('start');playMusic();screenMandu.wake();setTimeout(closeScreen,reduce?0:450)};
  $('launchTour').onclick=()=>{closeScreen();$('tourBtn').click()};
  $('launchNew').onclick=()=>armed($('launchNew'),()=>{game.reset();resetTrails();loopReset();showLaunch()});
  $('exitResume').onclick=()=>{closeScreen();playMusic()};
  $('exitBack').onclick=()=>showLaunch();

  // ---- first paint ----
  const saved=S.get('tab','route');
  showTab(TABS.includes(saved)?saved:'route');
  renderPlat();renderHeader();renderProg();renderQuests();renderLoop();renderTrails();renderSound();renderMusic();
  if(S.get('away',false))setAway(true,true);
  // The extension popup skips the title screen.
  if(!POPUP)showLaunch();
})(globalThis.AntRouter = globalThis.AntRouter || {});
