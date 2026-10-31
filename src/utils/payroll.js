const r2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const MAX_AMOUNT = 1e11;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;

const isValidDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3]);
};

export const payrollBusinessKey = (profile) => {
  const gstin = String(profile?.gstin || '').trim().toUpperCase();
  if (gstin) return `gstin:${gstin}`;
  const name = String(profile?.businessName || '').trim().toLowerCase();
  return name ? `name:${name}` : 'unassigned';
};

export const netSalary = (run) => r2(
  Number(run?.basic) + Number(run?.allowances) + Number(run?.bonus)
  - Number(run?.deductions) - Number(run?.tds),
);

export function validateEmployee(employee) {
  if (!employee || typeof employee !== 'object' || Array.isArray(employee)) return 'Enter employee details';
  if (!String(employee.name || '').trim()) return 'Employee name is required';
  if (String(employee.name).trim().length > 120) return 'Employee name must be 120 characters or fewer';
  if (String(employee.employeeCode || '').trim().length > 40) return 'Employee ID must be 40 characters or fewer';
  if (String(employee.designation || '').trim().length > 100) return 'Designation must be 100 characters or fewer';
  const pan = String(employee.pan || '').trim().toUpperCase();
  if (pan && !PAN.test(pan)) return 'Enter a valid PAN or leave it blank';
  const salary = Number(employee.monthlySalary);
  if (!Number.isFinite(salary) || salary < 0 || salary > MAX_AMOUNT) return 'Enter a valid monthly salary';
  return '';
}

export function validatePayRun(run, employees, existingRuns = []) {
  if (!run || typeof run !== 'object' || Array.isArray(run)) return 'Enter the pay-run details';
  if (!employees.some((employee) => employee.id === run.employeeId)) return 'Choose an employee';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(run.month || ''))) return 'Choose a valid salary month';
  if (existingRuns.some((item) => item.id !== run.id && item.employeeId === run.employeeId && item.month === run.month)) {
    return 'A payslip already exists for this employee and month';
  }
  for (const field of ['basic', 'allowances', 'bonus', 'deductions', 'tds']) {
    const amount = Number(run[field]);
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) return `Enter a valid ${field} amount`;
  }
  if (netSalary(run) < 0) return 'Deductions and TDS cannot exceed gross salary';
  if (run.status !== 'paid' && run.status !== 'unpaid') return 'Choose whether this salary is paid';
  if (run.status === 'paid' && !isValidDate(run.paidOn)) return 'Enter a valid payment date';
  return '';
}

export const cleanEmployee = (employee) => ({
  id: String(employee.id || `emp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`),
  employeeCode: String(employee.employeeCode || '').trim(),
  name: String(employee.name || '').trim(),
  designation: String(employee.designation || '').trim(),
  pan: String(employee.pan || '').trim().toUpperCase(),
  monthlySalary: r2(employee.monthlySalary),
  active: employee.active !== false,
});

export const cleanPayRun = (run) => ({
  id: String(run.id || `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`),
  employeeId: String(run.employeeId),
  month: String(run.month),
  basic: r2(run.basic),
  allowances: r2(run.allowances),
  bonus: r2(run.bonus),
  deductions: r2(run.deductions),
  tds: r2(run.tds),
  status: run.status,
  paidOn: run.status === 'paid' ? String(run.paidOn || '') : '',
  createdAt: String(run.createdAt || new Date().toISOString()),
});
