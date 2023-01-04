import { ThreeLoader } from '../utils/threejs/ThreeLoader';
import { TEXTURE_LOAD_LIST } from '../data/TextureData';
import { MODEL_LOAD_LIST } from '../data/ModelData';
import { Params } from '../data/Params';
import { Settings } from '../data/Settings';
import { Callbacks } from '../utils/Types';

export class GameLoader {

    private static instance: GameLoader = null;
    private _loader: ThreeLoader;

    private constructor() {
        if (GameLoader.instance) {
            throw new Error("Don't use GameLoader.constructor(), it's SINGLETON, use getInstance() method");
        }
        // init ThreeLoader
        this._loader = ThreeLoader.getInstance({
            retryCount: 2
        });
    }

    static getInstance(): GameLoader {
        if (!GameLoader.instance) GameLoader.instance = new GameLoader();
        return GameLoader.instance;
    }
    
    loadInit(aCallbacks?: Callbacks) {
        let setId = this._loader.createNewSet(aCallbacks);
        this.addInitAssets(setId);
        this._loader.startSetLoading(setId);
    }
    
    private addInitAssets(aSetId: number) {

        let assetsPath = Settings.assetsPath;

        // models
        for (let i = 0; i < MODEL_LOAD_LIST.length; i++) {
            const item = MODEL_LOAD_LIST[i];
            this._loader.addFileToSet(aSetId, {
                alias: item.alias,
                file: assetsPath + item.file
            });
        }
        
        // textures
        for (let i = 0; i < TEXTURE_LOAD_LIST.length; i++) {
            const item = TEXTURE_LOAD_LIST[i];
            this._loader.addFileToSet(aSetId, {
                alias: item.alias,
                file: assetsPath + item.file
            });
        }

    }

}
