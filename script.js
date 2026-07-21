const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".nav");

if (menuButton && navigation) {
  const menuLabel = menuButton.querySelector(".sr-only");

  const setMenuState = (isOpen) => {
    menuButton.setAttribute("aria-expanded", String(isOpen));
    navigation.classList.toggle("is-open", isOpen);
    if (menuLabel) menuLabel.textContent = isOpen ? "全メニューを閉じる" : "全メニューを開く";
  };

  const closeMenu = () => {
    setMenuState(false);
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!navigation.classList.contains("is-open")) return;
    if (navigation.contains(event.target) || menuButton.contains(event.target)) return;
    closeMenu();
  });
}
