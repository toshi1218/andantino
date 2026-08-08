// 旧URL→新URLの301が本当に効いているかを、実際のHTTPレスポンスで確認する。
//
// 使い方:
//   npm run redirects:verify                      本番（www.andantino-shoes.jp）を確認
//   npm run redirects:verify -- <URL>             切替前にPagesのプレビューURLで確認
//
// 独自ドメイン切替の前は、まだ旧サイトがDNSを握っているため本番URLでは
// 旧サイトの応答が返る。その段階では *.pages.dev のURLを渡して確認すること。
import { readFile } from "node:fs/promises";
import { siteUrl } from "./site-pages.mjs";

const root = new URL("../", import.meta.url);
const base = (process.argv[2] || siteUrl).replace(/\/$/, "");
const timeoutMs = Number(process.env.REDIRECT_TIMEOUT_MS || 15000);

// _redirects を唯一の正とし、そこから確認対象を組み立てる。
// 対応表を増やしたときにこのスクリプトを直す必要がないようにするため。
const lines = (await readFile(new URL("_redirects", root), "utf8"))
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const isProduction = base === siteUrl;
const allRules = lines
  .map((line) => line.split(/\s+/))
  .filter(([from, to, code]) => code === "301" && from && to);

// ホスト名を含む規則（apex → www）は本番ドメインでしか確認できない。
// 切替前にプレビューURLで確認するときは対象から外す。
const rules = allRules.filter(([from]) => isProduction || !from.startsWith("http"));
const skipped = allRules.length - rules.length;

// ワイルドカードを含む規則は代表パスを1つ作って確認する。
function probeFor([from, to]) {
  if (from.startsWith("http")) {
    const url = new URL(from.replace("/*", "/about"));
    return { url: url.href, expected: to.replace(":splat", "about"), label: from };
  }
  if (from.endsWith("/*")) {
    const sample = `${from.slice(0, -2)}/README.md`;
    return { url: `${base}${sample}`, expected: `${base}${to}`, label: from };
  }
  return { url: `${base}${from}`, expected: to.startsWith("http") ? to : `${base}${to}`, label: from };
}

async function head(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    return { status: response.status, location: response.headers.get("location") };
  } finally {
    clearTimeout(timer);
  }
}

function normalize(value, url) {
  if (!value) return "";
  return new URL(value, url).href.replace(/\/$/, "") || value;
}

const failures = [];
console.log(`確認先: ${base}`);
if (skipped) console.log(`（apex→wwwの規則${skipped}件は本番ドメインでのみ確認できるため省略しました）`);
console.log("");

for (const rule of rules) {
  const { url, expected, label } = probeFor(rule);
  let result;
  try {
    result = await head(url);
  } catch (error) {
    failures.push(`${label}: リクエスト失敗 (${error.message})`);
    console.log(`✗ ${label} → リクエスト失敗: ${error.message}`);
    continue;
  }
  const actual = normalize(result.location, url);
  const want = normalize(expected, url);
  const ok = result.status === 301 && actual === want;
  if (!ok) failures.push(`${label}: ${result.status} → ${result.location || "(Locationなし)"}（期待: 301 → ${expected}）`);
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(24)} ${result.status} → ${result.location || "(なし)"}`);
}

// 転送先が実際に200で開けることも確認する。301だけ合っていて
// 転送先が404という取りこぼしを防ぐため。
const targets = [...new Set(rules.map(([, to]) => to).filter((to) => to.startsWith("/") && !to.includes(":")))];
console.log("");
for (const target of targets) {
  const url = `${base}${target}`;
  let result;
  try {
    result = await head(url);
  } catch (error) {
    failures.push(`転送先 ${target}: リクエスト失敗 (${error.message})`);
    continue;
  }
  const ok = result.status === 200;
  if (!ok) failures.push(`転送先 ${target}: ${result.status}（期待: 200）`);
  console.log(`${ok ? "✓" : "✗"} 転送先 ${target.padEnd(24)} ${result.status}`);
}

if (failures.length) {
  console.error(`\n301の確認に失敗しました（${failures.length}件）:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`\n301の確認に成功しました: ${rules.length}件の規則と${targets.length}件の転送先。`);
