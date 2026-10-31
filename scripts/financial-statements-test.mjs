import assert from 'node:assert/strict';
import { cashFlowSummary, workingCapitalEstimate } from '../src/utils/financialStatements.js';

const flow = cashFlowSummary([
  { date: '2026-04-02', type: 'in', amount: 100 },
  { date: '2026-04-03', type: 'out', amount: 25 },
  { date: '2026-03-31', type: 'in', amount: 900 },
], '2026-04-01', '2026-04-30');
assert.equal(flow.in, 100);
assert.equal(flow.out, 25);
assert.equal(flow.net, 75);
assert.equal(flow.rows.length, 2);

const estimate = workingCapitalEstimate({
  asOf: '2026-04-30',
  cashLines: [
    { date: '2026-04-01', type: 'in', amount: 500 },
    { date: '2026-04-12', type: 'out', amount: 80 },
    { date: '2026-05-01', type: 'in', amount: 1000 },
  ],
  bills: [
    { id: 'b1', invoiceDate: '2026-04-02', invoiceType: 'tax-invoice', totalAmount: 118, totalTaxAmount: 18, paidAmount: 20, status: 'partial' },
    { id: 'b2', invoiceDate: '2026-04-10', invoiceType: 'tax-invoice', totalAmount: 200, totalTaxAmount: 0, status: 'cancelled' },
    { id: 'b3', invoiceDate: '2026-04-20', invoiceType: 'tax-invoice', totalAmount: 10, currency: 'USD' },
  ],
  purchases: [
    { id: 'p1', date: '2026-04-05', totalAmount: 60, payments: [{ amount: 10, date: '2026-04-06' }, { amount: 5, date: '2026-05-01' }] },
    { id: 'p2', date: '2026-05-01', totalAmount: 100 },
  ],
});
assert.equal(estimate.cash, 420);
assert.equal(estimate.receivables, 98);
assert.equal(estimate.payables, 50);
assert.equal(estimate.knownAssets, 518);
assert.equal(estimate.netKnownWorkingCapital, 468);

console.log('Financial statement helper tests passed.');
