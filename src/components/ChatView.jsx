import { useState, useEffect, useCallback } from 'preact/hooks';
import { MessageList } from './MessageList.jsx';
import { ChatInput } from './ChatInput.jsx';
import { FileUpload } from './FileUpload.jsx';
import { LoadingIndicator } from './LoadingIndicator.jsx';
import { sendMessage, getChatHistory, newConversation, clearConversations, logout } from '../lib/api.js';
import '../styles/chat.css';

/**
 * Main chat view — the AI tutor interface.
 *
 * Manages conversation state, sends messages to the backend,
 * and processes the streaming SSE response from Claude.
 *
 * The streaming flow:
 *   1. User sends a message
 *   2. Frontend POSTs to /api/chat/message
 *   3. Backend streams SSE events (delta, done, error)
 *   4. Frontend accumulates deltas into streamingContent
 *   5. On 'done', streamingContent moves to the messages array
 *
 * Props:
 *   user - The authenticated user object { id, username }
 *   onLogout - Called when the user logs out
 */
export function ChatView({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [streamingContent, setStreamingContent] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [error, setError] = useState('');

  // Load conversation history on mount
  useEffect(() => {
    console.log('[chat] Loading conversation history...');
    getChatHistory()
      .then((data) => {
        const msgs = data.messages || [];
        console.log(`[chat] History loaded: ${msgs.length} messages`);
        setMessages(msgs);
      })
      .catch((err) => {
        console.error('[chat] Failed to load history:', err.message);
        setError(err.message);
      });
  }, []);

  /**
   * Send a message and process the streaming response.
   *
   * Reads the SSE stream line by line, accumulating text deltas
   * into the streaming content state. On completion, the full
   * message is added to the messages array.
   */
  const handleSend = useCallback(async (text) => {
    console.log(`[chat] Sending message: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"${pendingImage ? ' +image' : ''}`);
    setError('');
    setIsStreaming(true);

    // Add user message to the local state immediately
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Start streaming content as empty
    setStreamingContent('');

    try {
      const response = await sendMessage(text, pendingImage);

      // Clear pending image after sending
      setPendingImage(null);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error(`[chat] API error: ${response.status}`, errData);
        throw new Error(errData.error || `Request failed: ${response.status}`);
      }

      console.log('[chat] Stream started, reading response...');

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'delta') {
              fullText += event.text;
              setStreamingContent(fullText);
            }

            if (event.type === 'done') {
              // Move complete message from streaming to messages array
              const finalText = event.fullText || fullText;
              console.log(`[chat] Response complete: ${finalText.length} chars`);
              setStreamingContent(null);
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: finalText },
              ]);
            }

            if (event.type === 'error') {
              console.error('[chat] Stream error event:', event.error);
              throw new Error(event.error);
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      console.error('[chat] Send failed:', err.message);
      setError(err.message);
      setStreamingContent(null);
    } finally {
      setIsStreaming(false);
    }
  }, [pendingImage]);

  /**
   * Start a new conversation — clears the active conversation
   * on the server and resets local state.
   */
  async function handleNewConversation() {
    console.log('[chat] Starting new conversation');
    try {
      await newConversation();
      setMessages([]);
      setStreamingContent(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  /**
   * Handle logout — destroy session and notify parent.
   */
  async function handleLogout() {
    console.log('[chat] Logging out');
    try {
      await logout();
    } catch (err) {
      console.warn('[chat] Logout request failed (proceeding anyway):', err.message);
    }
    onLogout();
  }

  /**
   * Called by FileUpload when an image is ready to be sent.
   * Stores the base64 data so it's included in the next message.
   */
  function handleImageReady(imageData) {
    setPendingImage(imageData);
  }

  return (
    <div class="chat-wrapper">
      <header class="chat-header">
        <h2>Practice Math - AI Tutor</h2>
        <div class="chat-header-actions">
          <button onClick={handleNewConversation} disabled={isStreaming}>
            New Conversation
          </button>
          <button onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div class="chat-container">
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
        />

        <LoadingIndicator visible={isStreaming && streamingContent === ''} />

        {error && <p class="chat-error">{error}</p>}

        <ChatInput onSend={handleSend} disabled={isStreaming} />

        <FileUpload
          onImageReady={handleImageReady}
          disabled={isStreaming}
          hasPending={!!pendingImage}
        />
      </div>
    </div>
  );
}
