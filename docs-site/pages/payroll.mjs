const ui = (s) => `<span class="ui">${s}</span>`;

export default [
{
  slug: 'payroll',
  title: 'Payroll & salary',
  lead: 'Keep employee records, prepare a monthly salary run, mark a salary paid or unpaid, and print or export payslips.',
  body: `
<section id="employee-records">
<h2>Employee records</h2>
<p>Open ${ui('Payroll')} from the sidebar. Add the employee name, optional employee ID, designation, optional PAN and monthly basic salary. Mark a person inactive when they leave; past salary runs remain available.</p>
<p>Payroll data is kept separately for the selected business and is included in the app's normal backup and restore.</p>
</section>
<section id="salary-run">
<h2>Monthly salary and payslips</h2>
<p>Choose an employee and salary month, then enter basic salary, allowances, bonus, other deductions and TDS. Net salary is gross pay less deductions and TDS. One payslip per employee per month is allowed; edit the existing run to correct it.</p>
<p>Mark the run paid and enter its payment date only after payment. This status is a payroll record; it does not create a cash-book transaction. Record the payment separately in the Cash book if applicable.</p>
<p>Use ${ui('Payslip')} to print or save a PDF. Use ${ui('Excel')} or ${ui('CSV')} on the salary register to export payroll rows.</p>
</section>
<section id="tax-limitations">
<h2>Tax and statutory limits</h2>
<p>TDS and other deductions are manually entered. The app does not calculate income-tax withholding, PF, ESI, professional tax, gratuity, statutory forms or payroll filings. Check amounts and applicable law with your payroll professional before paying employees or filing returns. Payslips are operational records, not statutory certificates.</p>
</section>
`,
},
];
