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
