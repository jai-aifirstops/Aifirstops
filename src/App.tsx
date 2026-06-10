import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Cloud,
  Cpu,
  Globe,
  Lock,
  Menu,
  MessageCircle,
  PlayCircle,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react';

type IconItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type DashboardPanel = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  metric: string;
  metricLabel: string;
  tasks: string[];
};

type PricingPlan = {
  name: string;
  summary: string;
  monthly: number | 'Custom';
  annual: number | 'Custom';
  badge?: string;
  features: string[];
};

const navItems = [
  { label: 'Platform', href: '#platform' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const stats = [
  { value: '4.9x', label: 'faster workflow resolution' },
  { value: '99.95%', label: 'platform availability target' },
  { value: '68%', label: 'less manual triage' },
  { value: '120+', label: 'prebuilt integrations' },
];

const capabilities: IconItem[] = [
  {
    icon: Bot,
    title: 'AI copilots for every team',
    description:
      'Launch role-aware assistants for sales, support, finance, and operations with approvals, memory, and guardrails built in.',
  },
  {
    icon: Zap,
    title: 'No-code automation studio',
    description:
      'Design multi-step workflows with triggers, enrichment, human review, branching logic, and real-time health signals.',
  },
  {
    icon: BarChart3,
    title: 'Executive intelligence',
    description:
      'Unify KPIs, forecast risk, and surface priority actions from the tools your business already uses every day.',
  },
  {
    icon: Shield,
    title: 'Enterprise-grade controls',
    description:
      'Govern automations with RBAC, audit trails, approval queues, data residency options, and policy-aware AI actions.',
  },
  {
    icon: MessageCircle,
    title: 'Omnichannel engagement',
    description:
      'Route conversations from chat, email, Slack, forms, and voice into one intelligent workspace with shared context.',
  },
  {
    icon: Cloud,
    title: 'Composable operations cloud',
    description:
      'Connect apps, databases, knowledge bases, and models into a flexible operating layer that scales with the business.',
  },
];

const dashboardPanels: DashboardPanel[] = [
  {
    id: 'command',
    label: 'Command center',
    eyebrow: 'Live operations',
    title: 'One cockpit for revenue, delivery, and customer health',
    body: 'Monitor automations, exceptions, team workload, customer sentiment, and executive KPIs without switching tabs.',
    metric: '18,420',
    metricLabel: 'actions orchestrated this week',
    tasks: ['Renewal risk review', 'Invoice reconciliation', 'VIP ticket escalation'],
  },
  {
    id: 'automation',
    label: 'Automation studio',
    eyebrow: 'Workflow builder',
    title: 'Design intelligent workflows with human checkpoints',
    body: 'Blend AI reasoning, deterministic steps, approvals, and external systems into workflows your team can trust.',
    metric: '7.2 hrs',
    metricLabel: 'saved per teammate weekly',
    tasks: ['Lead enrichment', 'Quote approval', 'SLA breach recovery'],
  },
  {
    id: 'insights',
    label: 'Insights layer',
    eyebrow: 'Predictive analytics',
    title: 'Turn scattered signals into decision-ready recommendations',
    body: 'AI First Ops watches your operational data and recommends the next best action before small issues become costly.',
    metric: '$2.8M',
    metricLabel: 'pipeline risk surfaced early',
    tasks: ['Forecast drift', 'Margin anomaly', 'Support demand spike'],
  },
];

const solutions: IconItem[] = [
  {
    icon: Users,
    title: 'Customer experience',
    description:
      'Deflect repetitive tickets, personalize responses, summarize histories, and route sensitive conversations to experts.',
  },
  {
    icon: Rocket,
    title: 'Growth operations',
    description:
      'Research accounts, qualify demand, generate outreach, update CRM records, and move opportunities through approvals.',
  },
  {
    icon: Activity,
    title: 'Business operations',
    description:
      'Automate reporting, reconcile data, track vendors, manage approvals, and keep every team aligned on the same facts.',
  },
];

const integrations = [
  'Salesforce',
  'HubSpot',
  'Slack',
  'Microsoft 365',
  'Google Workspace',
  'Zendesk',
  'Stripe',
  'Shopify',
  'Snowflake',
  'PostgreSQL',
  'Notion',
  'Jira',
];

const securityItems = [
  'Granular role-based access',
  'End-to-end audit history',
  'Private knowledge sources',
  'Human approval gates',
  'SOC 2-ready controls',
  'PII-aware workflow policies',
];

const pricingPlans: PricingPlan[] = [
  {
    name: 'Launch',
    summary: 'For teams proving out their first AI-powered workflows.',
    monthly: 49,
    annual: 39,
    features: ['5 active workflows', 'Shared command center', 'Email and chat automations', 'Core integrations'],
  },
  {
    name: 'Scale',
    summary: 'For growing teams standardizing operations across functions.',
    monthly: 149,
    annual: 119,
    badge: 'Most popular',
    features: [
      'Unlimited workflows',
      'Advanced analytics',
      'Approval queues',
      'Custom roles',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    summary: 'For organizations that need deep governance and custom deployment.',
    monthly: 'Custom',
    annual: 'Custom',
    features: [
      'Dedicated success team',
      'Data residency options',
      'Custom AI policies',
      'SSO and SCIM',
      'Security review support',
    ],
  },
];

const testimonials = [
  {
    quote:
      'AI First Ops helped us consolidate six disconnected processes into one operating layer. The team finally has visibility and speed at the same time.',
    author: 'Maya Chen',
    role: 'COO, Northstar Cloud',
  },
  {
    quote:
      'The experience feels premium, but the value is practical. We use it to keep revenue, support, and finance aligned on the same priorities.',
    author: 'Andre Wilson',
    role: 'VP Revenue Operations, LumaWorks',
  },
  {
    quote:
      'Our executives get clear signals, our operators get automation, and our customers get faster answers. It became the front door to work.',
    author: 'Priya Shah',
    role: 'Head of Customer Experience, Atlas Labs',
  },
];

const faqs = [
  {
    question: 'Is this a marketing site or a product dashboard?',
    answer:
      'The site is structured to support both: a conversion-focused landing page plus product sections that preview the command center, automation studio, integrations, and governance model.',
  },
  {
    question: 'Can it connect to the tools we already use?',
    answer:
      'Yes. The design highlights a broad integration layer for CRMs, support desks, collaboration tools, warehouses, payment platforms, and custom APIs.',
  },
  {
    question: 'How does AI First Ops keep automations safe?',
    answer:
      'The platform messaging emphasizes approval gates, audit logs, role controls, policy-aware AI actions, and private knowledge sources for enterprise operations.',
  },
  {
    question: 'Can this be extended into a real app?',
    answer:
      'Absolutely. The React/Vite foundation can evolve into authenticated routes, real dashboards, API integrations, forms, and backend services as product requirements become concrete.',
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanelId, setActivePanelId] = useState(dashboardPanels[0].id);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [formSent, setFormSent] = useState(false);

  const activePanel = useMemo(
    () => dashboardPanels.find((panel) => panel.id === activePanelId) ?? dashboardPanels[0],
    [activePanelId],
  );

  const handleDemoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSent(true);
  };

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="site-header">
        <a className="brand" href="#top" aria-label="AI First Ops home">
          <span className="brand-mark">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <span>AI First Ops</span>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <a className="ghost-link" href="#pricing">
            View plans
          </a>
          <a className="button button-small" href="#contact">
            Book demo
          </a>
        </div>

        <button
          className="menu-button"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <a className="button" href="#contact" onClick={() => setMenuOpen(false)}>
            Book demo
          </a>
        </nav>
      )}

      <main id="top">
        <section className="hero section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="pulse-dot" />
              Intelligent operating system for ambitious teams
            </div>
            <h1>Run your entire business from one AI-powered command center.</h1>
            <p className="hero-lede">
              AI First Ops blends automation, analytics, collaboration, customer engagement, and enterprise governance into a
              premium digital workspace built for modern operators.
            </p>
            <div className="hero-actions">
              <a className="button" href="#contact">
                Start building
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="button button-secondary" href="#platform">
                <PlayCircle size={18} aria-hidden="true" />
                Explore platform
              </a>
            </div>
            <div className="trusted-row" aria-label="Trusted platform highlights">
              <span>Automation</span>
              <span>Insights</span>
              <span>Integrations</span>
              <span>Governance</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="AI First Ops dashboard preview">
            <div className="visual-card main-dashboard">
              <div className="dashboard-topbar">
                <div>
                  <span className="window-dot red" />
                  <span className="window-dot amber" />
                  <span className="window-dot green" />
                </div>
                <span className="status-pill">
                  <Activity size={14} aria-hidden="true" />
                  Live
                </span>
              </div>
              <div className="dashboard-grid">
                <div className="metric-card wide">
                  <span>Operating score</span>
                  <strong>94</strong>
                  <div className="progress-track">
                    <span style={{ width: '94%' }} />
                  </div>
                </div>
                <div className="metric-card">
                  <span>Tasks closed</span>
                  <strong>1,284</strong>
                </div>
                <div className="metric-card">
                  <span>Risk saved</span>
                  <strong>$420k</strong>
                </div>
              </div>
              <div className="workflow-preview">
                {['Capture signal', 'Classify with AI', 'Route approval', 'Sync systems'].map((step, index) => (
                  <div className="workflow-step" key={step}>
                    <span>{index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <div className="floating-card floating-card-one">
              <Cpu size={18} aria-hidden="true" />
              <div>
                <strong>AI agent active</strong>
                <span>Resolving renewal risk</span>
              </div>
            </div>
            <div className="floating-card floating-card-two">
              <Lock size={18} aria-hidden="true" />
              <div>
                <strong>Approval required</strong>
                <span>Finance policy matched</span>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-strip" aria-label="Platform results">
          {stats.map((item) => (
            <div key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <section className="section" id="platform">
          <div className="section-heading">
            <span className="eyebrow">Platform</span>
            <h2>Everything your team needs to operate with intelligence.</h2>
            <p>
              From customer conversations to internal approvals, AI First Ops turns fragmented processes into one elegant,
              measurable system of action.
            </p>
          </div>

          <div className="feature-grid">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <article className="feature-card" key={item.title}>
                  <span className="icon-badge">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section product-section">
          <div className="product-tabs" role="tablist" aria-label="Product views">
            {dashboardPanels.map((panel) => (
              <button
                className={panel.id === activePanel.id ? 'active' : ''}
                key={panel.id}
                type="button"
                role="tab"
                aria-selected={panel.id === activePanel.id}
                onClick={() => setActivePanelId(panel.id)}
              >
                {panel.label}
              </button>
            ))}
          </div>

          <div className="product-showcase">
            <div className="product-copy">
              <span className="eyebrow">{activePanel.eyebrow}</span>
              <h2>{activePanel.title}</h2>
              <p>{activePanel.body}</p>
              <a className="inline-link" href="#contact">
                See it in action
                <ChevronRight size={18} aria-hidden="true" />
              </a>
            </div>
            <div className="product-card">
              <div className="metric-highlight">
                <span>{activePanel.metricLabel}</span>
                <strong>{activePanel.metric}</strong>
              </div>
              <div className="task-list">
                {activePanel.tasks.map((task) => (
                  <div className="task-item" key={task}>
                    <Check size={16} aria-hidden="true" />
                    <span>{task}</span>
                    <small>Ready</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section split-section" id="solutions">
          <div>
            <span className="eyebrow">Solutions</span>
            <h2>Built for the teams that keep the company moving.</h2>
            <p>
              AI First Ops adapts to the workflows that matter most, helping every function ship faster with shared context
              and fewer handoffs.
            </p>
          </div>
          <div className="solution-stack">
            {solutions.map((item) => {
              const Icon = item.icon;
              return (
                <article className="solution-card" key={item.title}>
                  <Icon size={24} aria-hidden="true" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section integrations-section" id="integrations">
          <div className="section-heading">
            <span className="eyebrow">Integrations</span>
            <h2>Connect the tools, data, and models your teams already trust.</h2>
            <p>
              Use prebuilt connectors or API hooks to move work across your stack without losing control of context,
              permissions, or reporting.
            </p>
          </div>
          <div className="integration-cloud">
            {integrations.map((integration) => (
              <span key={integration}>
                <Globe size={16} aria-hidden="true" />
                {integration}
              </span>
            ))}
          </div>
        </section>

        <section className="section security-section">
          <div className="security-card">
            <div>
              <span className="eyebrow">Trust layer</span>
              <h2>Designed for safe, auditable AI operations.</h2>
              <p>
                Give teams speed without surrendering control. Every automated action can be governed by permissions,
                policies, approval paths, and transparent history.
              </p>
            </div>
            <div className="security-grid">
              {securityItems.map((item) => (
                <span key={item}>
                  <Shield size={16} aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section pricing-section" id="pricing">
          <div className="section-heading">
            <span className="eyebrow">Pricing</span>
            <h2>Start focused, scale into a complete operating layer.</h2>
            <p>Choose the plan that matches your current workflows and expand as AI First Ops becomes mission critical.</p>
            <div className="billing-toggle" aria-label="Billing cadence">
              <button className={billing === 'monthly' ? 'active' : ''} type="button" onClick={() => setBilling('monthly')}>
                Monthly
              </button>
              <button className={billing === 'annual' ? 'active' : ''} type="button" onClick={() => setBilling('annual')}>
                Annual
                <span>Save 20%</span>
              </button>
            </div>
          </div>

          <div className="pricing-grid">
            {pricingPlans.map((plan) => {
              const price = billing === 'annual' ? plan.annual : plan.monthly;
              return (
                <article className={`pricing-card ${plan.badge ? 'featured' : ''}`} key={plan.name}>
                  {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                  <h3>{plan.name}</h3>
                  <p>{plan.summary}</p>
                  <div className="price">
                    {typeof price === 'number' ? (
                      <>
                        <span>$</span>
                        {price}
                        <small>/seat/mo</small>
                      </>
                    ) : (
                      <>{price}</>
                    )}
                  </div>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <Check size={16} aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a className={plan.badge ? 'button' : 'button button-secondary'} href="#contact">
                    {plan.monthly === 'Custom' ? 'Talk to sales' : 'Get started'}
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section testimonials-section">
          <div className="section-heading">
            <span className="eyebrow">Customer love</span>
            <h2>Premium experience. Practical operational impact.</h2>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((testimonial) => (
              <article className="testimonial-card" key={testimonial.author}>
                <div className="stars" aria-label="Five star review">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star size={16} fill="currentColor" key={index} aria-hidden="true" />
                  ))}
                </div>
                <p>&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <strong>{testimonial.author}</strong>
                  <span>{testimonial.role}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div>
            <span className="eyebrow">FAQ</span>
            <h2>Answers for teams evaluating an AI operations layer.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="contact-card">
            <div>
              <span className="eyebrow">Get started</span>
              <h2>Build the operating system your team has been waiting for.</h2>
              <p>
                Tell us where work is getting stuck. We will map a high-impact AI operations flow and show how AI First Ops
                can become the front door to execution.
              </p>
            </div>
            <form className="contact-form" aria-label="Demo request form" onSubmit={handleDemoSubmit}>
              <label>
                Work email
                <input type="email" name="email" placeholder="you@company.com" required />
              </label>
              <label>
                What should AI First Ops improve?
                <textarea name="message" placeholder="Operations, customer support, reporting, approvals..." rows={4} />
              </label>
              <button className="button" type="submit">
                Request demo
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              {formSent && <p className="form-note">Thanks. Your demo request is ready to connect to a backend.</p>}
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top">
          <span className="brand-mark">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <span>AI First Ops</span>
        </a>
        <p>Premium AI operations for teams that want every workflow to feel effortless.</p>
        <div>
          <a href="#platform">Platform</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
