import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const footer = (current) => `  <footer><span class="footer-brand">QR STUDIO</span><div>生成したQR画像は個人・商用用途で利用できます。<br>画像はご自身で利用する権利のあるものをお使いください。<br>QRコードは株式会社デンソーウェーブの登録商標です。</div><nav class="footer-links" aria-label="利用条件とライセンス"><a href="./terms.html"${current === 'terms' ? ' aria-current="page"' : ''}>利用条件</a><a href="./licenses.html"${current === 'licenses' ? ' aria-current="page"' : ''}>第三者ライセンス</a></nav></footer>`;

function page({ title, description, skipTarget, skipLabel, body, current }) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#111111">
  <meta name="description" content="${description}">
  <title>${title} — QR Studio</title>
  <link rel="icon" href="./favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <a class="skip" href="#${skipTarget}">${skipLabel}</a>
  <header class="header"><a href="./" class="brand" aria-label="QR Studio ホーム"><span class="brand-icon" aria-hidden="true">▦</span> QR <strong>STUDIO</strong></a><span class="local-badge">端末内で処理</span></header>
${body}
${footer(current)}
</body>
</html>
`;
}

function parseQrLicense(source) {
  const lines = source.replaceAll('\r\n', '\n').trimEnd().split('\n');
  const sections = [];
  let current;

  for (const line of lines.slice(4)) {
    if (/^\d+\. /.test(line)) {
      current = { heading: line, lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }

  const renderSection = ({ heading, lines: sectionLines }) => {
    const blocks = [];
    let paragraph = [];
    let list = [];
    const flushParagraph = () => {
      if (paragraph.length) blocks.push(`<p>${escapeHtml(paragraph.join(''))}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (list.length) blocks.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
      list = [];
    };

    for (const line of [...sectionLines, '']) {
      if (line.startsWith('・')) {
        flushParagraph();
        list.push(line.slice(1));
      } else if (line === '') {
        flushParagraph();
        flushList();
      } else {
        flushList();
        paragraph.push(line);
      }
    }

    const id = `section-${heading.match(/^\d+/)[0]}`;
    return `    <section aria-labelledby="${id}">
      <h2 id="${id}">${escapeHtml(heading)}</h2>
      ${blocks.join('\n      ')}
    </section>`;
  };

  return {
    title: lines[0],
    copyright: lines[2],
    sections: sections.map(renderSection).join('\n'),
  };
}

function extractThirdPartyLicenses(source) {
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

const qrSource = await readFile(path.join(root, 'LICENSE'), 'utf8');
const qr = parseQrLicense(qrSource);
const qrBody = `  <main class="terms-page license-page">
    <div class="page-heading">
      <p class="eyebrow">OFFICIAL LICENSE TERMS</p>
      <h1 id="license-title" tabindex="-1">${escapeHtml(qr.title)}</h1>
      <p class="license-copyright">${escapeHtml(qr.copyright)}</p>
    </div>
${qr.sections}
    <nav class="page-links" aria-label="関連ページ">
      <a href="./">QR Studioへ戻る</a>
      <a href="./terms.html">利用条件へ戻る</a>
    </nav>
  </main>`;

const thirdPartySource = await readFile(path.join(dist, 'licenses.txt'), 'utf8');
const licenses = extractThirdPartyLicenses(thirdPartySource);
const libraryData = [
  ['qrcode', '入力されたURLからQRコードのデータと画像を生成するために使用しています。', 'MIT License'],
  ['jsQR', '生成したQRコードを画像データから読み取り、入力URLと一致するか確認するために使用しています。', 'Apache License 2.0'],
  ['dijkstrajs', 'qrcodeがQRコード内部のデータ配置を処理する際に使用する依存ライブラリです。', 'MIT License'],
];
const licenseCards = libraryData.map(([name, usage, licenseName]) => `    <article class="license-card" aria-labelledby="${name.toLowerCase()}-title">
      <div class="license-summary">
        <h2 id="${name.toLowerCase()}-title">${name}</h2>
        <dl><div><dt>使用目的</dt><dd>${usage}</dd></div><div><dt>ライセンス</dt><dd>${licenseName}</dd></div></dl>
      </div>
      <h3>正式なライセンス本文（英語）</h3>
      <pre data-license="${name}">${escapeHtml(licenses[name])}</pre>
    </article>`).join('\n');
const thirdPartyBody = `  <main class="terms-page licenses-page">
    <div class="page-heading">
      <p class="eyebrow">OPEN SOURCE LICENSES</p>
      <h1 id="licenses-title" tabindex="-1">第三者ライセンス</h1>
      <p class="page-lead">QR Studioでは以下のオープンソースライブラリを使用しています。各ライブラリには、それぞれのライセンスが適用されます。以下の英語本文は各ライセンスの正式な表示です。</p>
      <p class="source-link"><a href="./licenses.txt">ライセンス原文（テキスト）</a></p>
    </div>
${licenseCards}
    <nav class="page-links" aria-label="関連ページ">
      <a href="./">QR Studioへ戻る</a>
      <a href="./terms.html">利用条件へ戻る</a>
    </nav>
  </main>`;

await Promise.all([
  writeFile(path.join(dist, 'qr-studio-license.html'), page({
    title: 'QR Studio 独自部分の利用条件',
    description: 'QR Studio独自部分の正式な利用条件です。',
    skipTarget: 'license-title',
    skipLabel: '利用条件本文へスキップ',
    body: qrBody,
    current: null,
  })),
  writeFile(path.join(dist, 'licenses.html'), page({
    title: '第三者ライセンス',
    description: 'QR Studioで使用しているオープンソースライブラリの著作権表示とライセンス本文です。',
    skipTarget: 'licenses-title',
    skipLabel: '第三者ライセンス本文へスキップ',
    body: thirdPartyBody,
    current: 'licenses',
  })),
]);
