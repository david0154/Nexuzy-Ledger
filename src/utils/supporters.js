const num = (value, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
};

const text = (value, max) => (
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
);

export const upiNote = (businessName = '') => {
  const name = String(businessName || '').replace(/[^A-Za-z0-9 .-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return name ? `Free GST Billing support - ${name}`.slice(0, 50).trim() : 'Free GST Billing support';
};

export const parseSupporters = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const total = num(raw.totalReceived, 1e10);
  if (total === null) return null;
  const supporters = num(raw.supporters, 1e7);
  const goalAmount = num(raw.goal?.amount, 1e10);
  const updated = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.updated || '')) ? raw.updated : '';
  return {
    totalReceived: Math.round(total),
    supporters: supporters === null ? null : Math.floor(supporters),
    goal: goalAmount ? { amount: Math.round(goalAmount), label: text(raw.goal.label, 80) } : null,
    thanks: (Array.isArray(raw.thanks) ? raw.thanks : []).map((name) => text(name, 60)).filter(Boolean).slice(-2000),
    people: (Array.isArray(raw.people) ? raw.people : [])
      .filter((person) => person && typeof person === 'object')
      .map((person) => ({
        name: text(person.name, 60),
        amount: num(person.amount, 1e9),
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(person.date || '')) ? person.date : '',
      }))
      .filter((person) => person.name && person.amount !== null)
      .map((person) => ({ ...person, amount: Math.round(person.amount) }))
      .slice(-2000),
    updated,
  };
};
