import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HabitCheckbox from './HabitCheckbox';

describe('HabitCheckbox accessibility', () => {
    it('provides the habit, day, and current state as its accessible name', () => {
        const html = renderToStaticMarkup(
            <HabitCheckbox status="skip" label="Read, day 4" onClick={() => {}} />,
        );
        expect(html).toContain('aria-label="Read, day 4: frozen, neutral"');
        expect(html).toContain('aria-pressed="false"');
    });

    it('disables future checkboxes and announces why', () => {
        const html = renderToStaticMarkup(
            <HabitCheckbox status={false} label="Train, day 20" disabled onClick={() => {}} />,
        );
        expect(html).toContain('disabled=""');
        expect(html).toContain('aria-label="Train, day 20: future, unavailable"');
    });
});
