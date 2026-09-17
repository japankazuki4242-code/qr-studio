import QRCode from 'qrcode';
import jsQR from 'jsqr';

export function normalizeUrl(input) {
  const value = input.trim();
  if (!value) throw new Error('WebサイトのURLを入力してください。');
  if (/\s/.test(value)) throw new Error('URLに空白や改行を含めることはできません。');
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) {
    throw new Error('http:// または https:// のURLを入力してください。');
  }
  let url;
  try { url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); }
  catch { throw new Error('URLの形式を確認してください。例：https://example.com'); }
  if (!url.hostname.includes('.') && url.hostname !== 'localhost' && !url.hostname.startsWith('[')) {
    throw new Error('Webサイトのドメイン名を入力してください。例：example.com');
  }
  if (url.username || url.password) throw new Error('ユーザー名やパスワードを含むURLは使用できません。');
  if (new TextEncoder().encode(url.href).length > 1200) throw new Error('URLが長すぎます。1,200バイト以内のURLをお使いください。');
  return url.href;
}

export function contrastOnWhite(hex) {
  const rgb = hex.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!rgb) return 1;
  const [r, g, b] = rgb.slice(1).map(x => {
    const n = parseInt(x, 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

export function createPixels(url, size, color) {
  if (![256, 512, 1024, 2048].includes(size)) throw new Error('画像サイズを選び直してください。');
  if (contrastOnWhite(color) < 4.5) throw new Error('この色は白背景に対して薄すぎます。もう少し濃い色を選んでください。');
  const code = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const count = code.modules.size;
  const scale = Math.floor(size / (count + 8));
  if (scale < 2) throw new Error('このURLには、より大きな画像サイズが必要です。512px以上を選んでください。');
  const offset = Math.floor((size - count * scale) / 2);
  const rgb = color.slice(1).match(/../g).map(x => parseInt(x, 16));
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!code.modules.get(row, col)) continue;
      for (let y = offset + row * scale; y < offset + (row + 1) * scale; y++) {
        for (let x = offset + col * scale; x < offset + (col + 1) * scale; x++) {
          const i = (y * size + x) * 4;
          data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2];
        }
      }
    }
  }
  return { data, size, symbolSize: count * scale };
}

export function decodePixels(data, width, height) {
  return jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data ?? null;
}
