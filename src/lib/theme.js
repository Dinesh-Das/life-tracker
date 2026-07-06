const STORAGE_KEY = 'lt_theme';

/** Apply the persisted theme (default light) and return it. */
export function initTheme() {
    let theme = 'light';
    try {
        theme = localStorage.getItem(STORAGE_KEY) || 'light';
    } catch { /* noop */ }
    document.documentElement.dataset.theme = theme;
    return theme;
}

/** Flip light/dark, persist, and return the new theme. */
export function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch { /* noop */ }
    document.documentElement.dataset.theme = next;
    return next;
}