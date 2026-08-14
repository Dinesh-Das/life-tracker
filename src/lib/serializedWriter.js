/**
 * Keep asynchronous writes in issue order.
 *
 * Every task is attempted even when an earlier task failed. Consumers receive
 * their own task's result/error, while `idle()` can be used by unmount handlers
 * and tests to wait until the current chain has settled.
 */
export function createSerializedWriter() {
    let tail = Promise.resolve();
    let pending = 0;

    const run = (task) => {
        pending += 1;
        const execution = tail.then(task, task);
        const result = execution.finally(() => {
            pending = Math.max(0, pending - 1);
        });
        tail = result.catch(() => {});
        return result;
    };

    return {
        run,
        idle: () => tail,
        hasPending: () => pending > 0,
    };
}
