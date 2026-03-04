/**
 * AST Tree View Component
 */

let treeContainer = null;
let nodeClickCallback = null;

/**
 * Render the AST as an interactive tree
 * @param {HTMLElement} container - Container element
 * @param {object} ast - AST object from parser
 * @param {Function} onNodeClick - Callback when node is clicked
 */
export function renderTree(container, ast, onNodeClick) {
  treeContainer = container;
  nodeClickCallback = onNodeClick;

  container.innerHTML = "";

  if (!ast) {
    container.innerHTML =
      '<div style="padding: 16px; color: var(--text-muted);">Aucun AST à afficher</div>';
    return;
  }

  const tree = createTreeNode(ast, 0);
  container.appendChild(tree);
}

/**
 * Create a tree node element
 * @param {object} node - AST node
 * @param {number} depth - Current depth
 * @returns {HTMLElement}
 */
function createTreeNode(node, depth) {
  const container = document.createElement("div");
  container.className = "tree-node";
  container.dataset.depth = depth;

  // Node content (clickable row)
  const content = document.createElement("div");
  content.className = "tree-node-content";

  // Toggle icon
  const toggle = document.createElement("span");
  toggle.className = "tree-toggle";
  const hasChildren = node.children && node.children.length > 0;

  if (hasChildren) {
    toggle.textContent = "▶";
    toggle.classList.add("expanded");
    toggle.style.transform = "rotate(90deg)";
  } else {
    toggle.classList.add("empty");
  }

  // Node type badge
  const typeBadge = document.createElement("span");
  typeBadge.className = "tree-type";
  typeBadge.textContent = node.type;
  typeBadge.style.backgroundColor = node.color || "#6c757d";
  typeBadge.style.color = getContrastColor(node.color || "#6c757d");

  // Node label (additional info)
  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = getNodeLabel(node);

  content.appendChild(toggle);
  content.appendChild(typeBadge);
  content.appendChild(label);

  // Click handlers
  content.addEventListener("click", (e) => {
    e.stopPropagation();

    // Remove previous selection
    document.querySelectorAll(".tree-node-content.selected").forEach((el) => {
      el.classList.remove("selected");
    });

    content.classList.add("selected");

    if (nodeClickCallback) {
      nodeClickCallback(node);
    }
  });

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleChildren(container, toggle);
    }
  });

  container.appendChild(content);

  // Children container
  if (hasChildren) {
    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children";

    node.children.forEach((child) => {
      if (child && typeof child === "object" && child.type) {
        childrenContainer.appendChild(createTreeNode(child, depth + 1));
      }
    });

    container.appendChild(childrenContainer);
  }

  return container;
}

/**
 * Get a descriptive label for a node
 * @param {object} node - AST node
 * @returns {string}
 */
function getNodeLabel(node) {
  switch (node.type) {
    case "FunctionDef":
    case "AsyncFunctionDef":
      return `def ${node.name}()`;
    case "ClassDef":
      return `class ${node.name}`;
    case "Name":
      return node.id || "";
    case "Constant":
      if (typeof node.value === "string") {
        return `"${node.value.substring(0, 20)}${node.value.length > 20 ? "..." : ""}"`;
      }
      return String(node.value);
    case "Assign":
      if (node.targets && node.targets.length > 0) {
        const target = node.targets[0];
        if (target && target.id) {
          return `${target.id} = ...`;
        }
      }
      return "";
    case "Attribute":
      return `.${node.attr}`;
    case "Call":
      if (node.func) {
        if (node.func.id) return `${node.func.id}()`;
        if (node.func.attr) return `.${node.func.attr}()`;
      }
      return "";
    case "arg":
      return node.arg || "";
    case "Return":
      return "return";
    case "If":
      return "if ...";
    case "For":
      return "for ...";
    case "While":
      return "while ...";
    case "Import":
      if (node.names && node.names.length > 0) {
        return `import ${node.names.map((n) => n.name || n.id).join(", ")}`;
      }
      return "";
    case "ImportFrom":
      return `from ${node.module || "..."}`;
    case "BinOp":
      return getOperatorSymbol(node.op);
    case "Compare":
      if (node.ops && node.ops.length > 0) {
        return node.ops.map((op) => getOperatorSymbol(op)).join(" ");
      }
      return "";
    default:
      if (node.lineno) {
        return `L${node.lineno}`;
      }
      return "";
  }
}

/**
 * Get operator symbol
 * @param {object} op - Operator node
 * @returns {string}
 */
function getOperatorSymbol(op) {
  if (!op || !op.type) return "";

  const symbols = {
    Add: "+",
    Sub: "-",
    Mult: "*",
    Div: "/",
    Mod: "%",
    Pow: "**",
    FloorDiv: "//",
    Eq: "==",
    NotEq: "!=",
    Lt: "<",
    LtE: "<=",
    Gt: ">",
    GtE: ">=",
    Is: "is",
    IsNot: "is not",
    In: "in",
    NotIn: "not in",
    And: "and",
    Or: "or",
    Not: "not",
  };

  return symbols[op.type] || op.type;
}

/**
 * Toggle children visibility
 * @param {HTMLElement} nodeEl - Node element
 * @param {HTMLElement} toggleEl - Toggle button
 */
function toggleChildren(nodeEl, toggleEl) {
  const children = nodeEl.querySelector(".tree-children");
  if (!children) return;

  const isCollapsed = children.classList.contains("collapsed");

  if (isCollapsed) {
    children.classList.remove("collapsed");
    toggleEl.style.transform = "rotate(90deg)";
  } else {
    children.classList.add("collapsed");
    toggleEl.style.transform = "rotate(0deg)";
  }
}

/**
 * Expand all nodes
 */
export function expandAll() {
  if (!treeContainer) return;

  treeContainer.querySelectorAll(".tree-children").forEach((el) => {
    el.classList.remove("collapsed");
  });

  treeContainer.querySelectorAll(".tree-toggle:not(.empty)").forEach((el) => {
    el.style.transform = "rotate(90deg)";
  });
}

/**
 * Collapse all nodes
 */
export function collapseAll() {
  if (!treeContainer) return;

  treeContainer.querySelectorAll(".tree-children").forEach((el) => {
    el.classList.add("collapsed");
  });

  treeContainer.querySelectorAll(".tree-toggle:not(.empty)").forEach((el) => {
    el.style.transform = "rotate(0deg)";
  });
}

/**
 * Get contrasting text color for background
 * @param {string} hexColor - Background color in hex
 * @returns {string}
 */
function getContrastColor(hexColor) {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#1e1e2e" : "#ffffff";
}
