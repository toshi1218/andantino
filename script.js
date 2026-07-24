const fullMenuMarkup = `
  <div class="container nav__panel">
    <div class="nav__group nav__group--priority">
      <strong>相談内容から探す</strong>
      <a href="./adult-shoes.html">大人の靴選び</a>
      <a href="./childrens-shoes.html">子どもの足育・靴</a>
      <a href="./insoles.html">インソール</a>
      <a href="./pricing.html">料金</a>
      <a href="./contact.html">ご予約・ご相談・お問い合わせ</a>
    </div>
    <div class="nav__group nav__group--offerings">
      <strong>取扱商品・サービス</strong>
      <a href="./products.html"><img src="./assets/paramount-pumps.webp" width="60" height="60" loading="lazy" alt=""><span>取扱商品</span></a>
      <a href="./dymoco-insole.html"><img src="./assets/product-dymoco-insole.webp" width="60" height="60" loading="lazy" alt=""><span>オーダーインソール（ディモコ）</span></a>
      <a href="./seminars.html"><img src="./assets/legacy-seminar.webp" width="60" height="60" loading="lazy" alt=""><span>足育・靴選びセミナー</span></a>
      <a href="./nordic-walking.html"><img src="./assets/nordic-walking-park.webp" width="60" height="60" loading="lazy" alt=""><span>ノルディックウォーキング</span></a>
    </div>
    <div class="nav__group nav__group--knowledge">
      <strong>足と靴の知識</strong>
      <a href="./guides.html">足と靴の知識一覧</a>
      <a href="./shoe-wearing.html">靴の選び方・履き方</a>
      <a href="./foot-problems.html">お悩み・症状から探す</a>
      <a href="./foot-check.html">ご相談で確認すること</a>
      <a href="./case-studies.html">ご相談事例</a>
      <a href="./faq.html">よくある質問</a>
    </div>
    <div class="nav__group nav__group--secondary">
      <strong>店舗情報・サイト案内</strong>
      <a href="./about.html">店舗概要</a>
      <a href="./owner.html">五十嵐洋子について</a>
      <a href="./news.html">お知らせ</a>
      <a href="./#shop">店舗案内・アクセス</a>
      <a href="https://line.me/R/ti/p/@680mdoos" target="_blank" rel="noopener">公式LINE ↗</a>
      <a href="https://www.facebook.com/share/18yvcF1E6G/" target="_blank" rel="noopener">Facebook ↗</a>
      <a href="https://www.youtube.com/@andantino7110" target="_blank" rel="noopener">YouTube ↗</a>
      <a href="https://www.instagram.com/yoko1367/" target="_blank" rel="noopener">Instagram ↗</a>
      <a href="https://blog.livedoor.jp/andantino7110/" target="_blank" rel="noopener">公式ブログ ↗</a>
      <a href="./links.html">公式・関連外部リンク</a>
      <a href="./privacy.html">プライバシーポリシー</a>
      <a href="./terms.html">利用規約</a>
      <a href="./legal.html">特定商取引法に基づく表記</a>
    </div>
  </div>`;

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
  navigation.innerHTML = fullMenuMarkup;
  infoHeader.append(navigation);
}

if (infoHeader && !document.querySelector(".mobile-actions")) {
  document.body.insertAdjacentHTML(
    "beforeend",
    '<nav class="mobile-actions" aria-label="クイックアクション"><a href="tel:0734947110">📞 お電話</a><a href="mailto:andantino@wine.plala.or.jp">✉️ メール</a><a class="mobile-actions__primary" href="https://line.me/R/ti/p/@680mdoos" target="_blank" rel="noopener">💬 LINEでご予約・ご相談</a></nav>'
  );
}

const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".nav");
const mobileMenuMedia = window.matchMedia("(max-width: 520px)");
let resetMenuGroups = () => {};

if (navigation) {
  const collapsibleGroups = [
    ...navigation.querySelectorAll(".nav__group:not(.nav__group--priority)"),
  ].map((group, index) => {
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

    button.addEventListener("click", () => {
      setOpen(button.getAttribute("aria-expanded") !== "true");
    });

    return { setOpen };
  });

  const syncMenuGroups = () => {
    collapsibleGroups.forEach(({ setOpen }) => setOpen(!mobileMenuMedia.matches));
  };

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

  menuButton.addEventListener("click", () => {
    setMenuState(menuButton.getAttribute("aria-expanded") !== "true");
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  navigation.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [
      ...navigation.querySelectorAll("a[href], button:not([disabled])"),
    ].filter((element) => element.getClientRects().length);
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
    if (event.key === "Escape" && navigation.classList.contains("is-open")) {
      setMenuState(false, true);
    }
  });

  document.addEventListener("click", (event) => {
    if (!navigation.classList.contains("is-open")) return;
    if (navigation.contains(event.target) || menuButton.contains(event.target)) return;
    setMenuState(false);
  });
}

const contactForm = document.querySelector(".contact-form");

if (contactForm) {
  const statusEl = contactForm.querySelector(".contact-form__status");
  const phoneField = contactForm.querySelector("#cf-phone");
  const emailField = contactForm.querySelector("#cf-email");

  const showStatus = (message, state) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.state = state;
    statusEl.hidden = false;
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!phoneField.value.trim() && !emailField.value.trim()) {
      showStatus("電話番号かメールアドレスのいずれかをご記入ください。", "error");
      phoneField.focus();
      return;
    }

    if (!contactForm.reportValidity()) return;

    const submitButton = contactForm.querySelector("button[type=submit]");
    submitButton.disabled = true;
    showStatus("送信しています…", "");

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(contactForm),
      });
      const result = await response.json();

      if (result.success) {
        contactForm.reset();
        showStatus("送信しました。ご連絡いただきありがとうございます。折り返しご連絡いたします。", "success");
      } else {
        showStatus("送信に失敗しました。お手数ですがLINE・電話・メールでご連絡ください。", "error");
      }
    } catch {
      showStatus("送信に失敗しました。お手数ですがLINE・電話・メールでご連絡ください。", "error");
    } finally {
      submitButton.disabled = false;
    }
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
