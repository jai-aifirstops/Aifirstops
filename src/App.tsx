import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  Command,
  Globe2,
  Layers3,
  Menu,
  MessageSquare,
  Moon,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import './App.css';

type Feature = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
};

type Solution = {
  label: string;
  title: string;
  description: string;
  outcomes: string[];
};

type Operation = {
  title: string;
  icon: LucideIcon;
  description: string;
};

type PricingPlan = {
  name: string;
  price: number;
  summary: string;
  highlight?: boolean;
  features: string[];
};

const navItems = ['Platform', 'Solutions', 'Pricing', 'Stories', 'Contact'];

const metrics = [
  { value: '41%', label: 'faster launch cycles' },
  { value: '12k+', label: 'automations shipped' },
  { value: '99.98%', label: 'managed uptime' },
];

const features: Feature[] = [
  {
    icon: BrainCircuit,
    eyebrow: 'AI strategy',
    title: 'Executive-ready AI operating models',
    description:
      'Map high-value workflows, prioritize automation bets, and translate ideas into delivery roadmaps your teams can trust.',
  },
  {
    icon: Workflow,
    eyebrow: 'Automation',
    title: 'Multichannel workflows that run themselves',
    description:
      'Connect CRM, support, finance, marketing, and data systems with resilient automations and human approval gates.',
  },
  {
    icon: BarChart3,
    eyebrow: 'Insights',
    title: 'Live intelligence for every function',
    description:
      'Give leaders a shared command center for pipeline health, customer signals, service levels, and revenue operations.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Governance',
    title: 'Security, compliance, and auditability built in',
    description:
      'Ship AI with role-based access, traceable decisions, model usage policies, and privacy-aware implementation patterns.',
  },
];

const solutions: Solution[] = [
  {
    label: 'Growth',
    title: 'Revenue engines that detect, qualify, and nurture demand',
    description:
      'Launch AI-powered acquisition journeys, scoring models, and personalized follow-up systems without adding manual load.',
    outcomes: ['Lead enrichment in minutes', 'Dynamic campaign routing', 'Revenue attribution dashboards'],
  },
  {
    label: 'Support',
    title: 'Support operations that resolve faster and escalate smarter',
    description:
      'Blend AI agents, knowledge management, and service analytics to improve response quality across every channel.',
    outcomes: ['AI triage and ticket drafting', 'SLA risk detection', 'Customer sentiment alerts'],
  },
  {
    label: 'Finance',
    title: 'Finance workflows with fewer handoffs and cleaner controls',
    description:
      'Automate reporting, invoice operations, approval flows, and operational forecasting with transparent review checkpoints.',
    outcomes: ['Month-end automation', 'Spend anomaly monitoring', 'Board-ready reporting'],
  },
  {
    label: 'People',
    title: 'People operations that scale onboarding and knowledge',
    description:
      'Create self-serve employee experiences, onboarding copilots, policy assistants, and internal knowledge workflows.',
    outcomes: ['Onboarding copilots', 'Policy Q&A automation', 'Engagement pulse insights'],
  },
];

const portfolio = [
  {
    title: 'Autonomous booking concierge',
    category: 'Hospitality',
    result: '+32% direct bookings',
  },
  {
    title: 'AI claims intake cockpit',
    category: 'Insurance',
    result: '68% lower cycle time',
  },
  {
    title: 'Real-time ecommerce ops hub',
    category: 'Retail',
    result: '$4.1M recovered revenue',
  },
];

const operations: Operation[] = [
  {
    title: 'AI chat concierge',
    icon: Bot,
    description: 'Answers questions, captures intent, and routes visitors to the next best action.',
  },
  {
    title: 'Booking and lead flows',
    icon: CalendarCheck,
    description: 'Turns interest into qualified calls with smart forms and calendar-ready handoffs.',
  },
  {
    title: 'Content and SEO system',
    icon: Globe2,
    description: 'Supports service pages, case studies, knowledge hubs, and conversion-focused content.',
  },
  {
    title: 'Client portal concept',
    icon: MessageSquare,
    description: 'Creates a polished area for updates, documents, requests, and support conversations.',
  },
  {
    title: 'Revenue analytics',
    icon: CircleDollarSign,
    description: 'Shows what is converting, where time is saved, and which workflows need attention.',
  },
  {
    title: 'Automation library',
    icon: Workflow,
    description: 'Documents repeatable automations your team can launch, monitor, and improve.',
  },
];

const plans: PricingPlan[] = [
  {
    name: 'Launch',
    price: 2900,
    summary: 'For teams shipping their first AI workflows.',
    features: ['AI opportunity sprint', '3 production automations', 'Analytics starter dashboard', '30-day optimization window'],
  },
  {
    name: 'Scale',
    price: 7800,
    summary: 'For companies modernizing multiple departments.',
    highlight: true,
    features: ['Cross-functional operating model', '10+ integrated workflows', 'Governance and training', 'Priority support channel'],
  },
  {
    name: 'Enterprise',
    price: 15400,
    summary: 'For organizations that need managed AI operations.',
    features: ['Dedicated AI ops pod', 'Custom security reviews', 'Executive reporting suite', 'Quarterly innovation roadmap'],
  },
];

const testimonials = [
  {
    quote:
      'AI FirstOps gave us a polished digital operating layer in weeks. It feels like adding a senior automation team overnight.',
    name: 'Maya Patel',
    role: 'COO, Lumen Harbor',
  },
  {
    quote:
      'The website, workflows, analytics, and customer journeys finally work as one system. Our team adopted it immediately.',
    name: 'Theo Brooks',
    role: 'Founder, Northstar Labs',
  },
  {
    quote:
      'They brought enterprise-grade thinking without slowing us down. Every workflow is measurable, governed, and beautiful.',
    name: 'Elena Ruiz',
    role: 'VP Revenue, Atlas Grove',
  },
];

const faqs = [
  {
    question: 'Can AI FirstOps build the full website and the automations behind it?',
    answer:
      'Yes. The experience is designed as a complete front door for the business: premium website, lead capture, booking flows, AI-enabled support, analytics, and operational integrations.',
  },
  {
    question: 'Do we need an existing tech stack?',
    answer:
      'No. We can start with your current tools or design a clean stack around your CRM, support desk, data warehouse, payment platform, and internal collaboration systems.',
  },
  {
    question: 'How do you keep AI workflows safe?',
    answer:
      'Every workflow is mapped with permissions, review points, logs, model-use rules, and fallback paths so teams can scale AI with confidence.',
  },
  {
    question: 'What makes this different from a template site?',
    answer:
      'The site is built around business outcomes: conversion paths, operational workflows, analytics, customer journeys, and a refined brand system instead of static pages alone.',
  },
];

const searchIndex = [
  ...features.map((feature) => ({
    title: feature.title,
    type: feature.eyebrow,
    text: feature.description,
  })),
  ...solutions.map((solution) => ({
    title: solution.title,
    type: solution.label,
    text: solution.description,
  })),
  ...plans.map((plan) => ({
    title: `${plan.name} plan`,
    type: 'Pricing',
    text: plan.summary,
  })),
];

function App() {
  const [isDark, setIsDark] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeSolution, setActiveSolution] = useState(0);
  const [annualBilling, setAnnualBilling] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const [teamSize, setTeamSize] = useState(18);
  const [hoursSaved, setHoursSaved] = useState(7);
  const [hourlyCost, setHourlyCost] = useState(85);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  useEffect(() => {
    document.body.style.overflow = isSearchOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSearchOpen]);

  const filteredResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return searchIndex.slice(0, 6);
    }

    return searchIndex.filter((item) =>
      `${item.title} ${item.type} ${item.text}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  const estimatedSavings = useMemo(() => {
    return teamSize * hoursSaved * hourlyCost * 4;
  }, [hourlyCost, hoursSaved, teamSize]);

  const activeSolutionDetails = solutions[activeSolution];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="AI FirstOps home">
          <span className="brand-mark">
            <Command size={21} />
          </span>
          <span>
            <strong>AI FirstOps</strong>
            <small>Digital operating systems</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`}>
              {item}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => setIsSearchOpen(true)} aria-label="Open search">
            <Search size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsDark((current) => !current)}
            aria-label="Toggle color theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a className="button button-small button-primary" href="#contact">
            Start a project
          </a>
          <button
            className="icon-button menu-button"
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setIsMenuOpen(false)}>
              {item}
            </a>
          ))}
        </nav>
      )}

      {isSearchOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search website">
          <div className="search-panel">
            <div className="search-panel-header">
              <div>
                <p className="eyebrow">Site search</p>
                <h2>Find services, workflows, and plans</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsSearchOpen(false)} aria-label="Close search">
                <X size={20} />
              </button>
            </div>
            <label className="search-box">
              <Search size={18} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try automation, finance, analytics..."
              />
            </label>
            <div className="search-results">
              {filteredResults.length ? (
                filteredResults.map((item) => (
                  <article key={`${item.type}-${item.title}`} className="search-result-card">
                    <span>{item.type}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))
              ) : (
                <p className="muted">No matches yet. Try searching for support, pricing, or workflows.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main id="top">
        <section className="hero-section section-grid">
          <div className="hero-copy">
            <div className="pill">
              <Sparkles size={16} />
              Premium AI website, automations, and operations
            </div>
            <h1>Build the digital command center your business deserves.</h1>
            <p>
              AI FirstOps creates high-end multifunctional websites that convert, automate, analyze, and scale with your
              team. One refined experience connects your brand, customers, workflows, and data.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Build my website <ArrowRight size={18} />
              </a>
              <a className="button button-ghost" href="#platform">
                <Play size={18} /> Explore platform
              </a>
            </div>
            <div className="metric-row" aria-label="Company metrics">
              {metrics.map((metric) => (
                <div key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual" aria-label="AI operations dashboard preview">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="dashboard-card main-dashboard">
              <div className="dashboard-topbar">
                <span />
                <span />
                <span />
              </div>
              <div className="dashboard-header">
                <div>
                  <p>Command center</p>
                  <h2>AI Ops Health</h2>
                </div>
                <div className="status-chip">Live</div>
              </div>
              <div className="progress-stack">
                <div>
                  <span>Lead response</span>
                  <strong>96%</strong>
                  <i style={{ width: '96%' }} />
                </div>
                <div>
                  <span>Workflow coverage</span>
                  <strong>84%</strong>
                  <i style={{ width: '84%' }} />
                </div>
                <div>
                  <span>Support quality</span>
                  <strong>91%</strong>
                  <i style={{ width: '91%' }} />
                </div>
              </div>
            </div>
            <div className="dashboard-card floating-card automation-card">
              <Zap size={19} />
              <div>
                <strong>42 workflows</strong>
                <span>running today</span>
              </div>
            </div>
            <div className="dashboard-card floating-card booking-card">
              <CalendarCheck size={19} />
              <div>
                <strong>18 calls booked</strong>
                <span>from AI concierge</span>
              </div>
            </div>
          </div>
        </section>

        <section className="logo-strip" aria-label="Trusted by teams">
          {['NOVA', 'LUMEN', 'ATLAS', 'ORBIT', 'KINSHIP'].map((logo) => (
            <span key={logo}>{logo}</span>
          ))}
        </section>

        <section className="section" id="platform">
          <div className="section-heading">
            <p className="eyebrow">The multifunctional layer</p>
            <h2>A complete business website with operational intelligence behind it.</h2>
            <p>
              Go beyond pages. Give every visitor, lead, customer, and teammate a connected digital experience powered by
              smart workflows and measurable outcomes.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="feature-card">
                  <div className="feature-icon">
                    <Icon size={24} />
                  </div>
                  <span>{feature.eyebrow}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section split-section" id="solutions">
          <div>
            <p className="eyebrow">Solutions</p>
            <h2>One elegant front end. Many powerful business functions.</h2>
            <p>
              Select the operating area you want to upgrade and see how AI FirstOps connects content, automation, data,
              and team workflows.
            </p>
            <div className="solution-tabs" role="tablist" aria-label="Solution categories">
              {solutions.map((solution, index) => (
                <button
                  key={solution.label}
                  className={activeSolution === index ? 'active' : ''}
                  type="button"
                  onClick={() => setActiveSolution(index)}
                  role="tab"
                  aria-selected={activeSolution === index}
                >
                  {solution.label}
                </button>
              ))}
            </div>
          </div>
          <article className="solution-panel">
            <div className="panel-icon">
              <Layers3 size={26} />
            </div>
            <h3>{activeSolutionDetails.title}</h3>
            <p>{activeSolutionDetails.description}</p>
            <ul>
              {activeSolutionDetails.outcomes.map((outcome) => (
                <li key={outcome}>
                  <Check size={17} /> {outcome}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="section operations-section">
          <div className="section-heading">
            <p className="eyebrow">Included experiences</p>
            <h2>Everything needed to feel premium, useful, and alive.</h2>
          </div>
          <div className="operations-grid">
            {operations.map(({ title, icon: Icon, description }) => (
              <article key={title} className="operation-card">
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section portfolio-section">
          <div className="portfolio-copy">
            <p className="eyebrow">Proof of polish</p>
            <h2>Designed like a flagship brand. Built like an operating system.</h2>
            <p>
              The best websites do more than look expensive. They reduce manual work, clarify the offer, and keep every
              customer journey moving.
            </p>
          </div>
          <div className="portfolio-grid">
            {portfolio.map((item) => (
              <article key={item.title} className="portfolio-card">
                <span>{item.category}</span>
                <h3>{item.title}</h3>
                <strong>{item.result}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="section calculator-section">
          <div>
            <p className="eyebrow">Interactive ROI planner</p>
            <h2>Estimate what automation could unlock each month.</h2>
            <p>
              Adjust the assumptions to model the value of automating repetitive work across sales, support, operations,
              and finance.
            </p>
          </div>
          <div className="calculator-card">
            <label>
              <span>Team members affected: {teamSize}</span>
              <input type="range" min="3" max="80" value={teamSize} onChange={(event) => setTeamSize(Number(event.target.value))} />
            </label>
            <label>
              <span>Hours saved per person weekly: {hoursSaved}</span>
              <input
                type="range"
                min="1"
                max="20"
                value={hoursSaved}
                onChange={(event) => setHoursSaved(Number(event.target.value))}
              />
            </label>
            <label>
              <span>Fully loaded hourly cost: ${hourlyCost}</span>
              <input
                type="range"
                min="35"
                max="220"
                step="5"
                value={hourlyCost}
                onChange={(event) => setHourlyCost(Number(event.target.value))}
              />
            </label>
            <div className="savings-result">
              <span>Estimated monthly capacity unlocked</span>
              <strong>${estimatedSavings.toLocaleString()}</strong>
            </div>
          </div>
        </section>

        <section className="section pricing-section" id="pricing">
          <div className="section-heading">
            <p className="eyebrow">Pricing</p>
            <h2>Premium packages for every stage of AI adoption.</h2>
            <div className="billing-toggle" aria-label="Billing frequency">
              <button className={!annualBilling ? 'active' : ''} type="button" onClick={() => setAnnualBilling(false)}>
                Monthly
              </button>
              <button className={annualBilling ? 'active' : ''} type="button" onClick={() => setAnnualBilling(true)}>
                Annual - save 15%
              </button>
            </div>
          </div>
          <div className="pricing-grid">
            {plans.map((plan) => {
              const displayedPrice = annualBilling ? Math.round(plan.price * 0.85) : plan.price;
              return (
                <article key={plan.name} className={`pricing-card ${plan.highlight ? 'featured' : ''}`}>
                  {plan.highlight && <span className="popular-badge">Most popular</span>}
                  <h3>{plan.name}</h3>
                  <p>{plan.summary}</p>
                  <div className="price">
                    <strong>${displayedPrice.toLocaleString()}</strong>
                    <span>/mo</span>
                  </div>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <Check size={17} /> {feature}
                      </li>
                    ))}
                  </ul>
                  <a className={plan.highlight ? 'button button-primary' : 'button button-ghost'} href="#contact">
                    Choose {plan.name}
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section testimonials-section" id="stories">
          <div className="section-heading">
            <p className="eyebrow">Client stories</p>
            <h2>Built for founders, operators, and teams who expect more.</h2>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className="testimonial-card">
                <div className="stars" aria-label="Five-star review">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={16} fill="currentColor" />
                  ))}
                </div>
                <p>"{testimonial.quote}"</p>
                <div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section faq-section">
          <div>
            <p className="eyebrow">Questions</p>
            <h2>Everything starts with a clearer operating model.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <article key={faq.question} className="faq-item">
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                  <span>{faq.question}</span>
                  <ChevronDown size={19} />
                </button>
                {openFaq === index && <p>{faq.answer}</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="contact-card">
            <div>
              <p className="eyebrow">Start now</p>
              <h2>Tell us what "everything" should include for your business.</h2>
              <p>
                Share your goals and we will shape a flagship site concept with AI workflows, lead generation, analytics,
                and operational systems around it.
              </p>
              <div className="contact-highlights">
                <span>
                  <Check size={16} /> Strategy
                </span>
                <span>
                  <Check size={16} /> Design
                </span>
                <span>
                  <Check size={16} /> Automation
                </span>
              </div>
            </div>
            <form className="contact-form" onSubmit={handleSubmit}>
              <label>
                Name
                <input required type="text" name="name" placeholder="Your name" />
              </label>
              <label>
                Email
                <input required type="email" name="email" placeholder="you@company.com" />
              </label>
              <label>
                What should the website do?
                <textarea
                  required
                  name="message"
                  rows={4}
                  placeholder="Example: booking, ecommerce, AI chat, analytics, CRM workflows..."
                />
              </label>
              <button className="button button-primary" type="submit">
                Request blueprint <ArrowRight size={18} />
              </button>
              {formSubmitted && <p className="form-success">Thanks. Your project brief is ready for the next step.</p>}
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="brand">
          <span className="brand-mark">
            <Command size={21} />
          </span>
          <span>
            <strong>AI FirstOps</strong>
            <small>Build beautifully. Operate intelligently.</small>
          </span>
        </div>
        <div className="footer-links">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`}>
              {item}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default App;
