export const STAFF_ROLES = [
  { id: 'billing', label: 'Billing', description: 'Invoices, clients, recurring invoices and receipts' },
  { id: 'accounts', label: 'Accounts', description: 'Expenses, purchase bills, cash book and reports' },
  { id: 'inventory', label: 'Inventory', description: 'Products, stock, manufacturing and purchase orders' },
  { id: 'payroll', label: 'Payroll', description: 'Employee, attendance and payroll records' },
  { id: 'readOnly', label: 'Read-only', description: 'View business sections without changing records' },
];

const FUNCTIONAL_ROLE_IDS = STAFF_ROLES.filter(({ id }) => id !== 'readOnly').map(({ id }) => id);
const VALID_ROLE_IDS = new Set(STAFF_ROLES.map(({ id }) => id));

export function normalizeStaffRoles(roles, legacy = false) {
  if (!Array.isArray(roles)) return legacy ? [...FUNCTIONAL_ROLE_IDS] : ['billing'];
  const normalized = [...new Set(roles.filter((role) => VALID_ROLE_IDS.has(role)))];
  if (normalized.includes('readOnly')) return ['readOnly'];
  return normalized;
}

export function isValidStaffRoles(roles) {
  return Array.isArray(roles)
    && roles.length > 0
    && roles.every((role) => VALID_ROLE_IDS.has(role))
    && (roles.includes('readOnly') ? roles.length === 1 : true)
    && new Set(roles).size === roles.length;
}

export function userHasModuleAccess(user, module) {
  if (!user || user.role === 'admin') return true;
  const roles = normalizeStaffRoles(user.roles, true);
  if (roles.includes('readOnly')) return true;
  return roles.includes(module);
}

export function canOpenRoleView(user, view) {
  if (!user || user.role === 'admin') return true;
  if (view === 'settings' || view === 'controlpanel') return false;
  if (view === 'dashboard' || view === 'support' || view === 'guide') return true;
  if (view === 'new') return !normalizeStaffRoles(user.roles, true).includes('readOnly') && userHasModuleAccess(user, 'billing');
  if (['clients', 'recurring'].includes(view)) return userHasModuleAccess(user, 'billing');
  if (view === 'inventory') return userHasModuleAccess(user, 'inventory');
  if (view === 'payroll') return userHasModuleAccess(user, 'payroll');
  if (view === 'purchases') return userHasModuleAccess(user, 'accounts') || userHasModuleAccess(user, 'inventory');
  if (['expenses', 'receipts', 'cashbook', 'reports', 'filing', 'incometax'].includes(view)) {
    return userHasModuleAccess(user, 'accounts') || (view === 'receipts' && userHasModuleAccess(user, 'billing'));
  }
  return false;
}

export function requiredModuleForApiRequest(requestPath) {
  if (/^\/api\/(bills|clients|recurring)(\/|$)/.test(requestPath)) return 'billing';
  if (/^\/api\/(save-pdf|saved-pdf|trash-pdf|trash)(\/|$)/.test(requestPath)) return 'billing';
  if (/^\/api\/(products|productions|purchase-orders)(\/|$)/.test(requestPath)) return 'inventory';
  if (/^\/api\/(expenses|cash-book)(\/|$)/.test(requestPath)) return 'accounts';
  if (/^\/api\/purchases(\/|$)/.test(requestPath)) return 'accountsOrInventory';
  if (/^\/api\/receipts(\/|$)/.test(requestPath)) return 'accountsOrBilling';
  if (requestPath === '/api/meta/payroll') return 'payroll';
  if (/^\/api\/meta\/[^/]+\/increment$/.test(requestPath)) {
    return /purchase.?order|counter_PO/i.test(requestPath.split('/')[3] || '')
      ? 'inventory'
      : 'billing';
  }
  return null;
}

export function requiredReadModuleForApiRequest(requestPath) {
  if (/^\/api\/(bills|purchases|receipts)(\/|$)/.test(requestPath)) {
    if (/^\/api\/bills(\/|$)/.test(requestPath)) return 'accountsOrBilling';
    if (/^\/api\/purchases(\/|$)/.test(requestPath)) return 'accountsOrInventory';
    return 'accountsOrBilling';
  }
  if (/^\/api\/products(\/|$)/.test(requestPath)) return 'accountsOrBillingOrInventory';
  if (/^\/api\/(clients|recurring|save-pdf|saved-pdf|trash-pdf|trash)(\/|$)/.test(requestPath)) return 'billing';
  if (/^\/api\/(expenses|cash-book)(\/|$)/.test(requestPath)) return 'accounts';
  if (/^\/api\/(productions|purchase-orders)(\/|$)/.test(requestPath)) return 'inventory';
  if (requestPath === '/api/meta/payroll') return 'payroll';
  if (/^\/api\/meta\/[^/]+\/increment$/.test(requestPath)) {
    return /purchase.?order|counter_PO/i.test(requestPath.split('/')[3] || '')
      ? 'inventory'
      : 'billing';
  }
  return null;
}

export function userCanReadModule(user, module) {
  if (!user || user.role === 'admin') return true;
  const roles = normalizeStaffRoles(user.roles, true);
  if (roles.includes('readOnly')) return true;
  if (module === 'accountsOrInventory') return roles.includes('accounts') || roles.includes('inventory');
  if (module === 'accountsOrBilling') return roles.includes('accounts') || roles.includes('billing');
  if (module === 'accountsOrBillingOrInventory') {
    return roles.includes('accounts') || roles.includes('billing') || roles.includes('inventory');
  }
  return roles.includes(module);
}

export function userCanWriteModule(user, module) {
  if (!user || user.role === 'admin') return true;
  const roles = normalizeStaffRoles(user.roles, true);
  if (roles.includes('readOnly')) return false;
  if (module === 'accountsOrInventory') return roles.includes('accounts') || roles.includes('inventory');
  if (module === 'accountsOrBilling') return roles.includes('accounts') || roles.includes('billing');
  return roles.includes(module);
}
