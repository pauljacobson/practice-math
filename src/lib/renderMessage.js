/**
 * Message rendering pipeline for bot responses.
 *
 * Ported from the Python version's chat.js. Processes raw text from
 * Claude through a multi-step pipeline:
 *
 *   1. Extract LaTeX expressions and replace with placeholders
 *      (prevents Markdown from mangling LaTeX syntax like underscores)
 *   2. Parse remaining text as Markdown via `marked`
 *   3. Sanitize HTML via DOMPurify (configured to allow KaTeX tags)
 *   4. Restore LaTeX placeholders with KaTeX-rendered HTML
 *
 * JSXGraph activation is handled separately in jsxgraph.js after
 * the rendered HTML is inserted into the DOM.
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// KaTeX is loaded from CDN in index.html (both JS and CSS),
// keeping it out of the Vite bundle (~78KB gzipped savings).
// Access it via the global window object.
const katex = window.katex;

// Configure marked for consistent output
marked.setOptions({
  breaks: false,
  gfm: true,
});

/**
 * DOMPurify configuration to allow KaTeX's generated HTML.
 * KaTeX uses inline styles, SVG elements, and MathML tags
 * that would otherwise be stripped by the sanitizer.
 */
const PURIFY_CONFIG = {
  ADD_TAGS: [
    'math', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup',
    'msub', 'mfrac', 'mspace', 'mtext', 'annotation',
    'svg', 'line', 'path', 'rect', 'circle', 'g', 'use',
    'defs', 'symbol', 'span',
  ],
  ADD_ATTR: [
    'xmlns', 'xlink:href', 'viewBox', 'width', 'height',
    'preserveAspectRatio', 'focusable', 'role', 'aria-hidden',
    'style', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'fill', 'stroke', 'stroke-width', 'transform', 'class',
  ],
};

/**
 * Extract LaTeX expressions and replace them with unique placeholders.
 *
 * Processes display math ($$...$$) first, then inline math ($...$).
 * Each expression is pre-rendered with KaTeX and stored in a map.
 * If rendering fails, the raw LaTeX is kept as fallback.
 *
 * @param {string} text - Raw text from Claude
 * @returns {{ text: string, placeholders: Object }}
 */
function extractLatex(text) {
  const placeholders = {};
  let counter = 0;

  // Display math: $$...$$ (greedy across newlines)
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
    const id = `LATEXPLACEHOLDER${counter++}END`;
    try {
      placeholders[id] = katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      placeholders[id] = match;
    }
    return id;
  });

  // Inline math: $...$ (single line, no nested $)
  text = text.replace(/\$([^\$\n]+?)\$/g, (match, latex) => {
    const id = `LATEXPLACEHOLDER${counter++}END`;
    try {
      placeholders[id] = katex.renderToString(latex.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      placeholders[id] = match;
    }
    return id;
  });

  return { text, placeholders };
}

/**
 * Restore LaTeX placeholders with their rendered KaTeX HTML.
 *
 * @param {string} html - HTML string containing placeholder IDs
 * @param {Object} placeholders - Map of placeholder ID to rendered HTML
 * @returns {string} HTML with KaTeX in place
 */
function restoreLatex(html, placeholders) {
  for (const id in placeholders) {
    // Use split+join for global replacement without regex escaping
    html = html.split(id).join(placeholders[id]);
  }
  return html;
}

/**
 * Render a bot message through the full pipeline.
 *
 * @param {string} text - Raw text from Claude
 * @returns {string} Safe, rendered HTML string
 */
export function renderBotMessage(text) {
  // Step 1: Extract LaTeX before Markdown can mangle it
  const extracted = extractLatex(text);

  // Step 2: Parse remaining text as Markdown
  const rawHtml = marked.parse(extracted.text);

  // Step 3: Sanitize the HTML
  const cleanHtml = DOMPurify.sanitize(rawHtml);

  // Step 4: Restore LaTeX placeholders with rendered KaTeX HTML
  const finalHtml = restoreLatex(cleanHtml, extracted.placeholders);

  // Final sanitize pass allowing KaTeX elements
  return DOMPurify.sanitize(finalHtml, PURIFY_CONFIG);
}
