/**
 * JSXGraph code block activation with iframe-sandboxed execution.
 *
 * Finds fenced code blocks marked as `language-jsxgraph` in rendered
 * Markdown and replaces them with live, interactive JSXGraph boards
 * running inside sandboxed iframes.
 *
 * SECURITY: AI-generated JSXGraph code executes inside an iframe with
 * sandbox="allow-scripts" (no allow-same-origin). This gives the
 * iframe a unique opaque origin, so it cannot:
 *   - Access the parent page's DOM, cookies, or localStorage
 *   - Make same-origin requests to the app's API
 *   - Escape to the parent window in any way
 *
 * This is a true browser-enforced security boundary — no blocklist
 * or scope-shadowing tricks needed.
 */

// Counter for generating unique board container IDs
let boardCounter = 0;

// Default board dimensions (matches .jsxgraph-container CSS)
const BOARD_WIDTH = 400;
const BOARD_HEIGHT = 400;

/**
 * Build the self-contained HTML document that runs inside the sandbox iframe.
 *
 * The iframe loads JSXGraph from CDN, then listens for a postMessage
 * containing the code to execute. After execution, it posts back
 * either a resize event (with the board's rendered height) or an
 * error message.
 *
 * NOTE: The dynamic code execution in this template is intentionally
 * placed inside a sandboxed iframe (sandbox="allow-scripts", no
 * allow-same-origin). The iframe runs in an opaque origin with no
 * access to the parent page's DOM, cookies, storage, or network
 * context. This is the security boundary itself.
 *
 * @returns {string} Complete HTML document as a string
 */
function buildSandboxHTML() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsxgraph@1.11.1/distrib/jsxgraph.css"
      integrity="sha384-RMSPB2Be9wH/n5AI3PnFHmhJqFC+SgENIO12LT5G44DKGFC9QQwrHDw8c0Yso+2e"
      crossorigin="anonymous">
<style>
  html, body { margin: 0; padding: 0; overflow: hidden; }
  #board { width: ${BOARD_WIDTH}px; height: ${BOARD_HEIGHT}px; }
  .error { padding: 10px; color: #dc3545; font-style: italic; font-family: sans-serif; }
</style>
</head>
<body>
<div id="board"></div>
<script src="https://cdn.jsdelivr.net/npm/jsxgraph@1.11.1/distrib/jsxgraphcore.js"
        integrity="sha384-bnP6bjDf7JdwCa3dyHVQwAJzu+cmbZTukREdxWSaWy8QpBTr3/kmkf2C/5XfPAQA"
        crossorigin="anonymous"><\/script>
<script>
window.addEventListener('message', function(event) {
  if (!event.data || !event.data.code) return;
  try {
    // Dynamic execution is safe here: this runs inside a sandboxed
    // iframe with an opaque origin (no access to parent page)
    var fn = (0, Function)('boardId', 'JXG', 'Math', event.data.code);
    fn('board', JXG, Math);
    parent.postMessage({
      type: 'resize',
      id: event.data.id,
      height: document.body.scrollHeight
    }, '*');
  } catch (err) {
    // Show error inside the sandboxed iframe (safe — opaque origin)
    var el = document.getElementById('board');
    el.textContent = 'Diagram error: ' + err.message;
    el.className = 'error';
    parent.postMessage({
      type: 'error',
      id: event.data.id,
      message: err.message
    }, '*');
  }
});
<\/script>
</body>
</html>`;
}

/**
 * Find all jsxgraph code blocks in a DOM element and replace them
 * with live interactive JSXGraph boards running in sandboxed iframes.
 *
 * Marked renders fenced code blocks as <pre><code class="language-jsxgraph">.
 * This function finds those elements, creates a sandbox iframe for each,
 * and sends the code to execute via postMessage.
 *
 * @param {HTMLElement} element - The DOM element containing rendered message HTML
 */
export function activateJsxGraphBlocks(element) {
  const codeBlocks = element.querySelectorAll('code.language-jsxgraph');

  for (const codeEl of codeBlocks) {
    const pre = codeEl.parentElement; // The <pre> wrapper
    const jsxCode = codeEl.textContent;

    // Create a container div for the iframe
    const boardId = `jsxgraph-board-${boardCounter++}`;
    const container = document.createElement('div');
    container.id = boardId;
    container.className = 'jsxgraph-container';

    // Replace the <pre> block with the container
    pre.parentNode.replaceChild(container, pre);

    // Build the sandbox iframe from a blob URL
    const sandboxHTML = buildSandboxHTML();
    const blob = new Blob([sandboxHTML], { type: 'text/html' });
    const blobURL = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    // sandbox="allow-scripts" without allow-same-origin: the iframe gets
    // a unique opaque origin and cannot access the parent's DOM/cookies/APIs
    iframe.sandbox = 'allow-scripts';
    iframe.src = blobURL;
    iframe.style.width = `${BOARD_WIDTH}px`;
    iframe.style.height = `${BOARD_HEIGHT}px`;
    iframe.style.border = 'none';
    iframe.style.display = 'block';

    // Listen for messages from this iframe (resize or error)
    const messageHandler = (event) => {
      if (!event.data || event.data.id !== boardId) return;

      if (event.data.type === 'resize') {
        // Adjust iframe height to match rendered content
        iframe.style.height = `${event.data.height}px`;
      }
      // Error display is handled inside the iframe itself
    };
    window.addEventListener('message', messageHandler);

    // Once the iframe loads, send the JSXGraph code to execute
    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage({ code: jsxCode, id: boardId }, '*');
      // Clean up the blob URL after the iframe has loaded
      URL.revokeObjectURL(blobURL);
    });

    container.appendChild(iframe);
  }
}
