import { Heart, Star, Share2, Bug, Mail, Code, Wrench, Database, LifeBuoy, Bot, Smartphone, Workflow } from 'lucide-react';
import WhatsNew from './WhatsNew';
import ProblemLog from './ProblemLog';
import HelpButton from './HelpButton';
import { SafePrivateSection } from './SafePrivateNote';

const REPO = 'https://github.com/david0154/Nexuzy-Ledger';
const DONATION_URL = 'https://razorpay.me/@nexuzylab';
const EMAIL = 'info@nexuzy.in';
const WEBSITE = 'https://nexuzy.in';

const SERVICES = [
  { icon: Code, title: 'Custom software & web apps', text: 'Websites, web apps and business tools built for how you work.' },
  { icon: Wrench, title: 'Customising Nexuzy Ledger', text: 'Your own invoice layout, reports or features.' },
  { icon: Database, title: 'Setup & data migration', text: 'Installation, moving your data from Tally or Excel, and training.' },
  { icon: LifeBuoy, title: 'Support for businesses', text: 'Get in touch to discuss support and updates.' },
  { icon: Bot, title: 'AI integration', text: 'Add AI to your product: assistants, document reading, smart search.' },
  { icon: Workflow, title: 'AI automation', text: 'Automate repetitive work in the software you already use.' },
  { icon: Smartphone, title: 'Mobile apps', text: 'Android and iPhone apps for your business or customers.' },
];

export default function SupportView() {
  const shareText = `I use Nexuzy Ledger for GST invoices and business records. Learn more: ${REPO}`;
  const freeWays = [
    { icon: Star, title: 'Star it on GitHub', text: 'Helps other businesses find it.', href: REPO },
    { icon: Share2, title: 'Tell another business', text: 'Send it to a friend on WhatsApp.', href: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    { icon: Bug, title: 'Report a bug or ask for a feature', text: 'Your feedback helps improve Nexuzy Ledger.', href: `${REPO}/issues/new/choose` },
  ];
  const card = { padding: '1.25rem 1.5rem' };
  const linkRow = { display: 'flex', gap: '0.85rem', alignItems: 'flex-start', padding: '0.75rem 0', borderTop: '1px solid var(--border-color)', color: 'inherit', textDecoration: 'none' };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">About &amp; Support <HelpButton title="About & Support" doc="support" size={16} style={{ marginLeft: 6 }} /></h1>
          <p className="page-subtitle">About Nexuzy Ledger and the team behind it</p>
        </div>
      </div>

      <div className="glass-panel" style={{ ...card, marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <Heart size={28} style={{ color: '#e11d48', flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem' }}>Nexuzy Ledger by Nexuzy Lab <HelpButton title="About Nexuzy Ledger" doc="support#about" size={16} /></h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '70ch' }}>
            Nexuzy Ledger is developed by Nexuzy Lab. Developers: David and Manoj Konar.
            It is designed to help Indian businesses manage invoices and accounting records.
            Your business data stays on this computer; contributions are optional and do not unlock features.
          </p>
          <a href={WEBSITE} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 10, color: 'var(--primary)', fontWeight: 600 }}>
            Visit Nexuzy Lab · nexuzy.in
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="glass-panel" style={card}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Support Nexuzy Lab <HelpButton title="Support Nexuzy Lab" doc="support#donate" size={16} /></h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Donations are optional and help support development. Payment is handled securely by Razorpay.
          </p>
          <a className="btn btn-primary" href={DONATION_URL} target="_blank" rel="noopener noreferrer">
            <Heart size={16} /> Donate with Razorpay
          </a>
        </div>

        <div className="glass-panel" style={card}>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Help without paying <HelpButton title="Help without paying" doc="support#free-ways" size={16} /></h3>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>These matter just as much.</p>
          {freeWays.map((way) => (
            <a key={way.title} href={way.href} target="_blank" rel="noopener noreferrer" style={linkRow}>
              <way.icon size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
              <span>
                <span style={{ display: 'block', fontWeight: 600 }}>{way.title}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{way.text}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <SafePrivateSection style={{ marginBottom: '1.25rem' }} />
      <WhatsNew />
      <ProblemLog />

      <div className="glass-panel" style={card}>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Work with Nexuzy Lab <HelpButton title="Work with Nexuzy Lab" doc="support#services" size={16} /></h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>The team behind Nexuzy Ledger builds software for businesses too.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.1rem' }}>
          {SERVICES.map((service) => (
            <div key={service.title} style={{ display: 'flex', gap: '0.7rem', padding: '0.85rem', borderRadius: 8, background: 'var(--bg-secondary)' }}>
              <service.icon size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{service.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.45 }}>{service.text}</div>
              </div>
            </div>
          ))}
        </div>
        <a className="btn btn-primary" href={`mailto:${EMAIL}?subject=${encodeURIComponent('Nexuzy Ledger enquiry')}`}>
          <Mail size={16} /> Email {EMAIL}
        </a>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <a href={DONATION_URL} target="_blank" rel="noopener noreferrer">Razorpay donations</a> are optional. For questions or project enquiries, email Nexuzy Lab.
        </p>
      </div>
    </div>
  );
}
