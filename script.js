(function () {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const numberFormatter = new Intl.NumberFormat("en-US");

  const safeStorage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (_error) {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (_error) {
        // Private browsing or locked-down contexts can block storage.
      }
    },
  };

  function showToast(message) {
    const toast = $("[data-toast]");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3200);
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    const toggle = $("[data-theme-toggle]");
    if (toggle) {
      toggle.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
    }
    safeStorage.set("aifirstops-theme", theme);
  }

  function initTheme() {
    const savedTheme = safeStorage.get("aifirstops-theme");
    const preferredTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setTheme(savedTheme || preferredTheme);

    const toggle = $("[data-theme-toggle]");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
      setTheme(nextTheme);
      showToast(`${nextTheme === "light" ? "Light" : "Dark"} theme enabled`);
    });
  }

  function initNavigation() {
    const header = $("[data-header]");
    const progress = $("[data-scroll-progress]");
    const menu = $("[data-menu]");
    const menuButton = $(".mobile-menu-button");

    function updateScrollState() {
      const scrollTop = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable > 0 ? (scrollTop / scrollable) * 100 : 0;

      if (header) header.classList.toggle("scrolled", scrollTop > 16);
      if (progress) progress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    if (menu && menuButton) {
      menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        menuButton.setAttribute("aria-expanded", String(!isOpen));
        menu.classList.toggle("is-open", !isOpen);
        body.classList.toggle("menu-open", !isOpen);
      });

      $$("a", menu).forEach((link) => {
        link.addEventListener("click", () => {
          menuButton.setAttribute("aria-expanded", "false");
          menu.classList.remove("is-open");
          body.classList.remove("menu-open");
        });
      });
    }

    const backToTop = $("[data-back-to-top]");
    if (backToTop) {
      backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  }

  function initModal() {
    const modal = $("[data-modal]");
    const openButtons = $$("[data-open-modal]");
    const closeButtons = $$("[data-close-modal]");
    if (!modal) return;

    let previouslyFocused = null;

    function openModal() {
      previouslyFocused = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      body.classList.add("modal-open");
      const closeButton = $("[data-close-modal]", modal);
      if (closeButton) closeButton.focus();
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      body.classList.remove("modal-open");
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    }

    openButtons.forEach((button) => button.addEventListener("click", openModal));
    closeButtons.forEach((button) => button.addEventListener("click", closeModal));

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  function initTabs() {
    const buttons = $$("[data-tab]");
    const panels = $$("[data-panel]");
    if (!buttons.length || !panels.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.dataset.tab;
        buttons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle("active", isActive);
          item.setAttribute("aria-selected", String(isActive));
        });
        panels.forEach((panel) => {
          panel.classList.toggle("active", panel.dataset.panel === selected);
        });
      });
    });
  }

  function initMarketplaceFilters() {
    const filterButtons = $$("[data-filter]");
    const cards = $$("[data-category]");
    if (!filterButtons.length || !cards.length) return;

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;

        filterButtons.forEach((item) => item.classList.toggle("active", item === button));
        cards.forEach((card) => {
          const isVisible = filter === "all" || card.dataset.category === filter;
          card.classList.toggle("is-hidden", !isVisible);
        });

        showToast(`${button.textContent.trim()} offers selected`);
      });
    });
  }

  function initCalculator() {
    const calculator = $("[data-calculator]");
    if (!calculator) return;

    const visitorsInput = $('[name="visitors"]', calculator);
    const conversionInput = $('[name="conversion"]', calculator);
    const valueInput = $('[name="value"]', calculator);
    const revenueOutput = $("[data-revenue]", calculator);

    function updateCalculator() {
      const visitors = Number(visitorsInput.value);
      const conversion = Number(conversionInput.value);
      const customerValue = Number(valueInput.value);
      const monthlyRevenue = visitors * (conversion / 100) * customerValue;

      $('[data-output="visitors"]', calculator).textContent = numberFormatter.format(visitors);
      $('[data-output="conversion"]', calculator).textContent = `${conversion}%`;
      $('[data-output="value"]', calculator).textContent = currencyFormatter.format(customerValue);
      revenueOutput.textContent = currencyFormatter.format(monthlyRevenue);
    }

    [visitorsInput, conversionInput, valueInput].forEach((input) => {
      input.addEventListener("input", updateCalculator);
    });
    updateCalculator();
  }

  function initPricing() {
    const billingToggle = $("[data-billing-toggle]");
    const prices = $$("[data-price]");
    if (!billingToggle || !prices.length) return;

    function updatePricing(isAnnual) {
      billingToggle.setAttribute("aria-pressed", String(isAnnual));
      prices.forEach((price) => {
        const value = isAnnual ? price.dataset.annual : price.dataset.monthly;
        price.textContent = currencyFormatter.format(Number(value));
      });
      safeStorage.set("aifirstops-billing", isAnnual ? "annual" : "monthly");
    }

    updatePricing(safeStorage.get("aifirstops-billing") === "annual");
    billingToggle.addEventListener("click", () => {
      const nextIsAnnual = billingToggle.getAttribute("aria-pressed") !== "true";
      updatePricing(nextIsAnnual);
      showToast(nextIsAnnual ? "Annual savings applied" : "Monthly pricing restored");
    });
  }

  function initTestimonials() {
    const testimonial = $("[data-testimonial]");
    const previousButton = $("[data-carousel-prev]");
    const nextButton = $("[data-carousel-next]");
    if (!testimonial || !previousButton || !nextButton) return;

    const quotes = [
      {
        quote:
          "Aifirstops turned our website into a revenue control room. Leads, bookings, and reporting finally live in one cohesive experience.",
        name: "Maya Chen",
        role: "Founder, Nova Advisory",
      },
      {
        quote:
          "The site feels like a luxury brand on the front end and a practical operations layer behind the scenes.",
        name: "Andre Wilson",
        role: "Managing Partner, Signalhaus",
      },
      {
        quote:
          "We replaced five disconnected tools with one experience our customers actually enjoy using.",
        name: "Leah Patel",
        role: "COO, Meridian Studio",
      },
    ];
    let activeIndex = 0;

    function renderTestimonial() {
      const item = quotes[activeIndex];
      testimonial.innerHTML = `
        <blockquote>"${item.quote}"</blockquote>
        <div>
          <strong>${item.name}</strong>
          <span>${item.role}</span>
        </div>
      `;
    }

    previousButton.addEventListener("click", () => {
      activeIndex = (activeIndex - 1 + quotes.length) % quotes.length;
      renderTestimonial();
    });

    nextButton.addEventListener("click", () => {
      activeIndex = (activeIndex + 1) % quotes.length;
      renderTestimonial();
    });
  }

  function initForms() {
    const contactForm = $("[data-contact-form]");
    const newsletterForm = $("[data-newsletter-form]");

    if (contactForm) {
      contactForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const status = $("[data-form-status]", contactForm);
        const data = new FormData(contactForm);
        const name = String(data.get("name") || "there").trim();
        status.textContent = `Thanks, ${name}. Your project brief is ready for the next step.`;
        showToast("Project brief captured");
        contactForm.reset();
      });
    }

    if (newsletterForm) {
      newsletterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const status = $("[data-newsletter-status]");
        if (status) status.textContent = "You are on the Aifirstops launch list.";
        showToast("Newsletter signup saved");
        newsletterForm.reset();
      });
    }
  }

  function initYear() {
    const year = $("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNavigation();
    initModal();
    initTabs();
    initMarketplaceFilters();
    initCalculator();
    initPricing();
    initTestimonials();
    initForms();
    initYear();
  });
})();
