
export type Callbacks = {
    onProgress?: (aProgress: number) => void,
    onComplete?: () => void,
    onError?: () => void,
    context?: any
};
