import { readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const criticalCss = `<style data-critical="home">
:root{--cream:#fff9f2;--paper:#fffdf9;--accent:#3c7b86;--accent-dark:#2b5f63;--teal:#264e52;--charcoal:#373431;--muted:#514b46;--line:#e9dfd4;--serif:"Zen Maru Gothic","Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,sans-serif;--sans:"Zen Maru Gothic","Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,sans-serif}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--charcoal);background:var(--cream);font-family:var(--sans);line-height:1.8;-webkit-font-smoothing:antialiased}img{display:block;width:100%;height:auto}a{color:inherit;text-decoration:none}.container{width:min(1160px,calc(100% - 48px));margin-inline:auto}.notice{background:linear-gradient(90deg,#e7f1ee,#fbfefd);color:var(--teal);font-family:var(--serif);font-size:13px}.notice__inner{min-height:38px;display:flex;align-items:center;gap:14px}.header{position:sticky;top:0;z-index:100;background:rgba(255,249,242,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.header__inner{min-height:82px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{font-family:Georgia,"Times New Roman","Yu Mincho",serif;font-weight:700;letter-spacing:.08em}.header__actions{display:flex;align-items:center;gap:12px}.button,.outline-button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 20px;border-radius:999px;font-weight:700}.button{background:var(--accent-dark);color:#fff}.outline-button{border:1px solid var(--accent-dark);color:var(--accent-dark);background:transparent}.hero{position:relative;overflow:hidden;padding:72px 0 82px;background:linear-gradient(135deg,#fffdf9 0%,#eef6f4 100%)}.hero__grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);align-items:center;gap:64px}.hero__copy h1{margin:12px 0 22px;font-family:var(--serif);font-size:clamp(42px,5.1vw,72px);line-height:1.18;letter-spacing:.02em}.hero__copy h1 span{display:block}.eyebrow{margin:0;color:var(--accent-dark);font-weight:700;letter-spacing:.08em}.hero__lead{font-size:18px;max-width:42rem}.hero__targets{color:var(--muted)}.hero__buttons{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:28px}.hero__cta-note{flex-basis:100%;margin:0;color:var(--muted);font-size:14px}.hero__visual{position:relative}.hero__image{overflow:hidden;border-radius:32px;box-shadow:0 18px 50px rgba(69,50,36,.11)}.hero__image img{aspect-ratio:5/6;object-fit:cover}.hero__badge{position:absolute;right:-12px;bottom:24px;display:flex;align-items:center;gap:9px;padding:12px 16px;border-radius:14px;background:#fff;color:var(--teal);box-shadow:0 8px 24px rgba(69,50,36,.12)}@media(max-width:820px){.container{width:min(100% - 32px,1160px)}.notice{display:none}.header__inner{min-height:68px}.header__actions .button,.header__actions .header__phone{display:none}.hero{padding:46px 0 56px}.hero__grid{grid-template-columns:1fr;gap:34px}.hero__copy h1{font-size:clamp(34px,10vw,48px)}.hero__lead{font-size:16px}.hero__visual{max-width:520px;margin-inline:auto}.hero__badge{right:8px;bottom:16px}.hero__buttons{align-items:stretch}.hero__buttons>.button,.hero__buttons>.outline-button{width:100%}}
</style>`;

const asyncCss = `<link rel="preload" href="./styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="./styles.css"></noscript>`;

const allFiles = await walk(root);
for (const file of allFiles.filter((file) => file.endsWith('.html'))) {
  let html = await readFile(file, 'utf8');
  const original = html;
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*<link\s+href="https:\/\/fonts\.googleapis\.com\/css2\?[^\"]+"\s+rel="stylesheet"\s*>/gs, '');
  if (path.relative(root, file) === 'index.html') {
    html = html.replace('<link rel="stylesheet" href="./styles.css">', `${criticalCss}\n    ${asyncCss}`);
  }
  if (html !== original) await writeFile(file, html);
}

const cssPath = path.join(root, 'styles.css');
let css = await readFile(cssPath, 'utf8');
css = css
  .replace('--serif: "Shippori Mincho", "Yu Mincho", serif;', '--serif: "Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Yu Gothic", Meiryo, sans-serif;')
  .replace('--sans: "Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", sans-serif;', '--sans: "Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Yu Gothic", Meiryo, sans-serif;')
  .replace('--muted: #5c5650;', '--muted: #514b46;');
await writeFile(cssPath, css);

const headersPath = path.join(root, '_headers');
let headers = await readFile(headersPath, 'utf8');
if (!headers.includes('/styles.css')) {
  headers = `${headers.trimEnd()}\n\n/styles.css\n  Cache-Control: public, max-age=31536000, immutable\n\n/script.js\n  Cache-Control: public, max-age=31536000, immutable\n`;
  await writeFile(headersPath, headers);
}
