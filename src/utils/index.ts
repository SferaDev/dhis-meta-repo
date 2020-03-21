/**
 * @async
 * @param ms: Time to wait before resolving the promise
 */
export const timeout = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
