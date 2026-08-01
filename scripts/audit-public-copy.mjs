import { readFile } from "node:fs/promises";
import { pages } from "./site-pages.mjs";

const root = new URL("../", import.meta.url);
const patterns = [
  { label: "料金確認日", regex: /料金確認日[：:]?[^<。]*/g },
  { label: "社内確認日", regex: /(?:内容|料金|情報|掲載|更新)確認日[：:]?[^<。]*/g },
  { label: "内部確認表現", regex: /(?:本人確認|確認済み|決定済み|要確認|承認待ち|検討中|未決定|仮設定|暫定|制作中|移管後|公開前|実装済み|反映済み)/g },
  { label: "開発ツール名", regex: /(?:ChatGPT|Codex|Claude Code|Cloud Code|GitHub|Cloudflare|Supabase|microCMS|リポジトリ|コミット|プルリクエスト|PR\s*#?\d*)/gi },
  { label: "開発者向け指示", regex: /(?:管理画面（スタッフ用）|スタッフ向け|開発担当者|運用担当者|コードを編集|環境変数|ビルド|デプロイ)/g },
];

const findings = [];
for (const page of pages) {
  const html = await readFile(new URL(page.file, root), "utf8");
  for (const { label, regex } of patterns) {
    regex.lastIndex = 0;
    for (const match of html.matchAll(regex)) {
      const start = Math.max(0, match.index - 70);
      const end = Math.min(html.length, match.index + match[0].length + 100);
      const context = html.slice(start, end).replace(/\s+/g, " ");
      findings.push(`${page.file}: ${label}: ${context}`);
    }
  }
}

if (findings.length) {
  console.error(`Public copy audit found ${findings.length} possible internal-only phrase(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Public copy audit passed.");
