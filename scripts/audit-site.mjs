import { readFile, access } from "node:fs/promises";
import { pages, siteUrl } from "./site-pages.mjs";

const root = new URL("../", import.meta.url);
const errors = [];
const titles = new Map();
const descriptions = new Map();
const definedEntityIds = new Set();
const referencedEntityIds = [];
const stagingRobots = "noindex,nofollow,nosnippet";
const stagingRobotsHeader = "noindex, nofollow, nosnippet";
const liveRobots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
const socialImage = `${siteUrl}/assets/og-image.png`;
const socialImageAlt = "ANDANTINO｜和歌山の足と靴の相談室";
const headers = await readFile(new URL("_headers", root), "utf8");
const isStaging = headers.includes(`X-Robots-Tag: ${stagingRobotsHeader}`);
const expectedRobots = isStaging ? stagingRobots : liveRobots;

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [m[1], m[2]]));
}

function meta(html, key, value) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (attrs[key] === value) return attrs.content;
  }
}

function link(html, rel) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (attrs.rel === rel) return attrs.href;
  }
}

function collectTypes(value, types = []) {
  if (!value || typeof value !== "object") return types;
  if (value["@type"]) types.push(...(Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]]));
  for (const child of Object.values(value)) collectTypes(child, types);
  return types;
}

function collectObjects(value, objects = []) {
  if (!value || typeof value !== "object") return objects;
  if (!Array.isArray(value)) objects.push(value);
  for (const child of Object.values(value)) collectObjects(child, objects);
  return objects;
}

for (const page of pages) {
  const html = await readFile(new URL(page.file, root), "utf8");
  const expectedUrl = `${siteUrl}${page.path}`;

  if (!/<html\s+lang=["']ja["']/i.test(html)) fail(page.file, "html lang must be ja");

  const titleMatches = [...html.matchAll(/<title>([^<]+)<\/title>/gi)];
  if (titleMatches.length !== 1) fail(page.file, `expected one title, found ${titleMatches.length}`);
  else {
    const title = titleMatches[0][1].trim();
    const titleLength = [...title].length;
    if (titleLength < 10 || titleLength > 60) fail(page.file, `title length is ${titleLength}; expected 10–60 characters`);
    if (titles.has(title)) fail(page.file, `duplicate title also used by ${titles.get(title)}`);
    titles.set(title, page.file);
  }

  const description = meta(html, "name", "description");
  if (!description) fail(page.file, "missing meta description");
  else {
    const descriptionLength = [...description].length;
    if (descriptionLength < 40 || descriptionLength > 160) fail(page.file, `description length is ${descriptionLength}; expected 40–160 characters`);
    if (descriptions.has(description)) fail(page.file, `duplicate description also used by ${descriptions.get(description)}`);
    descriptions.set(description, page.file);
  }

  if (link(html, "canonical") !== expectedUrl) fail(page.file, `canonical must be ${expectedUrl}`);
  if (!link(html, "icon")) fail(page.file, "missing favicon link");
  if (!link(html, "apple-touch-icon")) fail(page.file, "missing apple-touch-icon link");
  if (!link(html, "manifest")) fail(page.file, "missing web manifest link");
  if (meta(html, "property", "og:url") !== expectedUrl) fail(page.file, "og:url must equal canonical");
  for (const property of ["og:title", "og:description", "og:image", "og:site_name"]) {
    if (!meta(html, "property", property)) fail(page.file, `missing ${property}`);
  }
  if (meta(html, "property", "og:image") !== socialImage) fail(page.file, "og:image must use the 1200x630 shared image");
  if (meta(html, "property", "og:image:width") !== "1200") fail(page.file, "og:image:width must be 1200");
  if (meta(html, "property", "og:image:height") !== "630") fail(page.file, "og:image:height must be 630");
  if (meta(html, "property", "og:image:alt") !== socialImageAlt) fail(page.file, "missing or incorrect og:image:alt");
  if (meta(html, "name", "twitter:card") !== "summary_large_image") fail(page.file, "twitter:card must be summary_large_image");
  if (meta(html, "name", "twitter:title") !== meta(html, "property", "og:title")) fail(page.file, "twitter:title must match og:title");
  if (meta(html, "name", "twitter:description") !== meta(html, "property", "og:description")) fail(page.file, "twitter:description must match og:description");
  if (meta(html, "name", "twitter:image") !== socialImage) fail(page.file, "twitter:image must use the shared image");
  if (meta(html, "name", "twitter:image:alt") !== socialImageAlt) fail(page.file, "missing or incorrect twitter:image:alt");
  if (meta(html, "name", "robots") !== expectedRobots) fail(page.file, `robots meta must match the ${isStaging ? "staging" : "live"} mode: ${expectedRobots}`);

  if (!/<main\b[^>]*>[\s\S]*?<\/main>/i.test(html)) fail(page.file, "missing non-empty main landmark");

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) fail(page.file, `expected one H1, found ${h1Count}`);
  const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  if (headingLevels[0] !== 1) fail(page.file, "the first heading must be H1");
  for (let i = 1; i < headingLevels.length; i += 1) {
    if (headingLevels[i] - headingLevels[i - 1] > 1) fail(page.file, `heading level jumps from H${headingLevels[i - 1]} to H${headingLevels[i]}`);
  }

  const jsonBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  if (!jsonBlocks.length) fail(page.file, "missing JSON-LD");
  const types = [];
  const objects = [];
  for (const block of jsonBlocks) {
    try {
      const data = JSON.parse(block[1]);
      collectTypes(data, types);
      collectObjects(data, objects);
    } catch (error) {
      fail(page.file, `invalid JSON-LD: ${error.message}`);
    }
  }
  if (page.path !== "/" && !types.includes("BreadcrumbList")) fail(page.file, "missing BreadcrumbList JSON-LD");
  if (page.path !== "/" && !/<nav\b[^>]*class=["'][^"']*breadcrumb/i.test(html)) fail(page.file, "missing visible breadcrumb");
  for (const object of objects) {
    const objectTypes = Array.isArray(object["@type"]) ? object["@type"] : [object["@type"]];
    if (object["@id"]) {
      if (Object.keys(object).length > 1) definedEntityIds.add(object["@id"]);
      else if (object["@id"].startsWith(`${siteUrl}/`)) referencedEntityIds.push([page.file, object["@id"]]);
    }
    if (objectTypes.some((type) => typeof type === "string" && type.endsWith("Page")) && object.url && object.url !== expectedUrl) {
      fail(page.file, `JSON-LD page URL must match canonical: ${object.url}`);
    }
    if (objectTypes.includes("Article")) {
      if (!object.author) fail(page.file, "Article JSON-LD is missing author");
      if (object.dateModified) {
        const [year, month, day] = object.dateModified.slice(0, 10).split("-");
        const visibleDate = `${year}年${Number(month)}月${Number(day)}日`;
        if (!html.includes(visibleDate)) fail(page.file, `Article dateModified must be visible as ${visibleDate}`);
      }
    }
    if (objectTypes.includes("BreadcrumbList")) {
      const crumbs = object.itemListElement || [];
      const lastItem = crumbs.at(-1)?.item;
      if (lastItem !== expectedUrl) fail(page.file, `last JSON-LD breadcrumb must be ${expectedUrl}`);
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (!("alt" in attrs)) fail(page.file, `image missing alt: ${match[0]}`);
    if (!attrs.width || !attrs.height) fail(page.file, `image missing width/height: ${attrs.src || match[0]}`);
    if (attrs.src && !/^(?:https?:|data:)/.test(attrs.src)) {
      const target = attrs.src.replace(/^\.\//, "").replace(/^\//, "");
      try {
        await access(new URL(target, root));
      } catch {
        fail(page.file, `missing image asset: ${attrs.src}`);
      }
    }
  }

  if (/hreflang=/i.test(html)) fail(page.file, "hreflang found on Japanese-only site");
  if (/\\n/.test(html)) fail(page.file, "contains a literal backslash-n sequence");

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (/^(?:https?:|tel:|mailto:|#)/.test(href)) continue;
    const clean = href.split("#")[0].split("?")[0];
    if (!clean || clean === "./" || clean === ".") continue;
    const target = clean.replace(/^\.\//, "").replace(/^\//, "");
    try {
      await access(new URL(target, root));
    } catch {
      fail(page.file, `broken internal link: ${href}`);
    }
  }
}

for (const [file, id] of referencedEntityIds) {
  if (!definedEntityIds.has(id)) fail(file, `JSON-LD references an undefined internal entity: ${id}`);
}

const requiredTypes = new Map([
  ["index.html", ["ShoeStore", "WebSite", "WebPage"]],
  ["owner.html", ["Person", "ProfilePage"]],
  ["insoles.html", ["Service", "HowTo"]],
  ["pricing.html", ["OfferCatalog"]],
  ["faq.html", ["FAQPage"]]
]);
for (const [file, expectedTypes] of requiredTypes) {
  const html = await readFile(new URL(file, root), "utf8");
  const types = [];
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) collectTypes(JSON.parse(match[1]), types);
  for (const type of expectedTypes) if (!types.includes(type)) fail(file, `missing required JSON-LD type ${type}`);
}

for (const asset of ["favicon.ico", "favicon.svg", "assets/apple-touch-icon.png", "assets/icon-192.png", "assets/icon-512.png", "assets/og-image.png", "site.webmanifest"]) {
  try {
    await access(new URL(asset, root));
  } catch {
    fail(asset, "required brand asset is missing");
  }
}

const sitemap = await readFile(new URL("sitemap.xml", root), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expectedUrls = pages.map((page) => `${siteUrl}${page.path}`);
if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedUrls)) fail("sitemap.xml", "URL list does not match the page manifest");

const robots = await readFile(new URL("robots.txt", root), "utf8");
for (const agent of ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
  if (!robots.includes(`User-agent: ${agent}`)) fail("robots.txt", `missing explicit ${agent} rule`);
}
if (!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) fail("robots.txt", "missing absolute sitemap URL");
if (/^Disallow:\s*\/$/m.test(robots)) fail("robots.txt", "site-wide Disallow would prevent crawlers from seeing noindex");

const robotHeaderMatches = [...headers.matchAll(/^\s*X-Robots-Tag:/gm)];
if (robotHeaderMatches.length > 1) fail("_headers", "multiple X-Robots-Tag directives found");
if (!isStaging && robotHeaderMatches.length) fail("_headers", "unexpected X-Robots-Tag in live mode");

const notFound = await readFile(new URL("404.html", root), "utf8");
if (meta(notFound, "name", "robots") !== stagingRobots) fail("404.html", `robots meta must be ${stagingRobots}`);

const redirects = await readFile(new URL("_redirects", root), "utf8");
for (const oldPath of ["/index.php", "/about.php", "/selection.php", "/childrenshoes.php", "/product.php", "/insole.php", "/seminar.php", "/contact.php"]) {
  if (!redirects.includes(oldPath)) fail("_redirects", `missing legacy redirect for ${oldPath}`);
}

if (errors.length) {
  console.error(`Site audit failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`Site audit passed: ${pages.length} site pages in ${isStaging ? "staging/noindex" : "live/index"} mode, unique metadata, social cards, valid JSON-LD, breadcrumbs, internal links and sitemap.`);
