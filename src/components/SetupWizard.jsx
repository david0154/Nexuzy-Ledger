import { useState } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { getPrintSettings, savePrintSettings, applyBusinessPreset } from '../utils/printSettings';
import { toast } from './Toast';
import HelpButton from './HelpButton';
import { patchInvoiceDefaults, getEnabledModules, setEnabledModules, setBusinessType, saveProfile } from '../store';
import { BUSINESS_TYPES, businessTypeById, applyBusinessType, invoiceDefaultsForType, modulesForType } from '../utils/businessTypes';

const PAPER_LABELS = { a4: 'A4', a5: 'A5', thermal80: '80mm thermal', thermal58: '58mm thermal' };

// Short, human labels for the features each business type switches on, shown
// as chips on the type cards so a user sees what they will get.
const FEATURE_LABELS = {
  inventory: 'Products & stock',
  purchases: 'Purchase bills',
  expenses: 'Expenses',
  payroll: 'Payroll & attendance',
  purchaseOrders: 'Purchase orders',
  manufacturing: 'Manufacturing / BOM',
  costCentres: 'Cost centres',
  recurring: 'Recurring invoices',
  tdsTcs: 'TDS / TCS',
  gstr2b: 'GSTR-2B',
  ewayBill: 'e-Way bill',
  receipts: 'Receipts',
  cashBook: 'Cash book',
  reports: 'Reports',
  gstReturns: 'GST returns',
  incomeTax: 'Income tax',
};

// ============================================================================
// v1.9.3 — First-run Setup Wizard
// Shown when onboardingComplete = false. 4 steps:
//   1. Business type (auto-configures 15+ settings via BUSINESS_PRESETS)
//   2. Business profile
//   3. Paper size + language
//   4. Confirm + save
// User can Skip at any time; setting is marked complete either way.
// ============================================================================

export default function SetupWizard({ onClose, profile: initialProfile, onSaved }) {
  const [step, setStep] = useState(1);
  const [selectedBiz, setSelectedBiz] = useState('');
  const [paperSize, setPaperSize] = useState('a4');
  const [language, setLanguage] = useState('en');
  const [business, setBusiness] = useState(() => ({
    businessName: '', address: '', city: '', state: '', pin: '', country: 'India',
    gstin: '', pan: '', email: '', phone: '', logo: '',
    ...(initialProfile || {}),
  }));
  const [saving, setSaving] = useState(false);

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast('Choose a PNG, JPG, or WebP logo image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Logo must be 5 MB or smaller.', 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setBusiness((current) => ({ ...current, logo: canvas.toDataURL('image/jpeg', 0.9) }));
      } catch {
        toast('Could not process the logo image. Please try another file.', 'error');
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      toast('Could not decode the logo image. Please try a PNG, JPG, or WebP file.', 'error');
    };
    image.src = url;
  };

  // Keep the finish action distinct from Skip: a completed setup must save a
  // business profile, while Skip remains available for later configuration.
  const finish = async () => {
    const businessName = String(business.businessName || '').trim();
    if (!businessName) {
      setStep(2);
      toast('Enter your business name to finish setup.', 'error');
      return;
    }
    setSaving(true);
    try {
      const savedProfile = { ...(initialProfile || {}), ...business, businessName };
      await saveProfile(savedProfile);
      onSaved?.(savedProfile);

      const current = getPrintSettings();
      // Clear onboardingSkipped when the user completes setup.
      let next = { ...current, onboardingComplete: true, onboardingSkipped: false };
      // Apply the preset first so the language selected below takes priority.
      if (selectedBiz) next = applyBusinessPreset(next, selectedBiz);
      if (selectedBiz) {
        setEnabledModules(applyBusinessType(selectedBiz, getEnabledModules()));
        setBusinessType(selectedBiz);
      }
      next.labelLanguage = language;
      if (paperSize) next.paperSize = paperSize;
      savePrintSettings(next);
      const invoiceDefaults = { ...(selectedBiz ? invoiceDefaultsForType(selectedBiz) : {}), ...(paperSize ? { paperSize } : {}) };
      patchInvoiceDefaults(invoiceDefaults);
      toast('Setup complete! Your defaults are configured.', 'success');
      onClose();
    } catch (error) {
      toast(error?.message || 'Could not save your setup. Please try again.', 'error', 7000);
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    if (saving) return;
    // v1.10.33 — Distinguishes "Skip" from "None of these":
    //   Skip           → onboardingComplete=true, onboardingSkipped=true
    //                    (App shows a bottom-right "Finish setup" pill)
    //   None of these  → onboardingComplete=true, onboardingSkipped=false
    //                    (user chose to configure manually — no nag)
    // Reported: "if user skip it should show in right side bottom so
    // they can do it again".
    const current = getPrintSettings();
    savePrintSettings({ ...current, onboardingComplete: true, onboardingSkipped: true });
    toast('Setup skipped — use the "Finish setup" pill to come back to it.', 'info');
    onClose();
  };
  const canFinish = !!String(business.businessName || '').trim() && !saving;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem' }}>👋 Welcome to Nexuzy Ledger <HelpButton title="Setting up your invoices" doc="first-run#setup-wizard" size={16} /></h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Step {step} of 4 · Takes about 2 minutes
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={skip} disabled={saving} title="Skip setup — I'll configure later"><X size={18} /></button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: n <= step ? 'var(--primary)' : 'var(--border)',
            }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h3 style={{ marginTop: 0 }}>What kind of business do you run? <HelpButton title="What kind of business do you run?" doc="first-run#wizard-business-type" size={16} /></h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Pick one and the app shows the features that business needs, and sets an invoice style to match. You can change it later in Settings → Business type.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
              {BUSINESS_TYPES.map(({ id: key, ...preset }) => (
                <button key={key} type="button"
                  onClick={() => setSelectedBiz(key)}
                  style={{
                    padding: '0.85rem',
                    background: selectedBiz === key ? 'var(--primary)' : 'var(--card)',
                    color: selectedBiz === key ? '#fff' : 'var(--text)',
                    border: `2px solid ${selectedBiz === key ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                  }}>
                  <div style={{ fontWeight: 700, marginBottom: 3 }}>{preset.label}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>{preset.hint}</div>
                  {(() => {
                    const on = modulesForType(key) || {};
                    const list = Object.keys(on).filter((m) => on[m] && FEATURE_LABELS[m]).map((m) => FEATURE_LABELS[m]);
                    if (!list.length) return null;
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                        {list.slice(0, 4).map((label) => (
                          <span key={label} style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: 'var(--primary)', color: '#fff', opacity: 0.92 }}>
                            {label}
                          </span>
                        ))}
                        {list.length > 4 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{list.length - 4} more</span>}
                      </div>
                    );
                  })()}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              {/* v1.10.33 — Was a plain "clear selection" button that did
                  nothing visible (the wizard stayed open, no progress).
                  Users tapped it, nothing happened, then reported "None
                  of these — I'll configure manually not working". Now:
                  the button treats "configure manually" as an explicit
                  intent → mark onboarded (so the wizard stops nagging)
                  AND close. User lands on the dashboard with all defaults
                  intact, free to tweak from Settings when they want. */}
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem' }}
                onClick={() => {
                  const current = getPrintSettings();
                  savePrintSettings({ ...current, onboardingComplete: true, onboardingSkipped: false });
                  toast('Setup dismissed — configure any time from Settings → Print & PDF.', 'info');
                  onClose();
                }}>
                None of these — I'll configure manually
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ marginTop: 0 }}>Your business details</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              These details appear on your invoices. Your business name is required; you can add the rest now or update it later in Settings.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
              <WizardField label="Business name *" value={business.businessName} onChange={(value) => setBusiness((current) => ({ ...current, businessName: value }))} autoFocus />
              <WizardField label="Phone" type="tel" value={business.phone} onChange={(value) => setBusiness((current) => ({ ...current, phone: value }))} />
              <WizardField label="Email" type="email" value={business.email} onChange={(value) => setBusiness((current) => ({ ...current, email: value }))} />
              <WizardField label="City" value={business.city} onChange={(value) => setBusiness((current) => ({ ...current, city: value }))} />
              <WizardField label="Country" value={business.country} onChange={(value) => setBusiness((current) => ({ ...current, country: value }))} />
              <WizardField label="State / region" value={business.state} onChange={(value) => setBusiness((current) => ({ ...current, state: value }))} />
              <WizardField label="PIN / postal code" value={business.pin} onChange={(value) => setBusiness((current) => ({ ...current, pin: value }))} />
              <WizardField label="GSTIN (optional)" value={business.gstin} onChange={(value) => setBusiness((current) => ({ ...current, gstin: value.toUpperCase() }))} />
              <WizardField label="PAN (optional)" value={business.pan} onChange={(value) => setBusiness((current) => ({ ...current, pan: value.toUpperCase() }))} />
            </div>
            <label style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.82rem', fontWeight: 600 }}>
              Business address
              <textarea
                value={business.address || ''}
                onChange={(event) => setBusiness((current) => ({ ...current, address: event.target.value }))}
                rows={2}
                maxLength={500}
                placeholder="Street address, building, or area"
                style={{ display: 'block', width: '100%', marginTop: '0.35rem', resize: 'vertical' }}
              />
            </label>
            <div style={{ marginTop: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Business logo (optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {business.logo && <img src={business.logo} alt="Business logo preview" style={{ maxWidth: 140, maxHeight: 64, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 6, padding: 4 }} />}
                <label className="btn btn-secondary" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                  {business.logo ? 'Change logo' : 'Upload logo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} style={{ display: 'none' }} />
                </label>
                {business.logo && <button type="button" className="btn btn-secondary" onClick={() => setBusiness((current) => ({ ...current, logo: '' }))} style={{ fontSize: '0.8rem' }}>Remove</button>}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PNG, JPG, or WebP · up to 5 MB</span>
              </div>
            </div>
            {!String(business.businessName || '').trim() && (
              <p role="status" style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Enter a business name to continue.</p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={{ marginTop: 0 }}>Paper size + language <HelpButton title="Paper size + language" doc="first-run#wizard-paper-language" size={16} /></h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              What are you mostly printing on?
            </p>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Paper size</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {[
                ['a4', 'A4 · Standard'],
                ['a5', 'A5 · Compact'],
                ['thermal80', '80mm Thermal'],
                ['thermal58', '58mm Thermal'],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setPaperSize(key)}
                  style={{
                    padding: '0.7rem',
                    background: paperSize === key ? 'var(--primary)' : 'var(--card)',
                    color: paperSize === key ? '#fff' : 'var(--text)',
                    border: `2px solid ${paperSize === key ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Section label language</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
              {[
                ['en', 'English'], ['hi', 'हिन्दी (Hindi)'], ['ta', 'தமிழ் (Tamil)'],
                ['mr', 'मराठी (Marathi)'], ['bn', 'বাংলা (Bengali)'],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setLanguage(key)}
                  style={{
                    padding: '0.55rem',
                    background: language === key ? 'var(--primary)' : 'var(--card)',
                    color: language === key ? '#fff' : 'var(--text)',
                    border: `1px solid ${language === key ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 5,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 style={{ marginTop: 0 }}>Ready to go 🚀 <HelpButton title="Ready to go" doc="first-run#wizard-ready" size={16} /></h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              We'll apply these defaults to every new invoice. You can change any of them later in <strong>Settings → Print & PDF</strong>.
            </p>

            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.9rem' }}>
              <Row label="Business name" value={business.businessName} />
              <Row label="Address" value={[business.address, business.city, business.state, business.pin, business.country].filter(Boolean).join(', ')} />
              <Row label="GSTIN" value={business.gstin} />
              <Row label="Contact" value={[business.phone, business.email].filter(Boolean).join(' · ')} />
              <Row label="Business type" value={selectedBiz ? businessTypeById(selectedBiz)?.label : '(none — manual config)'} />
              <Row label="Default paper size" value={PAPER_LABELS[paperSize] || paperSize} />
              <Row label="Section label language" value={
                { en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', mr: 'मराठी', bn: 'বাংলা' }[language]
              } />
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(30, 64, 175, 0.06)', borderRadius: 6, fontSize: '0.82rem' }}>
              💡 <strong>What happens next:</strong> When you create your first invoice, these settings apply automatically. Use the <strong>PDF Style Editor</strong> to tune colours or the <strong>Live preview</strong> to see any change instantly.
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={skip} disabled={saving} style={{ fontSize: '0.82rem' }}>
            Skip setup
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}
                disabled={step === 2 && !String(business.businessName || '').trim()}>
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={finish}
                disabled={!canFinish}
                title={canFinish ? '' : 'Enter a business name to finish setup.'}>
                <Check size={16} /> {saving ? 'Saving…' : 'Finish setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WizardField({ label, value, onChange, type = 'text', autoFocus = false }) {
  return (
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>
      {label}
      <input
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        autoFocus={autoFocus}
        maxLength={type === 'email' ? 254 : 120}
        style={{ display: 'block', width: '100%', marginTop: '0.35rem' }}
      />
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );
}
