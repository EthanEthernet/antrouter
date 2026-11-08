// The prompt adapter: suggests small, sourced changes that make a prompt clearer for the model Mandu picked.
// Pure text rules, no page or network access. It never touches pasted material or code, never invents content,
// and the page shows its changes as a diff the user can take or leave (docs/prompt-adapter-research.md).
(function (A) {
  const RULES_VERSION='2026-11';
  const CHANGES={
    'question-last':{label:'Put your question after the pasted text',
      why:"Anthropic and Google both advise long context first and the question last; 'Lost in the Middle' (TACL 2024) found models handle the middle of a prompt worst."},
    'question-both-ends':{label:'Repeat your question before and after the pasted text',
      why:"OpenAI's long-context guidance (GPT-4.1 guide) recommends putting the instructions at both the top and the bottom."},
    'delimit':{label:'Mark the pasted text with <document> tags',
      why:"All three vendors recommend clear delimiters around pasted material so the model doesn't mistake it for instructions."},
    'calm-emphasis':{label:'Tone down CAPS and CRITICAL / MUST',
      why:'Anthropic and OpenAI warn that shouted emphasis makes newer models over-apply a rule; plain wording is followed just as well.'},
    'no-cot':{label:'Drop "think step by step"',
      why:'The strongest models in these apps already reason on their own. OpenAI says the phrase can hinder reasoning models, and a 2024 study measured drops of up to 36 points.'},
    'tag-examples':{label:'Tag your examples',
      why:'Anthropic recommends wrapping examples in <example> tags so the model treats them as examples, not as part of the task.'}
  };
  const CHIPS={
    concise:{label:'Ask for a short answer',add:'Keep the answer short and to the point.',
      why:{Claude:'Claude Opus tends to write long answers; Anthropic suggests asking for brevity when you want it.',
        GPT:'Saying how long you want the answer stops the model from guessing.',Gemini:'Saying how long you want the answer stops the model from guessing.'}},
    detail:{label:'Ask for more detail',add:'Please go into detail.',
      why:{Gemini:'Gemini 3 answers tersely by default; Google suggests asking explicitly when you want depth.'}},
    bullets:{label:'Ask for bullet points',add:'Format the answer as bullet points.',
      why:"Leaving out a format instruction measurably hurt answers in Wharton's 2025 prompting tests; naming the format you want helps."},
    positive:{label:'Say what to do instead of what not to do',
      why:'Anthropic advises telling Claude what to do rather than what not to do. Only a few fixed phrases are rewritten.'}
  };
  // Only fixed phrases: guessing the positive form of arbitrary negatives would risk changing what you meant.
  const NEGATIVES=[[/\b(?:don'?t|do not) use (?:any )?markdown\.?/i,'Write in plain prose without markdown formatting.'],
    [/\b(?:don'?t|do not) use (?:any )?bullet points\.?/i,'Write in flowing paragraphs instead of bullet points.'],
    [/\b(?:don'?t|do not) be (?:too )?(?:verbose|wordy|long-winded)\.?/i,'Keep it brief.']];
  const STRONG=['opus','gpt','gpro'];
  // Rule-style shouting only; a single capitalized NOT or ONLY in a sentence is just emphasis.
  const EMPH=/\b(MUST(?: NOT)?|NEVER|ALWAYS|DO NOT|DON'T)\b/g;
  const COT=/\s*\(?\b(?:let'?s |please )?think (?:this |it )?(?:through )?step[- ]by[- ]step\b[.!]?\)?/gi;
  const EDIT=/\b(fix (?:the )?(?:grammar|spelling|typos)|proofread|translate|paraphrase|reword|rewrite|edit)\b/i;
  const SENSITIVE=/\b(suicid\w*|self[- ]harm\w*|kill myself|overdos\w*)\b/i;
  const LENGTH=/\b(short|brief|concise|detail(?:ed)?|in depth|thorough|\d+\s*(?:words|sentences|paragraphs))\b/i;
  const FORMAT=/\b(list|bullets?|table|json|csv|markdown|outline|paragraphs?|format)\b/i;
  const DEPTH=/\b(detail(?:ed)?|in depth|thorough(?:ly)?|explain|step by step|comprehensive)\b/i;

  // Code fences, <document> and <example> blocks are kept whole; the rest splits on blank lines.
  function split(text){const out=[],re=/```[\s\S]*?```|<document>[\s\S]*?<\/document>|<example>[\s\S]*?<\/example>/g;let last=0,m;
    const paras=s=>s.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).forEach(p=>out.push({kind:'para',s:p}));
    while((m=re.exec(text))){paras(text.slice(last,m.index));out.push({kind:m[0][0]==='`'?'code':m[0].startsWith('<document>')?'doc':'example',s:m[0]});last=re.lastIndex}
    paras(text.slice(last));
    const {PASTE_MIN,PASTE_LINES}=A.router;   // same "is this pasted?" threshold the router uses
    out.forEach(b=>{if(b.kind==='para'&&(b.s.length>=PASTE_MIN||b.s.split('\n').length>=PASTE_LINES))b.kind='prose'});
    return out}
  const isData=b=>b.kind==='code'||b.kind==='doc'||b.kind==='prose';

  function calmEmphasis(s){const letters=s.replace(/[^A-Za-z]/g,''),upper=s.replace(/[^A-Z]/g,'');
    if(!letters||upper.length/letters.length>0.6)return s;   // typed all in capitals: leave it
    return s.replace(/\b(?:CRITICAL|IMPORTANT)\s*[:!]+\s*(\w?)/g,(_,c)=>c.toUpperCase()).replace(EMPH,w=>w.toLowerCase())}

  function adapt(text,model,task){
    const base={skip:null,changes:[],chips:[],adapted:text,original:text,model:model.id,version:RULES_VERSION};
    if(task==='creative')return{...base,skip:'creative writing: rewording it could change your voice'};
    if(SENSITIVE.test(text))return{...base,skip:'sensitive topic: sent exactly as you wrote it'};
    if(EDIT.test(text))return{...base,skip:'you asked to edit or translate text, so it is sent untouched'};
    const fam=model.fam,used=new Set();
    let blocks=split(text);
    const paraCount=blocks.filter(b=>b.kind==='para').length;
    blocks.forEach(b=>{if(b.kind!=='para')return;let s=b.s;
      if(fam!=='Gemini'){const c=calmEmphasis(s);if(c!==s){s=c;used.add('calm-emphasis')}}
      if(STRONG.includes(model.id)){const c=s.replace(COT,'').trim();if(c!==s.trim()){s=c;used.add('no-cot')}}
      if(paraCount>1&&/^example(?: \d+)?\s*:/i.test(s)){b.kind='example';s='<example>\n'+s+'\n</example>';used.add('tag-examples')}
      b.s=s});
    blocks=blocks.filter(b=>b.s);
    const proseLen=blocks.filter(b=>b.kind==='prose'||b.kind==='doc').reduce((a,b)=>a+b.s.length,0);
    if(proseLen>=280&&blocks.some(b=>b.kind==='para')){
      // wrap each run of pasted prose as one document
      const merged=[];blocks.forEach(b=>{const prev=merged[merged.length-1];
        if(b.kind==='prose'){if(prev&&prev.kind==='prose')prev.s+='\n\n'+b.s;else merged.push({...b})}else merged.push(b)});
      blocks=merged.map(b=>{if(b.kind!=='prose')return b;used.add('delimit');return{kind:'doc',s:'<document>\n'+b.s+'\n</document>'}});
      const dataAt=blocks.map((b,i)=>isData(b)?i:-1).filter(i=>i>=0),first=Math.min(...dataAt),last=Math.max(...dataAt);
      const before=blocks.filter((b,i)=>b.kind==='para'&&i<first),after=blocks.filter((b,i)=>b.kind==='para'&&i>last);
      if(fam==='GPT'){
        if(before.length&&!after.length){blocks=blocks.concat(before.map(b=>({...b})));used.add('question-both-ends')}
        else if(after.length&&!before.length){blocks=after.map(b=>({...b})).concat(blocks);used.add('question-both-ends')}}
      else if(before.length&&!after.length){blocks=blocks.filter(b=>!before.includes(b)).concat(before);used.add('question-last')}}
    const changes=[...used].map(id=>({id,...CHANGES[id]}));
    const adapted=changes.length?blocks.map(b=>b.s).join('\n\n'):text;
    // optional chips: offered, never applied unless the user turns them on
    const chips=[],instr=blocks.filter(b=>b.kind==='para').map(b=>b.s).join(' ')||text;
    if(!LENGTH.test(instr))chips.push({id:'concise',label:CHIPS.concise.label,why:CHIPS.concise.why[fam],suggested:model.id==='opus'});
    if(fam==='Gemini'&&DEPTH.test(instr))chips.push({id:'detail',label:CHIPS.detail.label,why:CHIPS.detail.why.Gemini,suggested:true});
    if(!FORMAT.test(instr))chips.push({id:'bullets',label:CHIPS.bullets.label,why:CHIPS.bullets.why,suggested:false});
    if(fam==='Claude'&&NEGATIVES.some(([re])=>re.test(adapted)))chips.push({id:'positive',label:CHIPS.positive.label,why:CHIPS.positive.why,suggested:false});
    return{...base,changes,chips,adapted};
  }
  function withChips(r,ids){let t=r.adapted;ids=ids||[];
    if(ids.includes('positive'))NEGATIVES.forEach(([re,to])=>{t=t.replace(re,to)});
    const adds=['concise','detail','bullets'].filter(id=>ids.includes(id)&&r.chips.some(c=>c.id===id)).map(id=>CHIPS[id].add);
    return adds.length?t+'\n\n'+adds.join(' '):t}
  // Line diff (LCS) for showing the user exactly what changed.
  function diffLines(a,b){const x=a.split('\n'),y=b.split('\n'),n=x.length,m=y.length,L=Array.from({length:n+1},()=>new Array(m+1).fill(0));
    for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=x[i]===y[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
    const out=[];let i=0,j=0;
    while(i<n&&j<m){if(x[i]===y[j]){out.push({t:'same',s:x[i]});i++;j++}else if(L[i+1][j]>=L[i][j+1])out.push({t:'del',s:x[i++]});else out.push({t:'ins',s:y[j++]})}
    while(i<n)out.push({t:'del',s:x[i++]});while(j<m)out.push({t:'ins',s:y[j++]});return out}
  A.adapter={adapt,withChips,diffLines,RULES_VERSION,CHANGES,CHIPS};
})(globalThis.AntRouter = globalThis.AntRouter || {});
