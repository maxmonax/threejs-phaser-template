
export interface ILogger {
    logDebug(aMsg: string, aData?: any);
    logWarn(aMsg: string, aData?: any);
    logError(aMsg: string, aData?: any);
}