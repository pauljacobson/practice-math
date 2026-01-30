/**
 * Database helper functions wrapping D1 queries.
 *
 * All functions take the D1 binding (env.DB) as the first argument.
 * This keeps the database layer decoupled from handler logic.
 */

// ---- Users ----

export async function createUser(db, username) {
  const result = await db
    .prepare('INSERT INTO users (username) VALUES (?) RETURNING id, username, created_at')
    .bind(username)
    .first();
  return result;
}

export async function getUserByUsername(db, username) {
  return db
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
}

export async function getUserById(db, id) {
  return db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first();
}

// ---- Passkey Credentials ----

export async function saveCredential(db, userId, credentialId, publicKey, counter, transports) {
  await db
    .prepare(
      'INSERT INTO passkey_credentials (user_id, credential_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(userId, credentialId, publicKey, counter, transports ? JSON.stringify(transports) : null)
    .run();
}

export async function getCredentialByCredentialId(db, credentialId) {
  return db
    .prepare('SELECT * FROM passkey_credentials WHERE credential_id = ?')
    .bind(credentialId)
    .first();
}

export async function getCredentialsByUserId(db, userId) {
  const { results } = await db
    .prepare('SELECT * FROM passkey_credentials WHERE user_id = ?')
    .bind(userId)
    .all();
  return results;
}

export async function updateCredentialCounter(db, credentialId, newCounter) {
  await db
    .prepare('UPDATE passkey_credentials SET counter = ? WHERE credential_id = ?')
    .bind(newCounter, credentialId)
    .run();
}

// ---- Conversations ----

/**
 * Get or create the active conversation for a user.
 * Each user has at most one active conversation at a time.
 */
export async function getOrCreateConversation(db, userId) {
  // Try to find existing active conversation
  let convo = await db
    .prepare('SELECT * FROM conversations WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1')
    .bind(userId)
    .first();

  if (!convo) {
    convo = await db
      .prepare('INSERT INTO conversations (user_id) VALUES (?) RETURNING *')
      .bind(userId)
      .first();
  }

  return convo;
}

/**
 * Deactivate all conversations for a user and create a fresh one.
 */
export async function startNewConversation(db, userId) {
  await db
    .prepare('UPDATE conversations SET is_active = 0 WHERE user_id = ? AND is_active = 1')
    .bind(userId)
    .run();

  return db
    .prepare('INSERT INTO conversations (user_id) VALUES (?) RETURNING *')
    .bind(userId)
    .first();
}

/**
 * Delete all conversations (and their messages via CASCADE) for a user.
 */
export async function clearAllConversations(db, userId) {
  await db
    .prepare('DELETE FROM conversations WHERE user_id = ?')
    .bind(userId)
    .run();
}

// ---- Messages ----

/**
 * Get messages for a conversation, limited to the most recent MAX_HISTORY.
 */
export async function getMessages(db, conversationId, limit = 50) {
  const { results } = await db
    .prepare(
      'SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC LIMIT ?'
    )
    .bind(conversationId, limit)
    .all();
  return results;
}

/**
 * Add a message to a conversation.
 */
export async function addMessage(db, conversationId, role, content) {
  await db
    .prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
    .bind(conversationId, role, content)
    .run();
}
