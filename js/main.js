window.addEventListener('resize', () => {
    if (isSortedOrder() && getColumnCount() !== state.columns) layoutProblems();
});

window.onload = function() {
    $('summary-close').addEventListener('click', closeSummary);
    $('restart-button').addEventListener('click', restartTest);
    $('practice-button').addEventListener('click', practiceStruggled);
    $('problem-count').dataset.prev = $('problem-count').value;
    setToggleStyle('order-toggle', document.querySelector('#order-toggle + .slider'));
    renderLargeNumbers();
    let restored = false;
    try { restored = restoreSession(); } catch (e) { /* corrupt save */ }
    if (!restored) createMathProblems();
};
