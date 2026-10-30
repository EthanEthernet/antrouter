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

test('a save code moves progress to another copy of the app', () => {
  let S = load({ 'antrouter:prog': '{"xp":170,"crumbs":9}', 'antrouter:bias': '{"code:easy":{"gpt":0.08}}', 'other:key': 'x' });
  const code = S.exportSave();
  assert.match(code, /^ANTROUTER1:/);
  S = load({ 'antrouter:prog': '{"xp":3}', 'antrouter:tab': '"shop"' });
  assert.equal(S.importSave('  ' + code + '\n'), true);
  assert.equal(localStorage.getItem('antrouter:prog'), '{"xp":170,"crumbs":9}');
  assert.equal(localStorage.getItem('antrouter:bias'), '{"code:easy":{"gpt":0.08}}');
  assert.equal(localStorage.getItem('antrouter:tab'), null);
  assert.equal(localStorage.getItem('other:key'), null);
});

test('a broken or foreign save code is refused and changes nothing', () => {
  const S = load({ 'antrouter:prog': '{"xp":3}' });
  for (const bad of ['', 'hello', 'ANTROUTER1:not-base64!!', 'ANTROUTER1:' + Buffer.from('{"evil:key":"1"}').toString('base64'), 'ANTROUTER1:' + Buffer.from('[1,2]').toString('base64')])
    assert.equal(S.importSave(bad), false, bad);
  assert.equal(localStorage.getItem('antrouter:prog'), '{"xp":3}');
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
