const root = document.documentElement;
const header = document.querySelector('[data-header]');
const nav = document.querySelector('[data-nav]');
const navToggle = document.querySelector('[data-nav-toggle]');
const themeToggle = document.querySelector('[data-theme-toggle]');
const toast = document.querySelector('[data-toast]');

const showToast = (message) => {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3200);
};

const storedTheme = window.localStorage.getItem('theme');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
root.dataset.theme = storedTheme || (prefersLight ? 'light' : 'dark');

themeToggle?.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = nextTheme;
  window.localStorage.setItem('theme', nextTheme);
  showToast(`${nextTheme === 'light' ? 'Light' : 'Dark'} mode enabled`);
});

navToggle?.addEventListener('click', () => {
  const isOpen = nav?.classList.toggle('is-open');
  document.body.classList.toggle('nav-open', Boolean(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

nav?.addEventListener('click', (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    navToggle?.setAttribute('aria-label', 'Open navigation');
  }
});

const updateHeaderState = () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 20);
};

window.addEventListener('scroll', updateHeaderState, { passive: true });
updateHeaderState();

document.querySelector('[data-year]').textContent = new Date().getFullYear();

const countEls = document.querySelectorAll('[data-count-to]');
const animateCount = (element) => {
  const target = Number(element.dataset.countTo);
  const duration = 1100;
  const startedAt = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased).toString();

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

if ('IntersectionObserver' in window) {
  const countObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 },
  );

  countEls.forEach((element) => countObserver.observe(element));
} else {
  countEls.forEach(animateCount);
}

const sectionLinks = [...document.querySelectorAll('.primary-nav a')];
const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        sectionLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

const filterButtons = document.querySelectorAll('[data-filter]');
const portfolioCards = document.querySelectorAll('[data-category]');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    portfolioCards.forEach((card) => {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
    });
  });
});

const billingToggle = document.querySelector('[data-billing-toggle]');
const prices = document.querySelectorAll('[data-price]');

billingToggle?.addEventListener('click', () => {
  const isAnnual = billingToggle.getAttribute('aria-pressed') !== 'true';
  billingToggle.setAttribute('aria-pressed', String(isAnnual));

  prices.forEach((price) => {
    price.textContent = price.dataset[isAnnual ? 'annual' : 'monthly'];
  });

  showToast(isAnnual ? 'Annual savings applied' : 'Monthly billing selected');
});

const resourceSearch = document.querySelector('[data-resource-search]');
const resourceCards = document.querySelectorAll('[data-title]');

resourceSearch?.addEventListener('input', () => {
  const query = resourceSearch.value.trim().toLowerCase();

  resourceCards.forEach((card) => {
    const content = card.textContent.toLowerCase();
    card.hidden = query.length > 0 && !content.includes(query);
  });
});

document.querySelectorAll('.faq-item').forEach((item) => {
  const trigger = item.querySelector('button');

  trigger?.addEventListener('click', () => {
    const isOpen = item.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });
});

const commandForm = document.querySelector('[data-command-form]');
const automationFeed = document.querySelector('[data-automation-feed]');

commandForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(commandForm);
  const command = String(formData.get('command') || '').trim();

  if (!command) {
    showToast('Add a goal before running the automation demo.');
    return;
  }

  const steps = [
    'Analyze audience intent and source quality',
    'Generate the best-fit response and next step',
    'Create an owner-ready task with context',
  ];

  automationFeed.innerHTML = steps
    .map((step, index) => `<p><strong>${String(index + 1).padStart(2, '0')}</strong> ${step}</p>`)
    .join('');

  showToast(`Automation mapped for: ${command}`);
});

document.querySelector('[data-demo-trigger]')?.addEventListener('click', () => {
  document.querySelector('#platform')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Demo view opened: integrated platform flow.');
});

const contactForm = document.querySelector('[data-contact-form]');
const formStatus = document.querySelector('[data-form-status]');

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = [...contactForm.querySelectorAll('input, select, textarea')];
  let isValid = true;

  fields.forEach((field) => {
    const invalid = !field.checkValidity();
    field.classList.toggle('is-invalid', invalid);
    if (invalid) isValid = false;
  });

  if (!isValid) {
    formStatus.textContent = 'Please complete the highlighted fields.';
    showToast('A few details are missing from the form.');
    return;
  }

  contactForm.reset();
  formStatus.textContent = 'Request received. Your launch brief is ready for review.';
  showToast('Thanks. Your request has been captured.');
});

const newsletterForm = document.querySelector('[data-newsletter-form]');
const newsletterStatus = document.querySelector('[data-newsletter-status]');

newsletterForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = newsletterForm.querySelector('input');

  if (!input.checkValidity()) {
    newsletterStatus.textContent = 'Enter a valid email to join.';
    showToast('Please enter a valid email address.');
    return;
  }

  newsletterForm.reset();
  newsletterStatus.textContent = 'Welcome aboard. Check your inbox soon.';
  showToast('You joined the operator newsletter.');
});
