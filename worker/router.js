import { handleRegisterChallenge, handleRegisterVerify, handleLoginChallenge, handleLoginVerify, handleLogout, handleMe } from './handlers/auth.js';
import { handleChatMessage, handleChatHistory, handleNewConversation, handleClearConversations } from './handlers/chat.js';
import { handleUpload } from './handlers/upload.js';
import { getSession } from './lib/session.js';

/**
 * Simple pathname + method router for the Cloudflare Worker.
 *
 * Matches incoming requests to handler functions based on HTTP method
 * and URL pathname. ~10 endpoints don't justify a routing framework.
 *
 * Auth-protected routes check for a valid session before proceeding.
 * The session user is attached to the request context for handlers to use.
 */
export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;
  const start = Date.now();

  console.log(`[router] ${method} ${pathname}`);

  // --- CSRF protection: validate Origin on mutating requests ---
  // Browsers always send the Origin header on cross-origin requests.
  // If present and not in our allowlist, reject the request.
  if (method !== 'GET' && method !== 'OPTIONS') {
    const origin = request.headers.get('Origin');
    if (origin) {
      const allowed = [env.WEBAUTHN_ORIGIN, 'http://localhost:5173'].filter(Boolean);
      if (!allowed.includes(origin)) {
        console.log(`[router] ${method} ${pathname} -> 403 (origin ${origin} not allowed)`);
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
    }
  }

  // --- Public auth routes ---
  if (method === 'POST' && pathname === '/api/auth/register/challenge') {
    return handleRegisterChallenge(request, env);
  }
  if (method === 'POST' && pathname === '/api/auth/register/verify') {
    return handleRegisterVerify(request, env);
  }
  if (method === 'POST' && pathname === '/api/auth/login/challenge') {
    return handleLoginChallenge(request, env);
  }
  if (method === 'POST' && pathname === '/api/auth/login/verify') {
    return handleLoginVerify(request, env);
  }

  // --- Session check route (no auth required, returns null if not logged in) ---
  if (method === 'GET' && pathname === '/api/auth/me') {
    return handleMe(request, env);
  }

  // --- Protected routes: require valid session ---
  const session = await getSession(request, env);
  if (!session) {
    console.log(`[router] ${method} ${pathname} -> 401 (no session)`);
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  console.log(`[router] Authenticated user=${session.username} (id=${session.userId})`);

  // --- Strict CSRF for authenticated routes: require valid Origin ---
  // All browser POST requests include Origin. Session cookies are only
  // sent by browsers, so missing Origin on a cookie-authenticated route
  // is suspicious — reject it.
  if (method !== 'GET' && method !== 'OPTIONS') {
    const origin = request.headers.get('Origin');
    const allowed = [env.WEBAUTHN_ORIGIN, 'http://localhost:5173'].filter(Boolean);
    if (!origin || !allowed.includes(origin)) {
      console.log(`[router] ${method} ${pathname} -> 403 (origin ${origin || 'missing'} not allowed)`);
      return jsonResponse({ error: 'Forbidden' }, 403);
    }
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    return handleLogout(request, env, session);
  }
  if (method === 'POST' && pathname === '/api/chat/message') {
    return handleChatMessage(request, env, session);
  }
  if (method === 'GET' && pathname === '/api/chat/history') {
    return handleChatHistory(request, env, session);
  }
  if (method === 'POST' && pathname === '/api/chat/new') {
    return handleNewConversation(request, env, session);
  }
  if (method === 'POST' && pathname === '/api/chat/clear') {
    return handleClearConversations(request, env, session);
  }
  if (method === 'POST' && pathname === '/api/upload') {
    return handleUpload(request, env, session);
  }

  console.log(`[router] ${method} ${pathname} -> 404 (no matching route)`);
  return jsonResponse({ error: 'Not found' }, 404);
}

/**
 * Helper to create a JSON response with appropriate headers.
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
