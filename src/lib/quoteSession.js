export const CURRENT_QUOTE_KEY = 'lt_current_quote_v3';

export function resetQuoteForNextLogin() {
    try {
        sessionStorage.removeItem(CURRENT_QUOTE_KEY);
    } catch {
        // Storage may be unavailable in hardened browsers.
    }
}
