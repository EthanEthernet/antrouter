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
