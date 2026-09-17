import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, contrastOnWhite, createPixels, decodePixels } from '../src/qr.js';

test('HTTP URLs, IDNs, query strings and fragments round-trip', () => {
  for (const input of ['example.com', 'example.com:8080/path', 'localhost:3000', 'https://example.com/?a=1&b=2#hello', 'http://example.org/path', 'https://日本語.jp/こんにちは']) {
    const url = normalizeUrl(input);
    const { data, size } = createPixels(url, 512, '#111111');
    assert.equal(decodePixels(data, size, size), url);
  }
});
test('unsafe or invalid URL inputs are rejected', () => {
  for (const input of ['', 'hello', 'javascript:alert(1)', 'data:text/html,test', 'file:///a', 'ftp://example.com', 'https://user:secret@example.com', 'https://example.com/has space', `https://example.com/${'x'.repeat(1300)}`]) {
    assert.throws(() => normalizeUrl(input));
  }
});
test('all sizes and preset colors decode, including a central image area', () => {
  const url = normalizeUrl('https://example.com/qr-studio');
  for (const size of [256, 512, 1024, 2048]) {
    for (const color of ['#111111', '#b94700', '#234d83', '#22634c', '#70419a']) {
      assert.ok(contrastOnWhite(color) >= 4.5);
      const pixels = createPixels(url, size, color);
      const edge = Math.floor(pixels.symbolSize * 0.2);
      const start = Math.floor((size - edge) / 2);
      for (let y = start; y < start + edge; y++) {
        for (let x = start; x < start + edge; x++) {
          const i = (y * size + x) * 4;
          pixels.data[i] = 255; pixels.data[i + 1] = 255; pixels.data[i + 2] = 255;
        }
      }
      assert.equal(decodePixels(pixels.data, size, size), url, `${size} ${color}`);
    }
  }
});
test('light colors and non-supported sizes fail clearly', () => {
  assert.throws(() => createPixels('https://example.com', 512, '#ffffff'), /薄すぎ/);
  assert.throws(() => createPixels('https://example.com', 300, '#111111'), /サイズ/);
});
