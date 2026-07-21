import { readFile, writeFile } from "node:fs/promises";
import { pages, siteUrl } from "./site-pages.mjs";

const root = new URL("../", import.meta.url);
const imageAlt = "ANDANTINO｜和歌山の足と靴の相談室";

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [match[1], match[2]]));
}

function meta(html, key, value) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (attrs[key] === value) return attrs.content;
  }
}

for (const page of pages) {
  const url = new URL(page.file, root);
  let html = await readFile(url, "utf8");
  const title = meta(html, "property", "og:title");
  const description = meta(html, "property", "og:description");
  const image = meta(html, "property", "og:image");
  if (!title || !description || image !== `${siteUrl}/assets/og-image.png`) {
    throw new Error(`${page.file}: required Open Graph metadata is incomplete`);
  }

  html = html
    .replace(/<meta\s+property=["']og:image:alt["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:(?:title|description|image|image:alt)["'][^>]*>\s*/gi, "");

  const socialTags = [
    `<meta property="og:image:alt" content="${imageAlt}">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${imageAlt}">`
  ].join("");

  html = html.replace(
    /(<meta\s+name=["']twitter:card["']\s+content=["']summary_large_image["']\s*\/?\s*>)/i,
    `$1${socialTags}`
  );
  await writeFile(url, html);
}

console.log(`Synchronized Open Graph and Twitter metadata for ${pages.length} pages.`);
