import { useState, useEffect } from 'preact/hooks';
import { AuthView } from './components/AuthView.jsx';
import { ChatView } from './components/ChatView.jsx';
import { getMe } from './lib/api.js';

/**
 * Root application component.
 *
 * Manages authentication state and routes between the auth view
 * (login/register) and the chat view (AI tutor interface).
 *
 * On mount, checks for an existing session via /api/auth/me.
 * If authenticated, shows the chat; otherwise shows auth.
 */
export function App() {
  // null = loading, false = not authenticated, object = authenticated user
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if the user has an active session
    getMe()
      .then((data) => setUser(data.user || false))
      .catch(() => setUser(false));
  }, []);

  // Show nothing while checking auth status
  if (user === null) {
    return <div class="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <AuthView onLogin={setUser} />;
  }

  return (
    <ChatView
      user={user}
      onLogout={() => setUser(false)}
    />
  );
}
