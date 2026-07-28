// 記事ファイル（content/articles/*.md）を読み解くための最小限の部品。
//
// 外部パッケージは使わない。このサイトは依存ゼロで動く方針のため、
// 必要な記法だけを自前で処理する。対応する記法は README と AGENTS.md に明記し、
// それ以外の記法は「書かれてもそのまま文字として出る」挙動にしてある
// （壊れたHTMLが出るより、見た目が地味になる方が安全なため）。

const HEADING_PATTERN = /^(#{1,4})\s+(.*)$/;
const UNORDERED_PATTERN = /^[-*]\s+(.*)$/;
const ORDERED_PATTERN = /^\d+\.\s+(.*)$/;

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 「--- 」で囲まれた冒頭のメタ情報と、それ以降の本文に分ける。
// 値に「：」や「:」が含まれる場合があるため、最初のコロンだけで区切る。
export function parseFrontMatter(raw) {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { meta: {}, body: normalized.trim() };
  }

  const end = normalized.indexOf("\n---", 3);
  if (end === -1) {
    return { meta: {}, body: normalized.trim() };
  }

  const head = normalized.slice(4, end);
  const body = normalized.slice(end + 4).replace(/^\n/, "");

  const meta = {};
  for (const line of head.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    if (key) meta[key] = value;
  }

  return { meta, body: body.trim() };
}

// 行内の装飾（リンク・太字）。HTMLエスケープ済みの文字列を受け取る前提。
function renderInlineWithLinks(text) {
  const withLinks = text.replace(
    /\[([^\]]+)\]\(([^\s)]+)\)/g,
    (match, label, href) => {
      // エスケープ済みの文字列なので、ここでの href は既に安全な文字だけになっている。
      // 外部リンクだけを許可し、それ以外（javascript: など）は文字のまま残す。
      if (/^https?:\/\//.test(href)) {
        return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
      }
      if (/^(?:\.\.\/|\.\/|#)/.test(href)) {
        return `<a href="${href}">${label}</a>`;
      }
      return match;
    }
  );
  return withLinks.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

// 記事本文のMarkdownを、サイトの既存スタイルに合うHTMLへ変換する。
// 見出しは h2 以下に固定する（記事ページには既にタイトルの h1 があるため、
// 本文に h1 が入ると見出し階層が壊れ、監査スクリプトで弾かれる）。
export function markdownToHtml(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    const text = renderInlineWithLinks(escapeHtml(paragraph.join(" ")));
    blocks.push(`<p>${text}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    const items = list.items
      .map((item) => `<li>${renderInlineWithLinks(escapeHtml(item))}</li>`)
      .join("");
    blocks.push(`<${list.tag}>${items}</${list.tag}>`);
    list = null;
  }

  function flushAll() {
    flushParagraph();
    flushList();
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushAll();
      continue;
    }

    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      flushAll();
      // 「#」1つで書かれても h2 に落とす。本文に h1 を作らせない。
      const level = Math.min(Math.max(heading[1].length, 2), 4);
      const text = renderInlineWithLinks(escapeHtml(heading[2].trim()));
      blocks.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    const unordered = line.match(UNORDERED_PATTERN);
    if (unordered) {
      flushParagraph();
      if (!list || list.tag !== "ul") {
        flushList();
        list = { tag: "ul", items: [] };
      }
      list.items.push(unordered[1].trim());
      continue;
    }

    const ordered = line.match(ORDERED_PATTERN);
    if (ordered) {
      flushParagraph();
      if (!list || list.tag !== "ol") {
        flushList();
        list = { tag: "ol", items: [] };
      }
      list.items.push(ordered[1].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushAll();
  return blocks.join("\n");
}

// 本文から、説明文（メタディスクリプション用）の候補を作る。
// frontmatter に excerpt が書かれていない場合の保険。
export function deriveExcerpt(markdown, limit = 110) {
  const plain = String(markdown ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !HEADING_PATTERN.test(line))
    .map((line) => line.replace(UNORDERED_PATTERN, "$1").replace(ORDERED_PATTERN, "$1"))
    .join(" ")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, "$1")
    .trim();
  if (plain.length <= limit) return plain;
  return `${plain.slice(0, limit)}…`;
}
