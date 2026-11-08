// ===== Persistence =====
function checkedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
}

function saveSession() {
    try {
        const inputs = Array.from(document.querySelectorAll('.problem-container'))
            .sort((x, y) => x.dataset.rank - y.dataset.rank)
            .map(container => {
                const input = container.querySelector('.answer-input');
                const stateName = Object.keys(INPUT_STATES).find(
                    key => INPUT_STATES[key].className && input.classList.contains(INPUT_STATES[key].className)
                ) || 'idle';
                return { value: input.value, state: stateName };
            });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            config: {
                numbers: checkedValues('a_number'),
                operations: checkedValues('operation_type'),
                sorted: isSortedOrder(),
                largeNumbers: isLargeNumbersOnly(),
                count: readProblemCount(),
                showResults: $('show-results').checked
            },
            problems: state.problems,
            answers: inputs,
            game: {
                points: state.points,
                streak: state.streak,
                highestStreak: state.highestStreak,
                answered: Array.from(state.answeredIndices)
            },
            timing: {
                elapsed: state.startedAt === null ? null : (state.finishedAt ?? activeNow()) - state.startedAt,
                finished: state.finishedAt !== null,
                times: state.questionTimes,
                incorrect: Array.from(state.incorrect)
            }
        }));
    } catch (e) { /* storage unavailable: app still works, just without persistence */ }
}

function restoreTiming(timing) {
    resetTiming();
    if (!timing) return; // saved before timing existed
    const now = activeNow();
    if (typeof timing.elapsed === 'number') {
        state.startedAt = now - timing.elapsed;
        if (timing.finished) state.finishedAt = now;
    }
    state.questionTimes = timing.times || {};
    state.incorrect = new Set(timing.incorrect || []);
}

/** Rebuild the saved test. Returns false if there is nothing valid to restore. */
function restoreSession() {
    let saved;
    try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) { return false; }
    if (!saved || !Array.isArray(saved.problems) || !saved.problems.length ||
        !Array.isArray(saved.answers) || saved.answers.length !== saved.problems.length) return false;

    const { config, game } = saved;
    document.querySelectorAll('input[name="a_number"]').forEach(cb => cb.checked = config.numbers.includes(cb.value));
    document.querySelectorAll('input[name="operation_type"]').forEach(cb => cb.checked = config.operations.includes(cb.value));
    $('order-toggle').checked = !!config.sorted;
    $('large-numbers-toggle').checked = !!config.largeNumbers;
    renderLargeNumbers();
    if (PROBLEM_COUNT_OPTIONS.includes(Number(config.count))) $('problem-count').value = String(config.count);
    $('problem-count').dataset.prev = $('problem-count').value;
    $('show-results').checked = !!config.showResults;
    setToggleStyle('order-toggle', document.querySelector('#order-toggle + .slider'));
    setToggleStyle('show-results', $('show-answers-label'));

    state.problems = saved.problems;
    displayProblems(state.problems);
    document.querySelectorAll('.problem-container').forEach(container => {
        const input = container.querySelector('.answer-input');
        const answer = saved.answers[container.dataset.rank];
        input.value = answer.value;
        input.readOnly = !!config.showResults;
        setInputState(input, container._feedback, INPUT_STATES[answer.state] ? answer.state : 'idle');
    });

    state.points = game.points;
    state.streak = game.streak;
    state.highestStreak = game.highestStreak;
    state.answeredIndices = new Set(game.answered);
    restoreTiming(saved.timing);
    renderScore();
    renderProgress();
    setGameVisible(!config.showResults);
    return true;
}
