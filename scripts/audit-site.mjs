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
const socialImageAlt = "ANDANTINO｜和歌山の靴とインソール専門店";
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
  if (!/<main\b[^>]*\bid=["']main["']/i.test(html)) fail(page.file, "main landmark must expose id=main");
  if (!/<a\b[^>]*class=["'][^"']*skip-link[^"']*["'][^>]*href=["']#main["']/i.test(html)) fail(page.file, "missing skip link to main content");

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) fail(page.file, `expected one H1, found ${h1Count}`);
  const h1Markup = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  if (/<br\b/i.test(h1Markup)) fail(page.file, "H1 must not use forced line breaks; responsive CSS controls wrapping");
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

  const discouragedCustomerPhrases = [
    ">相談・予約<",
    "LINEで相談・予約",
    "お問い合わせ・相談予約",
    "<h2>4. 予約・相談</h2>",
    "遅刻・変更・キャンセルが分かった時点",
    "今の靴を見せてください",
    "相談には何を持って行けばよいですか",
    "毎回してほしい、靴の履き方",
    "保護者がフィットを確認してください"
  ];
  for (const phrase of discouragedCustomerPhrases) {
    if (html.includes(phrase)) fail(page.file, `customer-facing copy must use polite Japanese: ${phrase}`);
  }

  const unsupportedFirstPersonClaims = [
    "保護者の方を責めるための足育ではありません",
    "記録を残して次に比べることまでが私の仕事です",
    "商品をお渡しした日を終わりにしないこと",
    "商品からではなく、履く方の足から考えます"
  ];
  for (const phrase of unsupportedFirstPersonClaims) {
    if (html.includes(phrase)) fail(page.file, `unsupported first-person claim must not be presented as a verified quote: ${phrase}`);
  }

  if (/https?:\/\/(?:www\.)?ameblo\.jp\//i.test(html)) {
    fail(page.file, "unverified Ameba account must not be presented as an official source");
  }

  if (page.path !== "/") {
    if (!/class=["'][^"']*info-header/i.test(html)) fail(page.file, "missing shared information-page header");
    if (!/class=["'][^"']*info-footer/i.test(html)) fail(page.file, "missing shared information-page footer");
    if (!/<script\s+src=["']\.\/script\.js["']/i.test(html)) fail(page.file, "missing shared menu and mobile-action script");
  }

  for (const match of html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (!(attrs.rel || "").split(/\s+/).includes("noopener")) fail(page.file, `external target=_blank link must use rel=noopener: ${match[0]}`);
  }

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

const conversionPages = [
  "about.html", "adult-shoes.html", "childrens-shoes.html", "faq.html", "foot-check.html",
  "foot-problems.html", "guides.html", "insoles.html", "owner.html", "pricing.html", "products.html",
  "seminars.html", "shoe-wearing.html"
];
for (const file of conversionPages) {
  const html = await readFile(new URL(file, root), "utf8");
  if (!/class=["'][^"']*article-cta[^"']*["']/i.test(html)) fail(file, "missing end-of-page conversion CTA");
  if (!/class=["']button["'][^>]+href=["']https:\/\/line\.me\/R\/ti\/p\/@680mdoos["']/i.test(html)) {
    fail(file, "end-of-page CTA must link directly to the official LINE account");
  }
  if (file !== "seminars.html" && !html.includes("LINEでご予約・ご相談")) {
    fail(file, "end-of-page LINE CTA must use the polite label: LINEでご予約・ご相談");
  }
}

const termsHtml = await readFile(new URL("terms.html", root), "utf8");
if (!termsHtml.includes("<h2>4. ご予約・ご相談</h2>")) {
  fail("terms.html", "reservation section heading must use ご予約・ご相談");
}

const contactHtml = await readFile(new URL("contact.html", root), "utf8");
if (!contactHtml.includes("<h1>ご予約・ご相談・お問い合わせ</h1>")) {
  fail("contact.html", "contact H1 must use polite customer-facing terminology");
}

const sharedScript = await readFile(new URL("script.js", root), "utf8");
for (const label of ["ご予約・ご相談・お問い合わせ", "LINEでご予約・ご相談"]) {
  if (!sharedScript.includes(label)) fail("script.js", `shared navigation is missing polite label: ${label}`);
}
for (const action of ["tel:0734947110", "mailto:andantino@wine.plala.or.jp", "line.me/R/ti/p/@680mdoos"]) {
  if (!sharedScript.includes(action)) fail("script.js", `sticky action bar is missing contact action: ${action}`);
}

const faqHtml = await readFile(new URL("faq.html", root), "utf8");
if ((faqHtml.match(/<details\b/gi) || []).length !== 10) fail("faq.html", "expected ten independent FAQ disclosure cards");

const homeHtml = await readFile(new URL("index.html", root), "utf8");
if (!homeHtml.includes("足に合うことも、") || !homeHtml.includes("履いて出かける") || !homeHtml.includes("楽しさも。")) {
  fail("index.html", "home must express both fit and the joy of wearing shoes");
}
const mobileActions = homeHtml.match(/<nav\b[^>]*class=["'][^"']*mobile-actions[^"']*["'][\s\S]*?<\/nav>/i)?.[0] || "";
if ((mobileActions.match(/<a\b/gi) || []).length !== 3) fail("index.html", "mobile action bar must contain exactly phone, email and LINE actions");
const globalMenu = homeHtml.match(/<nav\b[^>]*id=["']global-nav["'][\s\S]*?<\/nav>/i)?.[0] || "";
if ((globalMenu.match(/class=["'][^"']*nav__group(?:\s|["'])/gi) || []).length !== 4) {
  fail("index.html", "global menu must use four scannable groups");
}

const productsHtml = await readFile(new URL("products.html", root), "utf8");
if (!productsHtml.includes('id="style"') || !productsHtml.includes("約3.5cmのヒール")) {
  fail("products.html", "products must include the sourced fit-and-style example");
}

const childrenHtml = await readFile(new URL("childrens-shoes.html", root), "utf8");
for (const detail of ['id="case"', "23.0cmの細い足に、24.5cmの学校靴", "ほかのお子さまに当てはまる基準ではありません"]) {
  if (!childrenHtml.includes(detail)) fail("childrens-shoes.html", `missing sourced and qualified consultation example: ${detail}`);
}

const css = await readFile(new URL("styles.css", root), "utf8");
const qrImageRule = css.match(/\.consult__qr img\s*\{([\s\S]*?)\}/)?.[1] || "";
if (!/object-fit:\s*contain/.test(qrImageRule) || /object-fit:\s*cover/.test(qrImageRule)) {
  fail("styles.css", "the official LINE QR code must be fully visible with object-fit: contain");
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
for (const requiredMarkup of ["info-header", "info-footer", '<script src="./script.js"']) {
  if (!notFound.includes(requiredMarkup)) fail("404.html", `missing shared shell markup: ${requiredMarkup}`);
}

const redirects = await readFile(new URL("_redirects", root), "utf8");
for (const oldPath of ["/index.php", "/about.php", "/selection.php", "/childrenshoes.php", "/product.php", "/insole.php", "/seminar.php", "/contact.php"]) {
  if (!redirects.includes(oldPath)) fail("_redirects", `missing legacy redirect for ${oldPath}`);
}

if (errors.length) {
  console.error(`Site audit failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`Site audit passed: ${pages.length} site pages in ${isStaging ? "staging/noindex" : "live/index"} mode, unique metadata, social cards, valid JSON-LD, breadcrumbs, internal links and sitemap.`);
