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

  function classify(text){
    let best=0,task='chat';
    for(const k in TASKS){const m=text.match(TASKS[k].re);const n=m?m.length:0;if(n>best){best=n;task=k}}
    if(best===0)task=text.trim().split(/\s+/).length<8?'fact':'chat';
    let cx=0.25+Math.min(text.length/500,0.3)+(text.match(HARD)||[]).length*0.18;
    if(task==='fact'||task==='chat')cx-=0.1;if(task==='reason'||task==='code')cx+=0.1;
    return{task,complexity:Math.max(0.1,Math.min(1,cx))};
  }
  function scoreModels(task,cx){const o={};
    MODELS.forEach(m=>{const q=W.Q*((m.q[task]-7)/3)*(0.3+0.7*cx)*2.2,s=W.S*m.speed/10,c=W.C*((LMAX-Math.log(m.cost))/(LMAX-LMIN));o[m.id]=Math.round(Math.max(0,Math.min(100,(q+s+c)*100)))});return o}
  function applyBias(scores,task,bias){const b=(bias&&bias[task])||{},o={};MODELS.forEach(m=>{o[m.id]=Math.max(0,Math.min(100,Math.round((scores[m.id]||0)+(b[m.id]||0)*100)))});return o}
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
  function decide(text,platformId,bias){const c=classify(text),scores=scoreModels(c.task,c.complexity);
    const reason=explain(c,rankModels(scores,platformId)[0],platformId),final=applyBias(scores,c.task,bias);
    return{task:c.task,complexity:c.complexity,scores,final,reason,order:rankModels(final,platformId)}}
  function nudge(bias,task,id,a){bias[task]=bias[task]||{};bias[task][id]=Math.max(-0.3,Math.min(0.4,(bias[task][id]||0)+a));return bias}
  A.router={TASKS,SAMPLES,classify,scoreModels,applyBias,allowedModels,rankModels,decide,nudge};
})(globalThis.AntRouter = globalThis.AntRouter || {});
