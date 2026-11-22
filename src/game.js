// Progress: XP, crumbs, levels, quests, badges and the gear shop. No page access: the page listens to events.
(function (A) {
  // Each level unlocks something that changes how routing works, not just a hat.
  // Thresholds and prices were raised after Playtest 3 (Lv4 by route 9, the whole shop by route 8). A player who decides
  // every loop now reaches Lv4 around route 17 and can afford the whole shop around route 28 (tests/game.test.js).
  const LEVELS=[{n:'Pup',xp:0},
   {n:'Forager',xp:120,feature:'scores',unlock:'Score bars: see every model\'s score on each pick'},
   {n:'Tracker',xp:320,feature:'closecall',unlock:'Close-call alerts: on close calls Mandu shows the runner-up and why, for free'},
   {n:'Trailblazer',xp:600,feature:'dials',unlock:'Priority dials: tell Mandu how much you care about quality, speed and cost'}];
  // slot: items in the same slot replace each other when worn (one scene at a time; one thing on the head).
  const SHOP=[
   {id:'bow',name:'Tail bow',ico:'>@<',cost:10,lvl:1,desc:'A pink bow where the tail meets the rump.'},
   {id:'hat',name:'Party hat',ico:'/\\',cost:20,lvl:1,slot:'head',desc:'Striped cone hat with a gold pompom.'},
   {id:'bandana',name:'UCI bandana',ico:'===',cost:30,lvl:2,desc:'Blue-and-gold neck bandana. Zot!'},
   {id:'night',name:'Night sky',ico:'.*.',cost:80,lvl:2,slot:'scene',desc:'A scene: twinkling stars and a crescent moon behind Mandu.'},
   {id:'shades',name:'Cool shades',ico:'█-█',cost:40,lvl:3,desc:'For routing in style.'},
   {id:'desert',name:'Desert ant hill',ico:'/^\\',cost:110,lvl:3,slot:'scene',desc:'A scene: dunes, a cactus and an ant hill on the horizon.'},
   {id:'gold',name:'Golden trail',ico:'ж ж',cost:60,lvl:4,desc:'Idle ants glitter gold.'},
   {id:'campus',name:'UCI campus',ico:'▐█▌',cost:140,lvl:4,slot:'scene',desc:'A scene: a blue-and-gold campus skyline with lit windows.'},
   {id:'grad',name:'Graduation cap',ico:'=▀=',cost:150,lvl:4,slot:'head',desc:'A mortarboard with a gold tassel, for a Trailblazer.'}];
  const BADGES=[{id:'first',n:'First trail'},{id:'reroute',n:'Changed my mind'},{id:'good',n:'Good nose'},{id:'tri',n:'Tri-colony'},{id:'zot',n:'Zot!'},{id:'full',n:'Full belly'},{id:'dress',n:'Dressed up'}];
  const QUESTS={r3:{t:'Route 3 prompts',type:'route',goal:3,rw:8},rr1:{t:'Reroute a pick you disagree with',type:'reroute',goal:1,rw:6},
   g1:{t:'Mark a Good route',type:'good',goal:1,rw:5},p1:{t:'Route inside one app (pick Claude, ChatGPT or Gemini first)',type:'plat',goal:1,rw:6},
   c1:{t:'Route a coding prompt',type:'code',goal:1,rw:5},f3:{t:'Feed Mandu ants from all 3 families',type:'fam',goal:3,rw:10},
   s1:{t:'Buy or put on gear in the shop',type:'gear',goal:1,rw:5},z1:{t:'Make Mandu cheer: type zot',type:'zot',goal:1,rw:3},
   r5:{t:'Route 5 more prompts',type:'route',goal:5,rw:12},o1:{t:'Open a pick in its app',type:'open',goal:1,rw:5},
   x1:{t:'Spend crumbs on a second opinion or on forgetting a trail',type:'spend',goal:1,rw:4}};
  const QORDER=['g1','o1','f3','s1','x1','c1','z1','r5','rr1','p1','r3'];
  // econ 2 = the doubled level thresholds. Older saves double their XP once on load, so nobody loses a level.
  function freshProg(){return{econ:2,xp:0,crumbs:0,owned:[],worn:{},badges:[],fams:[],routes:0,quests:[{id:'r3',n:0},{id:'rr1',n:0},{id:'p1',n:0}],qdone:0,laps:0}}
  const migrate=v=>{if(!v.econ){v.xp=(+v.xp||0)*2;v.econ=2}return v};
  const lvlIndex=xp=>{let i=0;LEVELS.forEach((l,k)=>{if(xp>=l.xp)i=k});return i};

  function createGame(store){
    const load=()=>{const v=store.get('prog',null);return v&&typeof v==='object'?Object.assign(freshProg(),migrate(v)):freshProg()};
    let prog=load();
    const ls={};
    const on=(ev,fn)=>{(ls[ev]=ls[ev]||[]).push(fn)};
    const emit=(ev,data)=>{(ls[ev]||[]).forEach(fn=>fn(data))};
    // This session: feeds the recap on the exit screen. It is saved, so a reload or a closed popup carries on the
    // same session (Playtest 3); it ends after 30 idle minutes or when the player goes back to the title.
    const IDLE=30*60*1000;
    const snap=now=>({at:now||Date.now(),xp:prog.xp,level:lvlIndex(prog.xp),badges:prog.badges.slice(),laps:prog.laps,routes:0,reroutes:0,goods:0,earned:0,spent:0,belly:{Claude:0,GPT:0,Gemini:0}});
    let session=snap();
    const keepSession=()=>{session.last=Date.now();store.set('session',session)};
    function startSession(now){session=snap(now);keepSession()}
    // Picks up the saved session if it was active in the last 30 minutes, otherwise starts a new one.
    function resumeSession(now){now=now||Date.now();const s=store.get('session',null);
      if(s&&typeof s==='object'&&s.belly&&now-(s.last||s.at)<IDLE){session=s;return true}
      startSession(now);return false}
    function endSession(){store.set('session',null);session=snap()}
    function sessionSummary(now){const s=session;
      return{ms:(now||Date.now())-s.at,routes:s.routes,reroutes:s.reroutes,goods:s.goods,laps:prog.laps-s.laps,xp:prog.xp-s.xp,earned:s.earned,spent:s.spent,
        levelFrom:LEVELS[s.level].n,levelTo:LEVELS[lvlIndex(prog.xp)].n,badges:prog.badges.filter(b=>!s.badges.includes(b)).map(id=>BADGES.find(x=>x.id===id).n),belly:{...s.belly}}}
    function save(){store.set('prog',prog);keepSession();emit('change')}
    function levelInfo(){const i=lvlIndex(prog.xp),L0=LEVELS[i],L1=LEVELS[i+1]||null;return{index:i,name:L0.n,xp:prog.xp,next:L1,progress:L1?(prog.xp-L0.xp)/(L1.xp-L0.xp):1}}
    function award(xp,cr){const before=lvlIndex(prog.xp);prog.xp+=xp;prog.crumbs+=cr;session.earned+=cr;const after=lvlIndex(prog.xp);save();
      if(after>before)emit('levelup',{name:LEVELS[after].n,feature:LEVELS[after].unlock||'',unlocked:SHOP.filter(s=>s.lvl===after+1).map(s=>s.name)})}
    const has=feature=>LEVELS.findIndex(l=>l.feature===feature)<=lvlIndex(prog.xp);
    function badge(id){if(prog.badges.includes(id))return;prog.badges.push(id);const b=BADGES.find(x=>x.id===id);award(15,10);emit('toast','Badge: '+b.n+'  +10 crumbs');emit('badge',id)}
    function quest(type,amt,absolute){let changed=false;
      prog.quests.forEach((q,i)=>{const Q=QUESTS[q.id];if(!Q||Q.type!==type)return;const before=q.n;q.n=absolute?Math.max(q.n,amt):q.n+(amt||1);if(q.n!==before)changed=true;
        if(q.n>=Q.goal){prog.qdone++;award(5,Q.rw);emit('toast','Quest done: '+Q.t+'  +'+Q.rw+' crumbs');
          const active=prog.quests.map(x=>x.id);const next=QORDER.find(id=>!active.includes(id)&&id!==q.id&&!(QUESTS[id].type==='fam'&&prog.fams.length>=3))||'r5';
          prog.quests[i]={id:next,n:QUESTS[next].type==='fam'?prog.fams.length:0};emit('quest',{done:q.id,next})}});
      if(changed)save()}
    const addFam=f=>{if(!prog.fams.includes(f))prog.fams.push(f)};
    // XP rewards decisions (Good route, steering, trying the pick, finishing a loop) more than routing volume.
    function routed(fam,ctx){prog.routes++;session.routes++;session.belly[fam]++;addFam(fam);award(4,3);
      quest('route');if(ctx.platform!=='any')quest('plat');if(ctx.task==='code')quest('code');quest('fam',prog.fams.length,true);
      badge('first');if(prog.fams.length>=3)badge('tri');if(prog.routes>=9)badge('full')}
    // Only the first reroute of a result pays, so flipping between chips can't farm XP.
    function rerouted(fam,o){o=o||{};addFam(fam);if(o.from&&session.belly[o.from]>0)session.belly[o.from]--;session.belly[fam]++;
      if(o.first!==false){session.reroutes++;award(10,3);quest('reroute');badge('reroute')}
      quest('fam',prog.fams.length,true);if(prog.fams.length>=3)badge('tri');keepSession()}
    function ratedGood(){session.goods++;award(10,4);quest('good');badge('good')}
    function opened(){award(5,2);quest('open')}
    function spend(cost){if(prog.crumbs<cost)return false;prog.crumbs-=cost;session.spent+=cost;save();quest('spend');return true}
    function zotted(){quest('zot');badge('zot')}
    function canBuy(id){const it=SHOP.find(x=>x.id===id);return!!it&&!prog.owned.includes(id)&&lvlIndex(prog.xp)+1>=it.lvl&&prog.crumbs>=it.cost}
    function buy(id){const it=SHOP.find(x=>x.id===id);if(!canBuy(id))return false;
      prog.crumbs-=it.cost;session.spent+=it.cost;prog.owned.push(id);wearOnly(it);save();quest('gear');badge('dress');return true}
    // Wearing an item takes off anything else in its slot.
    function wearOnly(it){if(it.slot)SHOP.forEach(o=>{if(o.slot===it.slot&&o.id!==it.id)prog.worn[o.id]=false});prog.worn[it.id]=true}
    function toggleWear(id){if(!prog.owned.includes(id))return false;if(prog.worn[id])prog.worn[id]=false;else wearOnly(SHOP.find(x=>x.id===id));save();quest('gear');return prog.worn[id]}
    const wearing=id=>!!prog.worn[id];
    function addLap(){prog.laps++;award(5,3)}
    function reset(){prog=freshProg();session=snap();save()}
    function reload(){prog=load();resumeSession();emit('change')}
    return{on,state:()=>prog,levelInfo,has,wearing,routed,rerouted,ratedGood,opened,spend,zotted,canBuy,buy,toggleWear,addLap,reset,reload,startSession,resumeSession,endSession,sessionSummary};
  }
  A.game={createGame,LEVELS,SHOP,BADGES,QUESTS};
})(globalThis.AntRouter = globalThis.AntRouter || {});
