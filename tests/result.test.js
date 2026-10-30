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

test('every pick says how sure Mandu is', () => {
  assert.match(result.resultHTML(pick('Fix this off-by-one bug in my Python loop'), 'any'), /Likely pick/);
  assert.match(result.resultHTML(pick('why is my Python loop slow'), 'any'), /Close call.*code and reasoning/s);
});

test('scores show on the chips only once unlocked', () => {
  const c = pick('Fix this off-by-one bug in my Python loop');
  assert.doesNotMatch(result.resultHTML(c, 'any'), /class="score"/);
  assert.match(result.resultHTML(c, 'any', { scores: true }), /Claude Sonnet<span class="score">84<\/span>/);
});

test('second opinion: a paid button, free on close calls at Tracker, then the comparison', () => {
  const c = pick('Fix this off-by-one bug in my Python loop');
  assert.match(result.resultHTML(c, 'any', { secondCost: 6, crumbs: 10 }), /id="second"[^>]*>Second opinion · 6 crumbs/);
  assert.match(result.resultHTML(c, 'any', { secondCost: 6, crumbs: 2 }), /id="second" disabled/);
  const close = pick('why is my Python loop slow');
  assert.match(result.resultHTML(close, 'any', { closecall: true, secondCost: 6 }), /class="second".*Runner-up/s);
  c.second = true;
  assert.match(result.resultHTML(c, 'any', { secondCost: 6 }), /Claude Opus scored 77/);
  assert.doesNotMatch(result.resultHTML(c, 'any', { secondCost: 6 }), /id="second"/);
});

test('platform mode lists only that family', () => {
  const h = result.resultHTML(pick('Fix this off-by-one bug in my Python loop', 'claude'), 'claude');
  assert.match(h, /data-id="opus"/);
  assert.doesNotMatch(h, /data-id="gpt"/);
  assert.match(h, /Claude \(you are in this app\)/);
});
