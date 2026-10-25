const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/audio.js');

function memStore(init = {}) {
  const d = { ...init };
  return { get: (k, f) => k in d ? d[k] : f, set: (k, v) => { d[k] = v }, data: d };
}

test('playing without Web Audio (or before a click) is a silent no-op', () => {
  const sfx = globalThis.AntRouter.audio.createAudio(memStore());
  assert.doesNotThrow(() => { sfx.play('gulp'); sfx.play('levelup'); sfx.play('not-a-sound'); });
});

test('mute is remembered', () => {
  const s = memStore();
  const sfx = globalThis.AntRouter.audio.createAudio(s);
  assert.equal(sfx.muted(), false);
  sfx.setMuted(true);
  assert.equal(s.data.muted, true);
  assert.equal(globalThis.AntRouter.audio.createAudio(s).muted(), true);
});

test('every sound the page uses exists', () => {
  const names = globalThis.AntRouter.audio.SOUNDS;
  for (const n of ['tap', 'route', 'gulp', 'good', 'hmm', 'coin', 'levelup', 'quest', 'badge', 'zot', 'pet', 'nap', 'start', 'end', 'lap', 'nope'])
    assert.ok(names.includes(n), n);
});
