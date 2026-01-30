import { useRef, useEffect } from 'preact/hooks';
import { renderBotMessage } from '../lib/renderMessage.js';
import { activateJsxGraphBlocks } from '../lib/jsxgraph.js';

/**
 * Individual message bubble in the chat.
 *
 * User messages are rendered as plain text for safety.
 * Assistant messages go through the full rendering pipeline:
 * LaTeX extraction -> Markdown -> DOMPurify -> KaTeX restore -> JSXGraph.
 *
 * SECURITY: Assistant message HTML is sanitized by DOMPurify in
 * renderBotMessage() before being set via innerHTML. DOMPurify is
 * configured to allow only KaTeX math rendering tags and attributes.
 *
 * Props:
 *   role - 'user' or 'assistant'
 *   content - The message text
 *   streaming - Whether this message is still being streamed
 */
export function MessageBubble({ role, content, streaming }) {
  const ref = useRef(null);

  // After rendering assistant messages, activate any JSXGraph blocks.
  // Only runs when streaming is complete (content finalized).
  useEffect(() => {
    if (role === 'assistant' && ref.current && !streaming) {
      activateJsxGraphBlocks(ref.current);
    }
  }, [content, streaming, role]);

  if (role === 'user') {
    return (
      <li class="user-message">
        {content}
      </li>
    );
  }

  // Render assistant message through the LaTeX/Markdown/DOMPurify pipeline.
  // Content is sanitized by DOMPurify in renderBotMessage() — safe for innerHTML.
  const html = renderBotMessage(content);

  return (
    <li
      ref={ref}
      class={`bot-message${streaming ? ' streaming' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
