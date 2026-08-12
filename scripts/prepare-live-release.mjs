import { readFile, writeFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const OLD_HOST = "https://www.andantino-shoes.jp";
const NEW_HOST = "https://andantino-shoes.jp";

const textTargets = [
  "index.html",
  "about.html",
  "owner.html",
  "adult-shoes.html",
  "childrens-shoes.html",
  "products.html",
  "insoles.html",
  "pricing.html",
  "seminars.html",
  "for-professionals.html",
  "guides.html",
  "shoe-wearing.html",
  "foot-problems.html",
  "hallux-valgus.html",
  "tailors-bunion.html",
  "foot-arch.html",
  "leg-length-discrepancy.html",
  "knee-pain.html",
  "foot-check.html",
  "nordic-walking.html",
  "case-studies.html",
  "articles.html",
  "articles-children.html",
  "articles-adult.html",
  "articles-foot-problems.html",
  "articles-insoles.html",
  "articles-shoe-wearing.html",
  "online-consultation.html",
  "pdf-products.html",
  "faq.html",
  "contact.html",
  "news.html",
  "links.html",
  "privacy.html",
  "terms.html",
  "legal.html",
  "404.html",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  "scripts/site-pages.mjs"
];

for (const file of textTargets) {
  const url = new URL(file, root);
  try {
    const current = await readFile(url, "utf8");
    const next = current.split(OLD_HOST).join(NEW_HOST);
    if (next !== current) await writeFile(url, next);
  } catch {
    // Optional/generated files may not exist yet.
  }
}

try {
  const articleFiles = (await readdir(new URL("articles/", root))).filter((file) => file.endsWith(".html"));
  for (const file of articleFiles) {
    const url = new URL(`articles/${file}`, root);
    const current = await readFile(url, "utf8");
    const next = current.split(OLD_HOST).join(NEW_HOST);
    if (next !== current) await writeFile(url, next);
  }
} catch {
  // No generated article directory yet.
}

console.log(`Canonical host normalized: ${OLD_HOST} -> ${NEW_HOST}`);
