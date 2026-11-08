// ===== Controls =====
/** Read the selected numbers/operations, applying defaults (and ticking the boxes) if none. */
function readSelections() {
    const read = (name, fallback) => {
        let boxes = Array.from(document.querySelectorAll(`input[name="${name}"]`));
        if (!boxes.some(cb => cb.checked)) {
            boxes.forEach(cb => cb.checked = !cb.disabled && fallback(cb));
        }
        return boxes.filter(cb => cb.checked).map(cb => cb.value);
    };
    return {
        numbers: read('a_number', () => true).map(Number),            // default: 1-10 (5-10 in large-numbers mode)
        operations: read('operation_type', cb => cb.value === 'multiply') // default: multiply
    };
}

function isLargeNumbersOnly() {
    return $('large-numbers-toggle').checked;
}

/** Style the toggle and disable (and untick) the number buttons below LARGE_NUMBER_MIN. */
function renderLargeNumbers() {
    const large = isLargeNumbersOnly();
    setToggleStyle('large-numbers-toggle', $('large-numbers-label'));
    document.querySelectorAll('input[name="a_number"]').forEach(cb => {
        if (Number(cb.value) >= LARGE_NUMBER_MIN) return;
        cb.disabled = large;
        if (large) cb.checked = false;
        cb.parentElement.classList.toggle('disabled', large);
    });
}

function readProblemCount() {
    const n = Number($('problem-count').value);
    return PROBLEM_COUNT_OPTIONS.includes(n) ? n : DEFAULT_PROBLEM_COUNT;
}

function displayProblems(problems) {
    const list = $('problems-list');
    list.innerHTML = '';
    state.totalProblems = problems.length;

    problems.forEach((problem, rank) => {
        const div = document.createElement('div');
        div.className = 'problem-container';
        div.dataset.rank = rank;
        createInteractiveProblem(div, problem, rank);
        list.appendChild(div);
    });

    layoutProblems();
}

/** Start a test with the given problems (sorted if that toggle is on). */
function startTest(problems) {
    state.problems = isSortedOrder() ? sortProblems(problems) : problems;
    displayProblems(state.problems);
    setAnswersVisible($('show-results').checked); // also resets score/progress/timing
    saveSession();
}

/** Generate a fresh test from the current controls. */
function createMathProblems() {
    const { numbers, operations } = readSelections();
    startTest(generateDistributedProblems(numbers, operations, readProblemCount(), isLargeNumbersOnly()));
}

