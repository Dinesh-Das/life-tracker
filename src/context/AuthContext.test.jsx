import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
    findLifeTrackerSpreadsheet: vi.fn(),
    getSpreadsheet: vi.fn(),
    tagLifeTrackerSpreadsheet: vi.fn(),
    scaffoldSheet: vi.fn(),
    loadAllHabits: vi.fn(),
    migrateHabitIdsAcrossMonths: vi.fn(),
    resetQuoteForNextLogin: vi.fn(),
}));

vi.mock('../lib/sheetsApi', () => ({
    findLifeTrackerSpreadsheet: mocks.findLifeTrackerSpreadsheet,
    getSpreadsheet: mocks.getSpreadsheet,
    tagLifeTrackerSpreadsheet: mocks.tagLifeTrackerSpreadsheet,
}));
vi.mock('../lib/sheetScaffold', () => ({ scaffoldSheet: mocks.scaffoldSheet }));
vi.mock('../lib/habitRepository', () => ({
    loadAllHabits: mocks.loadAllHabits,
    migrateHabitIdsAcrossMonths: mocks.migrateHabitIdsAcrossMonths,
}));
vi.mock('../lib/quoteSession', () => ({ resetQuoteForNextLogin: mocks.resetQuoteForNextLogin }));
vi.mock('../lib/syncQueue', () => ({
    initSyncQueue: vi.fn(),
    flush: vi.fn(),
    setActiveSpreadsheet: vi.fn(),
}));
vi.mock('react-hot-toast', () => {
    const toast = vi.fn();
    toast.success = vi.fn();
    toast.error = vi.fn();
    return { default: toast };
});

import { AuthProvider, useAuth } from './AuthContext';

let container;
let root;
let currentAuth;
let oauthCallback;
let oauthCallbacks;
let requestAccessToken;

function Probe() {
    currentAuth = useAuth();
    return null;
}

beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    oauthCallback = undefined;
    requestAccessToken = vi.fn();
    oauthCallbacks = [];
    window.gapi = {
        load: (_name, done) => done(),
        client: {
            init: vi.fn().mockResolvedValue(undefined),
            setToken: vi.fn(),
            sheets: { spreadsheets: { values: { get: vi.fn() } } },
        },
    };
    window.google = {
        accounts: {
            oauth2: {
                initTokenClient: vi.fn(config => {
                    oauthCallback = config.callback;
                    oauthCallbacks.push(config.callback);
                    return { requestAccessToken };
                }),
                revoke: vi.fn(),
            },
        },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sub: 'account-a', name: 'Account A', email: 'a@example.com' }),
    }));
    container = document.createElement('div');
    root = createRoot(container);
    await act(async () => root.render(<AuthProvider><Probe /></AuthProvider>));
    await vi.waitFor(() => expect(currentAuth.loading).toBe(false));
});

afterEach(async () => {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
});

describe('AuthProvider logout safety', () => {
    it('rejects a token response that arrives after logout', async () => {
        act(() => currentAuth.signIn());
        expect(oauthCallback).toBeTypeOf('function');
        act(() => currentAuth.signOut());

        await act(async () => oauthCallback({ access_token: 'late-token', expires_in: 3600 }));

        expect(fetch).not.toHaveBeenCalled();
        expect(window.google.accounts.oauth2.revoke).toHaveBeenCalledWith('late-token', expect.any(Function));
        expect(currentAuth.user).toBeNull();
    });

    it('ignores a login callback that finishes after logout', async () => {
        let finishWorkbookLookup;
        mocks.findLifeTrackerSpreadsheet.mockImplementation(() => new Promise(resolve => {
            finishWorkbookLookup = resolve;
        }));

        act(() => currentAuth.signIn());
        expect(oauthCallback).toBeTypeOf('function');
        let callbackPromise;
        await act(async () => {
            callbackPromise = oauthCallback({ access_token: 'late-token', expires_in: 3600 });
        });
        await vi.waitFor(() => expect(mocks.findLifeTrackerSpreadsheet).toHaveBeenCalledTimes(1));

        act(() => currentAuth.signOut());
        finishWorkbookLookup({ id: 'book-a' });
        await act(async () => callbackPromise);

        expect(currentAuth.user).toBeNull();
        expect(currentAuth.spreadsheetId).toBeNull();
        expect(sessionStorage.getItem('lt_google_session')).toBeNull();
    });

    it('rejects an old token response after logout followed by a new login', async () => {
        act(() => currentAuth.signIn());
        const oldCallback = oauthCallbacks.at(-1);
        act(() => currentAuth.signOut());
        act(() => currentAuth.signIn());
        const newCallback = oauthCallbacks.at(-1);

        expect(newCallback).not.toBe(oldCallback);
        await act(async () => oldCallback({ access_token: 'old-account-token', expires_in: 3600 }));

        expect(fetch).not.toHaveBeenCalled();
        expect(window.google.accounts.oauth2.revoke)
            .toHaveBeenCalledWith('old-account-token', expect.any(Function));
        expect(currentAuth.user).toBeNull();
    });
});

describe('AuthProvider cached-session admission', () => {
    it('persists offline routing metadata without persisting the access token', async () => {
        mocks.findLifeTrackerSpreadsheet.mockResolvedValue({ id: 'book-a' });
        mocks.tagLifeTrackerSpreadsheet.mockResolvedValue(undefined);
        mocks.loadAllHabits.mockResolvedValue([]);
        mocks.migrateHabitIdsAcrossMonths.mockResolvedValue(undefined);
        window.gapi.client.sheets.spreadsheets.values.get.mockResolvedValue({
            result: { values: [['male']] },
        });

        act(() => currentAuth.signIn());
        await act(async () => oauthCallback({ access_token: 'session-only-token', expires_in: 3600 }));
        await vi.waitFor(() => expect(currentAuth.user?.getEmail()).toBe('a@example.com'));

        const durable = JSON.parse(localStorage.getItem('lt_offline_identity_v1'));
        expect(durable).toMatchObject({ spreadsheetId: 'book-a', gender: 'male' });
        expect(JSON.stringify(durable)).not.toContain('session-only-token');
        expect(JSON.parse(sessionStorage.getItem('lt_google_session')).accessToken)
            .toBe('session-only-token');
    });

    it('admits an unexpired validated session when the browser is explicitly offline', async () => {
        await act(async () => root.unmount());

        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        sessionStorage.setItem('lt_google_session', JSON.stringify({
            accessToken: 'cached-token',
            expiresAt: Date.now() + 600_000,
            profile: { name: 'Offline User', email: 'offline@example.com', given_name: 'Offline' },
            spreadsheetId: 'offline-book',
            gender: 'male',
        }));
        mocks.getSpreadsheet.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        root = createRoot(container);

        await act(async () => root.render(<AuthProvider><Probe /></AuthProvider>));
        await vi.waitFor(() => expect(currentAuth.loading).toBe(false));

        expect(currentAuth.user?.getEmail()).toBe('offline@example.com');
        expect(currentAuth.spreadsheetId).toBe('offline-book');
    });

    it('admits persistent non-token identity before Google scripts are available', async () => {
        await act(async () => root.unmount());

        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        localStorage.setItem('lt_offline_identity_v1', JSON.stringify({
            profile: { name: 'Cold Start', email: 'cold@example.com', given_name: 'Cold' },
            spreadsheetId: 'cold-book',
            gender: 'female',
            validatedAt: Date.now(),
        }));
        delete window.google;
        delete window.gapi;
        root = createRoot(container);

        await act(async () => root.render(<AuthProvider><Probe /></AuthProvider>));
        await vi.waitFor(() => expect(currentAuth.loading).toBe(false));

        expect(currentAuth.user?.getEmail()).toBe('cold@example.com');
        expect(currentAuth.spreadsheetId).toBe('cold-book');
        expect(currentAuth.token).toBeNull();
    });

    it('prefers the current tab identity over another tab\'s last-used account', async () => {
        await act(async () => root.unmount());

        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        sessionStorage.setItem('lt_google_session', JSON.stringify({
            accessToken: 'expired-token-not-persisted-again',
            expiresAt: Date.now() - 1000,
            profile: { name: 'Tab A', email: 'a@example.com', given_name: 'A' },
            spreadsheetId: 'book-a',
            gender: 'male',
        }));
        localStorage.setItem('lt_offline_identity_v1', JSON.stringify({
            profile: { name: 'Tab B', email: 'b@example.com', given_name: 'B' },
            spreadsheetId: 'book-b',
            gender: 'female',
        }));
        delete window.google;
        delete window.gapi;
        root = createRoot(container);

        await act(async () => root.render(<AuthProvider><Probe /></AuthProvider>));
        await vi.waitFor(() => expect(currentAuth.loading).toBe(false));

        expect(currentAuth.user?.getEmail()).toBe('a@example.com');
        expect(currentAuth.spreadsheetId).toBe('book-a');
        expect(currentAuth.token).toBeNull();
    });

    it('keeps the validated identity when an OAuth request fails while offline', async () => {
        await act(async () => root.unmount());

        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        localStorage.setItem('lt_offline_identity_v1', JSON.stringify({
            profile: { name: 'Offline User', email: 'offline@example.com', given_name: 'Offline' },
            spreadsheetId: 'offline-book',
            gender: 'male',
        }));
        root = createRoot(container);

        await act(async () => root.render(<AuthProvider><Probe /></AuthProvider>));
        await act(async () => Promise.resolve());
        act(() => currentAuth.signIn());
        await act(async () => oauthCallback({ error: 'temporarily_unavailable' }));

        expect(currentAuth.user?.getEmail()).toBe('offline@example.com');
        expect(currentAuth.spreadsheetId).toBe('offline-book');
        expect(localStorage.getItem('lt_offline_identity_v1')).not.toBeNull();
    });
});
