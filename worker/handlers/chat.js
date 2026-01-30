/**
 * Chat request handlers for the AI tutor.
 *
 * Manages conversations and messages in D1, streams Claude responses
 * as Server-Sent Events, and enforces a 50-message history limit.
 */

import { jsonResponse } from '../router.js';
import {
  getOrCreateConversation,
  startNewConversation,
  clearAllConversations,
  getMessages,
  addMessage,
} from '../lib/db.js';
import { streamChatResponse, buildMessages } from '../lib/claude.js';

const MAX_HISTORY = 50;
const MAX_MESSAGE_LENGTH = 5000; // Characters per message

/**
 * POST /api/chat/message
 *
 * Receives a user message, stores it, builds conversation context,
 * streams a response from Claude, stores the assistant reply, and
 * returns the full response as SSE.
 *
 * Request body: { content: string, imageData?: { base64, mediaType } }
 * Response: text/event-stream with JSON events
 */
export async function handleChatMessage(request, env, session) {
  const { content, imageData } = await request.json();
  console.log(`[chat] Message from user=${session.username}: "${content?.slice(0, 100)}${content?.length > 100 ? '...' : ''}" (${content?.length || 0} chars)${imageData ? ' +image' : ''}`);

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.log('[chat] Message rejected: empty content');
    return jsonResponse({ error: 'Message content is required' }, 400);
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    console.log(`[chat] Message rejected: too long (${content.length} chars)`);
    return jsonResponse(
      { error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.` },
      400
    );
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[chat] ANTHROPIC_API_KEY not configured');
    return jsonResponse({ error: 'API key not configured' }, 500);
  }

  // Get or create the active conversation for this user
  const conversation = await getOrCreateConversation(env.DB, session.userId);
  console.log(`[chat] Conversation id=${conversation.id} for user=${session.userId}`);

  // Store the user message
  await addMessage(env.DB, conversation.id, 'user', content.trim());

  // Fetch conversation history for context (limited to MAX_HISTORY)
  const history = await getMessages(env.DB, conversation.id, MAX_HISTORY);
  console.log(`[chat] History: ${history.length} messages, sending to Claude`);

  // Build messages array for Claude API (exclude the last user message
  // since buildMessages adds it separately with optional image data)
  const historyWithoutLast = history.slice(0, -1);
  const messages = buildMessages(historyWithoutLast, content.trim(), imageData || null);

  // Create the SSE stream from Claude
  const stream = streamChatResponse(apiKey, messages);

  // We need to capture the full response text to store it in the DB.
  // Wrap the stream to intercept the 'done' event.
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  // Process the stream in the background, storing the response when done
  const processStream = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Forward data to the client
        await writer.write(value);

        // Check for done event to capture full text
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'done' && event.fullText) {
                // Store assistant response in DB
                await addMessage(env.DB, conversation.id, 'assistant', event.fullText);
                console.log(`[chat] Response stored: ${event.fullText.length} chars for conversation=${conversation.id}`);
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (err) {
      console.error('Stream processing error:', err);
    } finally {
      await writer.close();
    }
  };

  // Start processing without awaiting (runs in background)
  processStream();

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * GET /api/chat/history
 *
 * Returns the messages for the user's active conversation.
 */
export async function handleChatHistory(request, env, session) {
  const conversation = await getOrCreateConversation(env.DB, session.userId);
  const messages = await getMessages(env.DB, conversation.id, MAX_HISTORY);
  console.log(`[chat] History loaded: ${messages.length} messages for user=${session.username} conversation=${conversation.id}`);

  return jsonResponse({ messages });
}

/**
 * POST /api/chat/new
 *
 * Deactivates the current conversation and creates a fresh one.
 * The old conversation and its messages remain in the database
 * but are no longer active.
 */
export async function handleNewConversation(request, env, session) {
  console.log(`[chat] New conversation for user=${session.username}`);
  await startNewConversation(env.DB, session.userId);
  return jsonResponse({ ok: true });
}

/**
 * POST /api/chat/clear
 *
 * Permanently deletes all conversations and messages for the user.
 */
export async function handleClearConversations(request, env, session) {
  console.log(`[chat] Clearing all conversations for user=${session.username}`);
  await clearAllConversations(env.DB, session.userId);
  return jsonResponse({ ok: true });
}
