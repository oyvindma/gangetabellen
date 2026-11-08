// ===== Rendering =====
function formatEquation(problem) {
    return `<span class="number-part">${problem.a}</span>` +
           `<span class="operator">${OPERATOR_SYMBOLS[problem.operationType]}</span>` +
           `<span class="number-part">${problem.b}</span>` +
           `<span class="operator">=</span>`;
}

const INPUT_STATES = {
    idle:      { className: '',                 mark: '',  color: '' },
    invalid:   { className: 'invalid-answer',   mark: '!', color: 'orange' },
    correct:   { className: 'correct-answer',   mark: '✓', color: 'green' },
    incorrect: { className: 'incorrect-answer', mark: '✗', color: 'red' }
};

/** Single place that styles an answer input and records whether it is solved. */
function setInputState(input, feedback, stateName) {
    const s = INPUT_STATES[stateName];
    input.className = ('answer-input ' + s.className).trim();
    input.dataset.solved = stateName === 'correct' ? '1' : '';
    feedback.textContent = s.mark;
    feedback.style.color = s.color;
}

function renderScore() {
    $('points-display').textContent = state.points;
    $('streak-display').textContent = state.streak;
    $('highest-streak').textContent = state.highestStreak;
}

function renderProgress() {
    const percentage = state.totalProblems > 0
        ? (state.answeredIndices.size / state.totalProblems) * 100
        : 0;
    $('progress-bar').style.width = percentage + '%';
}

function setGameVisible(visible) {
    $('gamification-panel').style.display = visible ? 'flex' : 'none';
    $('progress-container').style.display = visible ? 'block' : 'none';
}

function setToggleStyle(toggleInputId, labelEl) {
    labelEl.classList.toggle('active', $(toggleInputId).checked);
}

