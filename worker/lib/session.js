/**
 * Session management using Cloudflare KV.
 *
 * Sessions are stored in the SESSIONS KV namespace as JSON blobs,
 * keyed by a random token. The token is sent to the client as a
 * cookie named "session".
 *
 * KV TTL is set to 7 days — sessions expire automatically.
 */

const SESSION_COOKIE = 'session';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Create a new session for a user and return a Set-Cookie header value.
 *
 * Generates a cryptographically random token, stores the session data
 * in KV, and returns both the token and the cookie header string.
 */
export async function createSession(env, userId, username) {
  const token = generateToken();
  const sessionData = { userId, username, createdAt: Date.now() };

  await env.SESSIONS.put(token, JSON.stringify(sessionData), {
    expirationTtl: SESSION_TTL,
  });

  const cookie = `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}`;
  return { token, cookie };
}

/**
 * Retrieve the session data for the current request.
 *
 * Reads the session token from the cookie header, looks it up in KV,
 * and returns the parsed session data or null if invalid/expired.
 */
export async function getSession(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = parseCookie(cookieHeader, SESSION_COOKIE);

  if (!token) return null;

  const data = await env.SESSIONS.get(token);
  if (!data) return null;

  return { ...JSON.parse(data), token };
}

/**
 * Destroy a session by deleting it from KV and returning an
 * expired Set-Cookie header to clear the client cookie.
 */
export async function destroySession(env, token) {
  await env.SESSIONS.delete(token);
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Generate a 32-byte random hex token using Web Crypto API.
 */
function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse a specific cookie value from a Cookie header string.
 */
function parseCookie(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}
