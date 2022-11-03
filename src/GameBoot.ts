import { LogMng } from "./utils/LogMng";
import { Settings } from './data/Settings';
import { Params } from './data/Params';
import { MyUtils } from './utils/MyUtils';
import { FrontEvents } from './events/FrontEvents';
import Phaser from 'phaser';
import { PreloaderScene } from './phaser/scenes/PreloaderScene';
import { MenuScene } from "./phaser/scenes/MenuScene";

type InitParams = {
    domThreejsParent: HTMLElement;
    domPhaserParent: HTMLElement;
    onLoadProgress?: (status: number) => void;
    onLoadComplete?: () => void;
};

export class GameBoot {

    private _initParams: InitParams;
    private _inited = false;

    init(aParams: InitParams) {

        if (this._inited) {
            LogMng.warn('GameBoot -> Game is already inited!');
            return;
        }
        this._inited = true;

        this._initParams = aParams;

        // init debug mode
        Params.isDebugMode = window.location.hash === '#debug';

        // LogMng settings
        if (!Params.isDebugMode) LogMng.setMode(LogMng.MODE_RELEASE);
        LogMng.system('log mode: ' + LogMng.getMode());

        Settings.domThreejsParent = aParams.domThreejsParent;
        if (!Settings.domThreejsParent) LogMng.warn(`Settings.domThreejsParent == null`);
        Settings.domPhaserParent = aParams.domPhaserParent;
        if (!Settings.domPhaserParent) LogMng.warn(`Settings.domPhaserParent == null`);


        // GET Params
        this.readGETParams();

        this.initPhaser();

        // Preloader
        // this.startPreloader();

    }

    private readGETParams() {

        const LIST = [
            {
                // anti aliasing
                keys: ['aa'],
                onReadHandler: (aValue: string) => {
                    Settings.AA_TYPE = Number(aValue);
                    LogMng.debug('Config.AA_TYPE = ' + Settings.AA_TYPE);
                }
            }
        ];

        for (let i = 0; i < LIST.length; i++) {
            const listItem = LIST[i];
            const keys = listItem.keys;
            for (let j = 0; j < keys.length; j++) {
                const getName = keys[j];
                let qValue = MyUtils.getQueryValue(getName);
                if (qValue != null && qValue != undefined) {
                    listItem.onReadHandler(qValue);
                }
            }
        }

    }

    private initPhaser() {

        // resize event
        FrontEvents.onWindowResizeSignal.add(this.onPhaserWindowResize);
        this.onPhaserWindowResize();

        new Phaser.Game({
            type: Phaser.WEBGL,
            parent: Settings.domPhaserParent,
            backgroundColor: 0x222222,
            transparent: true,
            //*
            scale: {
                mode: Phaser.Scale.HEIGHT_CONTROLS_WIDTH,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: Settings.Phaser.GW,
                height: Settings.Phaser.GH
            },
            // plugins: {
            // scene: [{ key: 'SpinePlugin', plugin: window['SpinePlugin'], mapping: 'spine' }]
            // },
            scene: [PreloaderScene, MenuScene]//, GameScene]
        });

    }

    private onPhaserWindowResize() {
        const gw = Settings.Phaser.GW;
        const gh = Settings.Phaser.GH;
        const ww = window.innerWidth;
        const wh = window.innerHeight;
        const scale = wh / gh; // scale by height
        Params.Phaser.gameWidth = Math.min(gw, ww / scale);
    }

    // private startPreloader() {
    //     this._preloader = new GamePreloader();

    //     let extOnLoadProgress: Function; 
    //     if (typeof this._initParams.onLoadProgress === 'function') {
    //         extOnLoadProgress = this._initParams.onLoadProgress;
    //     }

    //     this._preloader.onLoadProgressSignal.add((aProgressPercent: number) => {
    //         LogMng.debug(`loading: ${aProgressPercent}%`);
    //         if (extOnLoadProgress) extOnLoadProgress(aProgressPercent);
    //     }, this);

    //     this._preloader.onLoadCompleteSignal.addOnce(() => {
    //         this.onLoadingComplete();
    //         if (typeof this._initParams.onLoadComplete === 'function') {
    //             this._initParams.onLoadComplete();
    //         }
    //     }, this);

    //     this._preloader.start();
    // }

    // private onLoadingComplete() {
    //     new GameRender(this._initParams.domCanvasParent);
    // }

}
