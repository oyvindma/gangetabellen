// ===== Design switcher =====
// Every design is its own page (index-<theme>.html). index.html is only a router that
// sends you to the design you picked last. The choice is saved in localStorage.
const THEME_KEY = 'gangetabellen.theme';
const DEFAULT_THEME = 'classic';
const THEMES = [
    { id: 'classic',   label: 'Klassisk',    page: 'index-classic.html' },
    { id: 'minecraft', label: 'Blokkverden', page: 'index-minecraft.html' },
    { id: 'cat',       label: 'Kattekos',    page: 'index-cat.html' },
    { id: 'build',     label: '3D-bygg',     page: 'index-build.html' }
];

function findTheme(id) {
    return THEMES.find(t => t.id === id) || THEMES.find(t => t.id === DEFAULT_THEME);
}

function getSavedTheme() {
    try { return findTheme(localStorage.getItem(THEME_KEY)); }
    catch (e) { return findTheme(DEFAULT_THEME); } // storage blocked: fall back to the default
}

function saveTheme(id) {
    try { localStorage.setItem(THEME_KEY, id); }
    catch (e) { /* storage blocked: the choice just isn't remembered */ }
}

/** Fill the nav with one link per design; the current page's design is marked aria-current. */
function renderThemeSwitcher(nav, currentId) {
    nav.setAttribute('aria-label', 'Velg utseende');
    THEMES.forEach(theme => {
        const link = document.createElement('a');
        link.className = 'theme-option';
        link.href = theme.page;
        link.textContent = theme.label;
        link.dataset.theme = theme.id;
        if (theme.id === currentId) link.setAttribute('aria-current', 'page');
        link.addEventListener('click', e => {
            if (theme.id === currentId) { e.preventDefault(); return; }
            saveTheme(theme.id); // progress is saved continuously, so the new page restores it
        });
        nav.appendChild(link);
    });
}

const themeNav = document.getElementById('theme-switcher');
if (themeNav) renderThemeSwitcher(themeNav, document.body.dataset.theme);
