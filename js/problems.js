// ===== Problem model (no markup here) =====
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Build one problem. `n` is the user-selected number, `j` the second operand (1..10).
 * Divisions are always integer, subtractions never negative.
 */
function buildProblem(operation, n, j) {
    switch (operation) {
        case 'multiply': return { a: n, b: j, result: n * j, operationType: operation };
        case 'divide':   return { a: n * j, b: j, result: n, operationType: operation };
        case 'add':      return { a: n, b: j, result: n + j, operationType: operation };
        case 'subtract': {
            const hi = Math.max(n, j), lo = Math.min(n, j);
            return { a: hi, b: lo, result: hi - lo, operationType: operation };
        }
        default: return null;
    }
}

/** All unique problems for one operation and the selected numbers. */
function buildProblemPool(operation, selectedNumbers, largeNumbersOnly) {
    const pool = [];
    for (const n of selectedNumbers) {
        for (let j = 1; j <= SECOND_OPERAND_RANGE; j++) {
            const problem = buildProblem(operation, n, j);
            if (!problem) continue;
            if (largeNumbersOnly && (problem.a < LARGE_NUMBER_MIN || problem.b < LARGE_NUMBER_MIN)) continue;
            pool.push(problem);
        }
    }
    return pool;
}

/** Split `total` as evenly as possible over `parts` (first parts get the remainder). */
function splitEvenly(total, parts) {
    const base = Math.floor(total / parts);
    const remainder = total % parts;
    return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Pick `count` problems from a pool: shuffled first so every problem has the same
 * chance, and repeating the pool when more problems are needed than exist.
 */
function pickProblems(pool, count) {
    const shuffled = shuffleArray([...pool]);
    return Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length]);
}

/** Generate `totalCount` problems spread evenly over the operations, in random order. */
function generateDistributedProblems(selectedNumbers, selectedOperations, totalCount, largeNumbersOnly) {
    const counts = splitEvenly(totalCount, selectedOperations.length);
    const problems = [];
    selectedOperations.forEach((operation, i) => {
        const pool = buildProblemPool(operation, selectedNumbers, largeNumbersOnly);
        if (pool.length > 0) problems.push(...pickProblems(pool, counts[i]));
    });
    return shuffleArray(problems);
}

function sortProblems(problems) {
    return [...problems].sort((p1, p2) => (p1.a - p2.a) || (p1.b - p2.b));
}


// ===== Practice analysis (pure data, no DOM) =====
function median(values) {
    const sorted = [...values].sort((x, y) => x - y);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Ranks whose time is well above the typical time. Uses the median and the median
 * absolute deviation (MAD) rather than mean and standard deviation, so a few extreme
 * times cannot inflate the threshold and hide the genuinely slow problems.
 */
function findSlowRanks(timesByRank) {
    const entries = Object.entries(timesByRank);
    if (entries.length === 0) return [];
    const times = entries.map(([, ms]) => ms);
    const typical = median(times);
    const spread = 1.4826 * median(times.map(t => Math.abs(t - typical))); // ≈ std dev for normal data
    const threshold = typical + 0.5 * spread;
    return entries.filter(([, ms]) => ms > threshold).map(([rank]) => Number(rank));
}

/** Ranks the user struggled with: answered wrong, or took unusually long. */
function findStruggledRanks() {
    return Array.from(new Set([...state.incorrect, ...findSlowRanks(state.questionTimes)]))
        .filter(rank => rank < state.problems.length);
}

/** Repeat the given problems until there are `count` of them. */
function buildPracticeSet(problems, ranks, count) {
    const picked = ranks.map(rank => problems[rank]);
    return Array.from({ length: count }, (_, i) => picked[i % picked.length]);
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes === 0) return `${seconds} sekunder`;
    if (seconds === 0) return `${minutes} minutter`;
    return `${minutes} minutter og ${seconds} sekunder`;
}

