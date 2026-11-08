// ===== Layout =====
/** Number of columns the problems grid currently has (from CSS). */
function getColumnCount() {
    const template = getComputedStyle($('problems-list')).gridTemplateColumns;
    return template && template !== 'none' ? template.split(' ').length : 1;
}

/**
 * Reorder row-major so that reading each column top-to-bottom follows the sequence.
 */
function columnFirstOrder(items, columns) {
    // Column heights differ by at most one: the first `extra` columns are taller,
    // so the row-major grid fill lines up exactly with the columns.
    const heights = splitEvenly(items.length, columns);
    const starts = heights.map((_, col) => heights.slice(0, col).reduce((a, b) => a + b, 0));
    const ordered = [];
    for (let row = 0; row < heights[0]; row++) {
        for (let col = 0; col < columns; col++) {
            if (row < heights[col]) ordered.push(items[starts[col] + row]);
        }
    }
    return ordered;
}

function isSortedOrder() {
    return $('order-toggle').checked;
}

/**
 * Arrange the existing problem nodes in the grid. Nodes keep their state; only
 * their DOM order changes, so this is safe to call on resize.
 */
function layoutProblems() {
    const list = $('problems-list');
    let nodes = Array.from(list.children).sort((x, y) => x.dataset.rank - y.dataset.rank);
    state.columns = getColumnCount();
    if (isSortedOrder()) nodes = columnFirstOrder(nodes, state.columns);
    nodes.forEach(node => list.appendChild(node));
}

