// ガイド（PDF商品）の印刷用プレビュー。管理画面にログイン中の人だけが見られる。
// ここで組んだ内容を、ブラウザの印刷機能で「PDFとして保存」し、
// 購入者へは引き続きLINEなどで手動送付する（決済・自動配布は行わない）。
const LINE_URL = "https://line.me/R/ti/p/@680mdoos";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const client = window.andantinoSupabaseClient;
const statusEl = document.getElementById("guide-status");
const loginNote = document.getElementById("guide-login-note");
const paper = document.getElementById("guide-paper");

document.getElementById("print-button").addEventListener("click", () => window.print());

async function main() {
  if (!client) {
    loginNote.textContent = "Supabaseが設定されていないため、このページは使えません。";
    return;
  }

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session) {
    loginNote.innerHTML = 'ログインが必要です。<a href="./">管理画面からログインしてください</a>。';
    return;
  }

  const productId = new URLSearchParams(location.search).get("id");
  if (!productId) {
    loginNote.textContent = "商品が指定されていません。管理画面の「印刷用プレビューを開く」から開いてください。";
    return;
  }

  statusEl.textContent = "読み込んでいます…";

  const { data: product, error: productError } = await client
    .from("pdf_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    statusEl.textContent = "商品を読み込めませんでした。";
    return;
  }

  let articles = [];
  if (product.article_ids && product.article_ids.length) {
    const { data, error } = await client
      .from("articles")
      .select("id, title, article_content, excerpt")
      .in("id", product.article_ids);
    if (!error && data) {
      const byId = new Map(data.map((article) => [article.id, article]));
      articles = product.article_ids.map((id) => byId.get(id)).filter(Boolean);
    }
  }

  render(product, articles);
  statusEl.textContent = `${articles.length}件の記事を収録しています。`;
}

function render(product, articles) {
  const updated = product.updated_at
    ? new Date(product.updated_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const toc = articles
    .map((article, index) => `<li><a href="#guide-section-${index}">${escapeHtml(article.title)}</a></li>`)
    .join("");

  const sections = articles
    .map(
      (article, index) =>
        `<section class="guide-section" id="guide-section-${index}"><h2>${escapeHtml(article.title)}</h2>${article.article_content || ""}</section>`
    )
    .join("");

  const emptyNote = articles.length
    ? ""
    : '<p class="admin-note">まだ収録記事が選ばれていません。管理画面の「PDF商品」でチェックしてから、もう一度開いてください。</p>';

  paper.innerHTML = `
    <h1>${escapeHtml(product.name)}</h1>
    <p class="guide-meta">${escapeHtml(product.version_label || "")}${product.version_label ? " ／ " : ""}最終更新：${updated}</p>
    <p>${escapeHtml(product.description || "")}</p>
    ${toc ? `<div class="guide-toc"><h2>目次</h2><ol>${toc}</ol></div>` : ""}
    ${emptyNote}
    ${sections}
    <div class="guide-cta">
      <h2>もっと詳しく知りたい方・確認したい方へ</h2>
      <p>お読みになって気になることがあれば、公式LINEでご相談ください。今の状態を詳しく確認したい方には、対面カウンセリングまたはオンライン相談もご案内しています。</p>
      <p><a href="../online-consultation.html" target="_blank" rel="noopener">オンライン相談について見る</a> ／ <a href="${LINE_URL}" target="_blank" rel="noopener">公式LINEで相談する</a></p>
    </div>
  `;
  paper.hidden = false;
}

main();
