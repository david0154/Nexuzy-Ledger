import { useEffect, useState } from 'react';
import { useAuth } from '../utils/authContext';
import { normalizeStaffRoles, STAFF_ROLES } from '../utils/accessRoles';

function RoleCheckboxes({ value, onChange, disabled = false, label }) {
  const selected = normalizeStaffRoles(value);
  const toggle = (role, checked) => {
    if (role === 'readOnly') {
      onChange(checked ? ['readOnly'] : ['billing']);
      return;
    }
    const current = selected.filter((item) => item !== 'readOnly');
    const next = checked ? [...current, role] : current.filter((item) => item !== role);
    if (next.length) onChange(next);
  };

  return (
    <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: '4px 0 0', minWidth: 0 }}>
      <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {STAFF_ROLES.map((role) => (
          <label key={role.id} title={role.description} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={selected.includes(role.id)}
              disabled={role.id !== 'readOnly' && selected.length === 1 && selected.includes(role.id)}
              onChange={(event) => toggle(role.id, event.target.checked)} />
            {role.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

export default function AccountAccessSettings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [network, setNetwork] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newRoles, setNewRoles] = useState(['billing']);
  const [passwords, setPasswords] = useState({});
  const [roleDrafts, setRoleDrafts] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setError('');
    try {
      const [accountList, networkState] = await Promise.all([
        request('/api/auth/users'),
        request('/api/network'),
      ]);
      setUsers(accountList);
      setNetwork(networkState);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([request('/api/auth/users'), request('/api/network')])
      .then(([accountList, networkState]) => {
        if (cancelled) return;
        setUsers(accountList);
        setNetwork(networkState);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  if (user?.role !== 'admin') return null;

  const createStaff = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/api/auth/users', { method: 'POST', body: JSON.stringify({ username, password, roles: newRoles }) });
      setUsername('');
      setPassword('');
      setNewRoles(['billing']);
      setMessage('Staff account created. Share its username and password securely.');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const updateStaff = async (account, changes) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(`/api/auth/users/${encodeURIComponent(account.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      setPasswords((current) => ({ ...current, [account.id]: '' }));
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[account.id];
        return next;
      });
      setMessage('Staff account updated.');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleNetwork = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request('/api/network', {
        method: 'POST',
        body: JSON.stringify({ enabled: !network?.enabled }),
      });
      await refresh();
      setMessage(result.enabled
        ? 'Secure LAN access is on. The host computer must stay on and connected.'
        : 'LAN access is off. Other devices can no longer connect.');
    } catch (err) {
      setError(err.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const installLocalCertificate = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request('/api/network/certificate/install', { method: 'POST' });
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-panel p-6 mb-6" aria-labelledby="accounts-heading">
      <h2 id="accounts-heading" style={{ marginTop: 0 }}>Users &amp; device access</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Assign each person the sections they need. The administrator retains all access; read-only accounts can view sections but cannot change records.
      </p>

      <h3>Staff accounts</h3>
      <form onSubmit={createStaff} style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
          <label style={fieldStyle}>Username
            <input required minLength={3} maxLength={32} autoComplete="off" value={username}
              onChange={(event) => setUsername(event.target.value)} style={inputStyle} />
          </label>
          <label style={fieldStyle}>Temporary password (6–16 characters)
            <input required minLength={6} maxLength={16} type="password" autoComplete="new-password" value={password}
              onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>Add staff</button>
        </div>
        <RoleCheckboxes value={newRoles} onChange={setNewRoles} label="Access roles" />
      </form>

      <div style={{ display: 'grid', gap: 10 }}>
        {users.map((account) => (
          <div key={account.id} style={accountStyle}>
            <div style={{ minWidth: 150, flex: '1 1 170px' }}>
              <strong>{account.username}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {account.role === 'admin' ? 'Administrator' : `Staff · ${account.active ? 'Active' : 'Deactivated'}`}
              </div>
              {account.role === 'staff' && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  Roles: {normalizeStaffRoles(account.roles).map((id) => STAFF_ROLES.find((role) => role.id === id)?.label).join(', ')}
                </div>
              )}
            </div>
            {account.role === 'staff' && (
              <>
                <div style={{ flex: '1 1 100%' }}>
                  <RoleCheckboxes
                    value={roleDrafts[account.id] || account.roles}
                    onChange={(roles) => setRoleDrafts((current) => ({ ...current, [account.id]: roles }))}
                    disabled={busy || !account.active}
                    label={`Access roles for ${account.username}`}
                  />
                  {roleDrafts[account.id] && (
                    <button type="button" className="btn btn-primary" disabled={busy}
                      onClick={() => updateStaff(account, { roles: roleDrafts[account.id] })}>
                      Save roles
                    </button>
                  )}
                </div>
                <input aria-label={`New password for ${account.username}`} type="password" minLength={6} maxLength={16}
                  autoComplete="new-password" placeholder="Set new password (6–16 chars)"
                  value={passwords[account.id] || ''}
                  onChange={(event) => setPasswords((current) => ({ ...current, [account.id]: event.target.value }))}
                  style={{ ...inputStyle, flex: '1 1 220px' }} />
                <button type="button" className="btn" disabled={busy || !(passwords[account.id] || '').length}
                  onClick={() => updateStaff(account, { password: passwords[account.id] })}>Reset password</button>
                <button type="button" className="btn" disabled={busy}
                  onClick={() => updateStaff(account, { active: !account.active })}>
                  {account.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </>
            )}
          </div>
        ))}
        {!users.length && <span style={{ color: 'var(--text-muted)' }}>Loading accounts…</span>}
      </div>

      <h3 style={{ marginTop: 28 }}>Use this business on other devices</h3>
      <p>Enable HTTPS access only on a trusted local network. Staff devices connect to this host; business data remains here and internet access is not required after setup.</p>
      <button type="button" className={network?.enabled ? 'btn' : 'btn btn-primary'} disabled={busy || !network}
        onClick={toggleNetwork}>
        {busy ? 'Please wait…' : network?.enabled ? 'Turn off LAN access' : 'Enable secure LAN access'}
      </button>
      {network?.enabled && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <strong>Share the separate staff client with your team:</strong>
          <p>Download the <a href="https://github.com/david0154/Nexuzy-Ledger/releases/latest">Nexuzy Ledger Staff desktop app</a> for Windows, macOS, or Linux. Install it once, then use its desktop icon to open the staff app window, find this host, and sign in. The client does not start another business server or set up another administrator.</p>
          <p>The host name fallback is <code>{network.hostName}.local</code> on port <code>{network.port}</code>.</p>
          <strong>Network addresses (manual fallback):</strong>
          <ul>
            {network.addresses.map((address) => (
              <li key={address}><code>https://{address}:{network.port}</code></li>
            ))}
          </ul>
          {!network.addresses.length && <p>No local network address was found. Connect the host to your Wi-Fi or wired network and reload this section.</p>}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={installLocalCertificate} style={{ margin: '0 8px 10px 0' }}>
            Trust this host certificate
          </button>
          <a className="btn" href="/api/network/certificate" download style={{ display: 'inline-flex', margin: '4px 0 10px' }}>
            Download device-trust certificate
          </a>
          <ol style={{ paddingLeft: 22 }}>
            <li>On the host computer, use <strong>Trust this host certificate</strong>. Windows and macOS install it into your user certificate trust automatically after confirmation.</li>
            <li>Copy the certificate to each device and install it in that device's trusted root certificate store. This is a one-time step per device.</li>
            <li>Open the staff client, choose the discovered host (or enter its name above), and sign in with an account created here.</li>
          </ol>
          <p style={{ marginBottom: 0 }}>
            Keep the host computer on during business hours. Allow Nexuzy Ledger through the host's private-network firewall if prompted.
            A DHCP reservation for the host is recommended so its address remains stable.
          </p>
        </div>
      )}
      {message && <p role="status" style={{ color: 'var(--success, #15803d)' }}>{message}</p>}
      {error && <p role="alert" style={{ color: 'var(--danger, #b42318)' }}>{error}</p>}
    </section>
  );
}

const fieldStyle = { display: 'grid', gap: 6, flex: '1 1 220px', fontSize: 13, fontWeight: 600 };
const inputStyle = {
  boxSizing: 'border-box', width: '100%', minWidth: 0, padding: '9px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', font: 'inherit',
};
const accountStyle = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
  padding: 12, border: '1px solid var(--border)', borderRadius: 10,
};
