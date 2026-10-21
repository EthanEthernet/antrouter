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
