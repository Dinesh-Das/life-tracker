/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { findSpreadsheet } from '../lib/sheetsApi';
import { scaffoldSheet } from '../lib/sheetScaffold';

const AuthContext = createContext();

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// Token expires in 3600s — refresh 5 minutes early to avoid mid-session failures
const TOKEN_REFRESH_MS = (3600 - 300) * 1000;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [spreadsheetId, setSpreadsheetId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gapiError, setGapiError] = useState(false); // true = CDN failed to load
    const [userGender, setUserGender] = useState(null);
    const tokenClient = useRef(null);
    const tokenRefreshTimer = useRef(null);

    // Silently refresh the access token before it expires
    const scheduleTokenRefresh = useCallback(() => {
        if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
        tokenRefreshTimer.current = setTimeout(() => {
            if (tokenClient.current) {
                // Silent re-auth — no consent prompt if already granted
                tokenClient.current.requestAccessToken({ prompt: '' });
            }
        }, TOKEN_REFRESH_MS);
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

                tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: async (response) => {
                        if (response.error) {
                            toast.error('Authentication failed. Please try again.');
                            return;
                        }

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
                                try {
                                    const genderRes = await window.gapi.client.sheets.spreadsheets.values.get({
                                        spreadsheetId: existingSheet.id,
                                        range: 'Settings!L2',
                                        valueRenderOption: 'UNFORMATTED_VALUE'
                                    });
                                    const savedGender = genderRes.result.values?.[0]?.[0];
                                    if (savedGender === 'male' || savedGender === 'female') {
                                        setUserGender(savedGender);
                                    } else {
                                        setUserGender('needs_selection');
                                    }
                                } catch {
                                    setUserGender('needs_selection');
                                }
                                toast.success('Synced with your LifeTracker!');
                            } else {
                                toast('Setting up your LifeTracker for the first time...', { icon: '🏗️' });
                                const newId = await scaffoldSheet(profile.name);
                                setSpreadsheetId(newId);
                                setUserGender('needs_selection');
                                toast.success('Your LifeTracker is ready!');
                            }

                        } catch (err) {
                            console.error('Login flow error:', err);
                            toast.error('Failed to initialize your data. Please try again.');
                        }
                    },
                });

                console.info("Token client initialized successfully.");
            } catch (error) {
                console.error('GAPI/GIS full initialization error:', error);
                setGapiError(true);
            } finally {
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
        if (tokenClient.current) {
            tokenClient.current.requestAccessToken({ prompt: 'consent' });
        } else {
            toast.error('Google Auth is still initializing. Please wait a moment.');
        }
    };

    const signOut = () => {
        if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
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

    // Show a user-friendly screen if Google CDN scripts failed to load
    if (gapiError) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border border-amber-100">📡</div>
                <h1 className="text-2xl font-serif font-black text-gray-800 mb-2">Connection Required</h1>
                <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
                    LifeTracker couldn&apos;t connect to Google services. This usually happens when:
                </p>
                <ul className="text-sm text-left text-gray-500 max-w-xs mb-6 space-y-1 list-disc list-inside">
                    <li>You&apos;re offline or have a slow connection</li>
                    <li>A browser extension is blocking Google scripts</li>
                </ul>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200"
                >
                    Try Again
                </button>
            </div>
        );
    }

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
