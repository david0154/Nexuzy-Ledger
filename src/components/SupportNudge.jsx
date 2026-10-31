// The optional dashboard support reminder is stored per browser and never
// blocks work or appears on invoices.
import { useState } from 'react';
import { Heart } from 'lucide-react';
import HelpButton from './HelpButton';
import { shouldShowSupportNudge, localDay, SNOOZE_DAYS } from '../utils/supportNudge';

const KEY = 'freegstbill_supportNudge';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } };
// A different line each day, so the card doesn't read as the same banner.
const LINES = [
  'Nexuzy Ledger is free, with no ads and no paid version. Optional support helps development continue.',
  'Nexuzy Lab develops this app. Optional donations support ongoing development.',
  'No subscription, no locked features. If the app saves you time, help keep it free for everyone.',
  'Sharing feedback helps the team improve future updates.',
];

export default function SupportNudge({ invoiceCount, onOpen }) {
  const [state, setState] = useState(read);
  const visible = shouldShowSupportNudge(invoiceCount, state);
  if (!visible) return null;
  const save = (v) => { write(v); setState(v); };
  const hideToday = () => save({ ...state, hiddenOn: localDay() });
  const now = new Date();
  const line = LINES[Math.floor(now.getTime() / 86400000) % LINES.length];
  return (
    <div className="glass-panel" role="note" aria-label="Support Nexuzy Ledger"
      style={{ padding: '0.9rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '0.9rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <Heart size={22} style={{ color: '#e11d48', flexShrink: 0 }} />
      <div style={{ flex: '1 1 300px', minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{invoiceCount} invoices made with Nexuzy Ledger <HelpButton title="The support card" doc="dashboard#support-card" size={16} /></div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{line}</div>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => { hideToday(); onOpen(); }}
        style={{ fontSize: '0.82rem' }}>About &amp; Support</button>
      <button type="button" className="btn btn-secondary" onClick={hideToday}
        style={{ fontSize: '0.82rem' }}>Not today</button>
      <button type="button" onClick={() => save({ ...state, snoozedUntil: now.getTime() + SNOOZE_DAYS * 86400000 })}
        style={{ background: 'none', border: 0, color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', fontSize: '0.78rem', textDecoration: 'underline' }}>
        Hide for 30 days
      </button>
    </div>
  );
}
