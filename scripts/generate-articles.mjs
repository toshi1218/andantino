// content/articles/*.md を読み込み、記事詳細ページ・記事一覧・
// カテゴリ別一覧・sitemap-articles.xml を静的生成する。
//
// 記事の元データはリポジトリ内のMarkdownファイルであり、外部サービスには依存しない。
// 1ファイル＝1記事、ファイル名がそのままURL（/articles/{ファイル名}.html）になる。
// frontmatter に draft: true と書かれた記事は生成対象から外れる。
//
// 生成されるHTMLの構造・SEOタグ・パンくず・構造化データはすべてこのスクリプトが
// 決めるため、記事ファイル側の書き方が多少ぶれても、サイト全体の規約は保たれる。
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { siteUrl, lastmod } from "./site-pages.mjs";
import { parseFrontMatter, markdownToHtml, deriveExcerpt } from "./lib/content.mjs";

const root = new URL("../", import.meta.url);
const articlesDirUrl = new URL("../articles/", import.meta.url);
const contentDirUrl = new URL("../content/articles/", import.meta.url);
const lineUrl = "https://line.me/R/ti/p/@680mdoos";

const CATEGORY_META = {
  children: { label: "子どもの靴", listFile: "articles-children.html", marker: "ARTICLES_LIST_CHILDREN" },
  adult: { label: "大人の靴", listFile: "articles-adult.html", marker: "ARTICLES_LIST_ADULT" },
  "foot-problems": { label: "外反母趾・足の悩み", listFile: "articles-foot-problems.html", marker: "ARTICLES_LIST_FOOT_PROBLEMS" },
  insoles: { label: "インソール", listFile: "articles-insoles.html", marker: "ARTICLES_LIST_INSOLES" },
  "shoe-wearing": { label: "靴の履き方・選び方", listFile: "articles-shoe-wearing.html", marker: "ARTICLES_LIST_SHOE_WEARING" },
  seasonal: { label: "季節の話題", listFile: null, marker: null },
  other: { label: "その他", listFile: null, marker: null },
};

const CTA_MAP = {
  line: { label: "LINEでご予約・ご相談", href: lineUrl, external: true },
  reservation: { label: "ご来店予約はこちら", href: "../contact.html", external: false },
  services: { label: "サービス内容を見る", href: "../pricing.html", external: false },
  children: { label: "子どもの靴相談を見る", href: "../childrens-shoes.html", external: false },
  insoles: { label: "インソール相談を見る", href: "../insoles.html", external: false },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 記事詳細ページは /articles/{slug}.html に出力されるため、管理画面で
// 「./assets/foo.webp」「/assets/foo.webp」のように入力された画像パスを
// 1階層上へ辿る形（../assets/foo.webp）へ直す。外部URLはそのまま使う。
function toArticleAssetPath(value) {
  if (!value) return value;
  if (/^(?:https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  return `../${value.replace(/^\.\//, "").replace(/^\//, "")}`;
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  const display = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  const datetime = date.toISOString().slice(0, 10);
  const [year, month, day] = datetime.split("-");
  const visible = `${year}年${Number(month)}月${Number(day)}日`;
  return { display, datetime, visible };
}

async function detectRobotsMeta() {
  const headers = await readFile(new URL("_headers", root), "utf8");
  const isStaging = headers.includes("X-Robots-Tag: noindex, nofollow, nosnippet");
  return isStaging
    ? "noindex,nofollow,nosnippet"
    : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
}

function renderCta(article) {
  const cta = CTA_MAP[article.call_to_action] || CTA_MAP.line;
  const target = cta.external ? ' target="_blank" rel="noopener"' : "";
  return `<div class="article-cta"><div><h2>読んでみて気になったことがあれば、お気軽にご相談ください。</h2><p>記事の内容と似ているようで、実際は一人ずつ違います。今の靴を見ながら一緒に確認します。</p></div><a class="button" href="${cta.href}"${target}>${cta.label}</a></div>`;
}

function renderArticlePage(article, robotsMeta) {
  const category = CATEGORY_META[article.category] || CATEGORY_META.other;
  const url = `${siteUrl}/articles/${article.slug}.html`;
  const title = escapeHtml(article.seo_title || article.title);
  const description = escapeHtml(article.seo_description || article.excerpt || "");
  const dates = formatDate(article.published_at || article.updated_at || article.created_at);
  const modified = formatDate(article.updated_at || article.published_at || article.created_at);
  const heroImage = article.featured_image
    ? `<div class="container"><figure class="article-hero-photo"><img src="${escapeHtml(toArticleAssetPath(article.featured_image))}" width="1000" height="800" loading="eager" fetchpriority="high" alt="${escapeHtml(article.title)}"></figure></div>`
    : "";

  const breadcrumbItems = [
    { name: "トップ", item: `${siteUrl}/` },
    { name: "お役立ち記事", item: `${siteUrl}/articles.html` },
  ];
  if (category.listFile) {
    breadcrumbItems.push({ name: category.label, item: `${siteUrl}/${category.listFile}` });
  }
  breadcrumbItems.push({ name: article.title, item: url });

  const breadcrumbHtml = breadcrumbItems
    .map((crumb, index) => {
      const isLast = index === breadcrumbItems.length - 1;
      return isLast
        ? `<li aria-current="page">${escapeHtml(crumb.name)}</li>`
        : `<li><a href="${crumb.item.replace(siteUrl, "..")}">${escapeHtml(crumb.name)}</a></li>`;
    })
    .join("");

  const breadcrumbJsonLd = breadcrumbItems.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: crumb.item,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: article.title,
        url,
        image: article.featured_image ? new URL(article.featured_image, `${siteUrl}/`).toString() : `${siteUrl}/assets/og-image.png`,
        datePublished: dates.datetime,
        dateModified: modified.datetime,
        inLanguage: "ja-JP",
        author: { "@id": `${siteUrl}/owner.html#yoko-igarashi` },
        publisher: { "@id": `${siteUrl}/#store` },
        description: article.excerpt || "",
      },
      { "@type": "BreadcrumbList", itemListElement: breadcrumbJsonLd },
    ],
  };

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="theme-color" content="#fff9f2"><meta name="robots" content="${robotsMeta}">
    <link rel="canonical" href="${url}">
    <link rel="icon" href="../favicon.ico" sizes="any"><link rel="icon" href="../favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="../assets/apple-touch-icon.png"><link rel="manifest" href="../site.webmanifest">
    <meta property="og:type" content="article"><meta property="og:locale" content="ja_JP"><meta property="og:site_name" content="ANDANTINO">
    <meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}"><meta property="og:image" content="${siteUrl}/assets/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta property="og:image:alt" content="ANDANTINO｜和歌山の靴とインソール専門店"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${siteUrl}/assets/og-image.png"><meta name="twitter:image:alt" content="ANDANTINO｜和歌山の靴とインソール専門店"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="../styles.css">
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="info-page"><a class="skip-link" href="#main">本文へ移動</a>
    <header class="info-header"><div class="container info-header__inner"><a class="brand" href="../"><span class="brand__name">ANDANTINO</span><span class="brand__tagline">靴とインソールの専門店</span></a><nav aria-label="ページナビゲーション"><a href="../articles.html">お役立ち記事</a><a href="../faq.html">よくある質問</a><a class="button button--small" href="../contact.html">ご予約・ご相談</a></nav></div></header>
    <nav class="breadcrumb" aria-label="パンくずリスト"><ol class="container">${breadcrumbHtml}</ol></nav>
    <main id="main">
      <section class="article-hero"><div class="container article-hero__inner"><span class="section-kicker">${escapeHtml(category.label)}</span><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.excerpt || "")}</p></div></section>
      ${heroImage}
      <section class="article-body"><div class="container policy-content">
        <p class="article-byline">担当者：<a href="../owner.html">認定シューフィッター 五十嵐洋子</a> ／ 最終更新：${modified.visible}</p>
        <article class="prose">${article.article_content || ""}</article>
        ${renderCta(article)}
      </div></section>
    </main>
    <footer class="footer">
      <div class="container footer__top">
        <div class="brand brand--footer">
          <span class="brand__name">ANDANTINO</span>
          <span class="brand__tagline">靴とインソールの専門店</span>
        </div>
        <p>足に合う靴と正しい靴選びで、家族の健やかな毎日を。</p>
        <div class="footer__links">
          <a href="../#adult">大人の靴</a>
          <a href="../#children">子どもの足育</a>
          <a href="../#services">インソール</a>
          <a href="../#shop">店舗案内</a>
          <a href="../about.html">ANDANTINOについて</a>
          <a href="../owner.html">五十嵐洋子</a>
          <a href="../faq.html">よくある質問</a>
          <a href="../guides.html">足と靴の知識</a>
          <a href="../articles.html">お役立ち記事</a>
          <a href="../products.html">取扱商品</a>
          <a href="../seminars.html">セミナー</a>
          <a href="../online-consultation.html">オンライン相談</a>
          <a href="../pdf-products.html">デジタル商品</a>
          <a href="../for-professionals.html">医療機関・専門職の方へ</a>
          <a href="../contact.html">お問い合わせ</a>
          <a href="../news.html">お知らせ</a>
          <a href="../links.html">外部リンク</a>
          <a href="../privacy.html">プライバシー</a>
          <a href="../terms.html">利用規約</a>
          <a href="../legal.html">特定商取引法</a>
        </div>
      </div>
      <div class="container footer__bottom">
        <span>© 2026 ANDANTINO. All Rights Reserved.</span>
        <span class="footer__social">
          <a href="${lineUrl}" target="_blank" rel="noopener">公式LINE</a>
          <a href="https://www.facebook.com/share/18yvcF1E6G/" target="_blank" rel="noopener">Facebook</a>
          <a href="https://www.instagram.com/yoko1367/" target="_blank" rel="noopener">Instagram（個人）</a>
          <a href="https://www.youtube.com/@andantino7110" target="_blank" rel="noopener">YouTube</a>
          <a href="https://blog.livedoor.jp/andantino7110/" target="_blank" rel="noopener">公式ブログ</a>
          <a href="https://note.com/andantino_foot" target="_blank" rel="noopener">note</a>
        </span>
      </div>
    </footer>
  <script src="../assets/supabase-config.js"></script>
  <script src="../script.js"></script>
  </body>
</html>
`;
}

function renderListCard(article) {
  const category = CATEGORY_META[article.category] || CATEGORY_META.other;
  const dates = formatDate(article.published_at || article.updated_at || article.created_at);
  const image = article.featured_image
    ? `<img src="${escapeHtml(article.featured_image)}" width="400" height="300" loading="lazy" alt="${escapeHtml(article.title)}">`
    : "";
  return `<article class="article-card">
            <div class="article-card__media">${image}</div>
            <div class="article-card__content">
              <span class="article-card__category">${escapeHtml(category.label)}</span>
              <h3><a href="./articles/${article.slug}.html">${escapeHtml(article.title)}</a></h3>
              <p>${escapeHtml(article.excerpt || "")}</p>
              <time datetime="${dates.datetime}">${dates.display}</time>
            </div>
          </article>`;
}

function renderList(articles, emptyMessage) {
  if (!articles.length) {
    return `<div class="article-grid">\n          <p class="article-empty">${emptyMessage}</p>\n        </div>`;
  }
  return `<div class="article-grid">\n          ${articles.map(renderListCard).join("\n          ")}\n        </div>`;
}

async function injectMarker(fileName, marker, html) {
  const fileUrl = new URL(fileName, root);
  const content = await readFile(fileUrl, "utf8");
  const startMarker = `<!-- ${marker}:START -->`;
  const endMarker = `<!-- ${marker}:END -->`;
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1) {
    console.warn(`generate-articles: markers not found in ${fileName} — skipping.`);
    return;
  }
  const updated = `${content.slice(0, startIndex)}${startMarker}\n        ${html}\n        ${content.slice(endIndex)}`;
  await writeFile(fileUrl, updated, "utf8");
}

// content/articles/*.md を1件ずつ読み、記事オブジェクトへ変換する。
// 問題のあるファイルは、コマンド全体を失敗させずにスキップして警告を出す
// （1本の記事の書き損じで、サイト全体の生成が止まらないようにするため）。
async function loadArticles() {
  let fileNames;
  try {
    fileNames = (await readdir(contentDirUrl)).filter((file) => file.endsWith(".md"));
  } catch {
    console.log("generate-articles: content/articles/ が見つかりません — 記事なしとして扱います。");
    return [];
  }

  const articles = [];
  for (const fileName of fileNames.sort()) {
    // ファイル名がそのままURLになるため、半角英数とハイフンだけに限定する。
    // 「../index.md」のような名前でリポジトリ内の別ファイルを上書きさせない。
    const slug = fileName.replace(/\.md$/, "");
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      console.warn(
        `generate-articles: ${fileName} をスキップしました — ファイル名は半角小文字・数字・ハイフンだけで付けてください。`
      );
      continue;
    }

    const raw = await readFile(new URL(fileName, contentDirUrl), "utf8");
    const { meta, body } = parseFrontMatter(raw);

    if (String(meta.draft).toLowerCase() === "true") continue;

    if (!meta.title) {
      console.warn(`generate-articles: ${fileName} をスキップしました — title が書かれていません。`);
      continue;
    }
    if (!body.trim()) {
      console.warn(`generate-articles: ${fileName} をスキップしました — 本文が空です。`);
      continue;
    }
    if (meta.category && !CATEGORY_META[meta.category]) {
      console.warn(
        `generate-articles: ${fileName} の category「${meta.category}」は未対応です — other として扱います。`
      );
    }

    const publishedAt = meta.published_at || lastmod;
    articles.push({
      slug,
      title: meta.title,
      category: CATEGORY_META[meta.category] ? meta.category : "other",
      excerpt: meta.excerpt || deriveExcerpt(body),
      seo_title: meta.seo_title || "",
      seo_description: meta.seo_description || "",
      featured_image: meta.featured_image || "",
      call_to_action: meta.call_to_action || "line",
      article_content: markdownToHtml(body),
      published_at: publishedAt,
      updated_at: meta.updated_at || publishedAt,
      created_at: publishedAt,
    });
  }

  // 新しい記事が先頭に来るようにする（一覧ページの並び順）。
  return articles.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
}

async function main() {
  const validArticles = await loadArticles();
  const robotsMeta = await detectRobotsMeta();

  await mkdir(articlesDirUrl, { recursive: true });

  for (const article of validArticles) {
    await writeFile(new URL(`${article.slug}.html`, articlesDirUrl), renderArticlePage(article, robotsMeta), "utf8");
  }

  const existingFiles = (await readdir(articlesDirUrl)).filter((file) => file.endsWith(".html"));
  const expectedFiles = new Set(validArticles.map((article) => `${article.slug}.html`));
  for (const file of existingFiles) {
    if (!expectedFiles.has(file)) {
      await rm(new URL(file, articlesDirUrl));
      console.log(`generate-articles: removed stale article page ${file} (no longer published).`);
    }
  }

  await injectMarker(
    "articles.html",
    "ARTICLES_LIST",
    renderList(validArticles, "現在公開している記事はありません。近日、季節の靴選びの話などから掲載を始める予定です。")
  );

  for (const [categorySlug, meta] of Object.entries(CATEGORY_META)) {
    if (!meta.listFile) continue;
    const categoryArticles = validArticles.filter((article) => article.category === categorySlug);
    await injectMarker(
      meta.listFile,
      meta.marker,
      renderList(categoryArticles, "現在公開している記事はありません。近日、掲載を始める予定です。")
    );
  }

  const sitemapEntries = validArticles
    .map((article) => {
      const date = (article.updated_at || article.published_at || lastmod).slice(0, 10);
      return `  <url>
    <loc>${siteUrl}/articles/${article.slug}.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    })
    .join("\n");

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;
  await writeFile(new URL("sitemap-articles.xml", root), sitemapXml, "utf8");

  console.log(`generate-articles: generated ${validArticles.length} article page(s) and updated 6 list page(s).`);
}

await main();
