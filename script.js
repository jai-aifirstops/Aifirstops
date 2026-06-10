const root = document.documentElement;
const body = document.body;
const header = document.querySelector("[data-header]");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const themeToggle = document.querySelector("[data-theme-toggle]");
const billingToggle = document.querySelector("[data-billing-toggle]");
const priceNodes = document.querySelectorAll("[data-price]");
const tabButtons = document.querySelectorAll("[data-tab]");
const tabTitle = document.querySelector("[data-tab-title]");
const tabCopy = document.querySelector("[data-tab-copy]");
const tabList = document.querySelector("[data-tab-list]");
const testimonialCard = document.querySelector("[data-testimonial]");

const workspaces = {
  strategy: {
    title: "Strategy cockpit",
    copy: "Prioritize opportunities, map quarterly goals, and translate insights into campaigns your team can execute.",
    items: ["Market positioning briefs", "Campaign calendar planning", "Executive KPI summaries"],
  },
  sales: {
    title: "Revenue command",
    copy: "Track every lead source, monitor deal movement, and trigger personalized follow-ups at the right moment.",
    items: ["Lead scoring rules", "Proposal and booking flows", "Pipeline conversion insights"],
  },
  service: {
    title: "Customer care hub",
    copy: "Use AI-assisted routing and knowledge flows to answer faster while keeping complex requests human-led.",
    items: ["FAQ concierge prompts", "Escalation routing", "Customer health summaries"],
  },
};

const testimonials = [
  {
    quote:
      "Aifirstops gave us a premium brand presence and the automated workflows we kept postponing. Our pipeline is clearer, faster, and easier to manage.",
    initials: "MR",
    name: "Maya Rivers",
    role: "Founder, Lumen Atelier",
  },
  {
    quote:
      "The site feels high-end, but the real win is how much operational visibility it created for our team.",
    initials: "DK",
    name: "Devon Knight",
    role: "COO, Northstar Studio",
  },
  {
    quote:
      "We wanted one digital home for storytelling, lead capture, support, and analytics. This gave us the blueprint.",
    initials: "AS",
    name: "Amara Singh",
    role: "Managing Partner, Elevate Labs",
  },
];

let testimonialIndex = 0;

function setStoredTheme() {
  const savedTheme = localStorage.getItem("aifirstops-theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = savedTheme || (prefersLight ? "light" : "dark");
  root.dataset.theme = theme;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function closeNav() {
  body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
}

function updateHeaderState() {
  header?.classList.toggle("scrolled", window.scrollY > 20);
}

function updateWorkspace(workspaceKey) {
  const workspace = workspaces[workspaceKey];

  if (!workspace || !tabTitle || !tabCopy || !tabList) {
    return;
  }

  tabTitle.textContent = workspace.title;
  tabCopy.textContent = workspace.copy;
  tabList.innerHTML = workspace.items.map((item) => `<li>${item}</li>`).join("");

  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === workspaceKey;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function updatePrices(useAnnual) {
  priceNodes.forEach((node) => {
    const value = Number(useAnnual ? node.dataset.annual : node.dataset.monthly);
    node.textContent = formatCurrency(value);
  });
}

function renderTestimonial() {
  const testimonial = testimonials[testimonialIndex];
  if (!testimonialCard || !testimonial) {
    return;
  }

  testimonialCard.querySelector("blockquote").textContent = `“${testimonial.quote}”`;
  testimonialCard.querySelector(".testimonial-person span").textContent = testimonial.initials;
  testimonialCard.querySelector(".testimonial-person strong").textContent = testimonial.name;
  testimonialCard.querySelector(".testimonial-person small").textContent = testimonial.role;
}

function setupRevealAnimations() {
  const revealNodes = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );

  revealNodes.forEach((node) => observer.observe(node));
}

function setupCounters() {
  const counters = document.querySelectorAll("[data-count-up]");

  if (!("IntersectionObserver" in window)) {
    counters.forEach((counter) => {
      counter.textContent = counter.dataset.countUp;
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const counter = entry.target;
        const target = Number(counter.dataset.countUp);
        const duration = 1100;
        const startedAt = performance.now();

        function tick(now) {
          const progress = Math.min((now - startedAt) / duration, 1);
          counter.textContent = Math.round(target * progress).toString();

          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        }

        requestAnimationFrame(tick);
        observer.unobserve(counter);
      });
    },
    { threshold: 0.6 },
  );

  counters.forEach((counter) => observer.observe(counter));
}

setStoredTheme();
updateHeaderState();
setupRevealAnimations();
setupCounters();
document.querySelector("[data-year]").textContent = new Date().getFullYear();

window.addEventListener("scroll", updateHeaderState, { passive: true });

navToggle?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navMenu?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    closeNav();
  }
});

themeToggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = nextTheme;
  localStorage.setItem("aifirstops-theme", nextTheme);
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => updateWorkspace(button.dataset.tab));
});

billingToggle?.addEventListener("click", () => {
  const useAnnual = billingToggle.getAttribute("aria-pressed") !== "true";
  billingToggle.setAttribute("aria-pressed", String(useAnnual));
  updatePrices(useAnnual);
});

document.querySelectorAll(".faq-item button").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const isOpen = item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
    button.querySelector("span").textContent = isOpen ? "−" : "+";
  });
});

document.querySelector("[data-testimonial-prev]")?.addEventListener("click", () => {
  testimonialIndex = (testimonialIndex - 1 + testimonials.length) % testimonials.length;
  renderTestimonial();
});

document.querySelector("[data-testimonial-next]")?.addEventListener("click", () => {
  testimonialIndex = (testimonialIndex + 1) % testimonials.length;
  renderTestimonial();
});

document.querySelector("[data-contact-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = document.querySelector("[data-form-status]");
  status.textContent = "Thanks. Your consultation request is ready to be connected to a backend or CRM.";
  event.currentTarget.reset();
});

document.querySelector("[data-newsletter-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = document.querySelector("[data-newsletter-status]");
  status.textContent = "You are on the list.";
  event.currentTarget.reset();
});
