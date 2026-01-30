/**
 * WebAuthn / Passkey utilities wrapping @simplewebauthn/server.
 *
 * Provides functions to generate registration and authentication
 * challenges, and to verify the browser's responses. Uses the
 * Web Crypto API (available in Cloudflare Workers) rather than
 * Node.js crypto.
 *
 * Challenge state is stored temporarily in KV (SESSIONS namespace)
 * with a short TTL, keyed by a challenge ID sent to the client.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const CHALLENGE_TTL = 300; // 5 minutes for challenge expiry

/**
 * Generate registration options for a new passkey.
 *
 * Creates a WebAuthn registration challenge and stores it in KV
 * so it can be verified when the client responds.
 *
 * @param {Object} env - Worker env bindings (SESSIONS KV, WEBAUTHN_* vars)
 * @param {string} username - The username being registered
 * @param {Array} existingCredentials - Any existing credentials to exclude
 * @returns {{ options: Object, challengeId: string }}
 */
export async function generateRegOptions(env, username, existingCredentials = []) {
  const options = await generateRegistrationOptions({
    rpName: env.WEBAUTHN_RP_NAME,
    rpID: env.WEBAUTHN_RP_ID,
    userName: username,
    attestationType: 'none',
    // Exclude existing credentials so the user doesn't register the same key twice
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credential_id,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store the challenge in KV for later verification
  const challengeId = crypto.randomUUID();
  await env.SESSIONS.put(
    `challenge:${challengeId}`,
    JSON.stringify({ challenge: options.challenge, username }),
    { expirationTtl: CHALLENGE_TTL }
  );

  return { options, challengeId };
}

/**
 * Verify a registration response from the browser.
 *
 * Retrieves the stored challenge from KV, verifies the response
 * against it, and returns the verification result.
 *
 * @param {Object} env - Worker env bindings
 * @param {string} challengeId - The challenge ID from the registration step
 * @param {Object} response - The browser's attestation response
 * @returns {{ verified: boolean, registrationInfo: Object, username: string }}
 */
export async function verifyRegResponse(env, challengeId, response) {
  const stored = await env.SESSIONS.get(`challenge:${challengeId}`);
  if (!stored) {
    throw new Error('Challenge expired or not found');
  }

  const { challenge, username } = JSON.parse(stored);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: env.WEBAUTHN_ORIGIN,
    expectedRPID: env.WEBAUTHN_RP_ID,
  });

  // Clean up the used challenge
  await env.SESSIONS.delete(`challenge:${challengeId}`);

  return { ...verification, username };
}

/**
 * Generate authentication options for logging in with a passkey.
 *
 * If credentials are provided (username-based flow), they're included
 * as allowCredentials. Otherwise, the browser will prompt for any
 * discoverable credential (usernameless flow).
 *
 * @param {Object} env - Worker env bindings
 * @param {Array} credentials - Optional list of allowed credentials
 * @returns {{ options: Object, challengeId: string }}
 */
export async function generateAuthOptions(env, credentials = []) {
  const options = await generateAuthenticationOptions({
    rpID: env.WEBAUTHN_RP_ID,
    userVerification: 'preferred',
    allowCredentials: credentials.map((cred) => ({
      id: cred.credential_id,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
  });

  const challengeId = crypto.randomUUID();
  await env.SESSIONS.put(
    `challenge:${challengeId}`,
    JSON.stringify({ challenge: options.challenge }),
    { expirationTtl: CHALLENGE_TTL }
  );

  return { options, challengeId };
}

/**
 * Verify an authentication response from the browser.
 *
 * Looks up the stored challenge, finds the matching credential,
 * and verifies the assertion.
 *
 * @param {Object} env - Worker env bindings
 * @param {string} challengeId - The challenge ID from the auth step
 * @param {Object} response - The browser's assertion response
 * @param {Object} credential - The stored credential record from DB
 * @returns {{ verified: boolean, authenticationInfo: Object }}
 */
export async function verifyAuthResponse(env, challengeId, response, credential) {
  const stored = await env.SESSIONS.get(`challenge:${challengeId}`);
  if (!stored) {
    throw new Error('Challenge expired or not found');
  }

  const { challenge } = JSON.parse(stored);

  // v10 uses `authenticator` with { credentialID, credentialPublicKey, counter, transports }
  // (v11+ uses `credential` with { id, publicKey, counter, transports })
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: env.WEBAUTHN_ORIGIN,
    expectedRPID: env.WEBAUTHN_RP_ID,
    authenticator: {
      credentialID: credential.credential_id,
      credentialPublicKey: base64URLToUint8Array(credential.public_key),
      counter: credential.counter,
      transports: credential.transports ? JSON.parse(credential.transports) : undefined,
    },
  });

  // Clean up the used challenge
  await env.SESSIONS.delete(`challenge:${challengeId}`);

  return verification;
}

/**
 * Convert a base64url-encoded string to a Uint8Array.
 * Needed because D1 stores the public key as a base64url string.
 */
function base64URLToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
