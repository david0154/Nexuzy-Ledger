import assert from 'node:assert/strict';
import { cleanEmployee, cleanPayRun, netSalary, payrollBusinessKey, validateEmployee, validatePayRun } from '../src/utils/payroll.js';

const employee = cleanEmployee({
  id: 'e1', name: 'Asha Rao', employeeCode: 'E-01', pan: 'ABCDE1234F', monthlySalary: 30000,
});
assert.equal(validateEmployee(employee), '');
assert.equal(validateEmployee({ ...employee, pan: 'INVALID' }), 'Enter a valid PAN or leave it blank');
assert.equal(payrollBusinessKey({ gstin: '27ABCDE1234F1Z5', businessName: 'Shop' }), 'gstin:27ABCDE1234F1Z5');
assert.equal(payrollBusinessKey({ businessName: '  My Shop ' }), 'name:my shop');

const run = cleanPayRun({
  employeeId: 'e1', month: '2026-11', basic: 30000, allowances: 2000, bonus: 500,
  deductions: 1000, tds: 250, status: 'paid', paidOn: '2026-11-30',
});
assert.equal(netSalary(run), 31250);
assert.equal(validatePayRun(run, [employee]), '');
assert.match(validatePayRun({ ...run, month: '2026-13' }, [employee]), /month/);
assert.match(validatePayRun(run, [employee], [{ ...run, id: 'another' }]), /already exists/);
assert.match(validatePayRun({ ...run, tds: 40000 }, [employee]), /cannot exceed/);
assert.match(validatePayRun({ ...run, status: 'paid', paidOn: '' }, [employee]), /payment date/);
assert.match(validatePayRun({ ...run, paidOn: '2026-02-30' }, [employee]), /valid payment date/);
assert.equal(validatePayRun({ ...run, employeeId: 'missing' }, [employee]), 'Choose an employee');

console.log('Payroll helper tests passed.');
