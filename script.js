const root = document.documentElement;
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const progressBar = document.querySelector(".scroll-progress");
const toast = document.querySelector("[data-toast]");

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const showToast = (message) => {
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
};

const storedTheme = window.localStorage.getItem("aifirstops-theme");
if (storedTheme) {
  root.dataset.theme = storedTheme;
}

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  nav?.classList.toggle("open", !isOpen);
});

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    nav.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

themeToggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = nextTheme;
  window.localStorage.setItem("aifirstops-theme", nextTheme);
});

const updateProgress = () => {
  if (!progressBar) {
    return;
  }

  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
  progressBar.style.width = `${progress}%`;
};

window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      const counter = entry.target;
      const target = Number(counter.getAttribute("data-target"));
      let current = 0;
      const steps = 36;
      const increment = target / steps;

      const tick = () => {
        current += increment;
        if (current >= target) {
          counter.textContent = String(target);
          return;
        }

        counter.textContent = String(Math.round(current));
        window.requestAnimationFrame(tick);
      };

      tick();
      counterObserver.unobserve(counter);
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll("[data-counter]").forEach((counter) => {
  counterObserver.observe(counter);
});

const setupFilter = ({ buttonSelector, itemSelector, attribute }) => {
  const buttons = document.querySelectorAll(buttonSelector);
  const items = document.querySelectorAll(itemSelector);

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute(attribute);

      buttons.forEach((currentButton) => currentButton.classList.remove("active"));
      button.classList.add("active");

      items.forEach((item) => {
        const type = item.getAttribute(attribute === "data-filter" ? "data-category" : "data-type");
        item.hidden = value !== "all" && type !== value;
      });
    });
  });
};

setupFilter({
  buttonSelector: "[data-filter]",
  itemSelector: "[data-category]",
  attribute: "data-filter",
});

setupFilter({
  buttonSelector: "[data-portfolio-filter]",
  itemSelector: "[data-type]",
  attribute: "data-portfolio-filter",
});

const billingToggle = document.querySelector("[data-billing-toggle]");
billingToggle?.addEventListener("click", () => {
  const annual = billingToggle.getAttribute("aria-pressed") !== "true";
  billingToggle.setAttribute("aria-pressed", String(annual));

  document.querySelectorAll("[data-price]").forEach((price) => {
    const amount = Number(price.getAttribute(annual ? "data-annual" : "data-monthly"));
    price.textContent = formatCurrency(amount);
  });
});

document.querySelector("[data-contact-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  showToast("Inquiry received. The Aifirstops team will follow up with next steps.");
});

document.querySelector("[data-newsletter-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  showToast("You are on the list. Watch for premium launch insights.");
});

const year = document.querySelector("[data-year]");
if (year) {
  year.textContent = String(new Date().getFullYear());
}
