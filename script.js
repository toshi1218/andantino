const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
const currentFile = currentPath.split("/").pop() || "index.html";
const pageName = currentFile.replace(/\.html$/, "") || "home";
document.body.dataset.page = pageName;

const fullMenuMarkup = `
  <div class="container nav__panel nav__panel--simple">
    <div class="nav__group nav__group--priority">
      <strong>ご相談内容</strong>
      <a href="./adult-shoes.html">大人の靴選び</a>
      <a href="./childrens-shoes.html">子どもの靴選び</a>
      <a href="./insoles.html">インソール</a>
      <a href="./pricing.html">料金</a>
      <a href="./contact.html">ご予約・ご相談・お問い合わせ</a>
    </div>
    <div class="nav__group nav__group--knowledge">
      <strong>詳しく知る</strong>
      <a href="./case-studies.html">ご相談事例</a>
      <a href="./foot-problems.html">足のお悩みから探す</a>
      <a href="./products.html">取扱商品</a>
      <a href="./articles.html">お役立ち記事</a>
      <a href="./faq.html">よくある質問</a>
    </div>
    <div class="nav__group nav__group--secondary">
      <strong>店舗・その他</strong>
      <a href="./about.html">店舗概要・アクセス</a>
      <a href="./owner.html">五十嵐洋子について</a>
      <a href="./seminars.html">セミナー・法人向け</a>
      <a href="./online-consultation.html">オンライン相談</a>
      <a href="./pdf-products.html">デジタル商品</a>
    </div>
  </div>`;

const resolveMenuMarkup = () =>
  currentPath.startsWith("/articles/")
    ? fullMenuMarkup.replace(/="\.\//g, '="../')
    : fullMenuMarkup;

const infoHeader = document.querySelector(".info-header");

if (infoHeader && !infoHeader.querySelector(".menu-button")) {
  const headerInner = infoHeader.querySelector(".info-header__inner");
  const quickNav = [...headerInner.children].find((element) => element.tagName === "NAV");
  const menuButton = document.createElement("button");
  menuButton.className = "menu-button";
  menuButton.type = "button";
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-controls", "global-nav");
  menuButton.innerHTML = '<span class="menu-button__text">メニュー</span><span class="menu-button__bars" aria-hidden="true"><span></span><span></span><span></span></span><span class="sr-only">メニューを開く</span>';
  headerInner.insertBefore(menuButton, quickNav || null);

  const navigation = document.createElement("nav");
  navigation.className = "nav";
  navigation.id = "global-nav";
  navigation.setAttribute("aria-label", "全ページメニュー");
  navigation.innerHTML = resolveMenuMarkup();
  infoHeader.append(navigation);
}

const existingNavigation = document.querySelector(".nav#global-nav");
if (existingNavigation) existingNavigation.innerHTML = resolveMenuMarkup();

if (infoHeader && !document.querySelector(".mobile-actions")) {
  document.body.insertAdjacentHTML(
    "beforeend",
    '<nav class="mobile-actions" aria-label="クイックアクション"><a href="tel:0734947110">📞 お電話</a><a href="mailto:yokoigarashi213@gmail.com">✉️ メール</a><a class="mobile-actions__primary" href="https://line.me/R/ti/p/@680mdoos" target="_blank" rel="noopener">💬 LINEでご予約・ご相談</a></nav>'
  );
}

const enhancementStyle = document.createElement("style");
enhancementStyle.textContent = `
  .nav__panel--simple { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .line-guide { margin: 1.5rem 0; padding: 1.25rem; border: 1px solid rgba(91, 46, 111, .22); border-radius: 18px; background: #fffaf5; }
  .line-guide h2, .line-guide h3 { margin-top: 0; }
  .line-guide__buttons { display: flex; flex-wrap: wrap; gap: .75rem; margin: 1rem 0; }
  .line-guide__button { appearance: none; border: 1px solid #5b2e6f; border-radius: 999px; padding: .7rem 1rem; background: #fff; color: #5b2e6f; font: inherit; font-weight: 700; cursor: pointer; }
  .line-guide__button:hover, .line-guide__button:focus-visible { background: #f4e9f8; }
  .line-guide__template { white-space: pre-wrap; padding: 1rem; border-radius: 12px; background: #fff; border: 1px solid rgba(0,0,0,.08); }
  .line-guide__status { min-height: 1.5em; font-weight: 700; }
  .price-reassurance { margin-top: 1rem; padding: 1rem 1.1rem; border-left: 4px solid #5b2e6f; background: #fff; }
  .case-study-note { margin: 1.5rem 0; padding: 1.1rem; border-radius: 16px; background: #f8f3fa; }
  @media (max-width: 760px) { .nav__panel--simple { grid-template-columns: 1fr; } }
`;
document.head.append(enhancementStyle);

const lineTemplates = {
  adult: "【大人の靴選びについて相談】\n1. 現在困っていること：\n2. ご希望の来店日時：\n3. その他伝えておきたいこと：",
  child: "【子どもの靴について相談】\n1. お子さまの年齢：\n2. 現在困っていること：\n3. ご希望の来店日時：",
  insole: "【インソールについて相談】\n1. 現在困っていること：\n2. 使用したい靴・用途：\n3. ご希望の来店日時：",
};

const addLineGuide = (target, headingLevel = "h2") => {
  if (!target || document.querySelector(".line-guide")) return;
  const guide = document.createElement("section");
  guide.className = "line-guide";
  guide.setAttribute("aria-labelledby", "line-guide-title");
  guide.innerHTML = `
    <${headingLevel} id="line-guide-title">LINEでは、次の内容を送るとスムーズです</${headingLevel}>
    <p>相談内容を選ぶと、送信用のひな形が表示されます。コピーして公式LINEへ貼り付けてください。</p>
    <div class="line-guide__buttons" role="group" aria-label="相談内容を選ぶ">
      <button class="line-guide__button" type="button" data-line-template="adult">大人の靴</button>
      <button class="line-guide__button" type="button" data-line-template="child">子どもの靴</button>
      <button class="line-guide__button" type="button" data-line-template="insole">インソール</button>
    </div>
    <div class="line-guide__template" id="line-guide-template">相談内容を選んでください。</div>
    <p class="line-guide__status" id="line-guide-status" aria-live="polite"></p>
    <p><a class="button" href="https://line.me/R/ti/p/@680mdoos" target="_blank" rel="noopener">公式LINEを開く</a></p>`;
  target.insertAdjacentElement("afterend", guide);

  guide.querySelectorAll("[data-line-template]").forEach((button) => {
    button.addEventListener("click", async () => {
      const template = lineTemplates[button.dataset.lineTemplate];
      const templateEl = guide.querySelector("#line-guide-template");
      const statusEl = guide.querySelector("#line-guide-status");
      templateEl.textContent = template;
      try {
        await navigator.clipboard.writeText(template);
        statusEl.textContent = "ひな形をコピーしました。公式LINEを開いて貼り付けてください。";
      } catch {
        statusEl.textContent = "ひな形を表示しました。長押ししてコピーしてください。";
      }
    });
  });
};

if (pageName === "home") addLineGuide(document.querySelector(".hero"), "h2");
if (pageName === "contact") {
  const contactLead = document.querySelector("main .section-heading, main header, main > section:first-of-type");
  addLineGuide(contactLead, "h2");
}

const priceNote = document.querySelector(".price-glance__note");
if (priceNote && !document.querySelector(".price-reassurance")) {
  const reassurance = document.createElement("p");
  reassurance.className = "price-reassurance";
  reassurance.textContent = "すべての方に靴とインソールの両方が必要という意味ではありません。足・今の靴・用途を確認し、必要な内容だけをご提案します。";
  priceNote.insertAdjacentElement("afterend", reassurance);
}

if (pageName === "case-studies") {
  const mainHeading = document.querySelector("main h1");
  if (mainHeading && !document.querySelector(".case-study-note")) {
    const note = document.createElement("div");
    note.className = "case-study-note";
    note.innerHTML = "<strong>事例の見方</strong><p>一人ひとり足や生活条件が異なるため、同じ結果を保証するものではありません。どのようにお話を伺い、足・靴・歩き方を確認し、何をご提案したかをご覧ください。</p>";
    mainHeading.insertAdjacentElement("afterend", note);
  }
}

if (!document.querySelector(".back-to-top")) {
  const backToTop = document.createElement("button");
  backToTop.type = "button";
  backToTop.className = "back-to-top";
  backToTop.setAttribute("aria-label", "ページの一番上に戻る");
  backToTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline></svg>';
  document.body.append(backToTop);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ticking = false;
  const syncVisibility = () => {
    backToTop.classList.toggle("is-visible", window.scrollY > 480);
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncVisibility);
  }, { passive: true });
  syncVisibility();
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
  });
}

const normalizePath = (href) => {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin || url.hash) return "";
  const normalized = url.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "").replace(/\/+$/, "");
  return normalized || "/";
};

document.querySelectorAll('a[href]:not([href^="#"])').forEach((link) => {
  if (normalizePath(link.href) !== currentPath) return;
  if (link.closest(".breadcrumb")) return;
  link.setAttribute("aria-current", "page");
});

const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".nav");
const mobileMenuMedia = window.matchMedia("(max-width: 520px)");
let resetMenuGroups = () => {};

if (navigation) {
  const collapsibleGroups = [...navigation.querySelectorAll(".nav__group:not(.nav__group--priority)")].map((group, index) => {
    const heading = group.querySelector(":scope > strong");
    const links = [...group.querySelectorAll(":scope > a")];
    const panel = document.createElement("div");
    const button = document.createElement("button");
    const panelId = `nav-group-${index + 1}`;
    panel.className = "nav__group-links";
    panel.id = panelId;
    links.forEach((link) => panel.append(link));
    button.className = "nav__group-toggle";
    button.type = "button";
    button.setAttribute("aria-controls", panelId);
    button.innerHTML = `<span>${heading?.textContent || "メニュー"}</span><span class="nav__group-chevron" aria-hidden="true"></span>`;
    heading?.replaceWith(button);
    group.append(panel);
    const setOpen = (isOpen) => {
      button.setAttribute("aria-expanded", String(isOpen));
      panel.hidden = !isOpen;
    };
    button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
    return { setOpen };
  });
  const syncMenuGroups = () => collapsibleGroups.forEach(({ setOpen }) => setOpen(!mobileMenuMedia.matches));
  resetMenuGroups = () => {
    if (!mobileMenuMedia.matches) return;
    collapsibleGroups.forEach(({ setOpen }) => setOpen(false));
  };
  syncMenuGroups();
  mobileMenuMedia.addEventListener?.("change", syncMenuGroups);
}

if (menuButton && navigation) {
  const menuLabel = menuButton.querySelector(".sr-only");
  const setMenuState = (isOpen, returnFocus = false) => {
    if (isOpen) resetMenuGroups();
    menuButton.setAttribute("aria-expanded", String(isOpen));
    navigation.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    if (menuLabel) menuLabel.textContent = isOpen ? "メニューを閉じる" : "メニューを開く";
    if (!isOpen && returnFocus) menuButton.focus();
  };
  menuButton.addEventListener("click", () => setMenuState(menuButton.getAttribute("aria-expanded") !== "true"));
  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenuState(false)));
  navigation.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...navigation.querySelectorAll("a[href], button:not([disabled])")].filter((element) => element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navigation.classList.contains("is-open")) setMenuState(false, true);
  });
  document.addEventListener("click", (event) => {
    if (!navigation.classList.contains("is-open")) return;
    if (navigation.contains(event.target) || menuButton.contains(event.target)) return;
    setMenuState(false);
  });
}

document.querySelectorAll(".yt-facade").forEach((facade) => {
  facade.addEventListener("click", () => {
    const videoId = facade.dataset.ytId;
    if (!videoId) return;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
    iframe.title = facade.getAttribute("aria-label") || "";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    facade.replaceWith(iframe);
  });
});

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  const target = document.querySelector(button.dataset.copyTarget);
  const status = document.querySelector(`#${button.getAttribute("aria-describedby")}`);
  if (!target) return;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      button.textContent = "コピーしました";
      if (status) status.textContent = "公式LINEを開いて、そのまま貼り付けてください。";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      if (status) status.textContent = "ひな形を選択しました。長押ししてコピーしてください。";
    }
  });
});

const inquiryForm = document.querySelector("#inquiry-form-el");
if (inquiryForm) {
  const statusEl = inquiryForm.querySelector(".inquiry-form__status");
  const successPanel = document.querySelector("#inquiry-form-success");
  const submitButton = inquiryForm.querySelector('button[type="submit"]');
  inquiryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitButton) submitButton.disabled = true;
    if (statusEl) statusEl.textContent = "送信しています…";
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(inquiryForm))),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        inquiryForm.hidden = true;
        if (successPanel) successPanel.hidden = false;
        successPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else throw new Error(result.message || "submission failed");
    } catch {
      if (statusEl) statusEl.textContent = "送信できませんでした。お手数ですが、公式LINEまたはお電話でご連絡ください。";
      if (submitButton) submitButton.disabled = false;
    }
  });
}

const tocLinks = [...document.querySelectorAll('.article-toc a[href^="#"]')];
if (tocLinks.length) {
  const observedSections = tocLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const setCurrentSection = (id) => {
    tocLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === `#${id}`;
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) setCurrentSection(visible[0].target.id);
  }, { rootMargin: "-18% 0px -68% 0px", threshold: 0 });
  observedSections.forEach((section) => observer.observe(section));
  setCurrentSection(observedSections[0]?.id);
}

(function () {
  const config = window.ANDANTINO_SUPABASE || {};
  if (!config.url || !config.anonKey) return;
  const endpoint = `${config.url}/rest/v1/analytics_events`;
  const headers = { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, "Content-Type": "application/json", Prefer: "return=minimal" };
  function sendEvent(eventType, meta) {
    const payload = JSON.stringify({ event_type: eventType, page_path: window.location.pathname, meta: meta || {} });
    fetch(endpoint, { method: "POST", headers, body: payload, keepalive: true }).catch(() => {});
  }
  const path = window.location.pathname;
  if (/\/articles\/[^/]+\.html$/.test(path)) sendEvent("article_view");
  else if (/\/online-consultation\.html$/.test(path)) sendEvent("consultation_view");
  else if (/\/pdf-products\.html$/.test(path)) sendEvent("pdf_view");
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (/^https:\/\/line\.me\//.test(href)) sendEvent("line_click", { href });
    else if (/contact\.html(?:[?#]|$)/.test(href)) sendEvent("reservation_click", { href });
    else if (/^https:\/\/(www\.)?(facebook|instagram|youtube|note|x|twitter)\.com\//.test(href) || /^https:\/\/blog\.livedoor\.jp\//.test(href)) sendEvent("sns_click", { href });
  });
})();