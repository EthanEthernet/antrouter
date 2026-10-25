# AntRouter Tabbed Website + Extension Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single-file prototype into small shared scripts, rebuild the page as a tabbed layout with the chat at the top, and make the same folder load as a Chrome extension popup.

**Architecture:** Plain classic scripts that each attach to one global, `AntRouter` (`A.models`, `A.storage`, `A.router`, `A.game`, `A.mandu`, `A.result`, `A.tour`). `src/app.js` is the only file that touches page layout. `index.html` serves as both the website and the popup. Popup mode is on when the URL has `?popup` or the page runs from `chrome-extension:`.

**Tech Stack:** HTML, CSS, vanilla JS (no build, no npm dependencies in the repo). Node 24 `node --test` for tests. Chrome Manifest V3.

**Spec:** `docs/superpowers/specs/2026-10-21-website-and-extension-design.md`

## Global Constraints

- No build step, no `package.json`, no npm dependencies committed to the repo.
- No ES modules: no `import`/`export`, no `type="module"`. Every `src/*.js` file is wrapped as `(function (A) { … })(globalThis.AntRouter = globalThis.AntRouter || {});`.
- No inline `<script>` blocks and no inline event-handler attributes (`onclick="…"`) in HTML (Manifest V3 blocks them). Inline `style="…"` is fine.
- Double-clicking `index.html` (`file://`) must work.
- Existing `localStorage` keys keep their names and formats: `antrouter:belly`, `antrouter:prog`, `antrouter:bias`, `antrouter:ledger`, `antrouter:platform`. New key: `antrouter:tab`.
- Router outputs (task, complexity, scores, ranking, reason) must stay identical to the prototype at commit `b893370`.
- Mandu's drawing, moods and animations must not change.
- Match the prototype's compact JS style (short names, few comments, one-line helpers).
- "Original line N" always means `index.html` at commit `b893370`. Read it with `git show b893370:index.html`.
- Run tests from the repo root with `node --test`.

## File map

| File | Responsibility |
|---|---|
| `src/models.js` | Model catalog, platforms, family colours, hand-off links |
| `src/storage.js` | `antrouter:`-prefixed localStorage get/set, snapshot/restore |
| `src/router.js` | Classify, score, bias, rank, explain, nudge (pure) |
| `src/game.js` | XP, crumbs, levels, quests, badges, shop; events |
| `src/mandu.js` | ASCII renderer and animation loop, belly, gear |
| `src/result.js` | Result card HTML and its event wiring |
| `src/tour.js` | 1-minute guided tour |
| `src/app.js` | Page wiring: chat, tabs, panels, toasts, terminal buttons, popup mode |
| `index.html` | Markup only |
| `css/app.css` | All styles |
| `manifest.json`, `icons/`, `tools/make-icons.ps1` | Chrome extension |
| `tests/router.test.js`, `tests/game.test.js`, `tests/result.test.js`, `tests/mandu.test.js` | Node tests |

The old `index.html` is replaced in Task 5. Until then, the prototype keeps working, because Tasks 1–4 only add new files.

---

### Task 1: Models, storage and router (with regression tests)

**Files:**
- Create: `src/models.js`, `src/storage.js`, `src/router.js`
- Test: `tests/router.test.js`

**Interfaces:**
- Produces:
  - `A.models = { MODELS, PLATFORMS, FAMILIES, FAMILY_COLORS, OPEN }`
  - `A.storage = { get(key, fallback), set(key, value), snapshot() → {fullKey: rawString}, restore(snapshot) }`
  - `A.router = { TASKS, SAMPLES, classify(text) → {task, complexity}, scoreModels(task, complexity) → {id: 0..100}, applyBias(scores, task, bias) → {id: 0..100}, allowedModels(platformId) → Model[], rankModels(scores, platformId) → Model[], decide(text, platformId, bias) → {task, complexity, scores, final, reason, order}, nudge(bias, task, id, amount) → bias }`

- [ ] **Step 0: Create the working branch**

```bash
git checkout -b feature/tabs-and-extension
```

- [ ] **Step 1: Write the failing test** `tests/router.test.js`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/models.js');
require('../src/router.js');
const { router } = globalThis.AntRouter;

// Captured from the single-file prototype at commit b893370: platform, prompt, task, complexity, ranking, reason
const BASELINE = [
 ['any','Fix this off-by-one bug in my Python loop','code','0.432','sonnet:84 opus:77 gpt:76 gpro:70 haiku:64 gflash:64 gptmini:58','Claude Sonnet is the strongest fit for code at this difficulty.'],
 ['any',"What's the capital of Australia?",'fact','0.214','gflash:68 haiku:64 gptmini:58 gpro:57 sonnet:56 gpt:52 opus:44','A simple quick fact prompt, so a fast, inexpensive model does the job.'],
 ['any','Write a short poem about finals week at UCI','creative','0.336','sonnet:70 opus:67 gpt:57 gpro:54 haiku:53 gflash:49 gptmini:41','Claude Sonnet is the strongest fit for creative writing at this difficulty.'],
 ['any','Compare fixed vs floating exchange rates for an emerging market, step by step','reason','0.684','gpt:100 opus:97 sonnet:96 gpro:93 gflash:67 gptmini:60 haiku:49','GPT flagship is the strongest fit for reasoning & analysis at this difficulty.'],
 ['any','Summarize this 20-page article into key points','summarize','0.342','gflash:83 gpro:73 sonnet:68 haiku:65 opus:60 gptmini:58 gpt:57','A simple summarizing prompt, so a fast, inexpensive model does the job.'],
 ['any','Design the database schema for a ride-share app, handle edge cases','code','0.842','opus:100 sonnet:100 gpt:100 gpro:96 haiku:79 gflash:75 gptmini:68','Claude Opus is the strongest fit for code at this difficulty.'],
 ['claude','Fix this off-by-one bug in my Python loop','code','0.432','sonnet:84 opus:77 haiku:64',"You're in Claude; its middle tier handles this code prompt well without paying for the top model."],
 ['claude',"What's the capital of Australia?",'fact','0.214','haiku:64 sonnet:56 opus:44',"You're in Claude and this simple quick fact prompt doesn't need more than its fastest, cheapest tier."],
 ['claude','Write a short poem about finals week at UCI','creative','0.336','sonnet:70 opus:67 haiku:53',"You're in Claude; its middle tier handles this creative writing prompt well without paying for the top model."],
 ['claude','Compare fixed vs floating exchange rates for an emerging market, step by step','reason','0.684','opus:97 sonnet:96 haiku:49',"You're in Claude and this is a demanding reasoning & analysis prompt, so it's worth Claude's strongest tier."],
 ['claude','Summarize this 20-page article into key points','summarize','0.342','sonnet:68 haiku:65 opus:60',"You're in Claude; its middle tier handles this summarizing prompt well without paying for the top model."],
 ['claude','Design the database schema for a ride-share app, handle edge cases','code','0.842','opus:100 sonnet:100 haiku:79',"You're in Claude and this is a hard code prompt, so it's worth Claude's strongest tier."],
 ['chatgpt','Fix this off-by-one bug in my Python loop','code','0.432','gpt:76 gptmini:58',"You're in ChatGPT and this is a demanding code prompt, so it's worth ChatGPT's strongest tier."],
 ['chatgpt',"What's the capital of Australia?",'fact','0.214','gptmini:58 gpt:52',"You're in ChatGPT and this simple quick fact prompt doesn't need more than its fastest, cheapest tier."],
 ['chatgpt','Write a short poem about finals week at UCI','creative','0.336','gpt:57 gptmini:41',"You're in ChatGPT and this is a demanding creative writing prompt, so it's worth ChatGPT's strongest tier."],
 ['chatgpt','Compare fixed vs floating exchange rates for an emerging market, step by step','reason','0.684','gpt:100 gptmini:60',"You're in ChatGPT and this is a demanding reasoning & analysis prompt, so it's worth ChatGPT's strongest tier."],
 ['chatgpt','Summarize this 20-page article into key points','summarize','0.342','gptmini:58 gpt:57',"You're in ChatGPT and this simple summarizing prompt doesn't need more than its fastest, cheapest tier."],
 ['chatgpt','Design the database schema for a ride-share app, handle edge cases','code','0.842','gpt:100 gptmini:68',"You're in ChatGPT and this is a hard code prompt, so it's worth ChatGPT's strongest tier."],
 ['gemini','Fix this off-by-one bug in my Python loop','code','0.432','gpro:70 gflash:64',"You're in Gemini and this is a demanding code prompt, so it's worth Gemini's strongest tier."],
 ['gemini',"What's the capital of Australia?",'fact','0.214','gflash:68 gpro:57',"You're in Gemini and this simple quick fact prompt doesn't need more than its fastest, cheapest tier."],
 ['gemini','Write a short poem about finals week at UCI','creative','0.336','gpro:54 gflash:49',"You're in Gemini and this is a demanding creative writing prompt, so it's worth Gemini's strongest tier."],
 ['gemini','Compare fixed vs floating exchange rates for an emerging market, step by step','reason','0.684','gpro:93 gflash:67',"You're in Gemini and this is a demanding reasoning & analysis prompt, so it's worth Gemini's strongest tier."],
 ['gemini','Summarize this 20-page article into key points','summarize','0.342','gflash:83 gpro:73',"You're in Gemini and this simple summarizing prompt doesn't need more than its fastest, cheapest tier."],
 ['gemini','Design the database schema for a ride-share app, handle edge cases','code','0.842','gpro:96 gflash:75',"You're in Gemini and this is a hard code prompt, so it's worth Gemini's strongest tier."],
];
const ranking = d => d.order.map(m => m.id + ':' + d.final[m.id]).join(' ');

for (const [platform, prompt, task, cx, rank, reason] of BASELINE) {
  test(`${platform}: ${prompt}`, () => {
    const d = router.decide(prompt, platform, {});
    assert.equal(d.task, task);
    assert.equal(d.complexity.toFixed(3), cx);
    assert.equal(ranking(d), rank);
    assert.equal(d.reason, reason);
  });
}

test('the six sample prompts are unchanged', () => {
  assert.deepEqual(router.SAMPLES, BASELINE.slice(0, 6).map(r => r[1]));
});

test('classify edge cases', () => {
  for (const [text, task, cx] of [['zot','fact','0.156'],['hello there','fact','0.172'],['why is the sky blue','reason','0.388'],['','fact','0.150']]) {
    const c = router.classify(text);
    assert.equal(c.task, task, text);
    assert.equal(c.complexity.toFixed(3), cx, text);
  }
});

test('platform filter only returns that vendor', () => {
  assert.deepEqual(router.allowedModels('gemini').map(m => m.id), ['gpro', 'gflash']);
  assert.deepEqual(router.allowedModels('claude').map(m => m.id), ['opus', 'sonnet', 'haiku']);
  assert.equal(router.allowedModels('any').length, 7);
});

test('learned bias reorders the ranking but not the reason', () => {
  const d = router.decide('Fix this off-by-one bug in my Python loop', 'any', { code: { gpt: 0.08, sonnet: -0.04 } });
  assert.equal(ranking(d), 'gpt:84 sonnet:80 opus:77 gpro:70 haiku:64 gflash:64 gptmini:58');
  assert.equal(d.reason, 'Claude Sonnet is the strongest fit for code at this difficulty.');
});

test('nudge accumulates and clamps to -0.3..0.4', () => {
  const b = {};
  assert.equal(router.nudge(b, 'code', 'gpt', 0.08), b);
  assert.equal(b.code.gpt, 0.08);
  router.nudge(b, 'code', 'gpt', 0.5);
  assert.equal(b.code.gpt, 0.4);
  router.nudge(b, 'code', 'gpt', -1);
  assert.equal(b.code.gpt, -0.3);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test`
Expected: FAIL with `Cannot find module '../src/models.js'`.

- [ ] **Step 3: Create `src/models.js`**

```js
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
```

- [ ] **Step 4: Create `src/storage.js`**

```js
// localStorage wrapper. Every key gets the "antrouter:" prefix; blocked storage (private mode, previews) fails quietly.
(function (A) {
  const PREFIX='antrouter:';
  function get(k,d){try{const v=localStorage.getItem(PREFIX+k);return v?JSON.parse(v):d}catch(e){return d}}
  function set(k,v){try{localStorage.setItem(PREFIX+k,JSON.stringify(v))}catch(e){}}
  function keys(){const o=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(PREFIX))o.push(k)}}catch(e){}return o}
  // Raw copies of every antrouter: key, so the tour can play on a sandbox and put the viewer's data back.
  function snapshot(){const o={};try{keys().forEach(k=>{o[k]=localStorage.getItem(k)})}catch(e){}return o}
  function restore(o){try{keys().forEach(k=>localStorage.removeItem(k));for(const k in o)localStorage.setItem(k,o[k])}catch(e){}}
  A.storage={get,set,snapshot,restore};
})(globalThis.AntRouter = globalThis.AntRouter || {});
```

- [ ] **Step 5: Create `src/router.js`**

```js
// The router: reads a prompt, scores every model and explains the pick. Pure functions, no page or storage access.
(function (A) {
  const {MODELS,PLATFORMS}=A.models;
  const TASKS={
   code:{label:'code',re:/\b(code|function|bug|error|python|javascript|java|sql|api|regex|compile|refactor|debug|class|react|typescript|loop|schema|database)\b/gi},
   reason:{label:'reasoning & analysis',re:/\b(prove|why|calculate|solve|math|equation|probability|logic|plan|strategy|compare|tradeoffs?|analy[sz]e|derive|evaluate|explain)\b/gi},
   creative:{label:'creative writing',re:/\b(poem|story|lyrics|slogan|tagline|creative|character|script|essay|caption|rewrite)\b/gi},
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
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `node --test`
Expected: 29 tests PASS (24 baseline rows + 5 others), 0 fail.

- [ ] **Step 7: Commit**

```bash
git add src/models.js src/storage.js src/router.js tests/router.test.js
git commit -m "feat: extract models, storage and router into shared scripts with regression tests"
```

---

### Task 2: Game progress module

**Files:**
- Create: `src/game.js`
- Test: `tests/game.test.js`

**Interfaces:**
- Consumes: a store object with `get(key, fallback)` and `set(key, value)` (in the app, `A.storage`).
- Produces: `A.game = { createGame(store), LEVELS, SHOP, BADGES, QUESTS }`. `createGame` returns:
  - `on(event, fn)`. Events: `'change'` (no data, after every save), `'toast'` (string), `'levelup'` (`{name, unlocked: string[]}`), `'quest'` (`{done, next}`, emitted *before* the save that follows a completion), `'badge'` (id).
  - `state()` returns the live progress object `{xp, crumbs, owned, worn, badges, fams, routes, quests:[{id,n}], qdone, laps}`.
  - `levelInfo()` returns `{index, name, xp, next: {n, xp} | null, progress: 0..1}`.
  - `wearing(id)` → bool, `routed(fam, {platform, task})`, `rerouted(fam)`, `ratedGood()`, `zotted()`, `buy(id)` → bool, `toggleWear(id)` → bool (new worn state), `addLap()`, `reset()`.

- [ ] **Step 1: Write the failing test** `tests/game.test.js`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/game.js');
const { game: G } = globalThis.AntRouter;

function memStore(init = {}) {
  const d = JSON.parse(JSON.stringify(init));
  return { get: (k, f) => k in d ? JSON.parse(JSON.stringify(d[k])) : f, set: (k, v) => { d[k] = JSON.parse(JSON.stringify(v)) }, data: d };
}

test('a fresh game starts as a level 1 Pup with nothing', () => {
  const g = G.createGame(memStore());
  assert.equal(g.levelInfo().name, 'Pup');
  assert.equal(g.levelInfo().index, 0);
  assert.equal(g.state().crumbs, 0);
  assert.deepEqual(g.state().quests.map(q => q.id), ['r3', 'rr1', 'p1']);
});

test('saved progress loads on top of the defaults', () => {
  const g = G.createGame(memStore({ prog: { xp: 50 } }));
  assert.equal(g.levelInfo().name, 'Forager');
  assert.equal(g.state().crumbs, 0);
  assert.ok(Math.abs(g.levelInfo().progress - 1 / 6) < 1e-9);
});

test('first route pays route XP plus the First trail badge and saves', () => {
  const s = memStore(), g = G.createGame(s), toasts = [];
  g.on('toast', m => toasts.push(m));
  g.routed('Claude', { platform: 'any', task: 'fact' });
  assert.equal(g.state().xp, 25);
  assert.equal(g.state().crumbs, 15);
  assert.equal(s.data.prog.xp, 25);
  assert.deepEqual(toasts, ['Badge: First trail  +10 crumbs']);
});

test('third route finishes a quest, levels up once and rotates in the next quest', () => {
  const g = G.createGame(memStore()), ups = [], quests = [];
  g.on('levelup', e => ups.push(e));
  g.on('quest', e => quests.push(e));
  g.routed('Claude', { platform: 'any', task: 'fact' });
  g.routed('GPT', { platform: 'any', task: 'fact' });
  g.routed('Gemini', { platform: 'any', task: 'fact' });
  assert.equal(g.state().xp, 65);
  assert.equal(g.state().crumbs, 43);
  assert.equal(g.state().qdone, 1);
  assert.deepEqual(ups, [{ name: 'Forager', unlocked: ['UCI bandana'] }]);
  assert.deepEqual(quests, [{ done: 'r3', next: 'g1' }]);
  assert.deepEqual(g.state().quests.map(q => q.id), ['g1', 'rr1', 'p1']);
  assert.ok(g.state().badges.includes('tri'));
});

test('routing inside an app counts toward the platform quest', () => {
  const g = G.createGame(memStore());
  g.routed('Claude', { platform: 'claude', task: 'fact' });
  assert.equal(g.state().quests.find(q => q.id === 'p1'), undefined);
  assert.equal(g.state().qdone, 1);
});

test('badges are only awarded once', () => {
  const g = G.createGame(memStore());
  g.zotted(); g.zotted();
  assert.equal(g.state().crumbs, 10);
  assert.equal(g.state().xp, 15);
});

test('buying gear spends crumbs, wears it and earns Dressed up', () => {
  const g = G.createGame(memStore({ prog: { crumbs: 25 } }));
  assert.equal(g.buy('hat'), true);
  assert.equal(g.state().crumbs, 15);
  assert.ok(g.wearing('hat'));
  assert.equal(g.buy('hat'), false);
  assert.equal(g.toggleWear('hat'), false);
  assert.equal(g.wearing('hat'), false);
  assert.equal(g.toggleWear('hat'), true);
});

test('locked or unaffordable gear cannot be bought', () => {
  const g = G.createGame(memStore({ prog: { crumbs: 100 } }));
  assert.equal(g.buy('bandana'), false);
  assert.equal(g.state().crumbs, 100);
  const poor = G.createGame(memStore({ prog: { crumbs: 5 } }));
  assert.equal(poor.buy('bow'), false);
});

test('reset wipes progress and emits change', () => {
  const g = G.createGame(memStore({ prog: { xp: 200, crumbs: 99 } }));
  let changes = 0; g.on('change', () => changes++);
  g.reset();
  assert.equal(g.state().xp, 0);
  assert.equal(changes, 1);
});
```

Why the platform-quest test expects `qdone` 1: `p1` has goal 1, so routing inside an app completes it immediately. It rotates out to the first `QORDER` id that isn't active (`g1`).

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/game.test.js`
Expected: FAIL with `Cannot find module '../src/game.js'`.

- [ ] **Step 3: Create `src/game.js`**

```js
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test`
Expected: router and game tests all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game.js tests/game.test.js
git commit -m "feat: extract progress (XP, quests, badges, shop) into a game module with tests"
```

---

### Task 3: Result card module

**Files:**
- Create: `src/result.js`
- Test: `tests/result.test.js`

**Interfaces:**
- Consumes: `A.models.{MODELS, OPEN}`, `A.router.{TASKS, rankModels, allowedModels, decide}`.
- Produces: `A.result = { esc(text), resultHTML(current, platformId) → string, bindResult(el, current, {onReroute(id), onGood(), onCopy()}) }`. Here `current = {text, d, chosen, original, rerouted, rated}`, where `d` is the object returned by `router.decide`.

- [ ] **Step 1: Write the failing test** `tests/result.test.js`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/models.js');
require('../src/router.js');
require('../src/result.js');
const { router, result, models } = globalThis.AntRouter;

function pick(text, platform = 'any') {
  const d = router.decide(text, platform, {});
  return { text, d, chosen: d.order[0], original: d.order[0], rerouted: false, rated: false };
}

test('shows the pick, its reason, a Good route button and a pre-filled Claude link', () => {
  const h = result.resultHTML(pick('Fix this off-by-one bug in my Python loop'), 'any');
  assert.match(h, /Mandu picked/);
  assert.match(h, /Claude Sonnet is the strongest fit for code at this difficulty\./);
  assert.match(h, /Runner-up: Claude Opus\./);
  assert.match(h, /id="good"/);
  assert.match(h, /href="https:\/\/claude\.ai\/new\?q=Fix%20this%20off-by-one/);
  assert.doesNotMatch(h, /copyBtn/);
});

test('a Gemini pick offers Copy prompt', () => {
  const h = result.resultHTML(pick("What's the capital of Australia?"), 'any');
  assert.match(h, /Gemini Flash/);
  assert.match(h, /id="copyBtn"/);
  assert.match(h, /href="https:\/\/gemini\.google\.com\/app"/);
});

test('a rerouted card thanks you and hides Good route', () => {
  const c = pick('Fix this off-by-one bug in my Python loop');
  c.chosen = models.MODELS.find(m => m.id === 'gpt'); c.rerouted = true; c.rated = true;
  const h = result.resultHTML(c, 'any');
  assert.match(h, /You rerouted to/);
  assert.match(h, /the trail to GPT flagship will be a little stronger/);
  assert.doesNotMatch(h, /id="good"/);
});

test('escapes HTML in the reason', () => {
  const c = pick('Fix this off-by-one bug in my Python loop');
  c.d.reason = '<img src=x onerror=alert(1)>';
  const h = result.resultHTML(c, 'any');
  assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(h, /<img/);
});

test('platform mode lists only that family', () => {
  const h = result.resultHTML(pick('Fix this off-by-one bug in my Python loop', 'claude'), 'claude');
  assert.match(h, /data-id="opus"/);
  assert.doesNotMatch(h, /data-id="gpt"/);
  assert.match(h, /Claude \(you are in this app\)/);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/result.test.js`
Expected: FAIL with `Cannot find module '../src/result.js'`.

- [ ] **Step 3: Create `src/result.js`** (the template is the prototype's `renderResult`, original lines 636-650, with `ranked()`/`allowed()` replaced by router calls and the unused `d.note` line dropped)

```js
// The result card: who Mandu picked and why, reroute chips, Good route and the hand-off link.
(function (A) {
  const {MODELS,OPEN}=A.models;
  const {TASKS,rankModels,allowedModels}=A.router;
  function esc(x){return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function resultHTML(current,platformId){
    const {d,chosen,rerouted}=current;const order=rankModels(d.final,platformId);const runner=order.find(m=>m.id!==chosen.id)||chosen;
    const o=OPEN[chosen.open];
    let bars='';
    const fams=[...new Set(allowedModels(platformId).map(m=>m.fam))];
    fams.forEach(f=>{bars+=`<div class="fam">${f}${fams.length===1?' (you are in this app)':''}</div><div class="chips">`;MODELS.filter(m=>m.fam===f).forEach(m=>{
      const on=m.id===chosen.id;bars+=`<div class="chip${on?' on':''}" role="button" tabindex="0" data-id="${m.id}" aria-label="Reroute to ${m.name}" style="--c:${m.color}"><span class="sw" style="background:${m.color}"></span>${m.name}</div>`});bars+='</div>'});
    return `<div class="pick"><span class="meta">${rerouted?'You rerouted to':'Mandu picked'}</span>
      <h3><span class="sw" style="background:${chosen.color}"></span>${chosen.name}</h3>
      <div class="meta">Reads as ${TASKS[d.task].label}, complexity ${d.complexity<0.4?'low':d.complexity<0.7?'medium':'high'}. Runner-up: ${runner.name}.</div>
      <p class="reason">${rerouted?'Got it. Next time a '+TASKS[d.task].label+' prompt comes in, the trail to '+esc(chosen.name)+' will be a little stronger.':esc(d.reason)}</p>
      <div class="bars">${bars}</div>
      <div class="open"><a id="openLink" href="${o.url(current.text)}" target="_blank" rel="noopener">Open in ${o.label}</a>
      ${current.rated?'':'<button id="good">Good route</button>'}<span class="meta">Wrong trail? Tap another model above to reroute.</span></div>
      ${chosen.open==='gemini'?'<button id="copyBtn" type="button" style="margin-left:8px">Copy prompt</button><p class="meta" id="copyNote" style="margin-top:8px">Gemini can\'t receive a prompt through a link, so AntRouter copies it for you. Paste it into Gemini with Ctrl/Cmd+V.</p>':''}</div>`;
  }
  function bindResult(el,current,h){
    el.querySelectorAll('.chip').forEach(c=>{const go=()=>h.onReroute(c.dataset.id);c.onclick=go;c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
    el.querySelector('#openLink').onclick=()=>{if(current.chosen.open==='gemini')h.onCopy()};
    const cb=el.querySelector('#copyBtn');if(cb)cb.onclick=h.onCopy;
    const g=el.querySelector('#good');if(g)g.onclick=h.onGood;
  }
  A.result={esc,resultHTML,bindResult};
})(globalThis.AntRouter = globalThis.AntRouter || {});
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/result.js tests/result.test.js
git commit -m "feat: extract the result card into a module with tests"
```

---

### Task 4: Mandu module (renderer moved verbatim)

**Files:**
- Create: `src/mandu.js`
- Test: `tests/mandu.test.js`

**Interfaces:**
- Consumes: `A.models.FAMILY_COLORS`, plus a store object with `get`/`set`.
- Produces: `A.mandu = { createMandu(opts) }`.
  - `opts = { screen, status, reduce, store, maxFont = 13, getWorn(id) → bool, getHud() → {index, name, fill: 0..8, crumbs}, onLanded(), onBellyChange() }`. The last two are optional.
  - Returns `{ routeTo(model), puzzle(model), queueEat(fam, fromFam?), pet(), zot(), nap(), wake(), levelUp(name), resetBelly(), belly() → {Claude, GPT, Gemini}, fit(), start(), stop(), relaunch(), setStatus(text), idleStatus() }`.
  - `createMandu` calls `fit()` and `start()` itself. With `reduce`, `start()` draws a single still frame.

- [ ] **Step 1: Write the failing test** `tests/mandu.test.js`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.window = globalThis.window || { addEventListener() {} };
require('../src/models.js');
require('../src/mandu.js');
const { mandu: M } = globalThis.AntRouter;

function memStore(init = {}) {
  const d = JSON.parse(JSON.stringify(init));
  return { get: (k, f) => k in d ? JSON.parse(JSON.stringify(d[k])) : f, set: (k, v) => { d[k] = JSON.parse(JSON.stringify(v)) }, data: d };
}
function fakeScreen() {
  return { parentElement: { clientWidth: 900, clientHeight: 700, classList: { contains: () => false } }, style: {}, innerHTML: '',
    addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }) };
}
const text = el => el.innerHTML.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function make(init, opts = {}) {
  const screen = fakeScreen(), status = { textContent: '' }, store = memStore(init);
  const m = M.createMandu({ screen, status, store, reduce: true, getWorn: () => false,
    getHud: () => ({ index: 1, name: 'Forager', fill: 4, crumbs: 40 }), ...opts });
  return { m, screen, status, store };
}

test('draws a 44-row still frame with the trail sign, empty belly and HUD', () => {
  const { screen } = make();
  const s = text(screen);
  assert.equal(s.split('\n').length, 44);
  assert.match(s, /trail: \[ SNIFFING \]/);
  assert.match(s, /belly empty: route a prompt to feed Mandu/);
  assert.match(s, /Lv2 Forager \[####----\] 40 crumbs/);
});

test('reduced motion eats right away, saves the belly and reports the change', () => {
  let changed = 0;
  const { m, screen, store } = make({}, { onBellyChange: () => changed++ });
  m.queueEat('Claude');
  assert.deepEqual(m.belly(), { Claude: 1, GPT: 0, Gemini: 0 });
  assert.deepEqual(store.data.belly, { Claude: 1, GPT: 0, Gemini: 0 });
  assert.equal(changed, 1);
  m.start();
  assert.match(text(screen), /Claude 100%/);
});

test('a reroute moves one ant between families; reset empties the belly', () => {
  const { m } = make({ belly: { Claude: 2, GPT: 0, Gemini: 0 } });
  m.queueEat('GPT', 'Claude');
  assert.deepEqual(m.belly(), { Claude: 1, GPT: 1, Gemini: 0 });
  m.resetBelly();
  assert.deepEqual(m.belly(), { Claude: 0, GPT: 0, Gemini: 0 });
});

test('status line keeps the mandu prefix', () => {
  const { m, status } = make();
  m.setStatus('exited');
  assert.equal(status.textContent, 'mandu — exited');
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/mandu.test.js`
Expected: FAIL with `Cannot find module '../src/mandu.js'`.

- [ ] **Step 3: Assemble `src/mandu.js`** from this skeleton. Each `PASTE` line is replaced by the original lines it names, copied **verbatim**, with no reformatting. Get them with `git show b893370:index.html | sed -n 'A,Bp'`.

```js
// Mandu, the ASCII anteater: animation loop, moods, belly ants, gear and the level readout.
// The page talks to Mandu only through the object createMandu() returns.
(function (A) {
  function createMandu(opts){
    const pre=opts.screen, statusEl=opts.status, reduce=!!opts.reduce, store=opts.store, maxFont=opts.maxFont||13;
    const wearing=id=>opts.getWorn(id);
    const FAMC=A.models.FAMILY_COLORS;
    // PASTE original lines 228-229 (COLS … CW)
    // PASTE original lines 232-236 (RAMP … GREY)
    // PASTE original lines 238-240 (state … WIN)
    let belly=(()=>{const v=store.get('belly',null);return v&&typeof v==='object'?{Claude:v.Claude|0,GPT:v.GPT|0,Gemini:v.Gemini|0}:{Claude:0,GPT:0,Gemini:0}})();
    let gulpAt=-9, pendingEat=null, levelUpAt=-9, levelUpName='';
    function saveBelly(){store.set('belly',belly);if(opts.onBellyChange)opts.onBellyChange()}
    // PASTE original lines 258-259 (eat, queueEat)
    // PASTE original lines 261-267 (SLOTS … ants)
    function fit(){const term=pre.parentElement;const w=term.clientWidth-16;let f=w/(COLS*0.602);if(term.classList.contains('max')){f=Math.min(f,(term.clientHeight-80)/ROWS);f=Math.min(f,24)}else f=Math.min(f,maxFont);pre.style.fontSize=Math.max(5,f)+'px'}
    window.addEventListener('resize',fit);
    // PASTE original lines 271-273 (pointer listeners)
    // PASTE original lines 275-280 (len … seg)
    // PASTE original line 282 (setStatus)
    // PASTE original line 284 (routeTo)
    function puzzle(m){target=m;state='puzzled';stateT=0;lastInput=t;setStatus('hmm, new trail?')}
    function zot(){state='zot';stateT=0;lastInput=t;setStatus('zot! zot! zot!')}
    // PASTE original lines 289-291 (nap, wake, pet)
    // PASTE original lines 296-490 (update, eyeMode, tongueLen, render), then apply Edits A and B below
    // PASTE original lines 715-718 (last, rafId, loop, start, stop)
    function idleStatus(){setStatus(target?'hanging out at '+target.name.toLowerCase():'sniffing around')}
    function relaunch(){state='idle';stateT=0;lastInput=t;start();setStatus('back and sniffing around')}
    function levelUp(name){levelUpAt=t;levelUpName=name;for(let i=0;i<6;i++)fx.push({kind:'star',x:-0.6+Math.random()*1.4,y:-0.2+Math.random()*0.3,vy:-0.3,life:1,c:Math.random()<0.5?UGOLD:'#F59AB0'})}
    function resetBelly(){belly={Claude:0,GPT:0,Gemini:0};saveBelly()}
    fit();start();
    return{routeTo,puzzle,queueEat,pet,zot,nap,wake,levelUp,resetBelly,belly:()=>({...belly}),fit,start,stop,relaunch,setStatus,idleStatus};
  }
  A.mandu={createMandu};
})(globalThis.AntRouter = globalThis.AntRouter || {});
```

Deliberately **not** copied: original 230-231 (they come from `opts`), 241 (FAMC now comes from models), 242-257 (belly loading and game state, replaced above), 260 (`window.__antBelly`), 283 (`think`, unused), 285 (the dead first `reroute`, shadowed by the later one), 286-288 (zot/keyboard hooks, which move to `app.js`), 292-294 (button wiring, which moves to `app.js`).

**Edit A**, in the pasted `update()` (original line 299): replace
`loopStep('reveal');setTimeout(()=>loopStep('reward'),900);`
with
`if(opts.onLanded)opts.onLanded();`

**Edit B**, the HUD block (original lines 446-447): replace these two lines
```js
  {const li=lvlIndex(prog.xp),L0=LEVELS[li],L1=LEVELS[li+1];const fill=L1?Math.round((prog.xp-L0.xp)/(L1.xp-L0.xp)*8):8;
   const hud='Lv'+(li+1)+' '+L0.n+' ['+'#'.repeat(fill)+'-'.repeat(8-fill)+'] '+prog.crumbs+' crumbs';const c0=COLS-hud.length-2;
```
with
```js
  {const h=opts.getHud(),li=h.index,fill=h.fill;
   const hud='Lv'+(li+1)+' '+h.name+' ['+'#'.repeat(fill)+'-'.repeat(8-fill)+'] '+h.crumbs+' crumbs';const c0=COLS-hud.length-2;
```
Keep original line 448 (the `for` loop that writes the HUD) unchanged.

- [ ] **Step 4: Check that no app-level names leaked into Mandu**

Run: `grep -nE "prog\b|prog\.|lvlIndex|LEVELS|loopStep|quest\(|badge\(|\\$\(|document\." src/mandu.js`
Expected: no output.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node --test`
Expected: all tests PASS, including the 4 Mandu tests.

- [ ] **Step 6: Commit**

```bash
git add src/mandu.js tests/mandu.test.js
git commit -m "feat: move Mandu's renderer into a module driven by callbacks"
```

---

### Task 5: Tabbed page (markup, styles, app wiring)

**Files:**
- Replace: `index.html` (new markup, no inline script)
- Create: `css/app.css`, `src/app.js`, `src/tour.js`

**Interfaces:**
- Consumes everything from Tasks 1–4.
- Produces: `A.tour = { run(api), stop() }`, where `api = { resetForTour(), doRoute(), showTab(id), clickPlat(label), game }`.

- [ ] **Step 1: Create `css/app.css`**

1. Copy original lines 11-135 (everything inside the old `<style>` tag) verbatim into `css/app.css`.
2. Append:

```css
/* ---- tabbed layout ---- */
.top{display:flex;justify-content:space-between;align-items:baseline;gap:8px 16px;flex-wrap:wrap}
.top h1{font-size:clamp(32px,5vw,52px);margin:0}
.hdr-stats{font:700 15px/1.2 "Archivo",sans-serif;color:var(--signal)}
.top+.sub{margin:6px 0 16px;font-size:16px}
.chat textarea{min-height:72px;margin-top:6px}
.chat .open{margin-top:12px}
.tabbar{display:flex;align-items:flex-end;gap:12px;margin:22px 0 18px;border-bottom:1px solid var(--rule)}
.tabs{display:flex;gap:2px;overflow-x:auto;flex:1;min-width:0}
.tab{border:0;border-bottom:3px solid transparent;border-radius:10px 10px 0 0;padding:11px 14px;color:var(--muted);position:relative;white-space:nowrap}
.tab:hover{color:var(--ink);border-color:transparent;border-bottom-color:var(--rule)}
.tab[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--signal)}
.tab.has-news::after{content:"";position:absolute;top:8px;right:5px;width:8px;height:8px;border-radius:50%;background:var(--pink)}
.tabbar .tourbtn{margin:0 0 8px;padding:9px 14px;font-size:14px;white-space:nowrap}
.stage{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:20px;align-items:start}
.side{position:sticky;top:12px}
@media (max-width:860px){.stage{grid-template-columns:1fr}.side{position:static}}
.panel{display:grid;gap:16px}
.panel[hidden]{display:none}
.panel .loop{margin-top:0}
.cardtitle{display:block;font:700 16px/1.2 "Archivo",sans-serif}
.pill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;border:1px solid var(--c);font-size:13.5px}
.pill .sw{width:9px;height:9px;border-radius:50%;display:inline-block}
.panel .states{grid-template-columns:repeat(2,1fr);margin-top:0;border-top:0;padding-top:0}
@media (max-width:460px){.panel .states{grid-template-columns:1fr}}
.panel .brief{margin-top:0}
.panel .brief .lede{color:var(--ink)}
```

- [ ] **Step 2: Replace `index.html`** with:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>AntRouter: meet Mandu</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/app.css">
</head>
<body>
<div class="wrap">
  <header class="top"><h1>AntRouter</h1><span class="hdr-stats" id="hdrStats" aria-live="polite"></span></header>
  <p class="sub">Type a prompt and Mandu the anteater picks the best model among Claude, GPT and Gemini, shows why, and learns from your reroutes. Fellow Anteaters: try typing <b>zot</b>.</p>

  <section class="card chat" aria-label="Ask Mandu">
    <div class="plat" id="plat"><span class="meta">Mandu is working in:</span></div>
    <label for="prompt" style="font-weight:600">Your prompt</label>
    <textarea id="prompt" placeholder="Ask anything. Mandu will sniff out whether Claude, GPT or Gemini should take it."></textarea>
    <div class="samples" id="samples"></div>
    <div class="open"><button class="go" id="go">Route prompt</button><span class="meta" id="engine">Router: Mandu's trail map (runs in your browser)</span></div>
  </section>

  <div class="tabbar">
    <div class="tabs" role="tablist" aria-label="AntRouter sections">
      <button class="tab" role="tab" id="tab-route" aria-controls="panel-route">Route</button>
      <button class="tab" role="tab" id="tab-trails" aria-controls="panel-trails">Trails</button>
      <button class="tab" role="tab" id="tab-progress" aria-controls="panel-progress">Progress</button>
      <button class="tab" role="tab" id="tab-shop" aria-controls="panel-shop">Shop</button>
      <button class="tab" role="tab" id="tab-about" aria-controls="panel-about">About</button>
    </div>
    <button class="tourbtn" id="tourBtn">▶ 1-minute tour</button>
  </div>
  <div class="tourbar" id="tourbar" role="status" aria-live="polite"><span class="step" id="tourStep">0:00</span><p id="tourCap"></p><button id="tourStop">Stop tour</button><span class="tprog" id="tourProg"></span></div>
  <div class="shade" id="shade"></div>

  <div class="stage">
    <div class="side">
      <div class="term" id="term">
        <div class="bar"><button class="wb red" id="wQuit" aria-label="Quit Mandu" title="Quit">×</button><button class="wb yellow" id="wMin" aria-label="Minimize" title="Minimize">−</button><button class="wb green" id="wMax" aria-label="Expand" title="Expand">+</button><span id="status">mandu — sniffing around</span></div>
        <pre id="screen" role="img" aria-label="Animated ASCII anteater mascot named Mandu. Ants in its belly show how many prompts went to Claude, GPT and Gemini."></pre>
        <div class="exited">$ mandu --quit<br>[process exited] Mandu curled up and went home.<br><button id="wRelaunch">$ mandu --start</button></div>
      </div>
      <div class="mood">
        <button id="zot" style="border-color:#FFD200;color:#FFD200">Zot!</button><button id="pet">Pet Mandu</button><button id="nap">Nap</button><button id="wake">Wake up</button>
      </div>
    </div>

    <div class="panels">
      <section class="panel" role="tabpanel" id="panel-route" aria-labelledby="tab-route" tabindex="0">
        <div class="card" id="result" aria-live="polite">
          <p class="empty">Route a prompt and Mandu will follow the trail to the best model among Claude, GPT and Gemini.</p>
        </div>
        <div class="loop" aria-live="polite">
          <div class="loophead"><b>Core loop</b><span class="meta" id="laps">0 loops completed</span></div>
          <div class="steps" id="steps"></div>
          <div class="hint" id="hint"><b>Start here:</b> type a prompt above, or tap a sample.</div>
        </div>
      </section>

      <section class="panel" role="tabpanel" id="panel-trails" aria-labelledby="tab-trails" tabindex="0" hidden>
        <div class="card">
          <b class="cardtitle">Mandu's belly</b>
          <div class="meta">Every routed prompt becomes an ant in its model's colour.</div>
          <div class="chips" id="bellySplit" style="margin-top:10px"></div>
        </div>
        <div class="card">
          <b class="cardtitle">Your trails</b>
          <div id="learned" class="meta" style="margin-top:8px"></div>
        </div>
      </section>

      <section class="panel" role="tabpanel" id="panel-progress" aria-labelledby="tab-progress" tabindex="0" hidden>
        <div class="card">
          <span class="meta">Mandu's level</span>
          <div class="lvl"><b id="lvName">Lv1 Pup</b><span class="meta" id="lvNext"></span></div>
          <div class="xpbar"><span id="xpFill" style="width:0%"></span></div>
          <div class="meta" id="xpText"></div>
          <div style="margin-top:12px" class="crumbs" id="crumbs">0 crumbs</div>
          <div class="meta" style="margin-top:4px">Earn crumbs by routing (+5), rerouting (+2), marking a good route (+3) and unlocking badges (+10).</div>
          <div class="badges" id="badges"></div>
        </div>
        <div class="card">
          <div class="loophead" style="margin:0"><b class="cardtitle">Today's trail: quests</b><span class="meta" id="qdone">0 quests done</span></div>
          <div class="meta">Small goals that pay crumbs and walk you through every mechanic. Finish one and a new one appears.</div>
          <div class="quests" id="quests"></div>
        </div>
      </section>

      <section class="panel" role="tabpanel" id="panel-shop" aria-labelledby="tab-shop" tabindex="0" hidden>
        <div class="card">
          <b class="cardtitle">Mandu's shop</b>
          <div class="meta">Spend crumbs on gear. Higher levels unlock more items.</div>
          <div class="shop" id="shop"></div>
          <button id="resetProg" style="margin-top:12px;padding:7px 12px;font-size:13px">Reset level, crumbs and gear</button>
        </div>
      </section>

      <section class="panel" role="tabpanel" id="panel-about" aria-labelledby="tab-about" tabindex="0" hidden>
        <div class="brief">
          <p class="lede">Meet Mandu, a small anteater drawn entirely in text characters. Mandu follows ant trails, and in AntRouter every trail leads a prompt to the right model. Tell Mandu which app you're in and it picks the right tier inside Claude, ChatGPT or Gemini.</p>
        </div>
        <div class="states">
          <div><h3>Sniffing</h3><p>Gentle bob, swishy tail, wiggly snout, the odd tongue flick. Eyes follow your cursor.</p></div>
          <div><h3>Following the trail</h3><p>Ants in the model's color march ahead, Mandu trots after them, and the trail sign flips to the destination.</p></div>
          <div><h3>Found it</h3><p>Happy squint, blushing cheeks, tongue out, a few floating hearts.</p></div>
          <div><h3>Rerouted and napping</h3><p>A head tilt and a question mark when you overrule it. Left alone, it curls its tail and dozes.</p></div>
        </div>
        <div class="brief">
          <h2>Why an anteater</h2>
          <p>It also helps that AntRouter is built at UC Irvine, where the anteater has been the mascot since the 1960s. Mandu is its own character, but it knows the cheer: type z-o-t anywhere on this page, or press the Zot! button, and it does a little blue-and-gold victory dance.</p>
          <p>Real ants find the shortest path to food by laying scent trails, and computer scientists turned that into a routing method called ant colony optimization. AntRouter borrows the idea: every prompt leaves a trail, and the trails that lead to good answers get stronger. Mandu is the one who follows them. Its name comes from the tamandua, the anteater's smaller cousin, and its moods map onto the core loop: sniffing while you type, following the trail while AntRouter decides, happy when the answer arrives, puzzled when you steer.</p>
        </div>
      </section>
    </div>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
</div>
<script src="src/models.js"></script>
<script src="src/storage.js"></script>
<script src="src/router.js"></script>
<script src="src/game.js"></script>
<script src="src/mandu.js"></script>
<script src="src/result.js"></script>
<script src="src/tour.js"></script>
<script src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `src/tour.js`** (the prototype's tour, original lines 670-713, switching tabs instead of scrolling)

```js
// The 1-minute guided tour. Plays the whole loop on sandboxed progress, then restores the viewer's data and reloads.
(function (A) {
  const $=id=>document.getElementById(id);
  let touring=false, abort=false;
  const sleep=ms=>new Promise((res,rej)=>{setTimeout(()=>abort?rej('stop'):res(),ms)});
  async function typeIn(text){const ta=$('prompt');ta.value='';for(const ch of text){if(abort)throw'stop';ta.value+=ch;ta.dispatchEvent(new Event('input'));await sleep(32)}}
  function cap(step,text){$('tourStep').textContent=step;$('tourCap').textContent=text}
  const top=()=>window.scrollTo({top:0,behavior:'smooth'});
  async function run(app){
    if(touring)return;touring=true;abort=false;const saved=A.storage.snapshot();
    app.resetForTour();app.showTab('route');top();
    $('tourbar').classList.add('on');$('tourBtn').disabled=true;
    const t0=performance.now();const tick=setInterval(()=>{const s=Math.min(60,(performance.now()-t0)/1000);$('tourProg').style.width=(s/60*100)+'%'},250);
    try{
      cap('0:00','Meet Mandu. You bring a prompt, he finds the right AI model. Watch the Core loop strip light up as we play.');await sleep(4200);
      cap('ASK','Step 1, Ask: type what you would normally ask ChatGPT, Claude or Gemini.');await sleep(700);
      await typeIn("What's the capital of Australia?");await sleep(500);app.doRoute();
      cap('ROUTE','Step 2, Route: Mandu reads the prompt, follows the trail and snatches an ant in that model\'s colour.');await sleep(3800);
      cap('REVEAL','Step 3, Reveal: a quick fact goes to a fast, cheap model. The ant lands in his belly, and you earn XP and crumbs.');await sleep(3800);
      await typeIn('Fix this off-by-one bug in my Python loop');await sleep(300);app.doRoute();
      cap('REVEAL','A coding prompt gets a stronger model. The belly shows your split across Claude, GPT and Gemini.');await sleep(4200);
      cap('STEER','Step 4, Steer: disagree? Tap another model. Mandu tilts his head and reroutes.');await sleep(1600);
      const chips=[...$('result').querySelectorAll('.chip')].filter(c=>!c.classList.contains('on'));
      const want=['sonnet','gpt','gpro'].find(id=>{const m=A.models.MODELS.find(x=>x.id===id);return!app.game.state().fams.includes(m.fam)})||'sonnet';
      (chips.find(c=>c.dataset.id===want)||chips[0])?.click();await sleep(3800);
      cap('LEARN','Step 5, Learn: every reroute strengthens that trail, so next time Mandu picks it on his own.');app.showTab('trails');await sleep(2400);
      await typeIn('Summarize this 20-page article into key points');await sleep(300);app.doRoute();await sleep(3900);$('good')?.click();
      cap('LEARN','"Good route" confirms Mandu\'s pick. Badges pay bonus crumbs.');await sleep(3000);
      cap('PLATFORM','Already living in one app? Switch to Gemini and Mandu picks the right tier inside it.');app.clickPlat('Gemini');await sleep(900);
      await typeIn('Design the database schema for a ride-share app, handle edge cases');await sleep(300);app.doRoute();await sleep(4200);
      cap('LEVEL UP','Progress: XP levels Mandu up from Pup to Trailblazer and unlocks new shop items.');app.showTab('progress');await sleep(3200);
      cap('SHOP','Shop: spend crumbs on gear. Mandu wears it right away.');app.showTab('shop');await sleep(800);
      for(const id of ['hat','bandana','bow']){const b=$('shop').querySelector('[data-buy="'+id+'"]');if(b&&!b.disabled){b.click();await sleep(1300)}}
      await sleep(1600);
      cap('ZOT!','Fellow Anteaters: type zot.');app.clickPlat('Any app');await typeIn('zot');await sleep(3600);
      cap('LOOP','That is the loop: Ask, Route, Reveal, Steer, Learn, level up. Your turn!');app.showTab('route');await sleep(4200);
    }catch(e){}
    clearInterval(tick);A.storage.restore(saved);location.reload();
  }
  function stop(){abort=true;$('tourCap').textContent='Stopping…'}
  A.tour={run,stop};
})(globalThis.AntRouter = globalThis.AntRouter || {});
```

- [ ] **Step 4: Create `src/app.js`**

```js
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
  let current=null, newQ=null;
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
      return `<div class="q${newQ===q.id?' new':''}"><b>${Q.t}</b><div class="qbar"><span style="width:${pct}%"></span></div><div class="meta"><span>${Math.min(q.n,Q.goal)} / ${Q.goal}</span><span>+${Q.rw} crumbs</span></div></div>`}).join('');newQ=null}
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
  game.on('quest',e=>{newQ=e.next;flagProgress()});
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
```

Behaviour notes for reviewers:
- `doRoute` no longer calls `think()`. The prototype set the "thinking" state and replaced it with "routing" in the same tick, so nothing was ever drawn.
- The "Bought …" toast now shows after the "Dressed up" badge toast instead of before it. Both still fire. This is an accepted, cosmetic difference.

- [ ] **Step 5: Syntax-check every script and run the tests**

Run: `for f in src/*.js; do node --check "$f" || exit 1; done && node --test`
Expected: no syntax errors; all tests PASS.

- [ ] **Step 6: Check for inline scripts and module syntax**

Run: `grep -nE "<script>|<script [^s]|type=\"module\"| on[a-z]+=\"" index.html; grep -nE "^\s*(import|export) " src/*.js`
Expected: no output.

- [ ] **Step 7: Smoke-test in a real browser**

Do this with the throwaway Playwright script from Task 7 Step 3, or by hand: double-click `index.html` and check that Mandu animates, all five tabs switch, a sample prompt routes and shows the result, and there are no console errors.

- [ ] **Step 8: Commit**

```bash
git add index.html css/app.css src/app.js src/tour.js
git commit -m "feat: tabbed layout with chat at the top, Mandu always visible"
```

---

### Task 6: Chrome extension popup

**Files:**
- Create: `manifest.json`, `tools/make-icons.ps1`, `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
- Modify: `css/app.css` (append the popup block)

**Interfaces:**
- Consumes: the popup flag `html.popup`, set by `src/app.js` (Task 5).

- [ ] **Step 1: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "AntRouter",
  "version": "0.1.0",
  "description": "Mandu the ASCII anteater picks the best AI model for your prompt: Claude, GPT or Gemini.",
  "action": {
    "default_popup": "index.html?popup",
    "default_title": "AntRouter",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

- [ ] **Step 2: Create `tools/make-icons.ps1` and run it**

```powershell
# Draws the extension icons: a gold ant glyph (ж) on a navy rounded square.
# Usage, from the repo root:  powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $root 'icons') | Out-Null
$navy = [System.Drawing.ColorTranslator]::FromHtml('#0E1424')
$gold = [System.Drawing.ColorTranslator]::FromHtml('#F5B82E')
foreach ($size in 16, 48, 128) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $d = [Math]::Max(4, [int]($size * 0.44)); $e = $size - $d - 1
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, $d, $d, 180, 90); $path.AddArc($e, 0, $d, $d, 270, 90)
  $path.AddArc($e, $e, $d, $d, 0, 90); $path.AddArc(0, $e, $d, $d, 90, 90); $path.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $navy), $path)
  $font = New-Object System.Drawing.Font 'Consolas', ([float]($size * 0.62)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
  $g.DrawString([string][char]0x0436, $font, (New-Object System.Drawing.SolidBrush $gold), (New-Object System.Drawing.RectangleF 0, 0, $size, $size), $fmt)
  $bmp.Save((Join-Path $root "icons/icon$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
```

Run: `powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1`
Expected: `icons/icon16.png`, `icons/icon48.png` and `icons/icon128.png` exist. Open `icon128.png` to eyeball it: a gold ж on a navy rounded square.

- [ ] **Step 3: Append the popup styles to `css/app.css`**

```css
/* ---- extension popup (html.popup is set by app.js) ---- */
html.popup body{width:780px;height:580px;overflow-y:auto}
html.popup .wrap{padding:12px 14px 20px}
html.popup .top h1{font-size:26px}
html.popup .top+.sub{display:none}
html.popup .tabbar{margin:12px 0}
html.popup .tourbtn,html.popup .tourbar{display:none}
html.popup .stage{grid-template-columns:1fr}
html.popup .side{position:static}
html.popup pre{padding:10px 0 8px}
html.popup .samples button{font-size:12px;padding:6px 9px}
```

- [ ] **Step 4: Validate the manifest**

Run: `node -e "const m=require('./manifest.json');const fs=require('fs');for(const p of Object.values(m.icons))if(!fs.existsSync(p))throw new Error('missing '+p);console.log('ok',m.manifest_version,m.action.default_popup)"`
Expected: `ok 3 index.html?popup`

- [ ] **Step 5: Commit**

```bash
git add manifest.json tools/make-icons.ps1 icons css/app.css
git commit -m "feat: load the same folder as a Chrome extension popup"
```

---

### Task 7: README, browser verification and PR

**Files:**
- Modify: `README.md` (the "Try it", "Repo layout" and "Publishing" sections; add "Chrome extension" and "Tests")

- [ ] **Step 1: Update `README.md`**

Replace the **Try it** section with:

```markdown
## Try it

- **Live prototype:** https://claude.ai/artifact/QukhYtx9aMp2BWc4KP9tMR
- **Run locally:** double-click `index.html`. No build step, no install, no API key.
- **Chrome extension:** open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick this folder. Click the AntRouter icon in the toolbar to open Mandu in a popup. Progress in the popup is saved separately from the website.
- **Watch the loop:** press **▶ 1-minute tour** on the website, or play [`media/antrouter-1min-tour.mp4`](media/antrouter-1min-tour.mp4).
```

Replace the **Repo layout** block with:

```
index.html                         the app page (website and extension popup)
manifest.json                      Chrome extension manifest (popup = index.html?popup)
css/app.css                        all styles, including the compact popup layout
src/models.js                      the 7 models, platforms and hand-off links
src/storage.js                     localStorage helpers (antrouter: keys)
src/router.js                      classify, score, learn from reroutes, explain (no page code)
src/game.js                        XP, crumbs, levels, quests, badges, shop
src/mandu.js                       Mandu's ASCII renderer and moods
src/result.js                      the result card
src/tour.js                        the 1-minute guided tour
src/app.js                         wires the page together: chat, tabs, panels
icons/, tools/make-icons.ps1       extension icons and the script that draws them
tests/                             node --test checks
versions/v1-before-progression/    earlier build, before belly ants, window buttons, levels and shop
docs/                              concept art, research, design spec and plan
media/antrouter-1min-tour.mp4      recording of the 1-minute guided tour
tools/record-tour.js               Playwright script that re-records the tour
```

After **Repo layout**, add:

```markdown
## Working on the code

- Every file in `src/` adds itself to one shared object, `AntRouter` (for example `AntRouter.router`). Don't use `import`/`export`, because they break double-clicking `index.html`.
- Don't put `<script>` code or `onclick="…"` attributes in `index.html`. Chrome extensions block them, so put code in `src/` instead.
- `index.html` loads the scripts in order: models, storage, router, game, mandu, result, tour, app. A new file goes before the files that use it.
- **Tests:** with Node installed, run `node --test` from this folder.
```

- [ ] **Step 2: Run the full automated check**

Run: `for f in src/*.js; do node --check "$f" || exit 1; done && node --test`
Expected: all PASS.

- [ ] **Step 3: Verify in a real browser (throwaway script, not committed)**

In a scratch directory **outside the repo**, run `npm init -y && npm i playwright && npx playwright install chromium`, then create `smoke.js` with `ROOT` set to the repo path:

```js
const { chromium } = require('playwright');
const path = require('path');
const ROOT = process.argv[2];
const url = 'file:///' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
(async () => {
  const errors = [];
  // Website
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push('site: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('screen').textContent.includes('trail:'));
  for (const t of ['trails', 'progress', 'shop', 'about', 'route']) {
    await page.click('#tab-' + t);
    if (await page.isHidden('#panel-' + t)) throw new Error('panel not shown: ' + t);
  }
  await page.click('#samples button:nth-child(1)');
  await page.waitForSelector('#result .pick');
  console.log('picked:', await page.textContent('#result h3'));
  await page.click('#result .chip:not(.on)');
  if (!(await page.textContent('#result')).includes('You rerouted to')) throw new Error('reroute failed');
  if (!(await page.getAttribute('#tab-progress', 'class')).includes('has-news')) throw new Error('no progress dot');
  await page.evaluate(() => { localStorage.setItem('antrouter:prog', JSON.stringify({ crumbs: 100 })); localStorage.setItem('antrouter:tab', '"shop"') });
  await page.reload();
  if (await page.isHidden('#panel-shop')) throw new Error('last tab not remembered');
  await page.click('[data-buy="hat"]');
  if (!(await page.textContent('#shop')).includes('Take off')) throw new Error('buy failed');
  await page.setViewportSize({ width: 375, height: 800 });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 375) throw new Error('horizontal scroll at 375px: ' + sw);
  await page.goto(url + '?popup');
  if (!(await page.evaluate(() => document.documentElement.classList.contains('popup')))) throw new Error('popup mode off');
  await browser.close();

  // Extension
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`] });
  const p = await ctx.newPage();
  await p.goto('chrome://extensions');
  const id = await p.evaluate(async () => (await chrome.developerPrivate.getExtensionsInfo()).find(e => e.name === 'AntRouter').id);
  await p.setViewportSize({ width: 780, height: 580 });
  p.on('pageerror', e => errors.push('popup: ' + e.message));
  await p.goto(`chrome-extension://${id}/index.html?popup`);
  await p.waitForFunction(() => document.getElementById('screen').textContent.includes('trail:'));
  await p.click('#samples button:nth-child(2)');
  await p.waitForSelector('#result .pick');
  if (!(await p.isHidden('#tourBtn'))) throw new Error('tour visible in popup');
  await ctx.close();

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('SMOKE OK');
})().catch(e => { console.error(e); process.exit(1) });
```

Run: `node smoke.js "<repo path>"`
Expected: prints the pick and `SMOKE OK`.

Then **manually** run the tour once on the website (about 60 s). Check that it switches tabs, buys gear, and restores the previous progress after it reloads. Note the result in the PR.

- [ ] **Step 4: Commit and push the branch, then open a PR**

```bash
git add README.md
git commit -m "docs: README for the tabbed site, extension and team conventions"
git push -u origin feature/tabs-and-extension
gh pr create --title "Tabbed website + Chrome extension popup" --body "<summary of the change, test results and the manual tour check>"
```
