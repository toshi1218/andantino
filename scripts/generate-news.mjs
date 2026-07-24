import { readFile, writeFile } from "node:fs/promises";

const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = process.env.MICROCMS_API_KEY;
const endpoint = process.env.MICROCMS_NEWS_ENDPOINT || "news";
const newsFile = new URL("../news.html", import.meta.url);

const startMarker = "<!-- NEWS_LIST:START -->";
const endMarker = "<!-- NEWS_LIST:END -->";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  const display = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  return { display, datetime: date.toISOString().slice(0, 10) };
}

function renderItem(item) {
  const { display, datetime } = formatDate(item.publishedAt);
  const title = escapeHtml(item.title || "");
  const body = item.body || "";
  return `<article class="news-item" id="news-${escapeHtml(item.id)}"><time datetime="${datetime}">${display}</time><h3>${title}</h3><div class="news-item__body">${body}</div></article>`;
}

async function main() {
  if (!serviceDomain || !apiKey) {
    console.log("generate-news: MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY is not set — skipping news generation, keeping existing news.html.");
    return;
  }

  const url = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}?orders=-publishedAt&limit=100`;
  let contents;
  try {
    const response = await fetch(url, { headers: { "X-MICROCMS-API-KEY": apiKey } });
    if (!response.ok) throw new Error(`microCMS responded with ${response.status}`);
    ({ contents } = await response.json());
  } catch (error) {
    console.warn(`generate-news: failed to fetch from microCMS (${error.message}) — keeping existing news.html.`);
    return;
  }

  const html = await readFile(newsFile, "utf8");
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1) {
    console.warn("generate-news: NEWS_LIST markers not found in news.html — skipping.");
    return;
  }

  const listHtml = contents.length
    ? `<div class="news-list">${contents.map(renderItem).join("")}</div>`
    : `<div class="news-list"><p class="news-empty">現在お知らせはありません。</p></div>`;

  const updated = `${html.slice(0, startIndex)}${startMarker}\n        ${listHtml}\n        ${html.slice(endIndex)}`;
  await writeFile(newsFile, updated, "utf8");
  console.log(`generate-news: wrote ${contents.length} item(s) to news.html.`);
}

await main();
