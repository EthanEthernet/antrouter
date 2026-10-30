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

test('first route pays a little XP plus the First trail badge and saves', () => {
  const s = memStore(), g = G.createGame(s), toasts = [];
  g.on('toast', m => toasts.push(m));
  g.routed('Claude', { platform: 'any', task: 'fact' });
  assert.equal(g.state().xp, 19);
  assert.equal(g.state().crumbs, 13);
  assert.equal(s.data.prog.xp, 19);
  assert.deepEqual(toasts, ['Badge: First trail  +10 crumbs']);
});

test('third route finishes a quest and rotates in the next quest', () => {
  const g = G.createGame(memStore()), quests = [];
  g.on('quest', e => quests.push(e));
  g.routed('Claude', { platform: 'any', task: 'fact' });
  g.routed('GPT', { platform: 'any', task: 'fact' });
  g.routed('Gemini', { platform: 'any', task: 'fact' });
  assert.equal(g.state().xp, 47);
  assert.equal(g.state().crumbs, 37);
  assert.equal(g.state().qdone, 1);
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
  assert.equal(g.canBuy('bandana'), false);
  assert.equal(g.canBuy('bow'), true);
  assert.equal(g.buy('bandana'), false);
  assert.equal(g.state().crumbs, 100);
  const poor = G.createGame(memStore({ prog: { crumbs: 5 } }));
  assert.equal(poor.canBuy('bow'), false);
  assert.equal(poor.buy('bow'), false);
});

test('XP rewards decisions: deciding loops level up far faster than routing alone', () => {
  const routeOnly = G.createGame(memStore());
  let a = 0;
  while (routeOnly.levelInfo().next && a < 200) { routeOnly.routed('Claude', { platform: 'any', task: 'fact' }); a++; }
  const decider = G.createGame(memStore());
  let b = 0;
  while (decider.levelInfo().next && b < 200) { decider.routed('Claude', { platform: 'any', task: 'fact' }); decider.ratedGood(); decider.opened(); decider.addLap(); b++; }
  assert.ok(a >= 60, 'route-only reached max after ' + a);
  assert.ok(b <= a / 3, `deciding took ${b} loops vs ${a} plain routes`);
});

test('levels unlock routing features and announce them', () => {
  const g = G.createGame(memStore({ prog: { xp: 55 } })), ups = [];
  g.on('levelup', e => ups.push(e));
  assert.equal(g.has('scores'), false);
  g.ratedGood();
  assert.equal(g.has('scores'), true);
  assert.equal(g.has('closecall'), false);
  assert.equal(ups[0].name, 'Forager');
  assert.match(ups[0].feature, /Score bars/);
  assert.deepEqual(ups[0].unlocked, ['UCI bandana']);
  const top = G.createGame(memStore({ prog: { xp: 300 } }));
  assert.ok(top.has('closecall') && top.has('dials'));
});

test('crumbs can be spent on routing help, not just gear', () => {
  const g = G.createGame(memStore({ prog: { crumbs: 10 } }));
  assert.equal(g.spend(6), true);
  assert.equal(g.state().crumbs, 4);
  assert.equal(g.spend(6), false);
  assert.equal(g.state().crumbs, 4);
  assert.equal(g.sessionSummary().spent, 6);
});

test('opening a pick in its app pays once and counts for its quest', () => {
  const g = G.createGame(memStore({ prog: { quests: [{ id: 'o1', n: 0 }, { id: 'rr1', n: 0 }, { id: 'p1', n: 0 }] } }));
  g.opened();
  assert.equal(g.state().xp, 10);
  assert.equal(g.state().qdone, 1);
});

test('reload picks up a save written by someone else (tour, save code)', () => {
  const s = memStore({ prog: { xp: 5 } }), g = G.createGame(s);
  s.set('prog', { xp: 170, crumbs: 9 });
  g.reload();
  assert.equal(g.levelInfo().name, 'Tracker');
  assert.equal(g.state().crumbs, 9);
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
