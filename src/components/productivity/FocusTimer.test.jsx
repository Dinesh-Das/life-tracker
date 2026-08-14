import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FocusTimer from './FocusTimer';

const keyFor = spreadsheetId => `lt_focus_active:${encodeURIComponent(spreadsheetId)}`;

describe('FocusTimer persistence', () => {
    let container;
    let root;

    beforeEach(() => {
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        localStorage.clear();
    });

    it('restores paused progress instead of discarding it', async () => {
        localStorage.setItem(keyFor('book-a'), JSON.stringify({
            id: 'paused-session',
            mode: 'WORK',
            startedAt: Date.now() - 60_000,
            running: false,
            remaining: 840,
            endsAt: null,
        }));

        await act(async () => root.render(
            <FocusTimer spreadsheetId="book-a" onSessionComplete={vi.fn()} />
        ));

        expect(container.textContent).toContain('14:00');
        expect(container.querySelector('[aria-label="Start focus timer"]')).not.toBeNull();
    });

    it('does not let an older completion erase a newly started timer', async () => {
        let finishLog;
        const logCompletion = vi.fn(() => new Promise(resolve => { finishLog = resolve; }));
        localStorage.setItem(keyFor('book-a'), JSON.stringify({
            id: 'completed-session',
            mode: 'WORK',
            startedAt: Date.now() - 30 * 60_000,
            running: true,
            remaining: 1,
            endsAt: Date.now() - 1_000,
        }));

        await act(async () => root.render(
            <FocusTimer spreadsheetId="book-a" onSessionComplete={logCompletion} />
        ));
        await vi.waitFor(() => expect(logCompletion).toHaveBeenCalledTimes(1));

        const reset = container.querySelector('[aria-label="Reset focus timer"]');
        await act(async () => reset.click());
        const start = container.querySelector('[aria-label="Start focus timer"]');
        await act(async () => start.click());

        const replacement = JSON.parse(localStorage.getItem(keyFor('book-a')));
        expect(replacement.id).not.toBe('completed-session');
        expect(replacement.running).toBe(true);

        await act(async () => finishLog({ queued: true }));

        expect(JSON.parse(localStorage.getItem(keyFor('book-a'))).id).toBe(replacement.id);
    });

    it('starts a fresh full session instead of logging again from zero', async () => {
        let finishLog;
        const logCompletion = vi.fn(() => new Promise(resolve => { finishLog = resolve; }));
        localStorage.setItem(keyFor('book-a'), JSON.stringify({
            id: 'just-completed',
            mode: 'WORK',
            startedAt: Date.now() - 30 * 60_000,
            running: true,
            remaining: 0,
            endsAt: Date.now() - 1_000,
        }));

        await act(async () => root.render(
            <FocusTimer spreadsheetId="book-a" onSessionComplete={logCompletion} />
        ));
        await vi.waitFor(() => expect(logCompletion).toHaveBeenCalledTimes(1));

        const start = container.querySelector('[aria-label="Start focus timer"]');
        await act(async () => start.click());
        const replacement = JSON.parse(localStorage.getItem(keyFor('book-a')));

        expect(replacement).toMatchObject({ mode: 'WORK', running: true, remaining: 1500 });
        expect(replacement.id).not.toBe('just-completed');
        expect(container.textContent).toContain('25:00');

        await act(async () => finishLog({ queued: true }));

        expect(logCompletion).toHaveBeenCalledTimes(1);
        expect(JSON.parse(localStorage.getItem(keyFor('book-a'))).id).toBe(replacement.id);
    });
});
