/**
 * File upload handler.
 *
 * Accepts image uploads (PNG, JPG/JPEG), validates the file type and
 * size, converts to base64, and returns the data for inclusion in
 * the next chat message to Claude's vision API.
 *
 * Images are NOT stored on disk or R2 — they're converted to base64
 * in memory and returned to the client, which sends them back with
 * the next chat message. This avoids R2 setup while keeping the
 * architecture simple.
 */

import { jsonResponse } from '../router.js';

const ALLOWED_TYPES = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/upload
 *
 * Accepts a multipart form upload with a single 'file' field.
 * Validates the file type and size, converts to base64, and
 * returns the data ready for Claude's vision API.
 *
 * Response: { base64: string, mediaType: string, filename: string }
 */
export async function handleUpload(request, env, session) {
  console.log(`[upload] Upload request from user=${session.username}`);
  const contentType = request.headers.get('Content-Type') || '';

  if (!contentType.includes('multipart/form-data')) {
    console.log('[upload] Rejected: not multipart/form-data');
    return jsonResponse({ error: 'Expected multipart/form-data' }, 400);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error('[upload] Failed to parse form data:', err.message);
    return jsonResponse({ error: 'Invalid form data' }, 400);
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    console.log('[upload] Rejected: no file in form data');
    return jsonResponse({ error: 'No file provided' }, 400);
  }

  console.log(`[upload] File received: name="${file.name}" type="${file.type}" size=${file.size}`);

  // Validate file type
  const mediaType = ALLOWED_TYPES[file.type];
  if (!mediaType) {
    console.log(`[upload] Rejected: invalid file type "${file.type}"`);
    return jsonResponse(
      { error: 'Invalid file type. Only PNG and JPG images are allowed.' },
      400
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    console.log(`[upload] Rejected: file too large (${file.size} bytes)`);
    return jsonResponse({ error: 'File too large. Maximum size is 5MB.' }, 400);
  }

  // Convert to base64 for Claude's vision API
  const arrayBuffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  console.log(`[upload] Converted to base64: ${base64.length} chars, mediaType=${mediaType}`);

  return jsonResponse({
    base64,
    mediaType,
    filename: file.name,
  });
}

/**
 * Convert an ArrayBuffer to a base64-encoded string.
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
