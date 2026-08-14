import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TermsOfService, { TERMS_LAST_UPDATED } from './TermsOfService';

vi.mock('react-router', () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

describe('TermsOfService version', () => {
    it('renders the explicit legal-document version instead of the current date', () => {
        const html = renderToStaticMarkup(
            <TermsOfService />,
        );
        expect(TERMS_LAST_UPDATED).toBe('August 1, 2026');
        expect(html).toContain('Last updated: August 1, 2026');
    });
});
