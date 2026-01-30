import { useState } from 'preact/hooks';
import { registerPasskey, authenticatePasskey } from '../lib/auth.js';
import '../styles/auth.css';

/**
 * Authentication view with login and registration forms.
 *
 * Supports passkey-based authentication via WebAuthn. The user enters
 * a username and either registers a new passkey or authenticates with
 * an existing one. The browser handles the credential creation/assertion
 * via Touch ID, Face ID, security key, etc.
 *
 * Props:
 *   onLogin(user) - Called with the user object after successful auth
 */
export function AuthView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // 'login' or 'register' mode
  const [mode, setMode] = useState('login');

  /**
   * Handle form submission for both login and registration.
   * Delegates to the appropriate passkey flow based on current mode.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmed = username.trim();
      if (trimmed.length < 2) {
        throw new Error('Username must be at least 2 characters');
      }

      let user;
      if (mode === 'register') {
        user = await registerPasskey(trimmed);
      } else {
        user = await authenticatePasskey(trimmed);
      }

      onLogin(user);
    } catch (err) {
      // Provide user-friendly messages for common WebAuthn errors
      if (err.name === 'NotAllowedError') {
        setError('Passkey operation was cancelled or timed out.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="auth-container">
      <h1>Practice Math</h1>
      <p class="auth-subtitle">AI-powered math tutor for kids</p>

      <form onSubmit={handleSubmit} class="auth-form">
        <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>

        {error && <p class="auth-error">{error}</p>}

        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onInput={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          disabled={loading}
          autoFocus
        />

        <button type="submit" disabled={loading}>
          {loading
            ? 'Waiting for passkey...'
            : mode === 'login'
              ? 'Login with Passkey'
              : 'Register with Passkey'}
        </button>
      </form>

      <p class="auth-switch">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button class="link-button" onClick={() => { setMode('register'); setError(''); }}>
              Register here
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button class="link-button" onClick={() => { setMode('login'); setError(''); }}>
              Login here
            </button>
          </>
        )}
      </p>
    </div>
  );
}
