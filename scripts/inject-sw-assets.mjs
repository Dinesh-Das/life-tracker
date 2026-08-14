import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');

async function walkFiles(directory, relativeTo = directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await walkFiles(absolute, relativeTo));
        else if (entry.isFile()) files.push(path.relative(relativeTo, absolute));
    }
    return files;
}

export function renderServiceWorker(template, assets, cacheVersion) {
    const assetMarker = '/* __BUILD_ASSETS__ */ []';
    const versionMarker = '__BUILD_CACHE_VERSION__';
    if (!template.includes(assetMarker) || !template.includes(versionMarker)) {
        throw new Error('Service-worker build markers are missing');
    }
    return template
        .replace(assetMarker, JSON.stringify([...assets].sort()))
        .replace(versionMarker, cacheVersion);
}

export async function injectServiceWorkerAssets(distDirectory) {
    const allFiles = (await walkFiles(distDirectory)).sort();
    const assetFiles = allFiles.filter(file => file.startsWith(`assets${path.sep}`) || file.startsWith('assets/'));
    const assetUrls = assetFiles.map(file => `/${file.split(path.sep).map(encodeURIComponent).join('/')}`);

    const hash = createHash('sha256');
    for (const file of allFiles) {
        if (file === 'sw.js') continue;
        hash.update(file);
        hash.update(await readFile(path.join(distDirectory, file)));
    }
    const cacheVersion = hash.digest('hex').slice(0, 16);
    const workerPath = path.join(distDirectory, 'sw.js');
    const template = await readFile(workerPath, 'utf8');
    const rendered = renderServiceWorker(template, assetUrls, cacheVersion);
    await writeFile(workerPath, rendered, 'utf8');
    return { assets: assetUrls, cacheVersion };
}

async function main() {
    const result = await injectServiceWorkerAssets(path.join(PROJECT_ROOT, 'dist'));
    console.info(`Service worker precached ${result.assets.length} build assets (${result.cacheVersion}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
