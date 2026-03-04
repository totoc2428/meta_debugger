/**
 * CodeMirror 6 Editor Setup
 */

import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorState } from "@codemirror/state";

let editorView = null;
let onChangeCallback = null;

/**
 * Setup the CodeMirror editor
 * @param {HTMLElement} container - Container element
 * @param {string} initialCode - Initial code content
 * @param {Function} onChange - Callback for code changes
 */
export function setupEditor(container, initialCode, onChange) {
  onChangeCallback = onChange;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && onChangeCallback) {
      onChangeCallback(update.state.doc.toString());
    }
  });

  const state = EditorState.create({
    doc: initialCode,
    extensions: [
      basicSetup,
      python(),
      oneDark,
      updateListener,
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14px",
        },
        ".cm-scroller": {
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        },
        ".cm-content": {
          padding: "12px 0",
        },
        ".cm-line": {
          padding: "0 12px",
        },
        ".cm-gutters": {
          backgroundColor: "#282a36",
          borderRight: "1px solid #45475a",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#313244",
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(69, 71, 90, 0.3)",
        },
        ".cm-selectionBackground": {
          backgroundColor: "rgba(137, 180, 250, 0.3) !important",
        },
        "&.cm-focused .cm-selectionBackground": {
          backgroundColor: "rgba(137, 180, 250, 0.3) !important",
        },
        ".cm-highlight-line": {
          backgroundColor: "rgba(166, 227, 161, 0.2)",
        },
      }),
    ],
  });

  editorView = new EditorView({
    state,
    parent: container,
  });

  return editorView;
}

/**
 * Get the current code
 * @returns {string}
 */
export function getCode() {
  if (!editorView) return "";
  return editorView.state.doc.toString();
}

/**
 * Set the code content
 * @param {string} code
 */
export function setCode(code) {
  if (!editorView) return;

  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: code,
    },
  });
}

/**
 * Highlight lines in the editor
 * @param {number} startLine - Start line (1-based)
 * @param {number} endLine - End line (1-based)
 */
export function highlightLines(startLine, endLine) {
  if (!editorView) return;

  const doc = editorView.state.doc;

  // Convert 1-based line numbers to 0-based
  const start = startLine - 1;
  const end = Math.min(endLine, doc.lines);

  // Get positions
  const startPos = doc.line(start + 1).from;
  const endPos = doc.line(end).to;

  // Scroll into view and select
  editorView.dispatch({
    selection: { anchor: startPos, head: endPos },
    scrollIntoView: true,
  });

  editorView.focus();
}

/**
 * Get the editor view instance
 * @returns {EditorView}
 */
export function getEditorView() {
  return editorView;
}
