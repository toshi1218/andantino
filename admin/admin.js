// ANDANTINO コンテンツ管理画面。
// 運用ルール: ここで押せるのは「保存」「確認待ちにする」「承認する」「公開する」「非公開にする」だけ。
// 自動投稿・自動公開の仕組みはない。公開後、サイトへ反映するには
// 開発担当者が `npm run articles:sync` を実行してコミット・デプロイする必要がある。
const LINE_URL = "https://line.me/R/ti/p/@680mdoos";

const CATEGORY_LABEL = {
  children: "子どもの靴",
  adult: "大人の靴",
  "foot-problems": "外反母趾・足の悩み",
  insoles: "インソール",
  "shoe-wearing": "靴の履き方・選び方",
  seasonal: "季節の話題",
  other: "その他",
};

const STATUS_LABEL = {
  idea: "アイデア",
  draft: "下書き",
  review: "確認中",
  approved: "承認済み",
  published: "公開中",
  archived: "非公開",
};

const client = window.andantinoSupabaseClient;

const els = {
  loginView: document.getElementById("login-view"),
  unconfiguredView: document.getElementById("unconfigured-view"),
  appView: document.getElementById("app-view"),
  signOutButton: document.getElementById("sign-out-button"),
  loginForm: document.getElementById("login-form"),
  loginStatus: document.getElementById("login-status"),
};

if (!client) {
  els.loginView.hidden = true;
  els.unconfiguredView.hidden = false;
} else {
  initAuth();
}

function initAuth() {
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    els.loginStatus.textContent = "ログインしています…";
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      els.loginStatus.textContent = "ログインできませんでした。メールアドレスとパスワードをご確認ください。";
      return;
    }
    els.loginStatus.textContent = "";
  });

  els.signOutButton.addEventListener("click", async () => {
    await client.auth.signOut();
  });

  client.auth.onAuthStateChange((_event, session) => {
    setSignedIn(Boolean(session));
  });

  client.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
}

let appInitialized = false;

function setSignedIn(isSignedIn) {
  els.loginView.hidden = isSignedIn;
  els.appView.hidden = !isSignedIn;
  els.signOutButton.hidden = !isSignedIn;
  if (isSignedIn && !appInitialized) {
    appInitialized = true;
    initApp();
  }
}

function initApp() {
  initTabs();
  initArticles();
  initSettings();
  initProducts();
}

function initTabs() {
  const buttons = document.querySelectorAll(".admin-tabs__button");
  const panels = document.querySelectorAll(".admin-tab-panel");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.toggle("is-active", b === button));
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== button.dataset.tab;
      });
    });
  });
}

/* ===================== 記事 ===================== */

const articleState = { items: [], selectedId: null, filter: "" };

function initArticles() {
  document.querySelectorAll("[data-status-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-status-filter]").forEach((b) => b.classList.remove("is-active"));
      button.classList.add("is-active");
      articleState.filter = button.dataset.statusFilter;
      renderArticleList();
    });
  });

  document.getElementById("new-article-button").addEventListener("click", () => {
    articleState.selectedId = "new";
    fillEditor(blankArticle());
    highlightSelected();
  });

  document.getElementById("editor-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveArticle();
  });

  document.querySelectorAll("[data-set-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      await saveArticle(button.dataset.setStatus);
    });
  });

  document.getElementById("generate-button").addEventListener("click", generateContent);

  document.querySelectorAll("[data-copy-field]").forEach((button) => {
    button.addEventListener("click", async () => {
      const field = document.getElementById(button.dataset.copyField);
      try {
        await navigator.clipboard.writeText(field.value);
        const original = button.textContent;
        button.textContent = "コピーしました";
        setTimeout(() => (button.textContent = original), 1800);
      } catch {
        field.select();
      }
    });
  });

  loadArticles();
}

function blankArticle() {
  return {
    id: null,
    title: "",
    raw_content: "",
    article_content: "",
    excerpt: "",
    target_audience: "",
    category: "other",
    tags: [],
    status: "idea",
    source_type: "気づき",
    note_version: "",
    facebook_version: "",
    instagram_version: "",
    x_version: "",
    line_version: "",
    seo_title: "",
    seo_description: "",
    slug: "",
    featured_image: "",
    related_service: "",
    call_to_action: "line",
    updated_at: null,
  };
}

async function loadArticles() {
  const statusEl = document.getElementById("article-list-status");
  statusEl.textContent = "読み込んでいます…";
  const { data, error } = await client.from("articles").select("*").order("updated_at", { ascending: false });
  if (error) {
    statusEl.textContent = "記事一覧を読み込めませんでした。";
    return;
  }
  articleState.items = data || [];
  statusEl.textContent = "";
  renderArticleList();
}

function renderArticleList() {
  const list = document.getElementById("article-list");
  const filtered = articleState.filter
    ? articleState.items.filter((a) => a.status === articleState.filter)
    : articleState.items;

  list.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "admin-note";
    empty.textContent = "該当する記事はありません。";
    list.append(empty);
    return;
  }

  for (const article of filtered) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = article.id;
    button.innerHTML = `<span class="status-pill">${STATUS_LABEL[article.status] || article.status}</span><strong>${escapeHtml(article.title || "（無題）")}</strong>`;
    button.addEventListener("click", () => {
      articleState.selectedId = article.id;
      fillEditor(article);
      highlightSelected();
    });
    li.append(button);
    list.append(li);
  }
  highlightSelected();
}

function highlightSelected() {
  document.querySelectorAll("#article-list button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.id === String(articleState.selectedId));
  });
}

function fillEditor(article) {
  document.getElementById("editor-empty").hidden = true;
  const form = document.getElementById("editor-form");
  form.hidden = false;

  document.getElementById("editor-status-pill").textContent = STATUS_LABEL[article.status] || article.status;
  document.getElementById("editor-meta").textContent = article.updated_at
    ? `最終更新：${new Date(article.updated_at).toLocaleString("ja-JP")}`
    : "新規記事（未保存）";

  document.getElementById("field-title").value = article.title || "";
  document.getElementById("field-raw-content").value = article.raw_content || "";
  document.getElementById("field-target-audience").value = article.target_audience || "";
  document.getElementById("field-category").value = article.category || "other";
  document.getElementById("field-source-type").value = article.source_type || "気づき";
  document.getElementById("field-tags").value = (article.tags || []).join(", ");
  document.getElementById("field-article-content").value = article.article_content || "";
  document.getElementById("field-excerpt").value = article.excerpt || "";
  document.getElementById("field-note").value = article.note_version || "";
  document.getElementById("field-facebook").value = article.facebook_version || "";
  document.getElementById("field-instagram").value = article.instagram_version || "";
  document.getElementById("field-x").value = article.x_version || "";
  document.getElementById("field-line").value = article.line_version || "";
  document.getElementById("field-slug").value = article.slug || "";
  document.getElementById("field-seo-title").value = article.seo_title || "";
  document.getElementById("field-seo-description").value = article.seo_description || "";
  document.getElementById("field-featured-image").value = article.featured_image || "";
  document.getElementById("field-related-service").value = article.related_service || "";
  document.getElementById("field-cta").value = article.call_to_action || "line";

  form.dataset.currentId = article.id || "";
  form.dataset.currentStatus = article.status || "idea";
}

function readEditorFields() {
  const tags = document
    .getElementById("field-tags")
    .value.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    title: document.getElementById("field-title").value.trim(),
    raw_content: document.getElementById("field-raw-content").value,
    target_audience: document.getElementById("field-target-audience").value.trim(),
    category: document.getElementById("field-category").value,
    source_type: document.getElementById("field-source-type").value,
    tags,
    article_content: document.getElementById("field-article-content").value,
    excerpt: document.getElementById("field-excerpt").value,
    note_version: document.getElementById("field-note").value,
    facebook_version: document.getElementById("field-facebook").value,
    instagram_version: document.getElementById("field-instagram").value,
    x_version: document.getElementById("field-x").value,
    line_version: document.getElementById("field-line").value,
    slug: document.getElementById("field-slug").value.trim(),
    seo_title: document.getElementById("field-seo-title").value.trim(),
    seo_description: document.getElementById("field-seo-description").value.trim(),
    featured_image: document.getElementById("field-featured-image").value.trim(),
    related_service: document.getElementById("field-related-service").value.trim(),
    call_to_action: document.getElementById("field-cta").value,
  };
}

async function saveArticle(nextStatus) {
  const form = document.getElementById("editor-form");
  const statusEl = document.getElementById("editor-status");
  const fields = readEditorFields();

  if (!fields.title) {
    statusEl.textContent = "記事タイトルを入力してください。";
    return;
  }

  const currentStatus = form.dataset.currentStatus || "idea";
  const targetStatus = nextStatus || currentStatus || "idea";

  if (targetStatus === "published" && !fields.slug) {
    statusEl.textContent = "公開するには、SEO・公開設定の「URL」を入力してください。";
    return;
  }

  const payload = { ...fields, status: targetStatus };
  if (targetStatus === "approved" && currentStatus !== "approved") payload.approved_at = new Date().toISOString();
  if (targetStatus === "published" && currentStatus !== "published") payload.published_at = new Date().toISOString();

  const currentId = form.dataset.currentId;
  statusEl.textContent = "保存しています…";

  let result;
  if (currentId) {
    result = await client.from("articles").update(payload).eq("id", currentId).select().single();
  } else {
    result = await client.from("articles").insert(payload).select().single();
  }

  if (result.error) {
    statusEl.textContent = `保存できませんでした：${result.error.message}`;
    return;
  }

  statusEl.textContent = "保存しました。";
  form.dataset.currentId = result.data.id;
  form.dataset.currentStatus = result.data.status;
  articleState.selectedId = result.data.id;
  await loadArticles();
  fillEditor(result.data);
}

async function generateContent() {
  const statusEl = document.getElementById("generate-status");
  const fields = readEditorFields();

  if (!fields.title && !fields.raw_content) {
    statusEl.textContent = "先にタイトルか原文メモを入力してください。";
    return;
  }

  statusEl.textContent = "作成しています…";
  let result = null;

  try {
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(fields),
    });
    if (response.ok) {
      const json = await response.json();
      if (json && json.configured !== false) result = json;
    }
  } catch {
    // Cloudflare Functionが無い/未設定の場合はここに来る。テンプレートにフォールバックする。
  }

  if (!result) {
    result = buildTemplates(fields);
    statusEl.textContent = "AI設定がないため、テンプレートを表示しました。内容を確認し、書き足してください。";
  } else {
    statusEl.textContent = "AIによる下書き案を作成しました。内容を必ず確認してください。";
  }

  const setIfEmpty = (id, value) => {
    const el = document.getElementById(id);
    if (!el.value.trim() && value) el.value = value;
  };

  setIfEmpty("field-article-content", result.article_content);
  setIfEmpty("field-excerpt", result.excerpt);
  setIfEmpty("field-note", result.note_version);
  setIfEmpty("field-facebook", result.facebook_version);
  setIfEmpty("field-instagram", result.instagram_version);
  setIfEmpty("field-x", result.x_version);
  setIfEmpty("field-line", result.line_version);
  setIfEmpty("field-seo-title", result.seo_title);
  setIfEmpty("field-seo-description", result.seo_description);
}

function buildTemplates(fields) {
  const title = fields.title || "（タイトル未定）";
  const gist = fields.raw_content || fields.excerpt || "";
  const audience = fields.target_audience || "お客様";

  return {
    article_content: `<h2>${title}</h2>\n<p>${gist}</p>\n<p>ここに、店頭でお伝えしている内容を具体的に書き足してください。</p>`,
    excerpt: gist.slice(0, 80),
    note_version: `【${title}】\n\n${gist}\n\n※詳しくはANDANTINOのサイトでもご紹介しています。`,
    facebook_version: `${title}\n\n${gist}\n\nご来店の際は、今お使いの靴もお持ちください。`,
    instagram_version: `${title}\n${gist}\n#ANDANTINO #和歌山 #靴 #インソール`,
    x_version: `${title}／${gist}`.slice(0, 120),
    line_version: `${audience}へ\n\n${title}\n${gist}\n\n気になることがあれば、このままLINEでご相談ください。`,
    seo_title: `${title}｜ANDANTINO`,
    seo_description: gist.slice(0, 120),
  };
}

/* ===================== 設定（オンライン相談） ===================== */

function initSettings() {
  document.getElementById("settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const statusEl = document.getElementById("settings-status");
    const payload = {
      online_consultation_enabled: document.getElementById("settings-enabled").checked,
      online_consultation_price: document.getElementById("settings-price").value.trim(),
      online_consultation_duration_minutes: Number(document.getElementById("settings-duration").value) || 30,
      online_consultation_note: document.getElementById("settings-note").value.trim(),
    };
    statusEl.textContent = "保存しています…";
    const { error } = await client.from("site_settings").update(payload).eq("id", 1);
    statusEl.textContent = error ? `保存できませんでした：${error.message}` : "保存しました。";
  });

  loadSettings();
}

async function loadSettings() {
  const { data, error } = await client.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return;
  document.getElementById("settings-enabled").checked = Boolean(data.online_consultation_enabled);
  document.getElementById("settings-price").value = data.online_consultation_price || "";
  document.getElementById("settings-duration").value = data.online_consultation_duration_minutes || 30;
  document.getElementById("settings-note").value = data.online_consultation_note || "";
}

/* ===================== 設定（PDF商品） ===================== */

function initProducts() {
  document.getElementById("new-product-button").addEventListener("click", () => {
    renderProductRow({
      id: null,
      name: "",
      description: "",
      price: "",
      sample_image: "",
      status: "preparing",
      line_message: "",
      display_order: 0,
    });
  });

  loadProducts();
}

async function loadProducts() {
  const list = document.getElementById("product-list");
  const statusEl = document.getElementById("product-list-status");
  list.innerHTML = "";
  const { data, error } = await client.from("pdf_products").select("*").order("display_order", { ascending: true });
  if (error) {
    statusEl.textContent = "PDF商品を読み込めませんでした。";
    return;
  }
  statusEl.textContent = "";
  (data || []).forEach(renderProductRow);
}

function renderProductRow(product) {
  const template = document.getElementById("product-row-template");
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = product.id || "";

  const setField = (name, value) => {
    const field = node.querySelector(`[data-field="${name}"]`);
    if (field) field.value = value || (name === "status" ? "preparing" : "");
  };
  setField("name", product.name);
  setField("description", product.description);
  setField("price", product.price);
  setField("sample_image", product.sample_image);
  setField("status", product.status);
  setField("line_message", product.line_message);

  node.querySelector('[data-action="save"]').addEventListener("click", async () => {
    const payload = {
      name: node.querySelector('[data-field="name"]').value.trim(),
      description: node.querySelector('[data-field="description"]').value.trim(),
      price: node.querySelector('[data-field="price"]').value.trim(),
      sample_image: node.querySelector('[data-field="sample_image"]').value.trim(),
      status: node.querySelector('[data-field="status"]').value,
      line_message: node.querySelector('[data-field="line_message"]').value.trim(),
      display_order: product.display_order || 0,
    };
    const statusEl = document.getElementById("product-list-status");
    let result;
    if (node.dataset.id) {
      result = await client.from("pdf_products").update(payload).eq("id", node.dataset.id).select().single();
    } else {
      result = await client.from("pdf_products").insert(payload).select().single();
    }
    if (result.error) {
      statusEl.textContent = `保存できませんでした：${result.error.message}`;
      return;
    }
    node.dataset.id = result.data.id;
    statusEl.textContent = "保存しました。";
  });

  node.querySelector('[data-action="delete"]').addEventListener("click", async () => {
    if (!node.dataset.id) {
      node.remove();
      return;
    }
    if (!confirm("この商品を削除します。よろしいですか？")) return;
    const { error } = await client.from("pdf_products").delete().eq("id", node.dataset.id);
    if (!error) node.remove();
  });

  document.getElementById("product-list").append(node);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
