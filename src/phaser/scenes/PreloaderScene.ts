import { Settings } from "../../data/Settings";
import { Game3dMng } from "../../threejs/Game3dMng";
import { LogMng } from "../../utils/LogMng";
import { PreloaderBar } from "../gui/preloader/PreloaderBar";

enum Texts {
    Title = 'Loading complete',
    Message = 'Click anywhere to start'
}

enum Styles {
    Color = '#AAAAAA',
    Font = 'Arial'
}

const percentage3d = 0.6;

export class PreloaderScene extends Phaser.Scene {
    private _bg: Phaser.GameObjects.Image;
    private _bar: PreloaderBar;

    private _loadingProgress = {
        progress2d: 0,
        progress3d: 0,
    };
    private _loadingComplete = {
        loading2d: false,
        loading3d: false
    };
    
    constructor() {
        super('PreloaderScene');
    }

    public preload(): void {
        // this._bg = this.add.image(Settings.Phaser.GW_HALF, Settings.Phaser.GH_HALF, 'preloader', 'bg');

        if (Settings.Phaser.TAP_TO_START) {
            this._bar = new PreloaderBar(this, Settings.Phaser.GW_HALF, Settings.Phaser.GH_HALF + 200, true);
            this.add.existing(this._bar);
        }

        const assetsPath = `${Settings.assetsPath}sprites/`;

        // atlases
        this.load.setPath(`${assetsPath}atlases/`);
        this.load.atlas('game', 'game.png', 'game.json');

        // images

        // events
        this.load.on('progress', (aValue: number) => {
            // aValue: loading progress 0..1
            this._loadingProgress.progress2d = aValue;
            this.onLoadingProgress();
        }, this);

        this.load.on('complete', () => {
            this._loadingComplete.loading2d = true;
            this.checkLoadComplete();
        }, this);

        Game3dMng.getInstance().loadInit({
            context: this,
            onProgress: (aProgress: number) => {
                LogMng.debug(`3d init loading progress ${aProgress}...`);
                this._loadingProgress.progress3d = aProgress;
                this.onLoadingProgress();
            },
            onComplete: () => {
                LogMng.debug(`3d init loading complete...`);
                this._loadingProgress.progress3d = 1;
                this.onLoadingProgress();
                this._loadingComplete.loading3d = true;
                this.checkLoadComplete();
            }
        });

    }

    private onLoadingProgress() {
        // debugger;
        let total = this._loadingProgress.progress3d * percentage3d + this._loadingProgress.progress2d * (1 - percentage3d);
        if (Settings.Phaser.TAP_TO_START) this._bar.progress = total;
        LogMng.debug(`onLoadingProgress: total = ${total}`);
    }

    private checkLoadComplete() {
        if (!this._loadingComplete.loading2d || !this._loadingComplete.loading3d) return;

        // loading complete
        
        LogMng.debug(`Loading complete!`);

        if (Settings.Phaser.DRAW_DEBUG_BORDER) {
            let rFullArea = this.add.rectangle(Settings.Phaser.GW / 2, Settings.Phaser.GH / 2,
                Settings.Phaser.GW, Settings.Phaser.GH, 0x00FF00, 0.1);
            let rSafeArea = this.add.rectangle(Settings.Phaser.GW / 2, Settings.Phaser.GH / 2,
                Settings.Phaser.GW_SAFE, Settings.Phaser.GH_SAFE, 0x0000FF, 0.1);
        }

        if (Settings.Phaser.TAP_TO_START) {

            this.add.text(Settings.Phaser.GW_HALF, Settings.Phaser.GH_HALF - 100,
                Texts.Title,
                {
                    font: `90px ${Styles.Font}`,
                    color: Styles.Color
                })
                .setOrigin(0.5);

            this.add.text(Settings.Phaser.GW_HALF, Settings.Phaser.GH_HALF + 20,
                Texts.Message,
                {
                    font: `50px ${Styles.Font}`,
                    color: Styles.Color
                })
                .setOrigin(0.5);

            this.input.once('pointerdown', () => {
                this.scene.start('MenuScene');
            });
        }
        else {
            this.scene.start('MenuScene');
        }

    }

    public create(): void {

    }

    public update() {

    }


}