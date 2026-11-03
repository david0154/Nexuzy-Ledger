import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Printer, Save, UserRound, X } from 'lucide-react';
import { getPayrollData, savePayrollData } from '../store';
import { formatCurrency, localToday } from '../utils';
import { cleanEmployee, cleanPayRun, netSalary, payrollBusinessKey, validateEmployee, validatePayRun } from '../utils/payroll';
import { toast } from './Toast';
import HelpButton from './HelpButton';
import TableExport from './TableExport';

const emptyEmployee = () => ({ employeeCode: '', name: '', designation: '', pan: '', monthlySalary: '', active: true });
const thisMonth = () => localToday().slice(0, 7);
const emptyRun = (employeeId = '', month = thisMonth(), basic = '') => ({
  employeeId, month, basic: String(basic || ''), allowances: '0', bonus: '0',
  deductions: '0', tds: '0', status: 'unpaid', paidOn: '',
});
const monthName = (month) => {
  const [year, value] = String(month || '').split('-').map(Number);
  return year && value ? new Date(year, value - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : month;
};
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function openPayslip(run, employee, profile) {
  const popup = window.open('', '_blank');
  if (!popup) {
    toast('Allow pop-ups to print the payslip', 'warning');
    return;
  }
  const company = escapeHtml(profile?.businessName || 'Business');
  const name = escapeHtml(employee.name);
  const month = escapeHtml(monthName(run.month));
  const rows = [
    ['Basic salary', run.basic],
    ['Allowances', run.allowances],
    ['Bonus', run.bonus],
    ['Deductions', -run.deductions],
    ['TDS (manually entered)', -run.tds],
  ].map(([label, amount]) => `<tr><td>${label}</td><td class="amount">${formatCurrency(amount)}</td></tr>`).join('');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payslip - ${name} - ${month}</title>
    <style>
      body{font:14px Arial,sans-serif;color:#172033;max-width:760px;margin:40px auto;padding:24px}
      h1{font-size:24px;margin:0 0 6px}p{color:#536174;margin:6px 0 22px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;border:1px solid #d5dce7;padding:16px;margin:20px 0}
      table{border-collapse:collapse;width:100%}td{padding:10px;border-bottom:1px solid #d5dce7}
      .amount{text-align:right;font-variant-numeric:tabular-nums}.total{font-weight:700;font-size:17px}
      .note{font-size:12px;color:#536174;margin-top:24px}
      @media print{body{margin:0 auto;padding:10mm}button{display:none}}
    </style></head><body>
    <h1>${company}</h1><p>Salary payslip · ${month}</p>
    <div class="meta"><div><strong>Employee</strong><br>${name}</div>
      <div><strong>Employee ID</strong><br>${escapeHtml(employee.employeeCode || '—')}</div>
      <div><strong>Designation</strong><br>${escapeHtml(employee.designation || '—')}</div>
      <div><strong>PAN</strong><br>${escapeHtml(employee.pan || '—')}</div>
      <div><strong>Payment status</strong><br>${run.status === 'paid' ? `Paid on ${escapeHtml(run.paidOn)}` : 'Unpaid'}</div>
    </div>
    <table><tbody>${rows}<tr class="total"><td>Net salary</td><td class="amount">${formatCurrency(netSalary(run))}</td></tr></tbody></table>
    <p class="note">TDS and other deductions are manually entered. This payslip is not a statutory tax calculation or filing document.</p>
    <button onclick="window.print()">Print payslip</button>
    <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));</script>
    </body></html>`);
  popup.document.close();
}

export default function Payroll({ profile }) {
  const key = payrollBusinessKey(profile);
  const [employees, setEmployees] = useState([]);
  const [runs, setRuns] = useState([]);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [editingEmployee, setEditingEmployee] = useState('');
  const [runForm, setRunForm] = useState(() => emptyRun());
  const [editingRun, setEditingRun] = useState('');
  const [saving, setSaving] = useState(false);
  // v1.10.x — Attendance (mark present / absent / leave per employee per day).
  const [showAttendance, setShowAttendance] = useState(false);
  const [attMonth, setAttMonth] = useState(thisMonth());
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    let active = true;
    getPayrollData().then((data) => {
      if (!active) return;
      const saved = data[key] || {};
      setEmployees(Array.isArray(saved.employees) ? saved.employees : []);
      setRuns(Array.isArray(saved.payRuns) ? saved.payRuns : []);
      setAttendance((saved.attendance && typeof saved.attendance === 'object') ? saved.attendance : {});
    }).catch(() => toast('Could not load payroll data', 'error'));
    return () => { active = false; };
  }, [key]);

  const persist = async (nextEmployees, nextRuns) => {
    const data = await getPayrollData();
    data[key] = { ...(data[key] || {}), employees: nextEmployees, payRuns: nextRuns };
    await savePayrollData(data);
    setEmployees(nextEmployees);
    setRuns(nextRuns);

  };

  const persistAttendance = async (nextAttendance) => {
    const data = await getPayrollData();
    data[key] = { ...(data[key] || {}), attendance: nextAttendance };
    await savePayrollData(data);
    setAttendance(nextAttendance);
  };

  const cycleAttendance = (employeeId, date) => {
    const cur = attendance?.[employeeId]?.[date] || '';
    const next = cur === '' ? 'P' : cur === 'P' ? 'A' : cur === 'A' ? 'L' : '';
    persistAttendance({ ...attendance, [employeeId]: { ...(attendance?.[employeeId] || {}), [date]: next } });
  };

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.active !== false), [employees]);
  const currentMonthRuns = runs.filter((run) => run.month === thisMonth());
  const monthlyNet = currentMonthRuns.reduce((sum, run) => sum + netSalary(run), 0);

  const saveEmployee = async (event) => {
    event.preventDefault();
    if (saving) return;
    const problem = validateEmployee(employeeForm);
    if (problem) { toast(problem, 'warning'); return; }
    const normalized = cleanEmployee({ ...employeeForm, id: editingEmployee || undefined });
    if (employees.some((item) => item.id !== normalized.id && normalized.employeeCode
      && item.employeeCode?.toLowerCase() === normalized.employeeCode.toLowerCase())) {
      toast('That employee ID is already in use', 'warning');
      return;
    }
    setSaving(true);
    try {
      const next = [...employees.filter((item) => item.id !== normalized.id), normalized];
      await persist(next, runs);
      setEmployeeForm(emptyEmployee());
      setEditingEmployee('');
      if (!runForm.employeeId) setRunForm((form) => ({ ...form, employeeId: normalized.id, basic: String(normalized.monthlySalary) }));
      toast(editingEmployee ? 'Employee updated' : 'Employee saved', 'success');
    } catch {
      toast('Could not save the employee. Try again.', 'error');
    } finally { setSaving(false); }
  };

  const editEmployee = (employee) => {
    setEditingEmployee(employee.id);
    setEmployeeForm({ ...emptyEmployee(), ...employee, monthlySalary: String(employee.monthlySalary) });
  };

  const toggleEmployee = async (employee) => {
    const next = employees.map((item) => item.id === employee.id ? { ...item, active: employee.active === false } : item);
    setSaving(true);
    try {
      await persist(next, runs);
      toast(employee.active === false ? 'Employee reactivated' : 'Employee made inactive', 'success');
    } catch {
      toast('Could not update the employee. Try again.', 'error');
    } finally { setSaving(false); }
  };

  const saveRun = async (event) => {
    event.preventDefault();
    if (saving) return;
    const run = cleanPayRun({ ...runForm, id: editingRun || undefined });
    const problem = validatePayRun(run, employees, runs);
    if (problem) { toast(problem, 'warning'); return; }
    setSaving(true);
    try {
      await persist(employees, [...runs.filter((item) => item.id !== run.id), run]);
      setEditingRun('');
      setRunForm(emptyRun(run.employeeId, run.month, employees.find((item) => item.id === run.employeeId)?.monthlySalary));
      toast(editingRun ? 'Payslip updated' : 'Payslip generated', 'success');
    } catch {
      toast('Could not save the salary run. Try again.', 'error');
    } finally { setSaving(false); }
  };

  const editRun = (run) => {
    setEditingRun(run.id);
    setRunForm({ ...run, basic: String(run.basic), allowances: String(run.allowances), bonus: String(run.bonus), deductions: String(run.deductions), tds: String(run.tds) });
  };

  const runRows = [...runs].sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt));
  const employeeFor = (run) => employees.find((employee) => employee.id === run.employeeId);
  const field = (label, name, type = 'number', required = false) => (
    <div className="form-group" style={{ margin: 0, flex: '1 1 155px' }}>
      <label className="form-label" htmlFor={`payroll-${name}`}>{label}</label>
      <input id={`payroll-${name}`} className="form-input" type={type} min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined} required={required} value={employeeForm[name] ?? ''}
        onChange={(event) => setEmployeeForm((form) => ({ ...form, [name]: event.target.value }))} />
    </div>
  );
  const runField = (label, name, type = 'number', required = false) => (
    <div className="form-group" style={{ margin: 0, flex: '1 1 145px' }}>
      <label className="form-label" htmlFor={`payrun-${name}`}>{label}</label>
      <input id={`payrun-${name}`} className="form-input" type={type} min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined} required={required} value={runForm[name] ?? ''}
        onChange={(event) => setRunForm((form) => ({ ...form, [name]: event.target.value }))} />
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll &amp; Salary <HelpButton title="Payroll & salary" doc="payroll" size={16} /></h1>
          <p className="page-subtitle">Employee records, monthly salary runs, and printable payslips</p>
          <div style={{ marginTop: '0.6rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAttendance(true)}>
              <UserRound size={16} /> Attendance
            </button>
          </div>
        </div>
      </div>
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
        <strong>Manual tax inputs:</strong> Enter TDS and deductions yourself. Nexuzy Ledger does not calculate statutory TDS, PF, ESI, or payroll filings. Salary runs do not automatically post payments to the Cash book.
      </div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.25rem' }}>
        <div className="stat-card"><div className="stat-icon stat-icon-blue"><UserRound size={22} /></div><div><p className="stat-label">Active employees</p><h2 className="stat-value">{activeEmployees.length}</h2></div></div>
        <div className="stat-card"><div><p className="stat-label">Payslips this month</p><h2 className="stat-value">{currentMonthRuns.length}</h2></div></div>
        <div className="stat-card"><div><p className="stat-label">Net salary this month</p><h2 className="stat-value">{formatCurrency(monthlyNet)}</h2></div></div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 className="section-title">{editingEmployee ? 'Edit employee' : 'Add employee'}</h2>
        <form onSubmit={saveEmployee}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
            {field('Employee name', 'name', 'text', true)}
            {field('Employee ID', 'employeeCode', 'text')}
            {field('Designation', 'designation', 'text')}
            {field('PAN (optional)', 'pan', 'text')}
            {field('Monthly basic salary', 'monthlySalary', 'number', true)}
            <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save employee'}</button>
            {editingEmployee && <button type="button" className="btn btn-secondary" onClick={() => { setEditingEmployee(''); setEmployeeForm(emptyEmployee()); }}><X size={16} /> Cancel</button>}
          </div>
        </form>
        {employees.length > 0 && (
          <div className="table-scroll" style={{ marginTop: '1rem' }}>
            <table className="data-table">
              <thead><tr><th>Employee</th><th>ID</th><th>Designation</th><th>PAN</th><th style={{ textAlign: 'right' }}>Monthly basic</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="font-medium">{employee.name}</td><td>{employee.employeeCode || '—'}</td><td>{employee.designation || '—'}</td><td>{employee.pan || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(employee.monthlySalary)}</td><td>{employee.active === false ? 'Inactive' : 'Active'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><button type="button" className="btn btn-secondary" onClick={() => editEmployee(employee)}><Pencil size={14} /> Edit</button>{' '}
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => toggleEmployee(employee)}>{employee.active === false ? 'Reactivate' : 'Make inactive'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 className="section-title">{editingRun ? 'Edit salary run' : 'Generate monthly payslip'}</h2>
        {activeEmployees.length === 0 ? <p className="text-muted">Add an active employee before generating a payslip.</p> : (
          <form onSubmit={saveRun}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0, flex: '1 1 190px' }}>
                <label className="form-label" htmlFor="payrun-employee">Employee</label>
                <select id="payrun-employee" className="form-input" required value={runForm.employeeId}
                  onChange={(event) => {
                    const employee = employees.find((item) => item.id === event.target.value);
                    setRunForm((form) => ({ ...form, employeeId: event.target.value, basic: String(employee?.monthlySalary ?? '') }));
                  }}>
                  <option value="">Choose employee</option>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                </select>
              </div>
              {runField('Salary month', 'month', 'month', true)}
              {runField('Basic', 'basic', 'number', true)}
              {runField('Allowances', 'allowances')}
              {runField('Bonus', 'bonus')}
              {runField('Other deductions', 'deductions')}
              {runField('TDS (manual)', 'tds')}
              <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
                <label className="form-label" htmlFor="payrun-status">Payment status</label>
                <select id="payrun-status" className="form-input" value={runForm.status}
                  onChange={(event) => setRunForm((form) => ({ ...form, status: event.target.value }))}>
                  <option value="unpaid">Unpaid</option><option value="paid">Paid</option>
                </select>
              </div>
              {runForm.status === 'paid' && runField('Paid on', 'paidOn', 'date', true)}
              <div style={{ fontWeight: 700, padding: '0.65rem 0' }}>Net: {formatCurrency(netSalary(runForm))}</div>
              <button type="submit" className="btn btn-primary" disabled={saving}><Plus size={16} /> {saving ? 'Saving…' : 'Save payslip'}</button>
              {editingRun && <button type="button" className="btn btn-secondary" onClick={() => { setEditingRun(''); setRunForm(emptyRun(activeEmployees[0]?.id, thisMonth(), activeEmployees[0]?.monthlySalary)); }}><X size={16} /> Cancel</button>}
            </div>
          </form>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Salary register</h2>
          <TableExport title="Payroll salary register" filename="Payroll-register"
            headers={['Month', 'Employee', 'Basic', 'Allowances', 'Bonus', 'Deductions', 'TDS (manual)', 'Net salary', 'Status', 'Paid on']}
            rows={runRows.map((run) => [run.month, employeeFor(run)?.name || 'Employee removed', run.basic, run.allowances, run.bonus, run.deductions, run.tds, netSalary(run), run.status, run.paidOn])} />
        </div>
        {runRows.length === 0 ? <p className="text-muted">No salary runs yet. Generate a payslip above.</p> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Month</th><th>Employee</th><th style={{ textAlign: 'right' }}>Gross</th><th style={{ textAlign: 'right' }}>Deductions + TDS</th><th style={{ textAlign: 'right' }}>Net salary</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{runRows.map((run) => {
                const employee = employeeFor(run);
                const gross = Number(run.basic) + Number(run.allowances) + Number(run.bonus);
                return <tr key={run.id}>
                  <td>{monthName(run.month)}</td><td className="font-medium">{employee?.name || 'Employee removed'}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(gross)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(Number(run.deductions) + Number(run.tds))}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(netSalary(run))}</td><td>{run.status === 'paid' ? `Paid · ${run.paidOn}` : 'Unpaid'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => editRun(run)}><Pencil size={14} /> Edit</button>{' '}
                    <button type="button" className="btn btn-secondary" disabled={!employee} onClick={() => employee && openPayslip(run, employee, profile)}><Printer size={14} /> Payslip</button>
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.75rem' }}>Payroll records are saved in this app's business data and included in normal app backups.</p>

      {showAttendance && (
        <div className="modal-overlay" onClick={() => setShowAttendance(false)}>
          <div className="modal-content" style={{ maxWidth: '94vw', maxHeight: '86vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title" style={{ margin: 0 }}>Attendance</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAttendance(false)}><X size={16} /> Close</button>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Month
                <input type="month" className="form-input" style={{ marginLeft: '0.5rem' }} value={attMonth}
                  onChange={(e) => setAttMonth(e.target.value)} />
              </label>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Tap a day to cycle: Present (P) → Absent (A) → Leave (L) → blank
              </span>
            </div>
            {activeEmployees.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Add at least one employee first to mark attendance.</p>
            ) : (() => {
              const [y, m] = attMonth.split('-').map(Number);
              const days = new Date(y, m, 0).getDate();
              const dateKey = (d) => `${attMonth}-${String(d).padStart(2, '0')}`;
              return (
                <div className="table-scroll">
                  <table className="data-table" style={{ minWidth: 'max-content' }}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        {Array.from({ length: days }, (_, i) => <th key={i} style={{ padding: '4px 6px', minWidth: 28, textAlign: 'center' }}>{i + 1}</th>)}
                        <th>P</th><th>A</th><th>L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmployees.map((employee) => {
                        let pc = 0, ac = 0, lc = 0;
                        for (let d = 1; d <= days; d++) {
                          const s = attendance?.[employee.id]?.[dateKey(d)] || '';
                          if (s === 'P') pc++; else if (s === 'A') ac++; else if (s === 'L') lc++;
                        }
                        return (
                          <tr key={employee.id}>
                            <td className="font-medium">{employee.name}</td>
                            {Array.from({ length: days }, (_, i) => {
                              const d = i + 1;
                              const s = attendance?.[employee.id]?.[dateKey(d)] || '';
                              return (
                                <td key={d} style={{ padding: '2px', textAlign: 'center' }}>
                                  <button type="button"
                                    onClick={() => cycleAttendance(employee.id, dateKey(d))}
                                    title={`${employee.name} · ${dateKey(d)}: ${s || 'unmarked'}`}
                                    style={{ width: 26, height: 26, borderRadius: 4, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                      background: s === 'P' ? '#16a34a' : s === 'A' ? '#dc2626' : s === 'L' ? '#f59e0b' : 'transparent',
                                      color: s ? '#fff' : 'var(--text-muted)' }}>
                                    {s}
                                  </button>
                                </td>
                              );
                            })}
                            <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{pc}</td>
                            <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{ac}</td>
                            <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{lc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Attendance is saved per employee per day and included in app backups. It is meant as an HR record to help keep payroll accurate — it does not automatically change payslips.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
