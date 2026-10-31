import { useEffect, useMemo, useState } from 'react';
import { getAllCashEntries, getAllPurchases, getAllReceipts } from '../store';
import { belongsToProfile, formatCurrency, localToday } from '../utils';
import { cashFlowSummary, workingCapitalEstimate } from '../utils/financialStatements';
import { linkedCashLines, ownCashLines } from '../utils/cashBook';
import { toast } from './Toast';
import TableExport from './TableExport';

const dateLabel = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-IN') : '—';

export default function FinancialStatements({ bills, expenses, profile, from, to, periodLabel }) {
  const gstin = profile?.gstin;
  const businessName = profile?.businessName;
  const [cashEntries, setCashEntries] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([getAllCashEntries(), getAllReceipts(), getAllPurchases()])
      .then(([cash, receiptRows, purchaseRows]) => {
        if (!active) return;
        const owner = { gstin, businessName };
        const mine = (rows) => (rows || []).filter((row) => belongsToProfile(row, owner));
        setCashEntries(mine(cash));
        setReceipts(mine(receiptRows));
        setPurchases(mine(purchaseRows));
      })
      .catch(() => toast('Could not load cash-flow and purchase data', 'error'));
    return () => { active = false; };
  }, [gstin, businessName]);

  const cashLines = useMemo(() => [
    ...ownCashLines(cashEntries),
    ...linkedCashLines({ bills, receipts, expenses, purchases }),
  ], [cashEntries, bills, receipts, expenses, purchases]);
  const flow = cashFlowSummary(cashLines, from, to);
  const asOf = to && to < localToday() ? to : localToday();
  const estimate = workingCapitalEstimate({ bills, purchases, cashLines, asOf });
  const flowRows = flow.rows.map((line) => [
    line.date, line.name || line.label || line.category || 'Cash entry',
    line.note || '', line.type === 'in' ? line.amount : '',
    line.type === 'out' ? line.amount : '',
  ]);
  const estimateRows = [
    ['Recorded cash-book balance (including any opening entry)', estimate.cash],
    ['Trade receivables (unpaid INR sales)', estimate.receivables],
    ['Known assets', estimate.knownAssets],
    ['Trade payables (unpaid INR purchases)', estimate.payables],
    ['Known liabilities', estimate.knownLiabilities],
    ['Known working capital before unrecorded balances', estimate.netKnownWorkingCapital],
  ];

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
        <h3 style={{ marginTop: 0 }}>Estimated Balance Sheet snapshot · as of {dateLabel(asOf)}</h3>
        <p className="text-muted" style={{ marginBottom: 0 }}>
          This is a partial working-capital estimate, not a complete or audited balance sheet. The cash figure is based only on recorded cash-book entries and includes an opening balance only if you entered one. It also includes unpaid INR invoices/purchases. Inventory valuation, fixed assets, loans, GST/income-tax liabilities, owner capital, and bank balances are excluded. Do not use this estimate for statutory filing or lending decisions.
        </p>
        <div className="table-scroll" style={{ marginTop: '0.75rem' }}>
          <table className="data-table">
            <thead><tr><th>Known balance</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>{estimateRows.map(([label, amount]) => (
              <tr key={label}><td>{label}</td><td style={{ textAlign: 'right', fontWeight: label === 'Known working capital before unrecorded balances' ? 700 : 500 }}>{formatCurrency(amount)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <TableExport title="Estimated balance snapshot" filename={`Balance-snapshot-${asOf}`}
          subtitle={[profile?.businessName, `as of ${asOf}`, 'partial estimate; not audited'].filter(Boolean).join(', ')}
          headers={['Known balance', 'Amount']} rows={estimateRows} />
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Cash-book flow · {periodLabel}</h3>
            <p className="text-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>Cash transactions recorded in Nexuzy Ledger only; bank statement entries are not included.</p>
          </div>
          <TableExport title="Cash-book flow" filename={`Cash-flow-${periodLabel}`}
            subtitle={[profile?.businessName, periodLabel, 'cash book only'].filter(Boolean).join(', ')}
            headers={['Date', 'Name / entry', 'Note', 'Money in', 'Money out']}
            rows={[...flowRows, ['Total', '', '', flow.in, flow.out], ['Net cash movement', '', '', flow.net, '']]} />
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', margin: '1rem 0' }}>
          <div className="stat-card"><div><p className="stat-label">Money in</p><h2 className="stat-value stat-value-green">{formatCurrency(flow.in)}</h2></div></div>
          <div className="stat-card"><div><p className="stat-label">Money out</p><h2 className="stat-value stat-value-amber">{formatCurrency(flow.out)}</h2></div></div>
          <div className="stat-card"><div><p className="stat-label">Net movement</p><h2 className="stat-value">{formatCurrency(flow.net)}</h2></div></div>
        </div>
        {flow.rows.length === 0 ? <p className="text-muted">No cash-book transactions in this period.</p> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Name / entry</th><th>Note</th><th style={{ textAlign: 'right' }}>Money in</th><th style={{ textAlign: 'right' }}>Money out</th></tr></thead>
              <tbody>
                {flow.rows.map((line) => <tr key={line.key}>
                  <td>{dateLabel(line.date)}</td><td>{line.name || line.label || line.category || 'Cash entry'}</td><td>{line.note || '—'}</td>
                  <td style={{ textAlign: 'right', color: line.type === 'in' ? 'var(--success)' : undefined }}>{line.type === 'in' ? formatCurrency(line.amount) : '—'}</td>
                  <td style={{ textAlign: 'right', color: line.type === 'out' ? 'var(--danger)' : undefined }}>{line.type === 'out' ? formatCurrency(line.amount) : '—'}</td>
                </tr>)}
                <tr><td colSpan="3" className="font-medium">Total</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(flow.in)}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(flow.out)}</td></tr>
                <tr><td colSpan="3" className="font-medium">Net cash movement</td><td colSpan="2" style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(flow.net)}</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
