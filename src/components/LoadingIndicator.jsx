/**
 * Loading indicator shown while waiting for Claude's response.
 *
 * Displays a pulsing "Thinking..." message. Only visible when
 * the assistant is generating a response.
 *
 * Props:
 *   visible - Whether to show the indicator
 */
export function LoadingIndicator({ visible }) {
  if (!visible) return null;

  return (
    <div class="loading-indicator">
      <span class="loading-dots">Thinking</span>
    </div>
  );
}
