// ANDANTINO コンテンツ管理画面。
// 記事の追加・修正はこの画面では行わない（ChatGPT/Codexがリポジトリの
// content/articles/*.md を直接更新する運用）。ここで扱うのは、
// オンライン相談の受付設定と、PDF商品の一覧だけ。
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
  initSettings();
  initProducts();
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
      version_label: "",
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
  setField("version_label", product.version_label);

  node.querySelector('[data-action="save"]').addEventListener("click", async () => {
    const payload = {
      name: node.querySelector('[data-field="name"]').value.trim(),
      description: node.querySelector('[data-field="description"]').value.trim(),
      price: node.querySelector('[data-field="price"]').value.trim(),
      sample_image: node.querySelector('[data-field="sample_image"]').value.trim(),
      status: node.querySelector('[data-field="status"]').value,
      line_message: node.querySelector('[data-field="line_message"]').value.trim(),
      version_label: node.querySelector('[data-field="version_label"]').value.trim(),
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
