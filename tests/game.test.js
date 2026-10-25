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
  const g = G.createGame(memStore({ prog: { xp: 85 } }));
  assert.equal(g.levelInfo().name, 'Forager');
  assert.equal(g.state().crumbs, 0);
  assert.ok(Math.abs(g.levelInfo().progress - 0.25) < 1e-9);
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

test('max level takes about 30 plain routes, not 13', () => {
  const g = G.createGame(memStore());
  let n = 0;
  while (g.levelInfo().next && n < 100) { g.routed('Claude', { platform: 'any', task: 'fact' }); n++; }
  assert.ok(n >= 25, 'reached max level after only ' + n + ' routes');
});

test('only the first reroute of a result pays XP', () => {
  const g = G.createGame(memStore());
  g.routed('Claude', { platform: 'any', task: 'code' });
  const xp = g.state().xp;
  g.rerouted('GPT', { first: true, from: 'Claude' });
  const afterFirst = g.state().xp;
  assert.ok(afterFirst > xp);
  for (let i = 0; i < 10; i++) g.rerouted(i % 2 ? 'GPT' : 'Claude', { first: false, from: i % 2 ? 'Claude' : 'GPT' });
  assert.equal(g.state().xp, afterFirst);
});

test('a completed loop pays a small bonus', () => {
  const g = G.createGame(memStore());
  g.addLap();
  assert.equal(g.state().laps, 1);
  assert.equal(g.state().xp, 5);
  assert.equal(g.state().crumbs, 3);
});

test('the session recap counts only this session', () => {
  const g = G.createGame(memStore({ prog: { xp: 50, crumbs: 30, badges: ['zot'], laps: 2 } }));
  g.startSession(1000);
  g.routed('Claude', { platform: 'any', task: 'code' });
  g.rerouted('GPT', { first: true, from: 'Claude' });
  g.routed('Gemini', { platform: 'any', task: 'fact' });
  g.ratedGood();
  g.addLap();
  g.buy('bow');
  const s = g.sessionSummary(1000 + 95000);
  assert.equal(s.ms, 95000);
  assert.equal(s.routes, 2);
  assert.equal(s.reroutes, 1);
  assert.equal(s.goods, 1);
  assert.equal(s.laps, 1);
  assert.deepEqual(s.belly, { Claude: 0, GPT: 1, Gemini: 1 });
  assert.equal(s.levelFrom, 'Pup');
  assert.equal(s.levelTo, g.levelInfo().name);
  assert.equal(s.xp, g.state().xp - 50);
  assert.equal(s.spent, 10);
  assert.equal(s.earned, g.state().crumbs - 30 + 10);
  assert.ok(!s.badges.includes('Zot!'));
  assert.ok(s.badges.includes('First trail'));
});

test('reset wipes progress and emits change', () => {
  const g = G.createGame(memStore({ prog: { xp: 200, crumbs: 99 } }));
  let changes = 0; g.on('change', () => changes++);
  g.reset();
  assert.equal(g.state().xp, 0);
  assert.equal(changes, 1);
});
