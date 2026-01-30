/**
 * Client-side passkey authentication using @simplewebauthn/browser.
 *
 * Wraps the WebAuthn browser API via simplewebauthn to handle the
 * two-step challenge/verify flow for both registration and login.
 *
 * Each flow:
 *   1. Request challenge options from the server
 *   2. Use the browser's WebAuthn API to create/get a credential
 *   3. Send the result back to the server for verification
 */

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { registerChallenge, registerVerify, loginChallenge, loginVerify } from './api.js';

/**
 * Register a new passkey for the given username.
 *
 * 1. Requests registration options from the server
 * 2. Prompts the user to create a passkey (Touch ID, security key, etc.)
 * 3. Sends the attestation response back for verification
 *
 * @param {string} username - The desired username
 * @returns {Promise<Object>} The authenticated user object
 * @throws {Error} If registration fails at any step
 */
export async function registerPasskey(username) {
  console.log(`[auth] Starting registration for "${username}"`);

  // Step 1: Get challenge from server
  const { options, challengeId } = await registerChallenge(username);
  console.log(`[auth] Registration challenge received: challengeId=${challengeId}`);

  // Step 2: Create credential via browser WebAuthn API
  // v10 API takes options directly (v11+ uses { optionsJSON: options })
  console.log('[auth] Prompting browser for passkey creation...');
  const attestation = await startRegistration(options);
  console.log('[auth] Passkey created, verifying with server...');

  // Step 3: Send attestation to server for verification
  const result = await registerVerify(challengeId, attestation);
  console.log(`[auth] Registration complete: user=${result.user?.username}`);

  return result.user;
}

/**
 * Authenticate with an existing passkey.
 *
 * 1. Requests authentication options from the server
 * 2. Prompts the user to authenticate with their passkey
 * 3. Sends the assertion response back for verification
 *
 * @param {string} username - The username to authenticate as
 * @returns {Promise<Object>} The authenticated user object
 * @throws {Error} If authentication fails at any step
 */
export async function authenticatePasskey(username) {
  console.log(`[auth] Starting authentication for "${username}"`);

  // Step 1: Get challenge from server
  const { options, challengeId, userId } = await loginChallenge(username);
  console.log(`[auth] Auth challenge received: challengeId=${challengeId} userId=${userId}`);

  // Step 2: Authenticate via browser WebAuthn API
  // v10 API takes options directly (v11+ uses { optionsJSON: options })
  console.log('[auth] Prompting browser for passkey assertion...');
  const assertion = await startAuthentication(options);
  console.log('[auth] Passkey asserted, verifying with server...');

  // Step 3: Send assertion to server for verification
  const result = await loginVerify(challengeId, assertion, userId);
  console.log(`[auth] Login complete: user=${result.user?.username}`);

  return result.user;
}
