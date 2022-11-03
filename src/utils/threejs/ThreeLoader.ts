import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { LogMng } from "../LogMng";
import { Callbacks } from "../Types";

export enum ThreeLoaderResourceType {
    texture = 'texture',
    cubeTexture = 'cubeTexture',
    obj = 'obj',
    fbx = 'fbx',
    glb = 'glb',
    gltf = 'gltf',
    json = 'json',
    font = 'font',
    gz = 'gz',
    gzip = 'gzip'
};

enum AliasPreference {
    texture = 't_',
    model = 'm_',
    json = 'json_'
};

type LoaderParams = {
    isDebugMode?: boolean;
    retryCount?: number;
    textureMapping?: THREE.Mapping;
    textureEncoding?: THREE.TextureEncoding;
};

type LoadItem = {
    type?: string;
    alias: string;
    file?: string;
    files?: string[];
};

type SetItem = {
    loadItem: LoadItem[],
    callbacks: Callbacks[],
    loadCounter: number
};

export class ThreeLoader {

    private static instance: ThreeLoader = null;

    _params: LoaderParams;

    private cache: { [index: string]: any } = {};
    private sets: { [index: number]: SetItem } = {};

    private retryCount = 0;
    private setCounter = 0;

    private constructor(aParams: LoaderParams) {
        if (ThreeLoader.instance) {
            throw new Error("Don't use ThreeLoader.constructor(), it's SINGLETON, use getInstance() method");
        }
        this._params = aParams || {};
        if (!this._params.isDebugMode) this._params.isDebugMode = false;
        if (!this._params.retryCount) this._params.retryCount = 0;
    }

    static getInstance(aParams: LoaderParams = null): ThreeLoader {
        if (!ThreeLoader.instance) ThreeLoader.instance = new ThreeLoader(aParams);
        return ThreeLoader.instance;
    }

    private logDebug(aMessage: string) {
        LogMng.debug('ThreeLoader: ' + aMessage);
    }

    private logWarn(aMessage: string) {
        LogMng.warn('ThreeLoader: ' + aMessage);
    }

    private logError(aMessage: string) {
        LogMng.error('ThreeLoader: ' + aMessage);
    }

    private getResType(aFileName: string): string {

        let fileType = '';
        for (let i = aFileName.length - 1; i >= 0; i--) {
            if (aFileName[i] == '.') {
                if (fileType == ThreeLoaderResourceType.gz || fileType == ThreeLoaderResourceType.gzip) {
                    fileType = '';
                    continue;
                }
                break;
            }
            else {
                fileType = aFileName[i] + fileType;
            }
        }

        fileType.toLowerCase();

        switch (fileType) {
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'bmp':
            case 'gif':
            case 'dds':
            case 'mp4':
            case 'ogg':
            case 'ogv':
                return ThreeLoaderResourceType.texture;
                break;

            default:
                return fileType;
                break;
        }

    }

    private isItemLoaded(aKey: string): boolean {
        // check in cache
        if (this.cache[aKey]) {
            this.logWarn(`itemExists ${aKey}:`);
            console.log(this.cache[aKey]);
            return true;
        }
        return false;
    }

    /**
     * Create new loading set and return set id
     */
    createNewSet(aCallbacks?: Callbacks): number {
        this.setCounter++;
        let setId = this.setCounter;
        this.sets[setId] = {
            loadItem: [],
            callbacks: aCallbacks ? [aCallbacks] : [],
            loadCounter: 0
        };
        return setId;
    }

    startSetLoading(aSetId: number, aCallbacks?: Callbacks) {
        let setData = this.sets[aSetId];
        if (aCallbacks) setData.callbacks.push(aCallbacks);

        if (setData.loadItem.length <= 0) {
            this.onSetLoaded(aSetId);
            return;
        }

        for (let i = 0; i < setData.loadItem.length; i++) {
            const item = setData.loadItem[i];
            if (this.isItemLoaded(item.alias)) {
                this.logWarn(`item ${item.alias} already loaded!`);
                continue;
            }
            this.loadSetItem(aSetId, item);
        }
    }

    addFileToSet(aSetId: number, aAlias: string, aFile: string) {
        if (this.isItemLoaded(aAlias)) {
            this.logError(`addFileToSet() -> File with same alias (${aAlias}) already exists in cache!`);
            return;
        }
        this.sets[aSetId].loadItem.push({
            type: this.getResType(aFile),
            alias: aAlias,
            file: aFile
        });
    }

    /**
     * Load CubeTexture via CubeTextureLoader
     * @param aKey alias
     * @param files [px, nx, py, ny, pz, nz]
     * @returns 
     */
    addCubeTextureToSet(aSetId: number, aAlias: string, aFiles: string[]) {
        if (this.isItemLoaded(aAlias)) {
            this.logError(`addCubeTextureToSet() -> File with same alias (${aAlias}) already exists in cache!`);
            return;
        }
        // this.loadQueue.push({ type: ResType.cubeTexture, key: aAlias, files: files });
        this.sets[aSetId].loadItem.push({
            type: ThreeLoaderResourceType.cubeTexture,
            alias: aAlias,
            files: aFiles
        });
    }

    addFontToSet(aSetId: number, aAlias: string, aFile: string) {
        if (this.isItemLoaded(aAlias)) {
            this.logError(`addFontToSet() -> File with same alias (${aAlias}) already exists in cache!`);
            return;
        }
        // this.loadQueue.push({ type: ResType.font, key: aAlias, file: aFile });
        this.sets[aSetId].loadItem.push({
            type: ThreeLoaderResourceType.font,
            alias: aAlias,
            file: aFile
        });
    }

    loadSet(aSet: LoadItem[], aCallbacks: Callbacks) {

        let setId = this.createNewSet(aCallbacks);

        for (let i = 0; i < aSet.length; i++) {
            const item = aSet[i];
            switch (item.type) {

                case ThreeLoaderResourceType.cubeTexture:
                    this.addCubeTextureToSet(setId, item.alias, item.files);
                    break;

                case ThreeLoaderResourceType.font:
                    this.addFontToSet(setId, item.alias, item.file);

                default:
                    this.addFileToSet(setId, item.alias, item.file);
                    break;

            }
        }

        this.startSetLoading(setId);

    }

    private loadSetItem(aSetId: number, aData: LoadItem) {

        switch (aData.type) {

            case ThreeLoaderResourceType.texture:
                this.loadTexture(aData.alias, aData.file, {
                    onComplete: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    },
                    onError: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    }
                });
                break;

            case ThreeLoaderResourceType.cubeTexture:
                this.loadCubeTexture(aData.alias, aData.files, {
                    onComplete: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    },
                    onError: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    }
                });
                break;

            case ThreeLoaderResourceType.obj:
                this.loadObj(aData.alias, aData.file, {
                    onComplete: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    },
                    onError: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    }
                });
                break;

            case ThreeLoaderResourceType.fbx:
                this.loadFBX(aData.alias, aData.file, {
                    onComplete: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    },
                    onError: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    }
                });
                break;

            case ThreeLoaderResourceType.glb:
            case ThreeLoaderResourceType.gltf:
                this.loadGLB(aData.alias, aData.file, {
                    onComplete: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    },
                    onError: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    }
                });
                break;

            case ThreeLoaderResourceType.json:
                this.loadJSON(aData.alias, aData.file, {
                    onComplete: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    },
                    onError: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    }
                });
                break;

            case ThreeLoaderResourceType.font:
                this.loadFont(aData.alias, aData.file, {
                    onComplete: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    },
                    onError: () => {
                        this.onSetFileLoaded(aSetId, aData);
                    }
                });
                break;

            default:
                this.logError('loadByData() -> unknown data type: ' + aData.type);
                break;
        }

    }

    private onSetFileLoaded(aSetId: number, aData: LoadItem) {
        let sd = this.sets[aSetId];
        sd.loadCounter = Math.min(sd.loadCounter + 1, sd.loadItem.length);

        if (this._params.isDebugMode) {
            console.log(`onSetFileLoaded: `, {
                loadCounter: sd.loadCounter,
                totalFiles: sd.loadItem.length
            });
        }

        if (sd.loadItem.length == 0 || sd.loadCounter == sd.loadItem.length) {
            this.onSetLoaded(aSetId);
        }
    }

    private onSetLoaded(aSetId: number) {
        let sd = this.sets[aSetId];
        for (let i = 0; i < sd.callbacks.length; i++) {
            const cb = sd.callbacks[i];
            if (cb.onComplete) cb.onComplete.call(cb.context);
        }
        // clear set
        this.sets[aSetId] = null;
    }

    /**
     * 
     * @param aAlias 
     * @param aFile 
     * @param ctx 
     */
    private loadTexture(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let loader = new THREE.TextureLoader();
        loader.crossOrigin = "Anonymous";
        loader.load(aFile,
            (tex: THREE.Texture) => {
                // loaded
                if (this._params.textureMapping) tex.mapping = this._params.textureMapping;
                if (this._params.textureEncoding) tex.encoding = this._params.textureEncoding;
                if (this._params.isDebugMode) {
                    this.logDebug(`loadTexture -> (${aAlias}) file(${aFile}):`);
                    console.log(tex);
                }
                this.cache[aAlias] = tex;
                //this.onItemLoaded();
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            null,
            (err) => {
                // error
                if (this.retryCount > 0) {
                    aRetryCount++;
                    if (aRetryCount <= this.retryCount) {
                        this.logWarn(`loadTexture -> retry loading ${aRetryCount} (${aAlias})`);
                        setTimeout(() => {
                            this.loadTexture(aAlias, aFile, aCallbacks, aRetryCount);
                        }, 100);
                    }
                    else {
                        this.logError(`loadTexture -> (${aAlias}) ERROR (try cnt ${this.retryCount}):`);
                        console.log(err);
                        if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                    }
                }
                else {
                    this.logError('loadTexture error:');
                    this.logError(`alias: ${aAlias}; file: ${aFile};`);
                    console.log(err);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                }
            });
    }

    private loadCubeTexture(aAlias: string, aFiles: string[], aCallbacks?: Callbacks, aRetryCount = 0) {
        let cache = this.cache;
        let loader = new THREE.CubeTextureLoader();
        loader.crossOrigin = "Anonymous";
        loader.load(aFiles,
            (aTex: THREE.CubeTexture) => {
                // loaded
                if (this._params.textureMapping) aTex.mapping = this._params.textureMapping;
                if (this._params.textureEncoding) aTex.encoding = this._params.textureEncoding;
                if (this._params.isDebugMode) console.log(`loadCubeTexture: load complete (${aAlias}):`, aTex);
                cache[aAlias] = aTex;
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (xhr) => {

            },
            (err) => {
                // error
                if (this.retryCount > 0) {
                    aRetryCount++;
                    if (aRetryCount <= this.retryCount) {
                        this.logWarn(`loadCubeTexture -> retry loading ${aRetryCount} (${aAlias})`);
                        setTimeout(() => {
                            this.loadCubeTexture(aAlias, aFiles, aCallbacks, aRetryCount);
                        }, 100);
                    }
                    else {
                        this.logError(`loadCubeTexture error (try cnt ${this.retryCount}):`);
                        console.log(err);
                        if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                    }
                }
                else {
                    this.logError('loadCubeTexture error:');
                    this.logError(`alias: ${aAlias};`);
                    console.log(`files: `, aFiles);
                    console.log(err);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                }
            });
    }

    private loadObj(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        var loader = new OBJLoader();
        loader.load(aFile,
            (aObj: THREE.Group) => {
                this.cache[aAlias] = aObj;
                if (this._params.isDebugMode) console.log('loadObj: load complete (' + aAlias + '):', aObj);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (xhr) => {
                //debug('OBJ loading progress: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                if (this.retryCount > 0) {
                    aRetryCount++;
                    if (aRetryCount <= this.retryCount) {
                        this.logWarn(`loadObj -> retry loading ${aRetryCount} (${aAlias})`);
                        setTimeout(() => {
                            this.loadObj(aAlias, aFile);
                        }, 100);
                    }
                    else {
                        this.logError(`loadObj -> ERROR (try cnt ${this.retryCount}):`);
                        console.log(error);
                        if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                    }
                }
                else {
                    this.logError(`loadObj -> ERROR (${aAlias}):`);
                    console.log(error);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                }
            }
        );
    }

    private loadFBX(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let loader = new FBXLoader();
        loader.load(aFile,
            (aObj: THREE.Group) => {
                if (this._params.isDebugMode) console.log('loadFBX: load complete (' + aAlias + '):', aObj);
                this.cache[aAlias] = aObj;
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (xhr) => {
                //debug('FBX loading progress: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                if (this.retryCount > 0) {
                    aRetryCount++;
                    if (aRetryCount <= this.retryCount) {
                        this.logWarn(`loadFBX: retry loading ${aRetryCount} (${aAlias})`);
                        setTimeout(() => {
                            this.loadFBX(aAlias, aFile, aCallbacks, aRetryCount);
                        }, 100);
                    }
                    else {
                        this.logError(`loadFBX error (try cnt ${this.retryCount}):`);
                        console.log(error);
                        if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                    }
                }
                else {
                    this.logError('loadFBX error:');
                    console.log(error);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                }
            }
        );
    }

    private loadGLB(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let loader = new GLTFLoader();
        loader.load(aFile,
            (aObj: GLTF) => {
                this.cache[aAlias] = aObj;
                if (this._params.isDebugMode) console.log(`loadGLB: load complete (${aAlias}):`, aObj);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (xhr) => {
                //if (xhr.total > 0) this.logDebug('GLB loading progress: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                if (this.retryCount > 0) {
                    aRetryCount++;
                    if (aRetryCount <= this.retryCount) {
                        this.logWarn(`loadGLB: retry loading ${aRetryCount} (${aAlias})`);
                        setTimeout(() => {
                            this.loadGLB(aAlias, aFile);
                        }, 100);
                    }
                    else {
                        this.logError(`loadGLB failed: number of tries: ${this.retryCount}`);
                        this.logError(`key: ${aAlias}; file: ${aFile};`);
                        console.log(error);
                        if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                    }
                }
                else {
                    this.logError(`loadGLB error:`);
                    this.logError(`key: ${aAlias}; file: ${aFile};`);
                    console.log(error);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                }
            }
        );
    }

    private loadJSONFromUrl(url: string, aCallback: Function) {
        const HEADERS = {
            requestedWith: false,
            json: 'application/json',
            xml: 'application/xml'
        };
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.setRequestHeader('X-Requested-With', 'true');
        xhr.setRequestHeader('Accept', HEADERS.json);
        xhr.onload = () => {
            let status = xhr.status;
            if (xhr.readyState === 4 && status >= 400 && status <= 599) { // Handle HTTP status codes of 4xx and 5xx as errors, even if xhr.onerror was not called.
                aCallback(status, xhr.response);
            }
            else {
                aCallback(null, xhr.response);
            }
        };
        xhr.send();
    }

    private loadJSON(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        this.loadJSONFromUrl(aFile,
            (aError, aData) => {
                if (aError !== null) {
                    if (this.retryCount > 0) {
                        aRetryCount++;
                        if (aRetryCount <= this.retryCount) {
                            this.logWarn(`loadJSON: retry loading ${aRetryCount} (${aAlias})`);
                            setTimeout(() => {
                                this.loadJSON(aAlias, aFile, aCallbacks, aRetryCount);
                            }, 100);
                        }
                        else {
                            this.logError(`loadJSON error (try cnt ${this.retryCount}):`);
                            console.log(aError);
                            if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                        }
                    }
                    else {
                        this.logError('loadJSON error:');
                        console.log(aError);
                        if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                    }
                }
                else {
                    this.cache[aAlias] = aData;
                    if (this._params.isDebugMode) console.log(`loadJSON: load complete (${aAlias}):`, aData);
                    // this.onItemLoaded();
                    if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
                }
            }
        );
    }

    private loadFont(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let fontLoader = new FontLoader();
        fontLoader.load(aFile,
            (aFont: Font) => {
                this.cache[aAlias] = aFont;
                if (this._params.isDebugMode) console.log(`loadFont: load complete (${aAlias}):`, aFont);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (event) => {
                // on progress event
            },
            (error) => {
                if (this.retryCount > 0) {
                    aRetryCount++;
                    if (aRetryCount <= this.retryCount) {
                        this.logWarn(`loadFont: retry loading ${aRetryCount} (${aAlias})`);
                        setTimeout(() => {
                            this.loadFont(aAlias, aFile);
                        }, 100);
                    }
                    else {
                        this.logError(`loadFont error (try cnt ${this.retryCount}):`);
                        console.log(error);
                        if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                    }
                }
                else {
                    this.logError(`loadFont error:`);
                    console.log(error);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context);
                }
            }
        );
    }


    getTexture(aAlias: string): THREE.Texture {
        let data = this.cache[aAlias];
        if (!data) this.logWarn('getTexture() -> key not found: ' + aAlias);
        return data;
    }

    getCubeTexture(aAlias: string): THREE.CubeTexture {
        let data = this.cache[aAlias];
        if (!data) this.logWarn('getCubeTexture() -> key not found: ' + aAlias);
        return data;
    }

    /**
     * Get model for .obj .fbx
     */
    getModel(aAlias: string, aGetRealData = false): THREE.Group {
        let data = this.cache[aAlias];
        if (!data) this.logWarn('getModel() -> key not found: ' + aAlias);
        if (data instanceof THREE.Group) {

            if (aGetRealData) return data;

            // try to clone
            let copy = data.clone(true);
            for (const key in data) {
                if (!Object.prototype.hasOwnProperty.call(copy, key)) {
                    copy[key] = data[key];
                }
            }
            return copy;
        }
        else {
            this.logWarn(`getModel() -> data for key (${aAlias}) is not THREE.Group, use anothe method!`);
            return null;
        }
    }

    getModelGLB(aAlias: string, isFullData = false): any {
        let data = this.cache[aAlias];
        if (!data) {
            LogMng.warn('ThreeLoader.getModelGLB() key not found: ' + aAlias);
            return;
        }

        if (data.scene && data.scene instanceof THREE.Group) {
            if (isFullData) return data;
            return data.scene.clone(true);
        }
        else {
            LogMng.warn(`ThreeLoader.getModelGLB() data for key (${aAlias}) is not GLB format, use anothe method!`);
            return null;
        }
    }

    getJSON(aAlias: string): any {
        let data = this.cache[aAlias];
        if (!data) LogMng.warn('ThreeLoader.getJSON() key not found: ' + aAlias);
        return data;
    }

    getFont(aAlias: string): Font {
        let font = this.cache[aAlias];
        if (!font) LogMng.warn('ThreeLoader.getFont() key not found: ' + aAlias);
        return font;
    }


}
