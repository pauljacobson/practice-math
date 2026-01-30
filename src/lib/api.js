/**
 * API client for communicating with the Cloudflare Worker backend.
 *
 * All requests include credentials (cookies) for session auth.
 * JSON responses are automatically parsed; errors throw with
 * the server's error message.
 */

const BASE = '/api';

/**
 * Make a JSON request to the API.
 *
 * @param {string} path - API path (e.g. '/auth/login/challenge')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If the response is not ok
 */
async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle non-JSON responses (like SSE streams)
  const contentType = res.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res;
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

// ---- Auth endpoints ----

export function getMe() {
  return request('/auth/me');
}

export function registerChallenge(username) {
  return request('/auth/register/challenge', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function registerVerify(challengeId, response) {
  return request('/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, response }),
  });
}

export function loginChallenge(username) {
  return request('/auth/login/challenge', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function loginVerify(challengeId, response, userId) {
  return request('/auth/login/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, response, userId }),
  });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

// ---- Chat endpoints ----

/**
 * Send a message and return the raw Response for SSE streaming.
 * The caller reads the stream via response.body.getReader().
 */
export function sendMessage(content, imageData = null) {
  return fetch(`${BASE}/chat/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, imageData }),
  });
}

export function getChatHistory() {
  return request('/chat/history');
}

export function newConversation() {
  return request('/chat/new', { method: 'POST' });
}

export function clearConversations() {
  return request('/chat/clear', { method: 'POST' });
}

// ---- Upload ----

/**
 * Upload an image file. Uses FormData rather than JSON
 * since we're sending binary data.
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}
