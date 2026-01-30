/**
 * JSXGraph code block activation with sandboxed execution.
 *
 * Finds fenced code blocks marked as `language-jsxgraph` in rendered
 * Markdown and replaces them with live, interactive JSXGraph boards.
 *
 * SECURITY: Although JSXGraph code comes from Claude API responses
 * (not direct user input), prompt injection could theoretically
 * manipulate Claude into emitting malicious code. The sandbox
 * mitigates this by:
 *
 *   1. Validating the code against a blocklist of dangerous patterns
 *      (fetch, XMLHttpRequest, eval, document.cookie, import, etc.)
 *   2. Executing in a scope where dangerous globals are shadowed
 *      with undefined — the function only has access to `boardId`,
 *      `JXG`, and `Math`
 *   3. Limiting code length to prevent overly complex payloads
 *
 * This is defense-in-depth: the system prompt also instructs Claude
 * to only emit JSXGraph geometry code, but we don't rely on that alone.
 */

// Counter for generating unique board container IDs
let boardCounter = 0;

// Maximum allowed length for JSXGraph code blocks
const MAX_CODE_LENGTH = 5000;

/**
 * Patterns that should never appear in legitimate JSXGraph geometry code.
 * Each entry has a regex and a human-readable label for error messages.
 */
const BLOCKED_PATTERNS = [
  // Network access
  { pattern: /\bfetch\s*\(/, label: 'fetch()' },
  { pattern: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, label: 'WebSocket' },
  { pattern: /\bnavigator\b/, label: 'navigator' },
  { pattern: /\bBeacon\b/, label: 'Beacon' },

  // Dynamic code execution
  { pattern: /\beval\s*\(/, label: 'eval()' },
  { pattern: /\bFunction\s*\(/, label: 'Function()' },
  { pattern: /\bsetTimeout\s*\(/, label: 'setTimeout()' },
  { pattern: /\bsetInterval\s*\(/, label: 'setInterval()' },

  // DOM / document access
  { pattern: /\bdocument\b/, label: 'document' },
  { pattern: /\bwindow\b/, label: 'window' },
  { pattern: /\bglobalThis\b/, label: 'globalThis' },
  { pattern: /\bself\b/, label: 'self' },
  { pattern: /\bparent\b/, label: 'parent' },
  { pattern: /\btop\b/, label: 'top' },
  { pattern: /\bframes\b/, label: 'frames' },

  // Storage / cookies
  { pattern: /\bcookie\b/, label: 'cookie' },
  { pattern: /\blocalStorage\b/, label: 'localStorage' },
  { pattern: /\bsessionStorage\b/, label: 'sessionStorage' },
  { pattern: /\bindexedDB\b/, label: 'indexedDB' },

  // Module loading
  { pattern: /\bimport\s*\(/, label: 'import()' },
  { pattern: /\brequire\s*\(/, label: 'require()' },

  // Prototype pollution
  { pattern: /__proto__/, label: '__proto__' },
  { pattern: /\bconstructor\s*\[/, label: 'constructor[]' },
  { pattern: /\bprototype\b/, label: 'prototype' },
];

/**
 * Validate JSXGraph code against the blocklist.
 * Returns null if safe, or an error message string if blocked.
 *
 * @param {string} code - The JSXGraph code to validate
 * @returns {string|null} Error message or null if valid
 */
function validateCode(code) {
  if (code.length > MAX_CODE_LENGTH) {
    return `Code block too long (${code.length} chars, max ${MAX_CODE_LENGTH})`;
  }

  for (const { pattern, label } of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return `Blocked pattern detected: ${label}`;
    }
  }

  return null;
}

/**
 * Find all jsxgraph code blocks in a DOM element and replace them
 * with live interactive JSXGraph boards.
 *
 * Marked renders fenced code blocks as <pre><code class="language-jsxgraph">.
 * This function finds those elements, validates and executes the code
 * in a sandboxed scope with dangerous globals shadowed.
 *
 * @param {HTMLElement} element - The DOM element containing rendered message HTML
 */
export function activateJsxGraphBlocks(element) {
  // JXG is loaded as a global script in index.html
  const JXG = window.JXG;
  if (!JXG) return;

  const codeBlocks = element.querySelectorAll('code.language-jsxgraph');

  for (const codeEl of codeBlocks) {
    const pre = codeEl.parentElement; // The <pre> wrapper
    const jsxCode = codeEl.textContent;

    // Create a container div for the board
    const boardId = `jsxgraph-board-${boardCounter++}`;
    const container = document.createElement('div');
    container.id = boardId;
    container.className = 'jsxgraph-container';

    // Replace the <pre> block with the board container
    pre.parentNode.replaceChild(container, pre);

    // Step 1: Validate code against blocklist
    const blockReason = validateCode(jsxCode);
    if (blockReason) {
      container.textContent = `Diagram blocked: ${blockReason}`;
      container.className = 'jsxgraph-error';
      console.warn('JSXGraph code blocked:', blockReason);
      continue;
    }

    // Step 2: Execute in a sandboxed scope.
    // The function parameters shadow dangerous globals with undefined,
    // so even if code references `window` or `document` it gets nothing.
    // Only boardId, JXG, and Math are provided as usable values.
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(
        'boardId', 'JXG', 'Math',
        // Shadow dangerous globals by declaring them as parameters set to undefined
        'window', 'document', 'globalThis', 'self', 'top', 'parent', 'frames',
        'fetch', 'XMLHttpRequest', 'WebSocket', 'navigator',
        'eval', 'Function', 'setTimeout', 'setInterval',
        'localStorage', 'sessionStorage', 'indexedDB',
        'importScripts', 'postMessage',
        jsxCode
      );
      fn(
        boardId, JXG, Math,
        // All shadowed globals receive undefined
        undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        undefined, undefined
      );
    } catch (e) {
      container.textContent = `Diagram error: ${e.message}`;
      container.className = 'jsxgraph-error';
    }
  }
}
