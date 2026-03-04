/**
 * AST Graph Visualization with D3.js
 */

let svg = null;
let g = null;
let zoom = null;
let currentTransform = d3.zoomIdentity;

/**
 * Render the AST as a D3 tree graph
 * @param {SVGElement} svgElement - SVG container
 * @param {object} ast - AST object from parser
 */
export function renderGraph(svgElement, ast) {
  svg = d3.select(svgElement);
  svg.selectAll("*").remove();

  if (!ast) {
    return;
  }

  const container = svgElement.parentElement;
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;

  svg
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  // Create main group for zoom/pan
  g = svg.append("g");

  // Setup zoom behavior
  zoom = d3
    .zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      currentTransform = event.transform;
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Convert AST to D3 hierarchy format
  const root = d3.hierarchy(ast, (d) => d.children || []);

  // Calculate tree layout
  const treeLayout = d3
    .tree()
    .nodeSize([30, 120])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

  treeLayout(root);

  // Center the tree
  const bounds = getBounds(root);
  const treeWidth = bounds.maxX - bounds.minX;
  const treeHeight = bounds.maxY - bounds.minY;

  const scale = Math.min(
    (width - 100) / treeWidth,
    (height - 100) / treeHeight,
    1,
  );

  const tx = width / 2 - (bounds.minX + treeWidth / 2) * scale;
  const ty = 50 - bounds.minY * scale;

  const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
  svg.call(zoom.transform, initialTransform);

  // Draw links
  const links = g
    .append("g")
    .attr("class", "links")
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("class", "link")
    .attr(
      "d",
      d3
        .linkVertical()
        .x((d) => d.x)
        .y((d) => d.y),
    );

  // Draw nodes
  const nodes = g
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x},${d.y})`);

  // Node circles
  nodes
    .append("circle")
    .attr("r", (d) => getNodeRadius(d.data))
    .attr("fill", (d) => d.data.color || "#6c757d")
    .on("mouseover", showTooltip)
    .on("mouseout", hideTooltip)
    .on("click", (event, d) => {
      event.stopPropagation();
      highlightNode(d);
    });

  // Node labels
  nodes
    .append("text")
    .attr("dy", -15)
    .attr("text-anchor", "middle")
    .text((d) => getShortLabel(d.data))
    .style("font-size", "10px")
    .style("fill", "#cdd6f4");
}

/**
 * Get bounds of the tree
 * @param {object} root - D3 hierarchy root
 * @returns {object}
 */
function getBounds(root) {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  root.descendants().forEach((d) => {
    if (d.x < minX) minX = d.x;
    if (d.x > maxX) maxX = d.x;
    if (d.y < minY) minY = d.y;
    if (d.y > maxY) maxY = d.y;
  });

  return { minX, maxX, minY, maxY };
}

/**
 * Get node radius based on type
 * @param {object} node - AST node
 * @returns {number}
 */
function getNodeRadius(node) {
  const importantTypes = [
    "Module",
    "FunctionDef",
    "ClassDef",
    "AsyncFunctionDef",
  ];
  const mediumTypes = ["If", "For", "While", "Try", "With", "Return"];

  if (importantTypes.includes(node.type)) return 12;
  if (mediumTypes.includes(node.type)) return 9;
  return 6;
}

/**
 * Get short label for node
 * @param {object} node - AST node
 * @returns {string}
 */
function getShortLabel(node) {
  switch (node.type) {
    case "FunctionDef":
    case "AsyncFunctionDef":
      return node.name || "fn";
    case "ClassDef":
      return node.name || "cls";
    case "Name":
      return node.id || "";
    case "Constant":
      if (typeof node.value === "string") {
        return `"${node.value.substring(0, 8)}..."`;
      }
      return String(node.value).substring(0, 8);
    case "Module":
      return "Module";
    default:
      return node.type.substring(0, 6);
  }
}

/**
 * Show tooltip on hover
 * @param {Event} event - Mouse event
 * @param {object} d - Node data
 */
function showTooltip(event, d) {
  const tooltip = document.getElementById("tooltip");
  const node = d.data;

  let content = `<div class="tooltip-type">${node.type}</div>`;

  // Add details based on node type
  if (node.name) {
    content += `<div class="tooltip-detail">Name: ${node.name}</div>`;
  }
  if (node.id) {
    content += `<div class="tooltip-detail">ID: ${node.id}</div>`;
  }
  if (node.value !== undefined) {
    content += `<div class="tooltip-detail">Value: ${JSON.stringify(node.value).substring(0, 50)}</div>`;
  }
  if (node.lineno) {
    content += `<div class="tooltip-detail">Line: ${node.lineno}</div>`;
  }

  tooltip.innerHTML = content;
  tooltip.style.left = event.pageX + 10 + "px";
  tooltip.style.top = event.pageY + 10 + "px";
  tooltip.classList.add("visible");
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  const tooltip = document.getElementById("tooltip");
  tooltip.classList.remove("visible");
}

/**
 * Highlight a node
 * @param {object} d - Node data
 */
function highlightNode(d) {
  // Reset all nodes
  g.selectAll(".node circle").attr("stroke", null).attr("stroke-width", null);

  // Highlight selected node
  d3.select(event.target).attr("stroke", "#89b4fa").attr("stroke-width", 3);

  // Trigger editor highlight if line info available
  if (d.data.lineno && window.highlightEditorLines) {
    window.highlightEditorLines(
      d.data.lineno,
      d.data.end_lineno || d.data.lineno,
    );
  }
}

/**
 * Reset zoom to initial state
 */
export function resetZoom() {
  if (!svg || !zoom) return;

  svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
}

/**
 * Zoom to fit all nodes
 */
export function zoomToFit() {
  if (!svg || !g || !zoom) return;

  const bounds = g.node().getBBox();
  const container = svg.node().parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scale = Math.min(width / bounds.width, height / bounds.height) * 0.9;

  const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
  const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;

  svg
    .transition()
    .duration(500)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}
