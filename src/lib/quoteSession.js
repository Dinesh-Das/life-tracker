export const CURRENT_QUOTE_KEY = 'lt_current_quote_v2';

export function resetQuoteForNextLogin() {
    try {
        sessionStorage.removeItem(CURRENT_QUOTE_KEY);
    } catch {
        // Storage may be unavailable in hardened browsers.
    }
}
