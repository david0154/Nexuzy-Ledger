import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../utils/authContext';

async function authRequest(path, body) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not complete the request.');
  return result;
}

export default function AccountGate({ children }) {
  const [status, setStatus] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const loadStatus = async () => {
    setError('');
    try {
      const response = await fetch('/api/auth/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('The local server did not respond.');
      setStatus(await response.json());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/auth/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('The local server did not respond.');
        const nextStatus = await response.json();
        if (!cancelled) setStatus(nextStatus);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    checkStatus();
    return () => { cancelled = true; };
  }, []);
  const signedInUserId = status?.user?.id;
  const signedInRole = status?.user?.role;
  useEffect(() => {
    if (signedInUserId) window.dispatchEvent(new CustomEvent('nexuzy-authenticated', { detail: { role: signedInRole } }));
  }, [signedInUserId, signedInRole]);
  const finishSignIn = async (event) => {
    event.preventDefault();
    setError('');
    if (status?.setupRequired && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const result = await authRequest(status?.setupRequired ? 'setup' : 'login', { username, password });
      setStatus({ setupRequired: false, authRequired: true, user: result.user });
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await authRequest('logout', {});
      window.dispatchEvent(new Event('nexuzy-unauthenticated'));
      setStatus((current) => ({ ...current, user: null }));
      setPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const result = await authRequest('password', { currentPassword, newPassword });
      setStatus((current) => ({ ...current, user: result.user }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!status || status.setupRequired || (status.authRequired && !status.user)) {
    const setup = status?.setupRequired;
    return (
      <main style={pageStyle}>
        <form onSubmit={finishSignIn} style={cardStyle}>
          <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden="true">📒</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Nexuzy Ledger</h1>
          <p style={{ margin: '0 0 24px', color: 'var(--text-muted)' }}>
            {!status ? 'Connecting to the business server…' : setup
              ? 'Create the administrator account for this business. Do this on the host computer.'
              : 'Sign in with the account created by your administrator.'}
          </p>
          {status && (
            <>
              <label style={labelStyle} htmlFor="account-username">Username</label>
              <input id="account-username" autoComplete="username" required minLength={3} maxLength={32}
                value={username} onChange={(event) => setUsername(event.target.value)} style={inputStyle} />
              <label style={labelStyle} htmlFor="account-password">Password</label>
              <input id="account-password" type="password" autoComplete={setup ? 'new-password' : 'current-password'}
                required minLength={setup ? 6 : 1} maxLength={setup ? 16 : 128}
                value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
              {setup && (
                <>
                  <label style={labelStyle} htmlFor="account-confirm-password">Confirm password</label>
                  <input id="account-confirm-password" type="password" autoComplete="new-password" required minLength={6} maxLength={16}
                    value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={inputStyle} />
                  <small style={{ display: 'block', margin: '-4px 0 16px', color: 'var(--text-muted)' }}>
                    Use 6–16 characters. Passwords are stored as salted hashes.
                  </small>
                </>
              )}
              {error && <p role="alert" style={errorStyle}>{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                {busy ? 'Please wait…' : setup ? 'Create administrator' : 'Sign in'}
              </button>
            </>
          )}
          {!status && error && <p role="alert" style={errorStyle}>{error}</p>}
          {!status && <button type="button" className="btn" onClick={loadStatus} style={{ width: '100%', justifyContent: 'center' }}>Try again</button>}
        </form>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={{
      user: status.user,
      logout,
      openChangePassword: () => { setError(''); setShowPasswordForm(true); },
    }}>
      {children}
      {error && <div role="alert" style={floatingErrorStyle}>{error}</div>}
      {showPasswordForm && (
        <div style={dialogOverlayStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPasswordForm(false); }}>
          <form onSubmit={changePassword} style={dialogStyle}>
            <h2 style={{ marginTop: 0 }}>Change password</h2>
            <label style={labelStyle} htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" autoComplete="current-password" required maxLength={128}
              value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} style={inputStyle} />
            <label style={labelStyle} htmlFor="new-password">New password (6–16 characters)</label>
            <input id="new-password" type="password" autoComplete="new-password" required minLength={6} maxLength={16}
              value={newPassword} onChange={(event) => setNewPassword(event.target.value)} style={inputStyle} />
            <label style={labelStyle} htmlFor="confirm-new-password">Confirm new password</label>
            <input id="confirm-new-password" type="password" autoComplete="new-password" required minLength={6} maxLength={16}
              value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} style={inputStyle} />
            {error && <p role="alert" style={errorStyle}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'end', gap: 8, marginTop: 18 }}>
              <button type="button" className="btn" onClick={() => setShowPasswordForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
            </div>
          </form>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function AccountSessionMenu() {
  const { user, logout, openChangePassword } = useContext(AuthContext);
  if (!user) return null;

  const closeMenu = (event) => {
    event.currentTarget.closest('details').open = false;
  };
  return (
    <details className="account-session">
      <summary aria-label={`Account: ${user.username}`}>
        <span className="account-session-avatar" aria-hidden="true">{user.username.charAt(0).toUpperCase()}</span>
        <span className="account-session-label">
          <strong>{user.username}</strong>
          <small>{user.role === 'admin' ? 'Administrator' : 'Staff account'}</small>
        </span>
        <span className="account-session-chevron" aria-hidden="true">⌃</span>
      </summary>
      <div className="account-session-menu">
        <button type="button" onClick={(event) => {
          closeMenu(event);
          openChangePassword();
        }}>Change password</button>
        <button type="button" onClick={(event) => {
          closeMenu(event);
          logout();
        }}>Sign out</button>
      </div>
    </details>
  );
}

const pageStyle = {
  minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20,
  background: 'var(--bg, #f3f5f9)', color: 'var(--text, #172033)', fontFamily: 'Inter, sans-serif',
};
const cardStyle = {
  width: 'min(100%, 420px)', padding: 28, borderRadius: 16,
  background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #dce1ea)',
  boxShadow: '0 18px 55px rgba(15, 23, 42, .12)',
};
const labelStyle = { display: 'block', margin: '14px 0 6px', fontWeight: 600, fontSize: 14 };
const inputStyle = {
  boxSizing: 'border-box', width: '100%', padding: '11px 12px', borderRadius: 8,
  border: '1px solid var(--border, #cbd5e1)', background: 'var(--bg, #fff)', color: 'inherit', font: 'inherit',
};
const errorStyle = { color: '#b42318', background: '#fef3f2', padding: 10, borderRadius: 8, fontSize: 14 };
const floatingErrorStyle = { position: 'fixed', bottom: 12, right: 12, zIndex: 10001, padding: 12, background: '#fef3f2', color: '#b42318', borderRadius: 8 };
const dialogOverlayStyle = { position: 'fixed', inset: 0, zIndex: 10002, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15, 23, 42, .55)' };
const dialogStyle = { ...cardStyle, maxHeight: '90vh', overflowY: 'auto' };
