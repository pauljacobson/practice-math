/**
 * Authentication request handlers for passkey-based WebAuthn.
 *
 * Supports two flows:
 *   1. Registration: User picks a username, browser creates a passkey,
 *      server verifies and stores the credential.
 *   2. Login: User provides username, browser signs a challenge with
 *      the stored passkey, server verifies and creates a session.
 *
 * Sessions are managed via httpOnly cookies backed by KV storage.
 */

import { jsonResponse } from '../router.js';
import { createUser, getUserByUsername, saveCredential, getCredentialsByUserId, getCredentialByCredentialId, updateCredentialCounter } from '../lib/db.js';
import { generateRegOptions, verifyRegResponse, generateAuthOptions, verifyAuthResponse } from '../lib/passkey.js';
import { createSession, getSession, destroySession } from '../lib/session.js';

/**
 * POST /api/auth/register/challenge
 *
 * Start passkey registration. Takes a username, checks it's not already
 * taken, and generates WebAuthn registration options for the browser.
 */
export async function handleRegisterChallenge(request, env) {
  const { username } = await request.json();
  console.log(`[auth] Register challenge requested for username="${username}"`);

  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    console.log('[auth] Register challenge rejected: username too short');
    return jsonResponse({ error: 'Username must be at least 2 characters' }, 400);
  }

  const existing = await getUserByUsername(env.DB, username.trim());
  if (existing) {
    console.log(`[auth] Register challenge rejected: username "${username}" already taken`);
    return jsonResponse({ error: 'Registration failed' }, 400);
  }

  const { options, challengeId } = await generateRegOptions(env, username.trim());
  console.log(`[auth] Register challenge created: challengeId=${challengeId}`);

  return jsonResponse({ options, challengeId });
}

/**
 * POST /api/auth/register/verify
 *
 * Complete passkey registration. Verifies the browser's attestation
 * response, creates the user in D1, stores the credential, and
 * creates a session.
 */
export async function handleRegisterVerify(request, env) {
  const { challengeId, response } = await request.json();
  console.log(`[auth] Register verify for challengeId=${challengeId}`);

  if (!challengeId || !response) {
    console.log('[auth] Register verify rejected: missing challengeId or response');
    return jsonResponse({ error: 'Missing challengeId or response' }, 400);
  }

  let verification;
  try {
    verification = await verifyRegResponse(env, challengeId, response);
  } catch (err) {
    console.error('[auth] Register verify failed:', err.message);
    return jsonResponse({ error: err.message }, 400);
  }

  if (!verification.verified || !verification.registrationInfo) {
    console.log('[auth] Register verification did not pass');
    return jsonResponse({ error: 'Registration verification failed' }, 400);
  }

  const { registrationInfo, username } = verification;

  // Create user in database
  const user = await createUser(env.DB, username);
  console.log(`[auth] User created: id=${user.id} username="${username}"`);

  // Store the credential — public key as base64url string for portability.
  // v13 nests credential data under registrationInfo.credential
  const { credential: cred } = registrationInfo;
  const pubKeyBase64 = uint8ArrayToBase64URL(cred.publicKey);
  await saveCredential(
    env.DB,
    user.id,
    cred.id,
    pubKeyBase64,
    cred.counter,
    cred.transports || ['internal']
  );
  console.log(`[auth] Credential stored for user=${user.id} credentialID=${cred.id}`);

  // Create session and return user info
  const session = await createSession(env, user.id, user.username);
  console.log(`[auth] Session created for user=${user.id}`);

  return new Response(JSON.stringify({ user: { id: user.id, username: user.username } }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': session.cookie,
    },
  });
}

/**
 * POST /api/auth/login/challenge
 *
 * Start passkey authentication. Takes a username, looks up stored
 * credentials, and generates WebAuthn authentication options.
 */
export async function handleLoginChallenge(request, env) {
  const { username } = await request.json();
  console.log(`[auth] Login challenge requested for username="${username}"`);

  if (!username || typeof username !== 'string') {
    console.log('[auth] Login challenge rejected: missing username');
    return jsonResponse({ error: 'Username is required' }, 400);
  }

  const user = await getUserByUsername(env.DB, username.trim());
  if (!user) {
    console.log(`[auth] Login challenge rejected: user "${username}" not found`);
    return jsonResponse({ error: 'Invalid username or passkey' }, 400);
  }

  const credentials = await getCredentialsByUserId(env.DB, user.id);
  if (credentials.length === 0) {
    console.log(`[auth] Login challenge rejected: no passkeys for user=${user.id}`);
    return jsonResponse({ error: 'Invalid username or passkey' }, 400);
  }

  const { options, challengeId } = await generateAuthOptions(env, credentials);
  console.log(`[auth] Login challenge created: challengeId=${challengeId} user=${user.id} credentials=${credentials.length}`);

  return jsonResponse({ options, challengeId, userId: user.id });
}

/**
 * POST /api/auth/login/verify
 *
 * Complete passkey authentication. Verifies the browser's assertion
 * response against the stored credential, updates the counter, and
 * creates a session.
 */
export async function handleLoginVerify(request, env) {
  const { challengeId, response, userId } = await request.json();
  console.log(`[auth] Login verify for challengeId=${challengeId} userId=${userId}`);

  if (!challengeId || !response || !userId) {
    console.log('[auth] Login verify rejected: missing required fields');
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  // Find the credential that was used for this assertion
  const credential = await getCredentialByCredentialId(env.DB, response.id);
  if (!credential || credential.user_id !== userId) {
    console.log(`[auth] Login verify rejected: credential not found for response.id=${response.id}`);
    return jsonResponse({ error: 'Credential not found' }, 400);
  }

  let verification;
  try {
    verification = await verifyAuthResponse(env, challengeId, response, credential);
  } catch (err) {
    console.error('[auth] Login verify failed:', err.message);
    return jsonResponse({ error: err.message }, 400);
  }

  if (!verification.verified) {
    console.log('[auth] Login verification did not pass');
    return jsonResponse({ error: 'Authentication failed' }, 400);
  }

  console.log(`[auth] Login verified for userId=${userId}`);

  // Update the credential counter to prevent replay attacks
  await updateCredentialCounter(
    env.DB,
    credential.credential_id,
    verification.authenticationInfo.newCounter
  );

  // Look up the user for the session
  const { getUserById } = await import('../lib/db.js');
  const user = await getUserById(env.DB, userId);

  const session = await createSession(env, user.id, user.username);

  return new Response(JSON.stringify({ user: { id: user.id, username: user.username } }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': session.cookie,
    },
  });
}

/**
 * POST /api/auth/logout
 *
 * Destroy the current session and clear the cookie.
 */
export async function handleLogout(request, env, session) {
  console.log(`[auth] Logout for user=${session.username} (id=${session.userId})`);
  const cookie = await destroySession(env, session.token);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
}

/**
 * GET /api/auth/me
 *
 * Return the current session user, or null if not authenticated.
 * Used by the frontend to check auth state on page load.
 */
export async function handleMe(request, env) {
  const session = await getSession(request, env);

  if (!session) {
    return jsonResponse({ user: null });
  }

  return jsonResponse({ user: { id: session.userId, username: session.username } });
}

/**
 * Convert a Uint8Array to a base64url-encoded string.
 */
function uint8ArrayToBase64URL(uint8Array) {
  const binary = String.fromCharCode(...uint8Array);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
