import { normalizeUrl, contrastOnWhite, createPixels, decodePixels } from './qr.js';

const $ = id => document.getElementById(id);
const editor = $('editor');
const qr = $('qr');
let logo = null;
let imageRequest = 0;
let revision = 0;
let generated = null;
let imageLoading = false;
let busy = false;

function setStatus(text) { $('status').textContent = text; }
function invalidate() {
  revision++;
  generated = null;
  $('download').disabled = true;
  $('share').disabled = true;
  $('preview-badge').textContent = qr.hidden ? '未作成' : '変更あり';
  $('preview-badge').classList.remove('ready');
  if (!qr.hidden) setStatus('設定が変更されました。「QRコードを作成」で更新してください。');
}

editor.addEventListener('input', event => {
  if (event.target.id === 'image') return;
  invalidate();
  if (event.target.id === 'url') { $('url-error').hidden = true; $('url').removeAttribute('aria-invalid'); }
});
$('size').addEventListener('change', invalidate);
$('color').addEventListener('input', () => {
  document.querySelectorAll('.swatch').forEach(button => {
    const active = button.dataset.color === $('color').value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const lowContrast = contrastOnWhite($('color').value) < 4.5;
  $('color-hint').textContent = lowContrast ? 'この色は薄すぎます。作成するには濃い色を選んでください。' : '読み取りやすい、白背景と濃い色の組み合わせ。';
  $('color-hint').classList.toggle('error', lowContrast);
});
document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click', () => {
  $('color').value = button.dataset.color;
  $('color').dispatchEvent(new Event('input', { bubbles: true }));
}));

function clearLogo() {
  imageRequest++;
  logo = null;
  imageLoading = false;
  $('image').value = '';
  $('image-name').textContent = '画像を選択';
  $('image-status').textContent = '画像なしで作成できます。';
  $('remove-image').hidden = true;
  $('image-error').hidden = true;
  $('generate').disabled = busy;
  invalidate();
}
$('remove-image').addEventListener('click', clearLogo);
$('image').addEventListener('change', async () => {
  const file = $('image').files[0];
  if (!file) return;
  clearLogo();
  const request = imageRequest;
  let objectUrl;
  imageLoading = true;
  $('generate').disabled = true;
  $('image-status').textContent = '画像を読み込み中…';
  try {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('PNG・JPEG・WebPの画像を選んでください。HEICはJPEGに変換してお使いください。');
    if (file.size > 10 * 1024 * 1024) throw new Error('画像は10MB以下にしてください。');
    objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = objectUrl;
    try { await image.decode(); }
    catch { throw new Error('画像を読み込めませんでした。別の画像を選ぶか、PNG・JPEGで保存し直してください。'); }
    if (request !== imageRequest) return;
    if (image.naturalWidth * image.naturalHeight > 24_000_000) throw new Error('画像の画素数が大きすぎます。2,400万画素以下に縮小してください。');
    const thumbnail = document.createElement('canvas');
    const ratio = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    thumbnail.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    thumbnail.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    thumbnail.getContext('2d').drawImage(image, 0, 0, thumbnail.width, thumbnail.height);
    logo = thumbnail;
    $('image-name').textContent = file.name;
    $('image-status').textContent = '中央に小さく配置します。';
    $('remove-image').hidden = false;
  } catch (error) {
    if (request !== imageRequest) return;
    $('image-error').textContent = error.message || '画像を読み込めませんでした。別の画像をお試しください。';
    $('image-error').hidden = false;
    $('image-status').textContent = '画像なしで作成できます。';
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (request === imageRequest) { imageLoading = false; $('generate').disabled = busy; }
  }
});

function drawLogo(canvas, image, symbolSize) {
  const ctx = canvas.getContext('2d');
  // Cover at most 20% of the symbol's width (4% of its area).
  const backgroundSize = Math.floor(symbolSize * 0.20);
  const available = backgroundSize * 0.8;
  const ratio = Math.min(available / image.width, available / image.height);
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);
  ctx.fillStyle = '#fff';
  ctx.fillRect(Math.floor((canvas.width - backgroundSize) / 2), Math.floor((canvas.height - backgroundSize) / 2), backgroundSize, backgroundSize);
  ctx.drawImage(image, Math.floor((canvas.width - width) / 2), Math.floor((canvas.height - height) / 2), width, height);
}

editor.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || imageLoading) return;
  invalidate();
  const currentRevision = revision;
  let url;
  try { url = normalizeUrl($('url').value); }
  catch (error) {
    $('url-error').textContent = error.message;
    $('url-error').hidden = false;
    $('url').setAttribute('aria-invalid', 'true');
    $('url').focus();
    return;
  }
  busy = true;
  $('generate').disabled = true;
  $('generate').textContent = '作成・読み取り確認中…';
  setStatus('QRコードを作成し、読み取りを確認しています…');
  const size = Number($('size').value);
  const color = $('color').value;
  const image = logo;
  try {
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (revision !== currentRevision) return;
    const pixels = createPixels(url, size, color);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.getContext('2d').putImageData(new ImageData(pixels.data, size, size), 0, 0);
    if (image) drawLogo(canvas, image, pixels.symbolSize);
    // Bound the decoder workload on phones while checking the composed image.
    const check = document.createElement('canvas');
    check.width = check.height = Math.min(size, 1024);
    check.getContext('2d').drawImage(canvas, 0, 0, check.width, check.height);
    const checkPixels = check.getContext('2d').getImageData(0, 0, check.width, check.height);
    if (decodePixels(checkPixels.data, check.width, check.height) !== url) {
      throw new Error('読み取りを確認できませんでした。画像を外すか、色を濃くし、サイズを大きくして再作成してください。');
    }
    const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('画像の保存準備に失敗しました。')), 'image/png'));
    if (revision !== currentRevision) return;
    generated = { file: new File([blob], `qr-studio-${size}.png`, { type: 'image/png' }), url };
    qr.width = qr.height = size;
    qr.getContext('2d').drawImage(canvas, 0, 0);
    qr.hidden = false;
    $('empty-state').hidden = true;
    $('result-size').textContent = `${size} × ${size} px`;
    $('result-url').textContent = url;
    $('preview-badge').textContent = '作成済み';
    $('preview-badge').classList.add('ready');
    $('download').disabled = false;
    $('share').disabled = false;
    setStatus('作成できました。画像の読み取り確認も完了しています。');
    if (matchMedia('(max-width: 700px)').matches) $('preview-title').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  } catch (error) {
    if (revision === currentRevision) {
      $('preview-badge').textContent = '要確認';
      setStatus(error.message || '作成できませんでした。設定を確認して再度お試しください。');
    }
  } finally {
    busy = false;
    $('generate').disabled = imageLoading;
    $('generate').innerHTML = 'QRコードを作成 <span aria-hidden="true">↗</span>';
  }
});

function download() {
  if (!generated) return;
  const url = URL.createObjectURL(generated.file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = generated.file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  setStatus('PNG画像の保存を開始しました。端末のダウンロード先をご確認ください。');
}
$('download').addEventListener('click', download);
$('share').addEventListener('click', async () => {
  if (!generated) return;
  const file = generated.file;
  if (!navigator.canShare?.({ files: [file] }) || !navigator.share) {
    download();
    setStatus('このブラウザーでは画像共有に対応していないため、PNGを保存します。保存した画像をLINEやメールに添付してください。');
    return;
  }
  try {
    await navigator.share({ files: [file], title: 'QR Studio' });
    setStatus('端末の共有操作が完了しました。');
  } catch (error) {
    setStatus(error.name === 'AbortError' ? '共有をキャンセルしました。画像は引き続き保存・共有できます。' : '共有できませんでした。「PNGを保存」から保存して添付してください。');
  }
});
