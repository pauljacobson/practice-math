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
