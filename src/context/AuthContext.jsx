/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { findLifeTrackerSpreadsheet, getSpreadsheet, tagLifeTrackerSpreadsheet } from '../lib/sheetsApi';
import { scaffoldSheet } from '../lib/sheetScaffold';
import { loadAllHabits, migrateHabitIdsAcrossMonths } from '../lib/habitRepository';
import { resetQuoteForNextLogin } from '../lib/quoteSession';

const AuthContext = createContext();

const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// Token expires in 3600s — refresh 5 minutes early to avoid mid-session failures
const TOKEN_REFRESH_MS = (3600 - 300) * 1000;

// localStorage flag: the user has signed in before, so we can attempt a
// silent re-auth on launch (no tap needed — important for the installed PWA).
const SIGNED_IN_KEY = 'lt_signed_in';
const SESSION_KEY = 'lt_google_session';
const OFFLINE_IDENTITY_KEY = 'lt_offline_identity_v1';

function toUser(profile) {
    return {
        getName: () => profile.name,
        getEmail: () => profile.email,
        getImageUrl: () => profile.picture,
        firstName: profile.given_name,
    };
}

function readOfflineIdentity() {
    try {
        // Prefer this tab's last session identity when multiple accounts are
        // open in different tabs. The token itself is never copied to durable
        // storage and may already be expired; only identity/workbook routing is
        // needed to select the correct scoped IndexedDB data while offline.
        const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        if (session?.profile && session?.spreadsheetId) {
            return {
                profile: session.profile,
                spreadsheetId: session.spreadsheetId,
                gender: session.gender,
            };
        }
    } catch { /* fall through to the durable last-used identity */ }
    try {
        const cached = JSON.parse(localStorage.getItem(OFFLINE_IDENTITY_KEY) || 'null');
        if (!cached?.profile || !cached?.spreadsheetId) return null;
        return cached;
    } catch {
        return null;
    }
}

function cacheOfflineIdentity({ profile, spreadsheetId, gender }) {
    try {
        localStorage.setItem(OFFLINE_IDENTITY_KEY, JSON.stringify({
            profile: {
                name: profile?.name,
                email: profile?.email,
                picture: profile?.picture,
                given_name: profile?.given_name,
            },
            spreadsheetId,
            gender,
            validatedAt: Date.now(),
        }));
    } catch { /* storage can be unavailable in hardened browsers */ }
}

function clearCachedIdentity() {
    try { localStorage.removeItem(OFFLINE_IDENTITY_KEY); } catch { /* noop */ }
}

function canContinueWithOfflineIdentity(response) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    return ['server_error', 'temporarily_unavailable', 'popup_failed_to_open']
        .includes(String(response?.error || '').toLowerCase());
}

function readCachedSession() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        if (!cached?.accessToken || !cached?.profile || !cached?.spreadsheetId) return null;
        if (Number(cached.expiresAt || 0) <= Date.now() + 60_000) return null;
        return cached;
    } catch {
        return null;
    }
}

function cacheSession({ accessToken, expiresIn, profile, spreadsheetId, gender }) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            accessToken,
            expiresAt: Date.now() + (Number(expiresIn || 3600) * 1000),
            profile,
            spreadsheetId,
            gender,
        }));
    } catch { /* storage can be unavailable in hardened browsers */ }
    cacheOfflineIdentity({ profile, spreadsheetId, gender });
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [spreadsheetId, setSpreadsheetId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gapiError, setGapiError] = useState(false); // true = CDN failed to load
    const [userGender, setUserGender] = useState(null);
    const tokenClient = useRef(null);
    const requestToken = useRef(null);
    const tokenRefreshTimer = useRef(null);
    const silentAttempt = useRef(false);
    const authEpoch = useRef(0);

    // Silently refresh the access token before it expires
    const scheduleTokenRefresh = useCallback((delayMs = TOKEN_REFRESH_MS) => {
        if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
        tokenRefreshTimer.current = setTimeout(() => {
            if (requestToken.current) {
                // Silent re-auth — no consent prompt if already granted
                requestToken.current('');
            }
        }, Math.max(5_000, delayMs));
    }, []);

    useEffect(() => {
        let cancelled = false;
        const initGisAndGapi = async () => {
            const offlineIdentity = readOfflineIdentity();
            const explicitlyOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
            if (offlineIdentity && explicitlyOffline) {
                const offlineEpoch = authEpoch.current;
                setUser(toUser(offlineIdentity.profile));
                setSpreadsheetId(offlineIdentity.spreadsheetId);
                setUserGender(offlineIdentity.gender || 'needs_selection');
                setLoading(false);
                import('../lib/syncQueue').then(({ initSyncQueue }) => {
                    if (authEpoch.current === offlineEpoch) initSyncQueue(offlineIdentity.spreadsheetId);
                });
            }

            try {
                // Wait up to 5s for Google scripts to load from CDN
                let attempts = 0;
                while ((!window.google || !window.gapi) && attempts < 50 && !cancelled) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (cancelled) return;

                if (!window.google || !window.gapi) {
                    console.error('Timeout waiting for Google scripts. window.google:', !!window.google, 'window.gapi:', !!window.gapi);
                    setGapiError(true);
                    setLoading(false);
                    return;
                }

                console.info("Scripts loaded, initializing GAPI client...");
                await new Promise((resolve) => window.gapi.load('client', resolve));
                await window.gapi.client.init({
                    apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
                    discoveryDocs: [
                        'https://sheets.googleapis.com/$discovery/rest?version=v4',
                        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
                    ],
                });

                let cachedSession = readCachedSession();
                if (cachedSession) {
                    window.gapi.client.setToken({ access_token: cachedSession.accessToken });
                    let admitCachedSession = false;
                    try {
                        // Do not admit a cached user until both the token and
                        // workbook are still usable. Otherwise protected pages
                        // can mount forever with a null/broken data source.
                        await getSpreadsheet(cachedSession.spreadsheetId, {
                            forceRefresh: true,
                            allowOfflineFallback: false,
                        });
                        admitCachedSession = true;
                    } catch {
                        // A previously validated, unexpired session is safe to
                        // admit while explicitly offline. Reads will use the
                        // workbook-scoped IndexedDB cache and writes are queued.
                        admitCachedSession = navigator.onLine === false;
                        if (!admitCachedSession) {
                            sessionStorage.removeItem(SESSION_KEY);
                            clearCachedIdentity();
                            window.gapi.client.setToken(null);
                            cachedSession = null;
                        }
                    }
                    if (admitCachedSession && cachedSession) {
                        cacheOfflineIdentity(cachedSession);
                        setToken(cachedSession.accessToken);
                        setUser(toUser(cachedSession.profile));
                        setSpreadsheetId(cachedSession.spreadsheetId);
                        setUserGender(cachedSession.gender || 'needs_selection');
                        const cachedEpoch = authEpoch.current;
                        import('../lib/syncQueue').then(({ initSyncQueue, flush }) => {
                            if (authEpoch.current !== cachedEpoch) return;
                            initSyncQueue(cachedSession.spreadsheetId);
                            void flush(cachedSession.spreadsheetId);
                        });
                    }
                }

                const handleTokenResponse = async (response, callbackEpoch) => {
                        const isCurrentAttempt = () => callbackEpoch === authEpoch.current;
                        if (!isCurrentAttempt()) {
                            if (response.access_token && window.google?.accounts?.oauth2) {
                                window.google.accounts.oauth2.revoke(response.access_token, () => {});
                            }
                            return;
                        }
                        if (response.error) {
                            const wasSilent = silentAttempt.current;
                            silentAttempt.current = false;
                            const offlineFallback = readOfflineIdentity();
                            if (offlineFallback && canContinueWithOfflineIdentity(response)) {
                                if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
                                setToken(null);
                                setUser(toUser(offlineFallback.profile));
                                setSpreadsheetId(offlineFallback.spreadsheetId);
                                setUserGender(offlineFallback.gender || 'needs_selection');
                                window.gapi.client.setToken(null);
                                setLoading(false);
                                return;
                            }
                            localStorage.removeItem(SIGNED_IN_KEY);
                            sessionStorage.removeItem(SESSION_KEY);
                            clearCachedIdentity();
                            if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
                            setUser(null);
                            setToken(null);
                            setSpreadsheetId(null);
                            setUserGender(null);
                            window.gapi.client.setToken(null);
                            import('../lib/syncQueue').then(({ setActiveSpreadsheet }) => {
                                if (isCurrentAttempt()) setActiveSpreadsheet(null);
                            });
                            if (!wasSilent) {
                                toast.error('Authentication failed. Please try again.');
                            }
                            setLoading(false);
                            return;
                        }
                        
                        const wasSilent = silentAttempt.current;
                        silentAttempt.current = false;
                        localStorage.setItem(SIGNED_IN_KEY, '1');

                        window.gapi.client.setToken({ access_token: response.access_token });
                        setToken(response.access_token);
                        scheduleTokenRefresh(); // start the refresh countdown
                        try {
                            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${response.access_token}` },
                            });

                            if (!userInfoRes.ok) throw new Error('Failed to fetch user profile');
                            const profile = await userInfoRes.json();
                            if (!isCurrentAttempt()) return;

                            const userData = toUser(profile);
                            // Load or Scaffold Spreadsheet
                            const sheetTitle = `LifeTracker — ${profile.name}`;
                            const accountId = profile.sub || profile.email;
                            let existingSheet = await findLifeTrackerSpreadsheet(accountId, sheetTitle);
                            if (!isCurrentAttempt()) return;

                            if (existingSheet) {
                                setSpreadsheetId(existingSheet.id);
                                void tagLifeTrackerSpreadsheet(existingSheet.id, accountId)
                                    .catch(error => console.warn('Could not tag the LifeTracker workbook:', error));
                                // Establish the spreadsheet-wide ID invariant before
                                // any page starts reading historical month tabs.
                                void loadAllHabits(existingSheet.id)
                                    .then(definitions => isCurrentAttempt()
                                        ? migrateHabitIdsAcrossMonths(existingSheet.id, definitions)
                                        : undefined)
                                    .catch(error => console.error('Habit ID migration incomplete', error));
                                import('../lib/syncQueue').then(({ initSyncQueue, flush }) => {
                                    if (!isCurrentAttempt()) return;
                                    initSyncQueue(existingSheet.id);
                                    void flush(existingSheet.id);
                                });
                                try {
                                    const genderRes = await window.gapi.client.sheets.spreadsheets.values.get({
                                        spreadsheetId: existingSheet.id,
                                        range: 'Settings!L2',
                                        valueRenderOption: 'UNFORMATTED_VALUE'
                                    });
                                    if (!isCurrentAttempt()) return;
                                    const savedGender = genderRes.result.values?.[0]?.[0];
                                    if (savedGender === 'male' || savedGender === 'female') {
                                        setUserGender(savedGender);
                                        cacheSession({ accessToken: response.access_token, expiresIn: response.expires_in, profile, spreadsheetId: existingSheet.id, gender: savedGender });
                                    } else {
                                        setUserGender('needs_selection');
                                        cacheSession({ accessToken: response.access_token, expiresIn: response.expires_in, profile, spreadsheetId: existingSheet.id, gender: 'needs_selection' });
                                    }
                                } catch {
                                    if (!isCurrentAttempt()) return;
                                    setUserGender('needs_selection');
                                    cacheSession({ accessToken: response.access_token, expiresIn: response.expires_in, profile, spreadsheetId: existingSheet.id, gender: 'needs_selection' });
                                }
                                // Skip the toast on silent launches — only show it for explicit sign-ins
                                if (!wasSilent) toast.success('Synced with your LifeTracker!');
                            } else {
                                toast('Setting up your LifeTracker for the first time...', { icon: '🏗️' });
                                const newId = await scaffoldSheet(profile.name);
                                if (!isCurrentAttempt()) return;
                                void tagLifeTrackerSpreadsheet(newId, accountId)
                                    .catch(error => console.warn('Could not tag the new LifeTracker workbook:', error));
                                setSpreadsheetId(newId);
                                cacheSession({ accessToken: response.access_token, expiresIn: response.expires_in, profile, spreadsheetId: newId, gender: 'needs_selection' });
                                import('../lib/syncQueue').then(({ initSyncQueue, flush }) => {
                                    if (!isCurrentAttempt()) return;
                                    initSyncQueue(newId);
                                    void flush(newId);
                                });
                                setUserGender('needs_selection');
                                toast.success('Your LifeTracker is ready!');
                            }
                            // Authentication becomes visible to protected routes
                            // only after a usable workbook has been established.
                            if (!isCurrentAttempt()) return;
                            setUser(userData);

                        } catch (err) {
                            if (!isCurrentAttempt()) return;
                            console.error('Login flow error:', err);
                            setUser(null);
                            setToken(null);
                            setSpreadsheetId(null);
                            setUserGender(null);
                            localStorage.removeItem(SIGNED_IN_KEY);
                            sessionStorage.removeItem(SESSION_KEY);
                            clearCachedIdentity();
                            if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
                            window.gapi.client.setToken(null);
                            import('../lib/syncQueue').then(({ setActiveSpreadsheet }) => {
                                if (isCurrentAttempt()) setActiveSpreadsheet(null);
                            });
                            toast.error('Failed to initialize your data. Please try again.');
                        } finally {
                            if (isCurrentAttempt()) setLoading(false);
                        }
                };

                // Each OAuth request gets its own callback closure. A single
                // mutable "latest request" marker cannot distinguish a late
                // response from a request made before logout from a newer login.
                requestToken.current = (prompt) => {
                    const callbackEpoch = authEpoch.current;
                    const client = window.google.accounts.oauth2.initTokenClient({
                        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                        scope: SCOPES,
                        include_granted_scopes: false,
                        callback: response => handleTokenResponse(response, callbackEpoch),
                    });
                    tokenClient.current = client;
                    client.requestAccessToken({ prompt });
                };

                console.info("Token client initialized successfully.");
                // Silent re-auth on launch for returning users — restores the session
                // without a tap (important for the installed PWA experience).
                if (cachedSession) {
                    scheduleTokenRefresh(cachedSession.expiresAt - Date.now() - 300_000);
                    setLoading(false);
                } else if (offlineIdentity && explicitlyOffline) {
                    setLoading(false);
                } else if (localStorage.getItem(SIGNED_IN_KEY) === '1') {
                    silentAttempt.current = true;
                    requestToken.current('');
                    // Safety net: if the silent attempt never calls back (e.g. popup
                    // blocked), stop blocking the UI after 8 seconds.
                    const silentEpoch = authEpoch.current;
                    setTimeout(() => {
                        if (authEpoch.current === silentEpoch) setLoading(false);
                    }, 8000);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                if (cancelled) return;
                console.error('GAPI/GIS full initialization error:', error);
                setGapiError(true);
                setLoading(false);
            }
        };

        initGisAndGapi();

        // Cleanup timer on unmount
        return () => {
            cancelled = true;
            authEpoch.current += 1;
            requestToken.current = null;
            tokenClient.current = null;
            if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
        };
    }, [scheduleTokenRefresh]);

    const signIn = () => {
        if (gapiError) {
            toast.error('Cannot login: Google services are blocked by your browser or network. Please disable adblockers and refresh.');
            return;
        }
        if (requestToken.current) {
            authEpoch.current += 1;
            resetQuoteForNextLogin();
            requestToken.current('consent');
        } else {
            toast.error('Google Auth is still initializing. Please wait a moment.');
        }
    };

    const signOut = () => {
        // Invalidate token callbacks and workbook lookups already in flight.
        // Late Google responses must not restore protected state after logout.
        authEpoch.current += 1;
        silentAttempt.current = false;
        if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
        localStorage.removeItem(SIGNED_IN_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        clearCachedIdentity();
        resetQuoteForNextLogin();
        const signOutEpoch = authEpoch.current;
        import('../lib/syncQueue').then(({ setActiveSpreadsheet }) => {
            if (authEpoch.current === signOutEpoch) setActiveSpreadsheet(null);
        });
        setUser(null);
        setToken(null);
        setSpreadsheetId(null);
        setUserGender(null);
        window.gapi?.client?.setToken(null);
        if (token && window.google?.accounts?.oauth2) {
            window.google.accounts.oauth2.revoke(token, () => {});
        }
        toast.success('Logged out successfully');
    };

    const updateUserGender = async (gender) => {
        setUserGender(gender);
        try {
            const cached = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
            if (cached) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...cached, gender }));
        } catch { /* noop */ }
        const offlineIdentity = readOfflineIdentity();
        if (offlineIdentity) cacheOfflineIdentity({ ...offlineIdentity, gender });
        if (spreadsheetId) {
            try {
                await window.gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: 'Settings!L2',
                    valueInputOption: 'RAW',
                    resource: { values: [[gender]] },
                });
            } catch (e) {
                console.error('Failed to save gender preference:', e);
            }
        }
    };

    // We removed the full-screen gapiError blocker here.
    // The public landing page MUST render for Google's bot, even if Google's own scripts are blocked.

    return (
        <AuthContext.Provider value={{
            user, token, spreadsheetId, loading, signIn, signOut,
            userGender, updateUserGender
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
