import { readFile } from "node:fs/promises";
import { pages, siteUrl } from "./site-pages.mjs";

const root = new URL("../", import.meta.url);
const key = "fa47dccff6b545402cac78f9caf27469";
const headers = await readFile(new URL("_headers", root), "utf8");

if (/X-Robots-Tag:\s*noindex/i.test(headers)) {
  throw new Error("IndexNow submission stopped: switch the site to live indexing first.");
}

const host = new URL(siteUrl).host;
const payload = {
  host,
  key,
  keyLocation: `${siteUrl}/${key}.txt`,
  urlList: pages.map((page) => `${siteUrl}${page.path}`)
};

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload)
});

if (!response.ok && response.status !== 202) {
  const message = await response.text();
  throw new Error(`IndexNow submission failed (${response.status}): ${message}`);
}

console.log(`Submitted ${payload.urlList.length} URLs to IndexNow (${response.status}).`);
