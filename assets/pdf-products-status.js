// PDF商品一覧を、Supabaseの pdf_products から反映する。
// Supabase未設定・0件・通信失敗の場合は、静的な既定表示（準備中の例）のまま何もしない。
(function () {
  const list = document.querySelector("[data-product-list]");
  if (!list) return;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCard(product) {
    const isSelling = product.status === "selling";
    const badgeClass = isSelling ? "status-badge--open" : "status-badge--closed";
    const badgeLabel = isSelling ? "販売中" : "準備中";
    const price = product.price ? escapeHtml(product.price) : "価格は準備中です";
    const image = product.sample_image
      ? `<img src="${escapeHtml(product.sample_image)}" width="600" height="800" loading="lazy" alt="${escapeHtml(product.name)}のサンプル画像">`
      : "";
    const lineMessage = encodeURIComponent(product.line_message || `「${product.name}」について教えてください。`);
    const lineHref = `https://line.me/R/ti/p/@680mdoos`;
    const version = product.version_label
      ? `<span class="product-card__version">${escapeHtml(product.version_label)}</span>`
      : "";
    return `<article class="product-card"><div class="product-card__media">${image}</div><div class="product-card__body"><span class="status-badge ${badgeClass}">${badgeLabel}</span>${version}<h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description || "")}</p><span class="product-card__price">${price}</span><a class="outline-button" href="${lineHref}" data-line-message="${escapeHtml(lineMessage)}" target="_blank" rel="noopener">LINEで問い合わせる</a></div></article>`;
  }

  async function apply() {
    const client = window.andantinoSupabaseClient;
    if (!client) return;

    const { data, error } = await client
      .from("pdf_products")
      .select("name, description, price, sample_image, status, line_message, version_label, display_order")
      .order("display_order", { ascending: true });

    if (error || !data || !data.length) return;

    list.innerHTML = data.map(renderCard).join("");
  }

  apply().catch(() => {
    // 通信に失敗しても、静的な既定表示のまま画面は成立する。
  });
})();
