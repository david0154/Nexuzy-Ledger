import { amountDue, countsAsSales, isCancelledBill } from '../utils.js';
import { purchaseOwed } from './purchasePayments.js';

const r2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const inPeriod = (date, from, to) => !!date && (!from || date >= from) && (!to || date <= to);

export function cashFlowSummary(lines = [], from = '', to = '') {
  const rows = lines.filter((line) => inPeriod(line.date, from, to))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.at || '').localeCompare(String(b.at || '')));
  const totals = rows.reduce((sum, line) => {
    if (line.type === 'in') sum.in += Number(line.amount) || 0;
    else sum.out += Number(line.amount) || 0;
    return sum;
  }, { in: 0, out: 0 });
  return {
    rows,
    in: r2(totals.in),
    out: r2(totals.out),
    net: r2(totals.in - totals.out),
  };
}

export function workingCapitalEstimate({ bills = [], purchases = [], cashLines = [], asOf = '' } = {}) {
  const cash = cashLines.reduce((sum, line) => {
    if (!inPeriod(line.date, '', asOf)) return sum;
    return sum + (line.type === 'out' ? -1 : 1) * (Number(line.amount) || 0);
  }, 0);

  const receivables = bills.reduce((sum, bill) => {
    if (!bill?.invoiceDate || bill.invoiceDate > asOf || isCancelledBill(bill) || !countsAsSales(bill)) return sum;
    const currency = bill.currency || bill.data?.invoiceOptions?.currency || 'INR';
    if (currency !== 'INR') return sum;
    const due = amountDue(bill);
    const paidByDate = (bill.payments || bill.data?.payments || [])
      .filter((payment) => !payment.date || payment.date <= asOf)
      .reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
    const hasPaymentHistory = (bill.payments || bill.data?.payments || []).length > 0;
    const legacyPaid = hasPaymentHistory ? 0
      : bill.status === 'paid' ? due : Math.max(0, Number(bill.paidAmount) || 0);
    return sum + Math.max(0, due - Math.max(paidByDate, legacyPaid));
  }, 0);

  const payables = purchases.reduce((sum, purchase) => {
    if (!purchase?.date || purchase.date > asOf) return sum;
    if (purchase.currency && purchase.currency !== 'INR') return sum;
    const due = purchaseOwed(purchase);
    const paidByDate = (purchase.payments || [])
      .filter((payment) => !payment.date || payment.date <= asOf)
      .reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
    const legacyPaid = purchase.payments?.length ? 0
      : purchase.paymentStatus === 'Paid' ? due : Math.max(0, Number(purchase.paidAmount) || 0);
    return sum + Math.max(0, due - Math.max(paidByDate, legacyPaid));
  }, 0);

  const assetTotal = r2(cash + receivables);
  return {
    asOf,
    cash: r2(cash),
    receivables: r2(receivables),
    payables: r2(payables),
    knownAssets: assetTotal,
    knownLiabilities: r2(payables),
    netKnownWorkingCapital: r2(assetTotal - payables),
    excludedInventoryAndFixedAssets: true,
    excludesLoansAndTaxLiabilities: true,
  };
}
