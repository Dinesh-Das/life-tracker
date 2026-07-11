import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Modal from './Modal';

describe('Modal accessibility', () => {
    it('places dialog semantics on the focusable content, not the backdrop', () => {
        const html = renderToStaticMarkup(<Modal isOpen onClose={() => {}} title="Edit habit"><button>Save</button></Modal>);
        expect(html).toContain('role="dialog"');
        expect(html).toContain('aria-modal="true"');
        expect(html).toContain('tabindex="-1"');
        expect(html).toContain('aria-hidden="true"');
    });
});
