import { Settings } from "../data/Settings";
import { ILogger } from "../interfaces/ILogger";
import { LogMng } from "../utils/LogMng";
import { Callbacks } from "../utils/Types";
import { GameLoader } from "./GameLoader";
import { GameRender } from "./GameRender";

export class Game3dMng implements ILogger {

    private static instance: Game3dMng = null;

    private _gameRender: GameRender;

    private constructor() {
        if (Game3dMng.instance) {
            throw new Error("Don't use Game3dMng.constructor(), it's SINGLETON, use getInstance() method");
        }
        this._gameRender = new GameRender();
    }

    static getInstance(): Game3dMng {
        if (!Game3dMng.instance) Game3dMng.instance = new Game3dMng();
        return Game3dMng.instance;
    }

    logDebug(aMsg: string, aData?: any) {
        LogMng.debug(aMsg, aData);
    }

    logWarn(aMsg: string, aData?: any) {
        LogMng.warn(aMsg, aData);
    }

    logError(aMsg: string, aData?: any) {
        LogMng.error(aMsg, aData);
    }

    loadInit(aCallbacks?: Callbacks) {
        GameLoader.getInstance().loadInit(aCallbacks);
    }
    
}