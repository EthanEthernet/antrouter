// Model catalog, platforms and hand-off links. Data only.
(function (A) {
  const MODELS=[
   {id:'opus',fam:'Claude',name:'Claude Opus',color:'#9B7BEA',q:{code:9.6,reason:9.6,creative:9.5,fact:8.8,summarize:9.2,chat:9.0},speed:4,cost:30,open:'claude'},
   {id:'sonnet',fam:'Claude',name:'Claude Sonnet',color:'#B99BF2',q:{code:9.4,reason:9.2,creative:9.1,fact:8.8,summarize:9.0,chat:9.0},speed:7,cost:9,open:'claude'},
   {id:'haiku',fam:'Claude',name:'Claude Haiku',color:'#D6C2F8',q:{code:8.2,reason:7.5,creative:7.9,fact:8.6,summarize:8.4,chat:8.7},speed:9,cost:2.5,open:'claude'},
   {id:'gpt',fam:'GPT',name:'GPT flagship',color:'#3FBF7A',q:{code:9.4,reason:9.7,creative:8.9,fact:9.0,summarize:8.9,chat:8.9},speed:5,cost:20,open:'chatgpt'},
   {id:'gptmini',fam:'GPT',name:'GPT mini',color:'#A6CF2A',q:{code:7.8,reason:7.7,creative:7.2,fact:8.1,summarize:7.9,chat:8.2},speed:9,cost:1.2,open:'chatgpt'},
   {id:'gpro',fam:'Gemini',name:'Gemini Pro',color:'#4C8DF5',q:{code:9.1,reason:9.3,creative:8.7,fact:9.2,summarize:9.5,chat:8.6},speed:5,cost:15,open:'gemini'},
   {id:'gflash',fam:'Gemini',name:'Gemini Flash',color:'#56B8EE',q:{code:7.9,reason:7.8,creative:7.4,fact:8.4,summarize:8.8,chat:8.0},speed:10,cost:0.9,open:'gemini'}
  ];
  const PLATFORMS=[{id:'any',label:'Any app',fam:null},{id:'claude',label:'Claude',fam:'Claude'},{id:'chatgpt',label:'ChatGPT',fam:'GPT'},{id:'gemini',label:'Gemini',fam:'Gemini'}];
  const FAMILIES=['Claude','GPT','Gemini'];
  const FAMILY_COLORS={Claude:'#9B7BEA',GPT:'#3FBF7A',Gemini:'#4C8DF5'};
  const OPEN={claude:{label:'Claude',url:q=>'https://claude.ai/new?q='+encodeURIComponent(q)},chatgpt:{label:'ChatGPT',url:q=>'https://chatgpt.com/?q='+encodeURIComponent(q)},gemini:{label:'Gemini',url:()=>'https://gemini.google.com/app'}};
  A.models={MODELS,PLATFORMS,FAMILIES,FAMILY_COLORS,OPEN};
})(globalThis.AntRouter = globalThis.AntRouter || {});
