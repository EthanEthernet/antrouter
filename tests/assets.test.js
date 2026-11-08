const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Browsers cache css/ and src/ for a while (GitHub Pages sends max-age=600). Every page links them with the same ?v=
// so a release never pairs new HTML with an old stylesheet. Bump the number in both pages when you ship.
const pages = ['index.html', 'extension.html'].map(f => [f, fs.readFileSync(path.join(__dirname, '..', f), 'utf8')]);

test('every local stylesheet and script link carries a version tag', () => {
  for (const [name, html] of pages) {
    const refs = [...html.matchAll(/(?:href|src)="((?:css|src)\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(refs.length > 0, name);
    for (const r of refs) assert.match(r, /\?v=\d+$/, `${name}: ${r}`);
  }
});

test('all pages use the same version tag', () => {
  const versions = new Set(pages.flatMap(([, html]) => [...html.matchAll(/(?:css|src)\/[^"]+\?v=(\d+)"/g)].map(m => m[1])));
  assert.equal(versions.size, 1, [...versions].join(', '));
});

test('every script in src/ that index.html needs exists', () => {
  const html = pages[0][1];
  for (const m of html.matchAll(/src="(src\/[^"?]+)\?v=\d+"/g))
    assert.ok(fs.existsSync(path.join(__dirname, '..', m[1])), m[1]);
});
