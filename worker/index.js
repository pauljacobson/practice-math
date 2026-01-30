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
    // Add CORS headers for development (Vite on :5173 -> Worker on :8787)
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    try {
      const response = await handleRequest(request, env, ctx);
      // Add CORS headers to all responses
      const headers = corsHeaders(origin);
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
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Build CORS headers that allow the frontend origin.
 * In production these would be locked down to the actual domain.
 */
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}
