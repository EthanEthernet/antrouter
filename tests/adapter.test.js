const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/models.js');
require('../src/router.js');
require('../src/adapter.js');
const { adapter: AD, models } = globalThis.AntRouter;
const M = id => models.MODELS.find(m => m.id === id);
const ids = r => r.changes.map(c => c.id);

const ARTICLE = 'The ant colony optimization algorithm was introduced by Marco Dorigo in 1992. '.repeat(8).trim();

test('a short, clear prompt gets no changes', () => {
  const r = AD.adapt("What's the capital of Australia?", M('gflash'), 'fact');
  assert.deepEqual(r.changes, []);
  assert.equal(r.adapted, "What's the capital of Australia?");
  assert.equal(r.skip, null);
});

test('question before a long paste: moved after it for Claude and Gemini, kept at both ends for ChatGPT', () => {
  const p = 'What are the three main points of this article?\n\n' + ARTICLE;
  const claude = AD.adapt(p, M('sonnet'), 'summarize');
  assert.ok(ids(claude).includes('question-last'));
  assert.ok(claude.adapted.trim().endsWith('What are the three main points of this article?'));
  assert.ok(claude.adapted.startsWith('<document>'));
  const gem = AD.adapt(p, M('gpro'), 'summarize');
  assert.ok(gem.adapted.trim().endsWith('article?'));
  const gpt = AD.adapt(p, M('gpt'), 'summarize');
  assert.ok(ids(gpt).includes('question-both-ends'));
  assert.ok(gpt.adapted.startsWith('What are the three main points'));
  assert.ok(gpt.adapted.trim().endsWith('article?'));
});

test('pasted prose is wrapped in <document> but never changed', () => {
  const r = AD.adapt('Summarize the key points:\n\n' + ARTICLE, M('sonnet'), 'summarize');
  assert.ok(ids(r).includes('delimit'));
  assert.ok(r.adapted.includes('<document>\n' + ARTICLE + '\n</document>'));
});

test('code fences are already delimited: left alone, and CAPS inside code survive', () => {
  const code = '```js\nconst MUST_RUN = true; // NEVER change\n```';
  const r = AD.adapt('Why does this code fail? You MUST explain.\n\n' + code, M('opus'), 'code');
  assert.ok(r.adapted.includes(code));
  assert.ok(!ids(r).includes('delimit'));
  assert.ok(r.adapted.includes('You must explain.'));
});

test('CAPS and CRITICAL emphasis are toned down for Claude and ChatGPT, kept for Gemini; acronyms untouched', () => {
  const p = 'CRITICAL: You MUST NEVER use the API without a key. Use the NASA dataset.';
  const c = AD.adapt(p, M('sonnet'), 'code');
  assert.equal(c.adapted, 'You must never use the API without a key. Use the NASA dataset.');
  assert.ok(ids(c).includes('calm-emphasis'));
  assert.ok(ids(AD.adapt(p, M('gptmini'), 'code')).includes('calm-emphasis'));
  assert.equal(AD.adapt(p, M('gpro'), 'code').adapted, p);
});

test('a prompt typed entirely in capitals is not "fixed"', () => {
  const p = 'WHAT IS THE CAPITAL OF FRANCE? I MUST KNOW';
  assert.equal(AD.adapt(p, M('sonnet'), 'fact').adapted, p);
});

test('a single capitalized word is not treated as shouting', () => {
  const p = 'Is it NOT working when I run it? Help me debug';
  assert.equal(AD.adapt(p, M('sonnet'), 'code').adapted, p);
  assert.equal(AD.adapt('Answer with ONLY the number, VERY briefly', M('sonnet'), 'fact').changes.length, 0);
});

test('only explicit "Example:" lines next to a task count as examples', () => {
  assert.equal(AD.adapt('e.g.: this is not an example header, just text', M('haiku'), 'chat').changes.length, 0);
  assert.equal(AD.adapt('Example: what a lovely day', M('haiku'), 'chat').changes.length, 0);
});

test('"think step by step" is removed for strong tiers only, and "explain step by step" is kept', () => {
  const p = 'Solve 17 * 23. Let\'s think step by step.';
  const opus = AD.adapt(p, M('opus'), 'reason');
  assert.equal(opus.adapted, 'Solve 17 * 23.');
  assert.ok(ids(opus).includes('no-cot'));
  assert.equal(AD.adapt(p, M('haiku'), 'reason').adapted, p);
  const keep = 'Compare fixed vs floating exchange rates, step by step';
  assert.equal(AD.adapt(keep, M('gpt'), 'reason').adapted, keep);
});

test('examples the user wrote get <example> tags; none are invented', () => {
  const p = 'Classify the sentiment of a review.\n\nExample: "Great food" -> positive\n\nReview: "Cold fries"';
  const r = AD.adapt(p, M('sonnet'), 'chat');
  assert.ok(r.adapted.includes('<example>\nExample: "Great food" -> positive\n</example>'));
  assert.ok(ids(r).includes('tag-examples'));
  assert.equal((r.adapted.match(/<example>/g) || []).length, 1);
});

test('skips creative writing, edit/translate-the-paste requests and sensitive topics', () => {
  assert.match(AD.adapt('Write a poem. You MUST rhyme.', M('sonnet'), 'creative').skip, /creative/);
  assert.match(AD.adapt('Fix the grammar in this:\n\n' + ARTICLE, M('sonnet'), 'chat').skip, /edit/);
  assert.match(AD.adapt('Translate this to Spanish:\n\n' + ARTICLE, M('gpt'), 'chat').skip, /edit/);
  assert.match(AD.adapt('I keep thinking about suicide, what should I do? I MUST talk', M('sonnet'), 'chat').skip, /sensitive/);
  const s = AD.adapt('Write a poem. You MUST rhyme.', M('sonnet'), 'creative');
  assert.deepEqual(s.changes, []); assert.deepEqual(s.chips, []);
});

test('adapting an adapted prompt changes nothing more', () => {
  const p = 'CRITICAL: list the main points.\n\n' + ARTICLE;
  for (const id of ['sonnet', 'gpt', 'gpro']) {
    const once = AD.adapt(p, M(id), 'summarize');
    const twice = AD.adapt(once.adapted, M(id), 'summarize');
    assert.equal(twice.adapted, once.adapted, id);
  }
});

test('chips are optional, vendor-aware and only add what the user turns on', () => {
  const r = AD.adapt('Explain how vaccines train the immune system in detail', M('gpro'), 'reason');
  const chip = id => r.chips.find(c => c.id === id);
  assert.ok(chip('detail').suggested, 'Gemini + depth wording suggests more detail');
  assert.ok(chip('bullets'));
  assert.equal(AD.withChips(r, []), r.adapted);
  assert.equal(AD.withChips(r, ['bullets']), r.adapted + '\n\nFormat the answer as bullet points.');
  const opus = AD.adapt('Explain how vaccines work', M('opus'), 'reason');
  assert.ok(opus.chips.find(c => c.id === 'concise').suggested, 'Opus runs long, so a short-answer chip is suggested');
  assert.equal(AD.adapt('Explain how vaccines work as a bullet list', M('opus'), 'reason').chips.find(c => c.id === 'bullets'), undefined);
});

test('the "do instead of don\'t" chip is Claude-only and uses a fixed lookup table', () => {
  const p = "Explain recursion. Don't use markdown.";
  const c = AD.adapt(p, M('sonnet'), 'code');
  assert.ok(c.chips.find(x => x.id === 'positive'));
  assert.equal(AD.withChips(c, ['positive']), 'Explain recursion. Write in plain prose without markdown formatting.');
  assert.equal(AD.adapt(p, M('gpt'), 'code').chips.find(x => x.id === 'positive'), undefined);
});

test('every change and chip cites where it comes from', () => {
  const r = AD.adapt('CRITICAL: summarize this. Think step by step.\n\n' + ARTICLE, M('opus'), 'summarize');
  assert.ok(r.changes.length >= 3);
  for (const c of [...r.changes, ...r.chips]) assert.ok(c.why && c.why.length > 20, c.id);
  assert.match(AD.RULES_VERSION, /^\d{4}-\d{2}$/);
});

test('line diff marks removed and added lines', () => {
  const d = AD.diffLines('a\nb\nc', 'a\nc\nd');
  assert.deepEqual(d, [{ t: 'same', s: 'a' }, { t: 'del', s: 'b' }, { t: 'same', s: 'c' }, { t: 'ins', s: 'd' }]);
});
