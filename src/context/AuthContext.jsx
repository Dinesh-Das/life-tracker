/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { findSpreadsheet } from '../lib/sheetsApi';
import { scaffoldSheet } from '../lib/sheetScaffold';
import { loadAllHabits, migrateHabitIdsAcrossMonths } from '../lib/habitRepository';

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
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [spreadsheetId, setSpreadsheetId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gapiError, setGapiError] = useState(false); // true = CDN failed to load
    const [userGender, setUserGender] = useState(null);
    const tokenClient = useRef(null);
    const tokenRefreshTimer = useRef(null);
    const silentAttempt = useRef(false);

    // Silently refresh the access token before it expires
    const scheduleTokenRefresh = useCallback((delayMs = TOKEN_REFRESH_MS) => {
        if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
        tokenRefreshTimer.current = setTimeout(() => {
            if (tokenClient.current) {
                // Silent re-auth — no consent prompt if already granted
                tokenClient.current.requestAccessToken({ prompt: '' });
            }
        }, Math.max(5_000, delayMs));
    }, []);

    useEffect(() => {
        const initGisAndGapi = async () => {
            try {
                // Wait up to 5s for Google scripts to load from CDN
                let attempts = 0;
                while ((!window.google || !window.gapi) && attempts < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

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

                const cachedSession = readCachedSession();
                if (cachedSession) {
                    window.gapi.client.setToken({ access_token: cachedSession.accessToken });
                    setToken(cachedSession.accessToken);
                    setUser({
                        getName: () => cachedSession.profile.name,
                        getEmail: () => cachedSession.profile.email,
                        getImageUrl: () => cachedSession.profile.picture,
                        firstName: cachedSession.profile.given_name,
                    });
                    setSpreadsheetId(cachedSession.spreadsheetId);
                    setUserGender(cachedSession.gender || 'needs_selection');
                }

                tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    include_granted_scopes: false,
                    callback: async (response) => {
                        if (response.error) {
                            if (silentAttempt.current) {
                                // Silent re-auth failed (revoked/expired grant) — require a manual sign-in
                                silentAttempt.current = false;
                                localStorage.removeItem(SIGNED_IN_KEY);
                            } else {
                                toast.error('Authentication failed. Please try again.');
                            }
                            setLoading(false);
                            return;
                        }
                        
                        const wasSilent = silentAttempt.current;
                        silentAttempt.current = false;
                        localStorage.setItem(SIGNED_IN_KEY, '1');

                        setToken(response.access_token);
                        scheduleTokenRefresh(); // start the refresh countdown
                        try {
                            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${response.access_token}` },
                            });

                            if (!userInfoRes.ok) throw new Error('Failed to fetch user profile');
                            const profile = await userInfoRes.json();

                            const userData = {
                                getName: () => profile.name,
                                getEmail: () => profile.email,
                                getImageUrl: () => profile.picture,
                                firstName: profile.given_name,
                            };
                            setUser(userData);

                            // Load or Scaffold Spreadsheet
                            const sheetTitle = `LifeTracker — ${profile.name}`;
                            let existingSheet = await findSpreadsheet(sheetTitle);

                            if (existingSheet) {
                                setSpreadsheetId(existingSheet.id);
                                // Establish the spreadsheet-wide ID invariant before
                                // any page starts reading historical month tabs.
                                void loadAllHabits(existingSheet.id)
                                    .then(definitions => migrateHabitIdsAcrossMonths(existingSheet.id, definitions))
                                    .catch(error => console.error('Habit ID migration incomplete', error));
                                import('../lib/syncQueue').then(({ initSyncQueue, flush }) => {
                                    initSyncQueue();
                                    void flush(existingSheet.id);
                                });
                                try {
                                    const genderRes = await window.gapi.client.sheets.spreadsheets.values.get({
                                        spreadsheetId: existingSheet.id,
                                        range: 'Settings!L2',
                                        valueRenderOption: 'UNFORMATTED_VALUE'
                                    });
                                    const savedGender = genderRes.result.values?.[0]?.[0];
                                    if (savedGender === 'male' || savedGender === 'female') {
                                        setUserGender(savedGender);
                                        cacheSession({ accessToken: response.access_token, expiresIn: response.expires_in, profile, spreadsheetId: existingSheet.id, gender: savedGender });
                                    } else {
                                        setUserGender('needs_selection');
                                        cacheSession({ accessToken: response.access_token, expiresIn: response.expires_in, profile, spreadsheetId: existingSheet.id, gender: 'needs_selection' });
                                    }
                                } catch {
                                    setUserGender('needs_selection');
                                    cacheSession({ accessToken: response.access_token, expiresIn: response.expires_in, profile, spreadsheetId: existingSheet.id, gender: 'needs_selection' });
                                }
                                // Skip the toast on silent launches — only show it for explicit sign-ins
                                if (!wasSilent) toast.success('Synced with your LifeTracker!');
                            } else {
                                toast('Setting up your LifeTracker for the first time...', { icon: '🏗️' });
                                const newId = await scaffoldSheet(profile.name);
                                setSpreadsheetId(newId);
                                cacheSession({ accessToken: response.access_token, expiresIn: response.expires_in, profile, spreadsheetId: newId, gender: 'needs_selection' });
                                import('../lib/syncQueue').then(({ initSyncQueue, flush }) => {
                                    initSyncQueue();
                                    void flush(newId);
                                });
                                setUserGender('needs_selection');
                                toast.success('Your LifeTracker is ready!');
                            }

                        } catch (err) {
                            console.error('Login flow error:', err);
                            toast.error('Failed to initialize your data. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    },
                });

                console.info("Token client initialized successfully.");
                // Silent re-auth on launch for returning users — restores the session
                // without a tap (important for the installed PWA experience).
                if (cachedSession) {
                    scheduleTokenRefresh(cachedSession.expiresAt - Date.now() - 300_000);
                    setLoading(false);
                } else if (localStorage.getItem(SIGNED_IN_KEY) === '1') {
                    silentAttempt.current = true;
                    tokenClient.current.requestAccessToken({ prompt: '' });
                    // Safety net: if the silent attempt never calls back (e.g. popup
                    // blocked), stop blocking the UI after 8 seconds.
                    setTimeout(() => setLoading(false), 8000);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error('GAPI/GIS full initialization error:', error);
                setGapiError(true);
                setLoading(false);
            }
        };

        initGisAndGapi();

        // Cleanup timer on unmount
        return () => {
            if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
        };
    }, [scheduleTokenRefresh]);

    const signIn = () => {
        if (gapiError) {
            toast.error('Cannot login: Google services are blocked by your browser or network. Please disable adblockers and refresh.');
            return;
        }
        if (tokenClient.current) {
            tokenClient.current.requestAccessToken({ prompt: 'consent' });
        } else {
            toast.error('Google Auth is still initializing. Please wait a moment.');
        }
    };

    const signOut = () => {
        if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
        localStorage.removeItem(SIGNED_IN_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        if (token) {
            window.google.accounts.oauth2.revoke(token, () => {
                setUser(null);
                setToken(null);
                setSpreadsheetId(null);
                setUserGender(null);
                toast.success('Logged out successfully');
            });
        }
    };

    const updateUserGender = async (gender) => {
        setUserGender(gender);
        try {
            const cached = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
            if (cached) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...cached, gender }));
        } catch { /* noop */ }
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
