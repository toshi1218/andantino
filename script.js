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
    <div class="nav__group">
      <strong>悩み・知識から探す</strong>
      <a href="./guides.html">足と靴の知識一覧</a>
      <a href="./shoe-wearing.html">靴の選び方・履き方</a>
      <a href="./foot-problems.html">外反母趾・内反小趾・3つのアーチ</a>
      <a href="./foot-check.html">足・靴・歩き方を見る理由</a>
      <a href="./faq.html">よくある質問</a>
    </div>
    <div class="nav__group">
      <strong>店舗・サービス</strong>
      <a href="./products.html">取扱商品</a>
      <a href="./seminars.html">足育・靴選びセミナー</a>
      <a href="./about.html">店舗・個人事業概要</a>
      <a href="./owner.html">五十嵐洋子について</a>
      <a href="./#shop">店舗案内・アクセス</a>
    </div>
    <div class="nav__group nav__group--secondary">
      <strong>公式情報・サイト案内</strong>
      <a href="https://line.me/R/ti/p/@680mdoos" target="_blank" rel="noopener">公式LINE ↗</a>
      <a href="https://www.facebook.com/share/18yvcF1E6G/" target="_blank" rel="noopener">Facebook ↗</a>
      <a href="https://blog.livedoor.jp/andantino7110/" target="_blank" rel="noopener">公式ブログ ↗</a>
      <a href="./links.html">公式・関連外部リンク</a>
      <a href="./editorial-policy.html">編集方針・情報源</a>
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
  menuButton.innerHTML = '<span class="menu-button__text">全メニュー</span><span class="menu-button__bars" aria-hidden="true"><span></span><span></span><span></span></span><span class="sr-only">全メニューを開く</span>';
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
    '<nav class="mobile-actions" aria-label="クイックアクション"><a href="tel:0734947110">お電話でご相談</a><a class="mobile-actions__primary" href="https://line.me/R/ti/p/@680mdoos" target="_blank" rel="noopener">LINEでご予約・ご相談</a></nav>'
  );
}

const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".nav");

if (menuButton && navigation) {
  const menuLabel = menuButton.querySelector(".sr-only");

  const setMenuState = (isOpen, returnFocus = false) => {
    menuButton.setAttribute("aria-expanded", String(isOpen));
    navigation.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    if (menuLabel) menuLabel.textContent = isOpen ? "全メニューを閉じる" : "全メニューを開く";
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
    const focusable = [...navigation.querySelectorAll("a[href]")];
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
