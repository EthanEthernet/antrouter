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

test('reduced motion still redraws when Mandu routes, cheers and naps', () => {
  const { m, screen } = make();
  const sonnet = globalThis.AntRouter.models.MODELS.find(x => x.id === 'sonnet');
  m.routeTo(sonnet);
  assert.match(text(screen), /trail: \[ CLAUDE SONNET \]/);
  m.zot();
  assert.match(text(screen), /ZOT ZOT ZOT/);
  m.nap();
  assert.match(text(screen), /z z z/);
  assert.equal(m.busy(), false);
});

test('busy while following a trail, so a second route has to wait', () => {
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  const { m } = make({}, { reduce: false });
  m.routeTo(globalThis.AntRouter.models.MODELS[0]);
  assert.equal(m.busy(), true);
  m.stop();
});

test('loadBelly picks up a belly restored behind Mandu\'s back', () => {
  const { m, store, screen } = make({ belly: { Claude: 1, GPT: 0, Gemini: 0 } });
  store.set('belly', { Claude: 0, GPT: 2, Gemini: 2 });
  m.loadBelly();
  assert.deepEqual(m.belly(), { Claude: 0, GPT: 2, Gemini: 2 });
  assert.match(text(screen), /GPT 50%/);
});

test('calm mode holds the idle frame still', () => {
  let cb = null;
  globalThis.requestAnimationFrame = f => { cb = f; return 1 }; globalThis.cancelAnimationFrame = () => {};
  const { m, screen } = make({}, { reduce: false, calm: true });
  let now = performance.now();
  for (let i = 0; i < 60; i++) { now += 50; cb(now) }   // ~3s: settles after 0.6s
  const a = screen.innerHTML;
  for (let i = 0; i < 40; i++) { now += 50; cb(now) }
  assert.equal(screen.innerHTML, a);
  m.setCalm(false);
  for (let i = 0; i < 40; i++) { now += 50; cb(now) }
  assert.notEqual(screen.innerHTML, a);
  m.stop();
});

test('stopping mid-trail (hidden, minimized) lands the route instead of staying busy', () => {
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  let landed = 0;
  const { m } = make({}, { reduce: false, onLanded: () => landed++ });
  m.routeTo(globalThis.AntRouter.models.MODELS[0]);
  m.queueEat('Claude');
  m.stop();
  assert.equal(m.busy(), false);
  assert.equal(landed, 1);
  assert.deepEqual(m.belly(), { Claude: 1, GPT: 0, Gemini: 0 });
  m.stop();
  assert.equal(landed, 1);
  m.routeTo(globalThis.AntRouter.models.MODELS[3]);   // routed while stopped
  m.queueEat('GPT');
  assert.equal(m.busy(), false);
  assert.deepEqual(m.belly(), { Claude: 1, GPT: 1, Gemini: 0 });
});

test('status line keeps the mandu prefix', () => {
  const { m, status } = make();
  m.setStatus('exited');
  assert.equal(status.textContent, 'mandu — exited');
});
