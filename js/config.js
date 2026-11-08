// ===== Configuration =====
const PROBLEM_COUNT_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PROBLEM_COUNT = 50;     // Used when no valid count is selected
const SECOND_OPERAND_RANGE = 10;  // Second operand runs 1..10
const LARGE_NUMBER_MIN = 5;       // "Kun store tall": both operands must be at least this
const OPERATOR_SYMBOLS = { multiply: '×', divide: '÷', add: '+', subtract: '−' };
const BASE_POINTS = 10;
const IDLE_MS = 60000;           // no input for this long pauses the clock
const MAX_QUESTION_MS = 30000;   // a single problem never counts for more than this
const STREAK_BONUS_INTERVAL = 5; // +1 point multiplier every 5 correct answers in a row
const STORAGE_KEY = 'gangetabellen.v1';
const CONFIRM_MESSAGE = 'Dette fjerner svarene og poengene dine. Vil du fortsette?';

// ===== State =====
const state = {
    problems: [],               // the problems of the current test, in display order
    totalProblems: 0,
    answeredIndices: new Set(), // problems the user has answered at least once
    points: 0,
    streak: 0,
    highestStreak: 0,
    columns: 0,                 // column count used for the last sorted layout
    startedAt: null,            // active-clock time of the first focus in this test
    finishedAt: null,           // active-clock time when the last problem was answered
    questionStart: {},          // problem rank -> active-clock time of its first focus
    questionTimes: {},          // problem rank -> ms spent before its first answer
    incorrect: new Set()        // ranks whose current answer is wrong
};

// ===== DOM helpers =====
const $ = id => document.getElementById(id);

