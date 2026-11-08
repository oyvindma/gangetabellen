// ===== Active clock =====
// Does not advance while the page is hidden (screen off, tab/app switched), the
// window is unfocused, or the user has been idle for IDLE_MS, so such gaps are never
// counted as time spent on a problem. Uses Date.now() (not performance.now(), which
// may stop during device sleep).
let pausedTotal = 0;             // ms of settled pauses so far
let pausedAt = null;             // Date.now() when the page became hidden/unfocused, else null
let lastActivity = Date.now();   // last user input (or the page becoming visible again)

/** Start of the pause in progress (hidden, unfocused or idle), or null while active. */
function pauseStart(now) {
    const idleStart = lastActivity + IDLE_MS;
    if (pausedAt !== null) return Math.min(pausedAt, idleStart);
    return now > idleStart ? idleStart : null;
}

function activeNow() {
    const now = Date.now();
    const start = pauseStart(now);
    return now - pausedTotal - (start !== null ? now - start : 0);
}

/** Call on any user input: ends an idle pause (the first IDLE_MS of idling still counts). */
function noteActivity() {
    const now = Date.now();
    if (pausedAt === null) {
        const start = pauseStart(now);
        if (start !== null) pausedTotal += now - start;
        lastActivity = now;
    }
}

function syncClock() {
    const now = Date.now();
    const active = document.visibilityState === 'visible' && document.hasFocus();
    if (!active && pausedAt === null) {
        pausedAt = now;
    } else if (active && pausedAt !== null) {
        pausedTotal += now - pauseStart(now);
        pausedAt = null;
        lastActivity = now; // coming back counts as being present
    }
}
['visibilitychange', 'blur', 'focus', 'pagehide', 'pageshow']
    .forEach(ev => window.addEventListener(ev, syncClock));
['keydown', 'input', 'pointerdown', 'touchstart', 'focusin']
    .forEach(ev => document.addEventListener(ev, noteActivity, true));
syncClock();

