import { useRef, useEffect } from 'preact/hooks';
import { MessageBubble } from './MessageBubble.jsx';

/**
 * Scrollable list of chat messages.
 *
 * Auto-scrolls to the bottom when new messages arrive or
 * when streaming content updates.
 *
 * Props:
 *   messages - Array of { role, content } message objects
 *   streamingContent - Current partial content of the streaming message (or null)
 */
export function MessageList({ messages, streamingContent }) {
  const listRef = useRef(null);

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <ul ref={listRef} class="message-list">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          role={msg.role}
          content={msg.content}
          streaming={false}
        />
      ))}

      {/* Show the in-progress streaming message */}
      {streamingContent !== null && (
        <MessageBubble
          role="assistant"
          content={streamingContent}
          streaming={true}
        />
      )}
    </ul>
  );
}
