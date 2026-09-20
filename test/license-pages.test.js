import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const decodeHtml = (value) => value
  .replaceAll('&gt;', '>')
  .replaceAll('&lt;', '<')
  .replaceAll('&amp;', '&');

function sourceLicenses(source) {
  const lines = source.replaceAll('\r\n', '\n').trimEnd().split('\n');
  const names = ['qrcode', 'jsQR', 'dijkstrajs'];
  return Object.fromEntries(names.map((name, index) => {
    const start = lines.indexOf(name) + 1;
    const end = index + 1 < names.length ? lines.indexOf(names[index + 1]) : lines.length;
    const text = lines.slice(start, end);
    while (text.at(-1) === '') text.pop();
    return [name, text.join('\n')];
  }));
}

test('HTML pages declare UTF-8 and use Japanese document language', async () => {
  for (const name of ['terms.html', 'qr-studio-license.html', 'licenses.html']) {
    const html = await readFile(new URL(`../dist/${name}`, import.meta.url), 'utf8');
    assert.match(html, /<html lang="ja">/);
    assert.match(html, /<meta charset="UTF-8">/);
  }
});

test('third-party license text in HTML matches licenses.txt', async () => {
  const source = await readFile(new URL('../dist/licenses.txt', import.meta.url), 'utf8');
  const html = await readFile(new URL('../dist/licenses.html', import.meta.url), 'utf8');
  for (const [name, expected] of Object.entries(sourceLicenses(source))) {
    const match = html.match(new RegExp(`<pre data-license="${name}">([\\s\\S]*?)</pre>`));
    assert.ok(match, `${name} license is present`);
    assert.equal(decodeHtml(match[1]), expected, `${name} license text is unchanged`);
  }
});

test('QR Studio license source copies remain identical', async () => {
  const [rootLicense, publishedText] = await Promise.all([
    readFile(new URL('../LICENSE', import.meta.url), 'utf8'),
    readFile(new URL('../dist/qr-studio-license.txt', import.meta.url), 'utf8'),
  ]);
  assert.equal(publishedText, rootLicense);
});
