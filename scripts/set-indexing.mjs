import { readFile, writeFile, readdir } from "node:fs/promises";
import { pages } from "./site-pages.mjs";

const root = new URL("../", import.meta.url);
const mode = process.argv[2];
const modes = {
  staging: "noindex,nofollow,nosnippet",
  live: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
};

if (!modes[mode]) {
  console.error("Usage: node scripts/set-indexing.mjs <staging|live>");
  process.exit(1);
}

for (const page of pages) {
  const url = new URL(page.file, root);
  const html = await readFile(url, "utf8");
  const robotsPattern = /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?\s*>/i;
  if (!robotsPattern.test(html)) throw new Error(`${page.file}: robots meta is missing`);
  const next = html.replace(
    robotsPattern,
    `<meta name="robots" content="${modes[mode]}">`
  );
  await writeFile(url, next);
}

// お役立ち記事（articles/*.html）は generate-articles.mjs が生成するため
// site-pages.mjs のページ定義には含まれない。生成済みの記事もここで一緒に
// 切り替えないと、公開に切り替えたあとも記事だけ noindex のまま残ってしまう。
let articleCount = 0;
try {
  const articleFiles = (await readdir(new URL("articles/", root))).filter((file) => file.endsWith(".html"));
  for (const file of articleFiles) {
    const url = new URL(`articles/${file}`, root);
    const html = await readFile(url, "utf8");
    const robotsPattern = /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?\s*>/i;
    if (!robotsPattern.test(html)) continue;
    await writeFile(url, html.replace(robotsPattern, `<meta name="robots" content="${modes[mode]}">`));
    articleCount += 1;
  }
} catch {
  // articles/ がまだ存在しない（記事を一度も公開していない）場合は何もしない。
}

const notFoundUrl = new URL("404.html", root);
const notFound = await readFile(notFoundUrl, "utf8");
await writeFile(
  notFoundUrl,
  notFound.replace(
    /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?\s*>/i,
    '<meta name="robots" content="noindex,nofollow,nosnippet">'
  )
);

const headersUrl = new URL("_headers", root);
let headers = await readFile(headersUrl, "utf8");
headers = headers.replace(/^  X-Robots-Tag:.*\n/m, "");
if (mode === "staging") {
  headers = headers.replace("/*\n", "/*\n  X-Robots-Tag: noindex, nofollow, nosnippet\n");
}
await writeFile(headersUrl, headers);

console.log(
  `Indexing mode set to ${mode} for ${pages.length} pages and ${articleCount} generated article page(s); 404 remains noindex.`
);
