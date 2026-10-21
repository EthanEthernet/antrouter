// Progress: XP, crumbs, levels, quests, badges and the gear shop. No page access: the page listens to events.
(function (A) {
  const LEVELS=[{n:'Pup',xp:0},{n:'Forager',xp:40},{n:'Tracker',xp:100},{n:'Trailblazer',xp:180}];
  const SHOP=[
   {id:'bow',name:'Tail bow',ico:'>@<',cost:10,lvl:1,desc:'A pink bow where the tail meets the rump.'},
   {id:'hat',name:'Party hat',ico:'/\\',cost:20,lvl:1,desc:'Striped cone hat with a gold pompom.'},
   {id:'bandana',name:'UCI bandana',ico:'===',cost:30,lvl:2,desc:'Blue-and-gold neck bandana. Zot!'},
   {id:'shades',name:'Cool shades',ico:'█-█',cost:40,lvl:3,desc:'For routing in style.'},
   {id:'gold',name:'Golden trail',ico:'ж ж',cost:60,lvl:4,desc:'Idle ants glitter gold.'}];
  const BADGES=[{id:'first',n:'First trail'},{id:'reroute',n:'Second opinion'},{id:'good',n:'Good nose'},{id:'tri',n:'Tri-colony'},{id:'zot',n:'Zot!'},{id:'full',n:'Full belly'},{id:'dress',n:'Dressed up'}];
  const QUESTS={r3:{t:'Route 3 prompts',type:'route',goal:3,rw:8},rr1:{t:'Reroute a pick you disagree with',type:'reroute',goal:1,rw:6},
   g1:{t:'Mark a Good route',type:'good',goal:1,rw:5},p1:{t:'Route inside one app (pick Claude, ChatGPT or Gemini first)',type:'plat',goal:1,rw:6},
   c1:{t:'Route a coding prompt',type:'code',goal:1,rw:5},f3:{t:'Feed Mandu ants from all 3 families',type:'fam',goal:3,rw:10},
   s1:{t:'Buy or put on gear in the shop',type:'gear',goal:1,rw:5},z1:{t:'Make Mandu cheer: type zot',type:'zot',goal:1,rw:3},
   r5:{t:'Route 5 more prompts',type:'route',goal:5,rw:12}};
  const QORDER=['g1','f3','s1','c1','z1','r5','rr1','p1','r3'];
  function freshProg(){return{xp:0,crumbs:0,owned:[],worn:{},badges:[],fams:[],routes:0,quests:[{id:'r3',n:0},{id:'rr1',n:0},{id:'p1',n:0}],qdone:0,laps:0}}
  const lvlIndex=xp=>{let i=0;LEVELS.forEach((l,k)=>{if(xp>=l.xp)i=k});return i};

  function createGame(store){
    let prog=(()=>{const v=store.get('prog',null);return v&&typeof v==='object'?Object.assign(freshProg(),v):freshProg()})();
    const ls={};
    const on=(ev,fn)=>{(ls[ev]=ls[ev]||[]).push(fn)};
    const emit=(ev,data)=>{(ls[ev]||[]).forEach(fn=>fn(data))};
    function save(){store.set('prog',prog);emit('change')}
    function levelInfo(){const i=lvlIndex(prog.xp),L0=LEVELS[i],L1=LEVELS[i+1]||null;return{index:i,name:L0.n,xp:prog.xp,next:L1,progress:L1?(prog.xp-L0.xp)/(L1.xp-L0.xp):1}}
    function award(xp,cr){const before=lvlIndex(prog.xp);prog.xp+=xp;prog.crumbs+=cr;const after=lvlIndex(prog.xp);save();
      if(after>before)emit('levelup',{name:LEVELS[after].n,unlocked:SHOP.filter(s=>s.lvl===after+1).map(s=>s.name)})}
    function badge(id){if(prog.badges.includes(id))return;prog.badges.push(id);const b=BADGES.find(x=>x.id===id);award(15,10);emit('toast','Badge: '+b.n+'  +10 crumbs');emit('badge',id)}
    function quest(type,amt,absolute){let changed=false;
      prog.quests.forEach((q,i)=>{const Q=QUESTS[q.id];if(!Q||Q.type!==type)return;const before=q.n;q.n=absolute?Math.max(q.n,amt):q.n+(amt||1);if(q.n!==before)changed=true;
        if(q.n>=Q.goal){prog.qdone++;award(5,Q.rw);emit('toast','Quest done: '+Q.t+'  +'+Q.rw+' crumbs');
          const active=prog.quests.map(x=>x.id);const next=QORDER.find(id=>!active.includes(id)&&id!==q.id&&!(QUESTS[id].type==='fam'&&prog.fams.length>=3))||'r5';
          prog.quests[i]={id:next,n:QUESTS[next].type==='fam'?prog.fams.length:0};emit('quest',{done:q.id,next})}});
      if(changed)save()}
    const addFam=f=>{if(!prog.fams.includes(f))prog.fams.push(f)};
    function routed(fam,ctx){prog.routes++;addFam(fam);award(10,5);
      quest('route');if(ctx.platform!=='any')quest('plat');if(ctx.task==='code')quest('code');quest('fam',prog.fams.length,true);
      badge('first');if(prog.fams.length>=3)badge('tri');if(prog.routes>=9)badge('full')}
    function rerouted(fam){addFam(fam);award(5,2);quest('reroute');quest('fam',prog.fams.length,true);badge('reroute');if(prog.fams.length>=3)badge('tri')}
    function ratedGood(){award(5,3);quest('good');badge('good')}
    function zotted(){quest('zot');badge('zot')}
    function buy(id){const it=SHOP.find(x=>x.id===id);if(!it||prog.owned.includes(id)||lvlIndex(prog.xp)+1<it.lvl||prog.crumbs<it.cost)return false;
      prog.crumbs-=it.cost;prog.owned.push(id);prog.worn[id]=true;save();quest('gear');badge('dress');return true}
    function toggleWear(id){if(!prog.owned.includes(id))return false;prog.worn[id]=!prog.worn[id];save();quest('gear');return prog.worn[id]}
    const wearing=id=>!!prog.worn[id];
    function addLap(){prog.laps++;save()}
    function reset(){prog=freshProg();save()}
    return{on,state:()=>prog,levelInfo,wearing,routed,rerouted,ratedGood,zotted,buy,toggleWear,addLap,reset};
  }
  A.game={createGame,LEVELS,SHOP,BADGES,QUESTS};
})(globalThis.AntRouter = globalThis.AntRouter || {});
