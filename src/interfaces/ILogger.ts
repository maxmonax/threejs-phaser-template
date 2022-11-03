
export interface ILogger {
    logDebug(aMsg: string, aData?: any): void;
    logWarn(aMsg: string, aData?: any): void;
    logError(aMsg: string, aData?: any): void;
}