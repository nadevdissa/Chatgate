import { useState } from 'react';
import { useChat } from '../context/ChatContext';

export default function AuthScreen({ active }) {
  const {
    authStatus,
    showReset,
    resetUsername,
    handleLogin,
    handleResetPassword,
  } = useChat();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (event) => {
    event.preventDefault();
    handleLogin(username.trim(), password);
  };

  return (
    <section className={`screen auth-screen${active ? ' active' : ''}`}>
      <div className="glass-card">
        <div className="brand-panel">
          <div className="brand-icon small">💬</div>
          <div>
            <h1>ChatGate</h1>
            <p>Sign in with a username and password, then chat instantly.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="loginUsername">Username</label>
            <input
              id="loginUsername"
              type="text"
              placeholder="Choose a username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="loginPassword">Password</label>
            <input
              id="loginPassword"
              type="password"
              placeholder="Create a password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="btn primary">
            Enter Chat
          </button>
        </form>

        <div className="auth-footer">
          <span className="hint">Accounts are saved on the server so anyone can join and chat.</span>
          <span
            className="status-text"
            style={{ color: authStatus.isError ? '#f6a5c0' : '#c5d5ff' }}
          >
            {authStatus.message}
          </span>
          {showReset && (
            <div className="login-reset" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn secondary small"
                onClick={() => handleResetPassword(resetUsername || username.trim(), password)}
              >
                Reset password for this user
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
