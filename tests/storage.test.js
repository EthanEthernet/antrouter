const test = require('node:test');
const assert = require('node:assert/strict');

function fakeLocalStorage(init = {}) {
  const d = { ...init };
  return { get length() { return Object.keys(d).length }, key: i => Object.keys(d)[i] ?? null,
    getItem: k => k in d ? d[k] : null, setItem: (k, v) => { d[k] = String(v) }, removeItem: k => { delete d[k] }, data: d };
}
function load(init) {
  globalThis.localStorage = fakeLocalStorage(init);
  delete require.cache[require.resolve('../src/storage.js')];
  delete globalThis.AntRouter;
  require('../src/storage.js');
  return globalThis.AntRouter.storage;
}

test('the tour sandbox puts the viewer\'s save back when it ends', () => {
  const S = load({ 'antrouter:prog': '{"xp":77}', 'other:key': 'x' });
  S.beginSandbox();
  S.set('prog', { xp: 5 });
  S.set('bias', { code: {} });
  S.endSandbox();
  assert.equal(localStorage.getItem('antrouter:prog'), '{"xp":77}');
  assert.equal(localStorage.getItem('antrouter:bias'), null);
  assert.equal(localStorage.getItem('other:key'), 'x');
  assert.equal(S.inSandbox(), false);
});

test('a page closed mid-tour gets its save back on the next load', () => {
  let S = load({ 'antrouter:prog': '{"xp":77}' });
  S.beginSandbox();
  S.set('prog', { xp: 5 });
  // simulate a reload: same localStorage, fresh script
  const ls = globalThis.localStorage;
  delete require.cache[require.resolve('../src/storage.js')];
  delete globalThis.AntRouter;
  globalThis.localStorage = ls;
  require('../src/storage.js');
  S = globalThis.AntRouter.storage;
  assert.deepEqual(S.get('prog', null), { xp: 77 });
  assert.equal(S.inSandbox(), false);
});
