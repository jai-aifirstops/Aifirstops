const header = document.querySelector("[data-header]");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const year = document.querySelector("[data-year]");

if (year) {
  year.textContent = new Date().getFullYear();
}

const updateHeaderState = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";

  navToggle.setAttribute("aria-expanded", String(!isOpen));
  navLinks?.classList.toggle("is-open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

navLinks?.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLAnchorElement)) {
    return;
  }

  navToggle?.setAttribute("aria-expanded", "false");
  navLinks.classList.remove("is-open");
  document.body.classList.remove("menu-open");
});
