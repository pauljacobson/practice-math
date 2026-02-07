import { handleRequest } from './router.js';

/**
 * Cloudflare Worker entry point.
 *
 * All incoming requests are delegated to the router, which matches
 * the request method + pathname to the appropriate handler.
 * The env object provides access to D1 (DB), KV (SESSIONS),
 * and environment variables (ANTHROPIC_API_KEY, etc.).
 */
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: buildHeaders(origin, env),
      });
    }

    try {
      const response = await handleRequest(request, env, ctx);
      // Merge handler headers with CORS + security headers
      const headers = buildHeaders(origin, env);
      for (const [key, value] of response.headers.entries()) {
        headers[key] = value;
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...buildHeaders(origin, env), 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Build the set of allowed origins for CORS validation.
 * Uses WEBAUTHN_ORIGIN from env (set per environment) plus localhost for dev.
 */
function getAllowedOrigins(env) {
  return [env.WEBAUTHN_ORIGIN, 'http://localhost:5173'].filter(Boolean);
}

/**
 * Build response headers: CORS (origin-validated) + standard security headers.
 *
 * CORS headers are only included if the request origin is in the allowlist.
 * Security headers are always included on every response.
 */
function buildHeaders(origin, env) {
  const allowed = getAllowedOrigins(env);
  const headers = {
    // Always include Vary: Origin so caches distinguish by origin
    'Vary': 'Origin',
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // CSP: allow self + jsDelivr CDN for scripts/styles, blob: for sandboxed JSXGraph iframes
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self'; frame-src blob:",
  };

  // Only grant CORS access to allowed origins
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}
