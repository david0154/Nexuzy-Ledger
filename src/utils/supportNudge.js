// The dashboard support card's local snooze state.
export const SUPPORT_NUDGE_MIN_INVOICES = 10;
export const SNOOZE_DAYS = 30;
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const shouldShowSupportNudge = (invoiceCount, state = {}, now = new Date()) => {
  if (invoiceCount < SUPPORT_NUDGE_MIN_INVOICES || state.never) return false;
  if (state.hiddenOn === localDay(now)) return false;
  return !(Number(state.snoozedUntil) > now.getTime());
};
