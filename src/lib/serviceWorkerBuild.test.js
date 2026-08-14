import { describe, expect, it } from 'vitest';
import { renderServiceWorker } from '../../scripts/inject-sw-assets.mjs';

describe('service-worker production asset injection', () => {
    it('injects sorted hashed assets and a content-derived cache version', () => {
        const template = [
            "const CACHE_VERSION = 'lifetracker-__BUILD_CACHE_VERSION__';",
            'const BUILD_ASSETS = /* __BUILD_ASSETS__ */ [];',
        ].join('\n');

        const result = renderServiceWorker(
            template,
            ['/assets/index-z.js', '/assets/index-a.css'],
            'build123',
        );

        expect(result).toContain("'lifetracker-build123'");
        expect(result).toContain('["/assets/index-a.css","/assets/index-z.js"]');
        expect(result).not.toContain('__BUILD_');
    });

    it('fails the build when the public worker no longer contains its markers', () => {
        expect(() => renderServiceWorker('const CACHE = "static";', [], 'build123'))
            .toThrow('Service-worker build markers are missing');
    });
});
