// ===== Game state =====
function resetTiming() {
    state.startedAt = null;
    state.finishedAt = null;
    state.questionStart = {};
    state.questionTimes = {};
    state.incorrect.clear();
}

/** Start the clock for a problem the first time the user focuses it. */
function startQuestionTimer(rank) {
    if (state.startedAt === null) state.startedAt = activeNow();
    if (state.questionStart[rank] === undefined) state.questionStart[rank] = activeNow();
}

/** Record how long a problem took (capped at MAX_QUESTION_MS), the first time it gets an answer. */
function recordQuestionTime(rank) {
    if (state.questionStart[rank] === undefined || state.questionTimes[rank] !== undefined) return;
    state.questionTimes[rank] = Math.min(activeNow() - state.questionStart[rank], MAX_QUESTION_MS);
}

function resetGameState() {
    resetTiming();
    state.points = 0;
    state.streak = 0;
    state.highestStreak = 0;
    state.answeredIndices.clear();
    renderScore();
    renderProgress();
}

function markAnswered(index) {
    if (state.answeredIndices.has(index)) return;
    state.answeredIndices.add(index);
    renderProgress();
    if (state.answeredIndices.size === state.totalProblems) {
        if (state.startedAt === null) state.startedAt = activeNow();
        state.finishedAt = activeNow();
        saveSession();
        showSummary();
        return;
    }
    saveSession();
}

function awardCorrectAnswer() {
    state.streak++;
    state.highestStreak = Math.max(state.highestStreak, state.streak);
    const multiplier = Math.floor(state.streak / STREAK_BONUS_INTERVAL) + 1;
    state.points += BASE_POINTS * multiplier;
    renderScore();

    const pointsDisplay = $('points-display');
    pointsDisplay.classList.remove('points-increase');
    void pointsDisplay.offsetWidth; // Trigger reflow to restart the animation
    pointsDisplay.classList.add('points-increase');
}

function breakStreak() {
    if (state.streak === 0) return;
    state.streak = 0;
    renderScore();
}

