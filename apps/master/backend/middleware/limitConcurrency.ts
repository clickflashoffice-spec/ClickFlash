
/**
 * Simple concurrency limiter to avoid 'p-limit' dependency.
 * @param concurrency Maximum number of concurrent executions
 * @returns A function that accepts a generator/thunk and returns a promise
 */
export function limitConcurrency(concurrency: number) {
    const queue: (() => void)[] = [];
    let activeCount = 0;

    const next = () => {
        activeCount--;
        if (queue.length > 0) {
            const job = queue.shift();
            if (job) job();
        }
    };

    const run = <T>(fn: () => Promise<T>): Promise<T> => {
        const execute = async (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
            activeCount++;
            try {
                const result = await fn();
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                next();
            }
        };

        return new Promise((resolve, reject) => {
            if (activeCount < concurrency) {
                execute(resolve, reject);
            } else {
                queue.push(() => execute(resolve, reject));
            }
        });
    };

    return run;
}
