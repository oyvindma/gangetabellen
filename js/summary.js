// ===== Summary =====
function closeSummary() {
    $('summary-modal').style.display = 'none';
}

function showSummary() {
    const solved = document.querySelectorAll('.answer-input[data-solved="1"]').length;
    $('summary-points').textContent = state.points;
    $('summary-time').textContent = formatDuration(state.finishedAt - state.startedAt);
    $('summary-correct').textContent = `${solved} av ${state.totalProblems}`;
    $('summary-streak').textContent = state.highestStreak;
    $('practice-button').disabled = findStruggledRanks().length === 0;
    $('summary-modal').style.display = 'flex';
}

/** "Prøv igjen": the same problems once more. */
function restartTest() {
    closeSummary();
    startTest(state.problems);
}

/** "Bli enda bedre! 💪": a test built from the problems the user struggled with. */
function practiceStruggled() {
    const ranks = findStruggledRanks();
    if (ranks.length === 0) return;
    const practiceSet = buildPracticeSet(state.problems, ranks, state.problems.length);
    closeSummary();
    startTest(practiceSet);
}

function toggleAnswers() {
    setAnswersVisible($('show-results').checked);
    saveSession();
}

function toggleOrder() {
    setToggleStyle('order-toggle', document.querySelector('#order-toggle + .slider'));
    createMathProblems();
}

// ===== Progress guard =====
/** True when the user has typed answers that a reset would throw away. */
function hasProgress() {
    // Read-only inputs hold shown answers, not the user's work (and the toggle
    // may already have flipped when this runs from its change handler).
    return Array.from(document.querySelectorAll('.answer-input')).some(input => !input.readOnly && input.value !== '');
}

function confirmDiscardProgress() {
    return !hasProgress() || window.confirm(CONFIRM_MESSAGE);
}

/** Every settings control routes through here: confirm first, revert the control if declined. */
function onConfigChange(el) {
    if (!confirmDiscardProgress()) {
        if (el.id === 'problem-count') el.value = el.dataset.prev || String(DEFAULT_PROBLEM_COUNT);
        else el.checked = !el.checked;
        return;
    }
    if (el.id === 'problem-count') el.dataset.prev = el.value;
    if (el.id === 'large-numbers-toggle') { renderLargeNumbers(); createMathProblems(); }
    else if (el.id === 'order-toggle') toggleOrder();
    else if (el.id === 'show-results') toggleAnswers();
    else createMathProblems();
}

function clearTest() {
    if (!confirmDiscardProgress()) return;
    createMathProblems(); // fresh test; also saves the empty session
}

