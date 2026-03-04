/**
 * Main orchestrator for the Meta Python AST Visualizer
 */

import { setupEditor, getCode, setCode, highlightLines } from "./editor.js";
import { initPyodide, runPythonCode, parseAST } from "./pyodide-runner.js";
import { renderTree, expandAll, collapseAll } from "./ast-tree.js";
import { renderGraph, resetZoom } from "./ast-graph.js";

// DOM Elements
const runBtn = document.getElementById("run-btn");
const clearBtn = document.getElementById("clear-btn");
const exampleBtn = document.getElementById("example-btn");
const expandAllBtn = document.getElementById("expand-all-btn");
const collapseAllBtn = document.getElementById("collapse-all-btn");
const resetZoomBtn = document.getElementById("reset-zoom-btn");
const statusDot = document.querySelector(".status-dot");
const statusText = document.getElementById("status-text");
const outputEl = document.getElementById("output");
const methodCallsEl = document.getElementById("method-calls");
const attributeAccessesEl = document.getElementById("attribute-accesses");

// Tab handling
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;

    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`${tabName}-tab`).classList.add("active");
  });
});

// Example code
const EXAMPLE_CODE = `# Exemple de classe avec la métaclasse Meta
class Foo(metaclass=Meta):
    def __init__(self, x):
        self.x = x
    
    def bar(self, v):
        return (self.x, v)
    
    def increment(self):
        self.x += 1
        return self.x

# Création d'instance et appels de méthodes
a = Foo(10)
result = a.bar(20)
a.increment()
print(f"Résultat: {result}")
print(f"x après increment: {a.x}")
`;

// Initialize
let pyodideReady = false;
let debounceTimer = null;

async function init() {
  // Setup CodeMirror editor
  setupEditor(document.getElementById("editor"), EXAMPLE_CODE, onCodeChange);

  // Initialize Pyodide
  try {
    await initPyodide(updateStatus);
    pyodideReady = true;
    runBtn.disabled = false;
    updateStatus("ready", "Pyodide prêt");

    // Parse initial code
    await updateAST(EXAMPLE_CODE);
  } catch (error) {
    updateStatus("error", `Erreur: ${error.message}`);
    console.error("Failed to initialize Pyodide:", error);
  }
}

function updateStatus(state, message) {
  statusText.textContent = message;
  statusDot.classList.remove("loading", "error");

  if (state === "loading") {
    statusDot.classList.add("loading");
  } else if (state === "error") {
    statusDot.classList.add("error");
  }
}

function onCodeChange(code) {
  // Debounce AST parsing
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    if (pyodideReady) {
      await updateAST(code);
    }
  }, 300);
}

async function updateAST(code) {
  try {
    const result = await parseAST(code);

    if (result.success) {
      renderTree(document.getElementById("ast-tree"), result.ast, onNodeClick);
      renderGraph(document.getElementById("ast-graph"), result.ast);
    } else {
      // Show syntax error
      const errorMsg = `Erreur ligne ${result.error.line}: ${result.error.message}`;
      document.getElementById("ast-tree").innerHTML =
        `<div style="color: var(--accent-error); padding: 16px;">${errorMsg}</div>`;
    }
  } catch (error) {
    console.error("AST parsing error:", error);
  }
}

function onNodeClick(node) {
  if (node.lineno && node.end_lineno) {
    highlightLines(node.lineno, node.end_lineno);
  }
}

async function runCode() {
  if (!pyodideReady) return;

  const code = getCode();
  outputEl.textContent = "";
  runBtn.disabled = true;
  updateStatus("loading", "Exécution...");

  try {
    const result = await runPythonCode(code);

    // Display output
    if (result.output) {
      outputEl.textContent = result.output;
    }

    if (result.error) {
      outputEl.innerHTML += `<span class="error">\n${result.error}</span>`;
    }

    // Display debug data
    displayMethodCalls(result.debugData?.method_calls || []);
    displayAttributeAccesses(result.debugData?.attribute_accesses || []);

    updateStatus("ready", "Exécution terminée");
  } catch (error) {
    outputEl.innerHTML = `<span class="error">${error.message}</span>`;
    updateStatus("error", "Erreur d'exécution");
  } finally {
    runBtn.disabled = false;
  }
}

function displayMethodCalls(calls) {
  if (calls.length === 0) {
    methodCallsEl.innerHTML =
      '<div style="padding: 16px; color: var(--text-muted);">Aucun appel de méthode enregistré</div>';
    return;
  }

  let html = `
        <table class="debug-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Classe</th>
                    <th>Méthode</th>
                    <th>Args</th>
                    <th>Kwargs</th>
                </tr>
            </thead>
            <tbody>
    `;

  calls.forEach((call, i) => {
    html += `
            <tr>
                <td>${i + 1}</td>
                <td>${call.class}</td>
                <td><strong>${call.method}</strong></td>
                <td>${formatValue(call.args)}</td>
                <td>${formatValue(call.kwargs)}</td>
            </tr>
        `;
  });

  html += "</tbody></table>";
  methodCallsEl.innerHTML = html;
}

function displayAttributeAccesses(accesses) {
  if (accesses.length === 0) {
    attributeAccessesEl.innerHTML =
      '<div style="padding: 16px; color: var(--text-muted);">Aucun accès attribut enregistré</div>';
    return;
  }

  let html = `
        <table class="debug-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Action</th>
                    <th>Classe</th>
                    <th>Attribut</th>
                    <th>Valeur</th>
                </tr>
            </thead>
            <tbody>
    `;

  accesses.forEach((access, i) => {
    const badgeClass = access.action === "get" ? "badge-get" : "badge-set";
    html += `
            <tr>
                <td>${i + 1}</td>
                <td><span class="badge ${badgeClass}">${access.action.toUpperCase()}</span></td>
                <td>${access.class}</td>
                <td><strong>${access.attribute}</strong></td>
                <td>${formatValue(access.value)}</td>
            </tr>
        `;
  });

  html += "</tbody></table>";
  attributeAccessesEl.innerHTML = html;
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return '<span style="color: var(--text-muted)">None</span>';
  }

  if (typeof value === "object") {
    if (value.__type__ === "object") {
      return `<span style="color: var(--accent-purple)">&lt;${value.class}&gt;</span>`;
    }
    return JSON.stringify(value);
  }

  return String(value);
}

// Event Listeners
runBtn.addEventListener("click", runCode);

clearBtn.addEventListener("click", () => {
  outputEl.textContent = "";
  methodCallsEl.innerHTML = "";
  attributeAccessesEl.innerHTML = "";
});

exampleBtn.addEventListener("click", () => {
  setCode(EXAMPLE_CODE);
});

expandAllBtn.addEventListener("click", expandAll);
collapseAllBtn.addEventListener("click", collapseAll);
resetZoomBtn.addEventListener("click", resetZoom);

// Keyboard shortcut
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runCode();
  }
});

// Start the app
init();
