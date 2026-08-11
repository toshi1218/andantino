import { readFile } from "node:fs/promises";
import { pages, siteUrl } from "./site-pages.mjs";

const root = new URL("../", import.meta.url);
const redirectsText = await readFile(new URL("_redirects", root), "utf8");
const headersText = await readFile(new URL("_headers", root), "utf8");

const requiredRedirects = new Map([
  ["/index.php", "/"],
  ["/index.html", "/"],
  ["/about.php", "/about.html"],
  ["/selection.php", "/adult-shoes.html"],
  ["/childrenshoes.php", "/childrens-shoes.html"],
  ["/product.php", "/products.html"],
  ["/insole.php", "/insoles.html"],
  ["/seminar.php", "/seminars.html"],
  ["/contact.php", "/contact.html"],
  ["/dimoco-insole.html", "/dymoco-insole.html"]
]);

const redirectLines = redirectsText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const redirects = new Map();
for (const line of redirectLines) {
  const [from, to, status] = line.split(/\s+/);
  if (!from || !to || !status) continue;
  redirects.set(from, { to, status });
}

const errors = [];
for (const [from, to] of requiredRedirects) {
  const rule = redirects.get(from);
  if (!rule) {
    errors.push(`Missing legacy redirect: ${from} -> ${to}`);
    continue;
  }
  if (rule.to !== to || rule.status !== "301") {
    errors.push(`Invalid legacy redirect: ${from} expected ${to} 301, got ${rule.to} ${rule.status}`);
  }
}

const knownPaths = new Set(pages.map((page) => page.path));
knownPaths.add("/");
for (const [from, rule] of redirects) {
  if (from.startsWith("/docs/") || from.startsWith("/scripts/") || from.startsWith("/package") || from.startsWith("/README") || from.startsWith("/.")) continue;
  if (rule.to.startsWith("/") && !knownPaths.has(rule.to)) {
    errors.push(`Redirect target is not a declared page: ${from} -> ${rule.to}`);
  }
}

for (const page of pages) {
  const html = await readFile(new URL(page.file, root), "utf8");
  const expectedCanonical = `${siteUrl}${page.path}`;
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  if (canonical !== expectedCanonical) {
    errors.push(`${page.file}: canonical expected ${expectedCanonical}, got ${canonical ?? "missing"}`);
  }
  if (!/<meta\s+name=["']robots["']\s+content=["'][^"']+["']/i.test(html)) {
    errors.push(`${page.file}: robots meta missing`);
  }
}

if (!headersText.includes("X-Robots-Tag: noindex, nofollow, nosnippet")) {
  console.warn("NOTE: _headers is not in staging noindex mode. This is expected only after production launch.");
}

if (errors.length) {
  console.error("Migration audit failed:\n" + errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}

console.log(`Migration audit passed: ${requiredRedirects.size} legacy redirects and ${pages.length} canonical pages verified.`);
