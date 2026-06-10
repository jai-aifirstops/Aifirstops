(function () {
  const body = document.body;
  const header = document.querySelector("[data-header]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const themeLabel = document.querySelector("[data-theme-label]");
  const backToTop = document.querySelector("[data-back-to-top]");
  const contactForm = document.querySelector("[data-contact-form]");
  const formStatus = document.querySelector("[data-form-status]");
  const formatter = new Intl.NumberFormat("en-US");
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  function updateHeader() {
    const isScrolled = window.scrollY > 12;
    header?.classList.toggle("is-scrolled", isScrolled);
    backToTop?.classList.toggle("is-visible", window.scrollY > 600);
  }

  function closeMenu() {
    navMenu?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    body.classList.remove("nav-open");
  }

  function setTheme(theme) {
    const isLight = theme === "light";
    body.classList.toggle("light-theme", isLight);
    themeLabel.textContent = isLight ? "Dark" : "Light";
    localStorage.setItem("aifirstops-theme", theme);
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("aifirstops-theme");
    if (savedTheme) {
      setTheme(savedTheme);
      return;
    }

    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    setTheme(prefersLight ? "light" : "dark");
  }

  function animateCount(element) {
    const target = Number(element.dataset.countTo || 0);
    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased).toString();

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  function initReveals() {
    const revealItems = document.querySelectorAll(".reveal");
    const countItems = document.querySelectorAll("[data-count-to]");

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      countItems.forEach((item) => {
        item.textContent = item.dataset.countTo || "0";
      });
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.45 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
    countItems.forEach((item) => countObserver.observe(item));
  }

  function initTabs() {
    const tabs = document.querySelectorAll("[data-tab]");
    const panels = document.querySelectorAll("[data-panel]");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;

        tabs.forEach((item) => {
          const isActive = item === tab;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", isActive.toString());
        });

        panels.forEach((panel) => {
          const isActive = panel.dataset.panel === target;
          panel.classList.toggle("is-active", isActive);
          panel.hidden = !isActive;
        });
      });
    });
  }

  function initRoiCalculator() {
    const inputs = document.querySelectorAll("[data-roi-input]");
    const result = document.querySelector("[data-roi-result]");

    if (!inputs.length || !result) {
      return;
    }

    function getInput(name) {
      return document.querySelector(`[data-roi-input="${name}"]`);
    }

    function getValue(name) {
      return Number(getInput(name)?.value || 0);
    }

    function updateCalculator() {
      const leads = getValue("leads");
      const deal = getValue("deal");
      const lift = getValue("lift");
      const closeRate = 0.08;
      const annualUpside = leads * (lift / 100) * closeRate * deal * 12;

      document.querySelector('[data-roi-value="leads"]').textContent = formatter.format(leads);
      document.querySelector('[data-roi-value="deal"]').textContent = currencyFormatter.format(deal);
      document.querySelector('[data-roi-value="lift"]').textContent = `${lift}%`;
      result.textContent = currencyFormatter.format(annualUpside);
    }

    inputs.forEach((input) => input.addEventListener("input", updateCalculator));
    updateCalculator();
  }

  function initContactForm() {
    contactForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(contactForm);
      const name = String(formData.get("name") || "there").trim().split(" ")[0] || "there";
      const focus = String(formData.get("focus") || "your project").toLowerCase();

      formStatus.textContent = `Thanks, ${name}. Your ${focus} brief is ready to route into the next workflow.`;
      contactForm.reset();
    });
  }

  navToggle?.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen.toString());
    body.classList.toggle("nav-open", isOpen);
  });

  navMenu?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  themeToggle?.addEventListener("click", () => {
    setTheme(body.classList.contains("light-theme") ? "dark" : "light");
  });

  backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 740) {
      closeMenu();
    }
  });

  initTheme();
  initReveals();
  initTabs();
  initRoiCalculator();
  initContactForm();
  updateHeader();
})();
