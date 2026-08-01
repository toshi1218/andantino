import { readFile } from "node:fs/promises";
import { pages } from "./site-pages.mjs";

const root = new URL("../", import.meta.url);
const patterns = [
  { label: "料金確認日", regex: /料金確認日/g },
  { label: "社内確認日", regex: /社内確認日/g },
  { label: "スタッフ用管理画面", regex: /管理画面（スタッフ用）/g },
  { label: "開発ツール名", regex: /(?:ChatGPT|Codex|Claude Code|Cloud Code|GitHub|Cloudflare|Supabase|microCMS)/gi },
  { label: "開発作業用語", regex: /(?:リポジトリ|コミット|プルリクエスト)/g },
];

const toVisibleText = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findings = [];
for (const page of pages) {
  const html = await readFile(new URL(page.file, root), "utf8");
  const visibleText = toVisibleText(html);
  for (const { label, regex } of patterns) {
    regex.lastIndex = 0;
    for (const match of visibleText.matchAll(regex)) {
      const start = Math.max(0, match.index - 55);
      const end = Math.min(visibleText.length, match.index + match[0].length + 80);
      findings.push(`${page.file}: ${label}: ${visibleText.slice(start, end)}`);
    }
  }
}

if (findings.length) {
  console.error(`Public copy audit found ${findings.length} internal-only phrase(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Public copy audit passed.");
