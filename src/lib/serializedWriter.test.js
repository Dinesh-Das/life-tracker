import { describe, expect, it } from 'vitest';
import { createSerializedWriter } from './serializedWriter';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('createSerializedWriter', () => {
    it('does not start a newer write until the older write settles', async () => {
        const writer = createSerializedWriter();
        const first = deferred();
        const calls = [];

        const firstResult = writer.run(async () => {
            calls.push('first:start');
            await first.promise;
            calls.push('first:end');
            return 'first';
        });
        const secondResult = writer.run(async () => {
            calls.push('second');
            return 'second';
        });

        await Promise.resolve();
        expect(calls).toEqual(['first:start']);
        expect(writer.hasPending()).toBe(true);

        first.resolve();
        await expect(firstResult).resolves.toBe('first');
        await expect(secondResult).resolves.toBe('second');
        expect(calls).toEqual(['first:start', 'first:end', 'second']);
        await writer.idle();
        expect(writer.hasPending()).toBe(false);
    });

    it('continues the chain after a failed write', async () => {
        const writer = createSerializedWriter();
        const failure = writer.run(() => Promise.reject(new Error('offline')));
        const success = writer.run(() => 'saved');

        await expect(failure).rejects.toThrow('offline');
        await expect(success).resolves.toBe('saved');
    });
});
