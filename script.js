const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
const navLinks = [...document.querySelectorAll(".nav-menu a")];
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const featureCards = [...document.querySelectorAll("[data-category]")];
const workflowTabs = [...document.querySelectorAll("[data-stage]")];
const workflowPanel = document.querySelector("[data-workflow-panel]");
const billingToggle = document.querySelector("[data-billing-toggle]");
const prices = [...document.querySelectorAll("[data-price]")];
const trafficInput = document.querySelector("[data-traffic]");
const trafficValue = document.querySelector("[data-traffic-value]");
const conversionInput = document.querySelector("[data-conversion]");
const conversionValue = document.querySelector("[data-conversion-value]");
const roiResult = document.querySelector("[data-roi-result]");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const revealItems = [...document.querySelectorAll(".reveal")];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const workflowContent = {
  discover: {
    number: "01",
    title: "Personalized content paths",
    body: "Visitors are guided through polished stories, targeted service pages, intelligent forms, and campaign-specific journeys.",
  },
  convert: {
    number: "02",
    title: "Revenue-ready conversion flows",
    body: "Product drops, booking funnels, pricing pages, proposals, payments, and CRM handoffs keep every opportunity moving.",
  },
  retain: {
    number: "03",
    title: "Long-term customer intelligence",
    body: "Client portals, support workflows, loyalty moments, and executive reporting help teams keep customers engaged after purchase.",
  },
};

const updateHeaderState = () => {
  header?.classList.toggle("scrolled", window.scrollY > 12);
};

const closeMobileMenu = () => {
  navMenu?.classList.remove("open");
  navToggle?.setAttribute("aria-expanded", "false");
};

navToggle?.addEventListener("click", () => {
  const isOpen = navMenu?.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const activeFilter = button.dataset.filter;

    filterButtons.forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton === button);
    });

    featureCards.forEach((card) => {
      const shouldShow = activeFilter === "all" || card.dataset.category === activeFilter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

workflowTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const content = workflowContent[tab.dataset.stage];
    if (!content || !workflowPanel) return;

    workflowTabs.forEach((item) => item.classList.toggle("active", item === tab));
    workflowPanel.innerHTML = `
      <span class="stage-number">${content.number}</span>
      <h3>${content.title}</h3>
      <p>${content.body}</p>
    `;
  });
});

billingToggle?.addEventListener("click", () => {
  const isAnnual = billingToggle.getAttribute("aria-pressed") !== "true";
  billingToggle.setAttribute("aria-pressed", String(isAnnual));

  prices.forEach((price) => {
    const basePrice = Number(price.dataset.price);
    const adjustedPrice = isAnnual ? basePrice * 10 : basePrice;
    price.textContent = currencyFormatter.format(adjustedPrice);
  });
});

const updateRoi = () => {
  if (!trafficInput || !trafficValue || !conversionInput || !conversionValue || !roiResult) return;

  const traffic = Number(trafficInput.value);
  const conversionLift = Number(conversionInput.value);
  const baselineConversion = 0.01;
  const averageOrderValue = 120;
  const extraOrders = traffic * baselineConversion * (conversionLift / 100);
  const extraRevenue = extraOrders * averageOrderValue;

  trafficValue.textContent = numberFormatter.format(traffic);
  conversionValue.textContent = String(conversionLift);
  roiResult.textContent = currencyFormatter.format(extraRevenue);
};

[trafficInput, conversionInput].forEach((input) => {
  input?.addEventListener("input", updateRoi);
});
updateRoi();

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const name = String(formData.get("name") || "").trim();

  if (formStatus) {
    formStatus.textContent = `Thanks${name ? `, ${name}` : ""}. Your strategy request is ready to send.`;
  }

  contactForm.reset();
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const activeLink = navLinks.find((link) => link.getAttribute("href") === `#${entry.target.id}`);
        navLinks.forEach((link) => link.classList.toggle("active", link === activeLink));
      });
    },
    { rootMargin: "-45% 0px -48% 0px" },
  );

  document.querySelectorAll("main section[id]").forEach((section) => {
    sectionObserver.observe(section);
  });
}

window.addEventListener("scroll", updateHeaderState, { passive: true });
updateHeaderState();
