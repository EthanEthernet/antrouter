// The router: reads a prompt, scores every model and explains the pick. Pure functions, no page or storage access.
(function (A) {
  const {MODELS,PLATFORMS}=A.models;
  const TASKS={
   code:{label:'code',re:/\b(code|function|bug|error|python|javascript|java|sql|api|regex|compile|refactor|debug|class|react|typescript|loop|schema|database)\b/gi},
   reason:{label:'reasoning & analysis',re:/\b(prove|why|calculate|solve|math|equation|probability|logic|plan|strategy|compare|tradeoffs?|analy[sz]e|derive|evaluate|explain)\b/gi},
   creative:{label:'creative writing',re:/\b(poems?|stor(y|ies)|lyrics|slogan|tagline|creative|character|script|essay|caption|rewrite|haikus?|limericks?|sonnets?|jokes?|songs?|verses?|rhymes?|fiction)\b/gi},
   fact:{label:'quick fact',re:/(what is|what's|who is|who was|when did|when was|where is|define|capital of|how many|meaning of)/gi},
   summarize:{label:'summarizing',re:/\b(summari[sz]e|tl;?dr|condense|key points|article|paper|pdf|document|notes|transcript)\b/gi},
   chat:{label:'everyday chat',re:/\b(hey|hi|thanks|help me|should i|advice|recommend|ideas?|feel)\b/gi}
  };
  const HARD=/\b(step by step|architecture|design|prove|edge cases?|optimi[sz]e|rigorous|in depth|detailed|tradeoffs?|multi-step|from scratch)\b/gi;
  const SAMPLES=['Fix this off-by-one bug in my Python loop',"What's the capital of Australia?",'Write a short poem about finals week at UCI','Compare fixed vs floating exchange rates for an emerging market, step by step','Summarize this 20-page article into key points','Design the database schema for a ride-share app, handle edge cases'];
  const W={Q:0.6,S:0.2,C:0.2};
  const LMAX=Math.log(30),LMIN=Math.log(0.9);

  // alt is a second task with at least half as many keyword hits: a sign the keywords disagree.
  function classify(text){
    const hits=Object.keys(TASKS).map(k=>[k,(text.match(TASKS[k].re)||[]).length]).filter(h=>h[1]>0).sort((a,b)=>b[1]-a[1]);
    const task=hits.length?hits[0][0]:text.trim().split(/\s+/).length<8?'fact':'chat';
    const alt=hits.length>1&&hits[1][1]*2>=hits[0][1]?hits[1][0]:null;
    let cx=0.25+Math.min(text.length/500,0.3)+(text.match(HARD)||[]).length*0.18;
    if(task==='fact'||task==='chat')cx-=0.1;if(task==='reason'||task==='code')cx+=0.1;
    return{task,alt,complexity:Math.max(0.1,Math.min(1,cx))};
  }
  function scoreModels(task,cx,w){w=w||W;const o={};
    MODELS.forEach(m=>{const q=w.Q*((m.q[task]-7)/3)*(0.3+0.7*cx)*2.2,s=w.S*m.speed/10,c=w.C*((LMAX-Math.log(m.cost))/(LMAX-LMIN));o[m.id]=Math.round(Math.max(0,Math.min(100,(q+s+c)*100)))});return o}
  // Trails are learned per task AND difficulty, so steering easy code prompts leaves hard ones alone.
  const BANDS=['easy','medium','hard'];
  const trailKey=(task,cx)=>task+':'+(cx<0.4?'easy':cx<0.7?'medium':'hard');
  const trailLabel=key=>{const [t,b]=key.split(':');return b+' '+TASKS[t].label};
  function applyBias(scores,key,bias){const b=(bias&&bias[key])||{},o={};MODELS.forEach(m=>{o[m.id]=Math.max(0,Math.min(100,Math.round((scores[m.id]||0)+(b[m.id]||0)*100)))});return o}
  // How sure the pick is: the gap between the top two models, and lower when the keywords pointed two ways.
  function confidence(order,final,alt){if(order.length<2)return{level:'clear',margin:100};
    const margin=final[order[0].id]-final[order[1].id];
    return{level:margin<4||(alt&&margin<8)?'close':margin<10?'likely':'clear',margin}}
  function secondOpinion(d,a,b){const L=TASKS[d.task].label;
    const edge=(x,y)=>[x.q[d.task]>y.q[d.task]&&'better at '+L,x.speed>y.speed&&'faster',x.cost<y.cost&&'cheaper'].filter(Boolean);
    const list=l=>l.length>1?l.slice(0,-1).join(', ')+' and '+l[l.length-1]:l[0];
    const forB=edge(b,a),forA=edge(a,b);
    return`${b.name} scored ${d.final[b.id]} to ${a.name}'s ${d.final[a.id]}. `+(forB.length?`It's ${list(forB)}`:'It has no clear edge here')+(forA.length?`, while ${a.name} is ${list(forA)}.`:'.')}
  function allowedModels(platformId){const f=PLATFORMS.find(x=>x.id===platformId).fam;return MODELS.filter(m=>!f||m.fam===f)}
  function rankModels(scores,platformId){return allowedModels(platformId).sort((a,b)=>scores[b.id]-scores[a.id])}
  // The reason describes the unbiased pick, exactly as the prototype did.
  function explain(c,r,platformId){
    const pl=PLATFORMS.find(x=>x.id===platformId),label=TASKS[c.task].label;
    const fam=pl.fam?MODELS.filter(m=>m.fam===pl.fam):null;
    const tier=fam?(r.cost===Math.min(...fam.map(m=>m.cost))?'fastest':r.cost===Math.max(...fam.map(m=>m.cost))?'strongest':'middle'):null;
    if(fam&&tier==='fastest')return`You're in ${pl.label} and this ${c.complexity<0.4?'simple':''} ${label} prompt doesn't need more than its fastest, cheapest tier.`.replace('  ',' ');
    if(fam&&tier==='strongest'&&c.complexity<0.4)return`You're in ${pl.label}; this ${label} prompt is simple, but ${pl.label}'s strongest tier is clearly better at it.`;
    if(fam&&tier==='strongest')return`You're in ${pl.label} and this is a ${c.complexity>=0.7?'hard':'demanding'} ${label} prompt, so it's worth ${pl.label}'s strongest tier.`;
    if(fam)return`You're in ${pl.label}; its middle tier handles this ${label} prompt well without paying for the top model.`;
    if(c.complexity<0.4&&r.cost<5)return`A simple ${label} prompt, so a fast, inexpensive model does the job.`;
    return`${r.name} is the strongest fit for ${label} at this difficulty.`;
  }
  // weights (optional) are the player's priority dials: {Q,S,C}.
  function decide(text,platformId,bias,weights){const c=classify(text),scores=scoreModels(c.task,c.complexity,weights),key=trailKey(c.task,c.complexity);
    const reason=explain(c,rankModels(scores,platformId)[0],platformId),final=applyBias(scores,key,bias),order=rankModels(final,platformId);
    return{task:c.task,alt:c.alt,complexity:c.complexity,key,scores,final,reason,order,confidence:confidence(order,final,c.alt)}}
  function nudge(bias,key,id,a){bias[key]=bias[key]||{};bias[key][id]=Math.max(-0.3,Math.min(0.4,(bias[key][id]||0)+a));return bias}
  // Trails saved before learning was split by difficulty have no ":band" and are dropped once.
  function migrateBias(bias){const o={};for(const k in bias||{})if(/^[a-z]+:(easy|medium|hard)$/.test(k)&&TASKS[k.split(':')[0]])o[k]=bias[k];return o}
  A.router={TASKS,BANDS,SAMPLES,W,classify,scoreModels,applyBias,allowedModels,rankModels,decide,nudge,trailKey,trailLabel,secondOpinion,migrateBias};
})(globalThis.AntRouter = globalThis.AntRouter || {});
