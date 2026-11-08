// ===== Answer checking =====
function checkAnswer(input, feedback) {
    const rank = Number(input.dataset.rank);
    const value = input.value.trim();
    if (value !== input.value && /^\d+$/.test(value)) input.value = value;
    if (value !== '') recordQuestionTime(rank);

    if (value === '') {
        setInputState(input, feedback, 'idle');
    } else if (!/^\d+$/.test(value)) {
        setInputState(input, feedback, 'invalid');
    } else if (parseInt(value, 10) === parseInt(input.dataset.correct, 10)) {
        const wasSolved = input.dataset.solved === '1';
        setInputState(input, feedback, 'correct');
        state.incorrect.delete(rank);
        if (!wasSolved) awardCorrectAnswer(); // points only the first time
    } else {
        setInputState(input, feedback, 'incorrect');
        state.incorrect.add(rank);
        breakStreak();
    }
    saveSession();
}

function createInteractiveProblem(container, problem, rank) {
    container.innerHTML = formatEquation(problem);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `answer-${rank}`;
    input.className = 'answer-input';
    input.dataset.correct = problem.result;
    input.dataset.rank = rank;
    input.tabIndex = rank + 1;
    input.maxLength = 3;
    input.inputMode = 'numeric';
    input.pattern = '[0-9]*';

    const feedback = document.createElement('span');
    feedback.className = 'feedback';

    // Check answer on Tab or Enter key
    input.addEventListener('keydown', e => {
        if (e.key !== 'Tab' && e.key !== 'Enter') return;
        checkAnswer(input, feedback);
        if (e.key === 'Enter') {
            e.preventDefault();
            const next = $(`answer-${rank + 1}`);
            if (next) next.focus();
        }
    });

    // Time each problem from the moment it is first focused
    input.addEventListener('focus', () => {
        if (!input.readOnly) startQuestionTimer(rank);
    });

    // Persist half-typed answers too
    input.addEventListener('input', saveSession);

    // Also check when the input loses focus
    input.addEventListener('blur', () => {
        if (input.readOnly || !input.value) return;
        checkAnswer(input, feedback);
        markAnswered(rank);
    });

    container.append(input, feedback);
    container._feedback = feedback;
    return input;
}

// ===== Show / hide answers =====
function setAnswersVisible(visible) {
    setToggleStyle('show-results', $('show-answers-label'));
    document.querySelectorAll('.problem-container').forEach(container => {
        const input = container.querySelector('.answer-input');
        setInputState(input, container._feedback, 'idle');
        input.value = visible ? input.dataset.correct : '';
        input.readOnly = visible;
    });
    resetGameState();
    setGameVisible(!visible);
}

