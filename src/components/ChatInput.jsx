import { useState, useRef } from 'preact/hooks';

/**
 * Chat input area with text field and send button.
 *
 * Supports sending messages with Enter key (Shift+Enter for newline).
 * Input is disabled while a response is streaming.
 *
 * Props:
 *   onSend(text) - Called with the message text when the user sends
 *   disabled - Whether the input should be disabled (e.g. during streaming)
 */
export function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setText('');

    // Re-focus the input after sending
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e) {
    // Send on Enter, allow Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div class="chat-input-area">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onInput={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a math question..."
        disabled={disabled}
        autoFocus
      />
      <button onClick={handleSend} disabled={disabled || !text.trim()}>
        Send
      </button>
    </div>
  );
}
