import { Params } from "../../data/Params";
import { Settings } from "../../data/Settings";
import { GameLoader } from "../../threejs/GameLoader";
import { LogMng } from "../../utils/LogMng";
import { PreloaderBar } from "../gui/preloader/PreloaderBar";

export class MenuScene extends Phaser.Scene {

    private dummyMain: Phaser.GameObjects.Container;

    // GUI
    private btnClose: Phaser.GameObjects.Image;
    private blackCurtain: Phaser.GameObjects.Graphics;

    // flags
    private isPointerDown = false;
    
    private music: Phaser.Sound.BaseSound;


    constructor() {
        super('MenuScene');
    }

    public init(aData: any) {
        
    }

    public preload(): void {
        this.load.audio('btn', ['./assets/audio/btn.mp3']);
        this.load.audio('music', ['./assets/audio/music.mp3']);

    }

    public create(): void {
        this.dummyMain = this.add.container(0, 0);

        this.btnClose = new Phaser.GameObjects.Image(this, 0, 80, 'game', 'btnClose');
        this.btnClose.setInteractive({ cursor: 'pointer' });
        this.updateBtnClosePos();
        this.add.existing(this.btnClose);

        this.blackCurtain = this.add.graphics();
        this.blackCurtain.fillStyle(0x111111);
        this.blackCurtain.fillRect(0, 0, Settings.Phaser.GW, Settings.Phaser.GH);
        this.hideBlackCurtain();
        
        // music
        // if (!Params.music) {
        //     Params.music = this.sound.add('music', { loop: true, volume: .2 });
        //     Params.music.play();
        // }
        // else {
        //     Params.music.volume = .2;
        // }

        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
        
        this.input.on('dragstart', this.onDragStart, this);
        this.input.on('drag', this.onDrag, this);
        this.input.on('dragend', this.onDragEnd, this);

        this.events.once('shutdown', this.shutdown, this);

        this.scale.on('resize', this.onResize, this);
        this.onResize();
    }

    private onResize() {
        this.updateBtnClosePos();
    }

    private hideBlackCurtain(cb?: Function, ctx?: any) {
        this.tweens.killTweensOf(this.blackCurtain);
        this.tweens.add({
            targets: this.blackCurtain,
            alpha: 0,
            duration: 250,
            onComplete: () => {
                this.blackCurtain.visible = false;
                if (cb) cb.call(ctx);
            }
        });
    }

    private showBlackCurtain(cb?: Function, ctx?: any) {
        this.tweens.killTweensOf(this.blackCurtain);
        this.blackCurtain.alpha = 0;
        this.blackCurtain.visible = true;
        this.tweens.add({
            targets: this.blackCurtain,
            alpha: 1,
            duration: 250,
            onComplete: () => {
                if (cb) cb.call(ctx);
            }
        });
    }

    private updateBtnClosePos() {
        if (this.btnClose) {
            this.btnClose.x = (Settings.Phaser.GW - Params.Phaser.gameWidth) / 2 + 80;
        }
    }

    private onPointerDown(aPointer, aObj) {
        this.isPointerDown = true;

        if (aObj[0] == this.btnClose) {
            this.sound.play('btn');
            this.btnClose['isMouseDown'] = true;
        }

    }

    private onPointerUp(aPointer, aObj) {
        
        if (this.btnClose) {
            if (aObj[0] == this.btnClose && this.btnClose['isMouseDown']) {
                // this.onCloseClick();
            }
            this.btnClose['isMouseDown'] = false;
        }

        this.isPointerDown = false;

    }

    private onPointerMove(aPointer) {
        if (!this.isPointerDown) return;
    }

    private onDragStart(aPointer, aObj) {

    }

    private onDrag(aPointer, aObj, dragX, dragY) {

    }

    private onDragEnd(aPointer, aObj) {

    }

    private shutdown() {

    }

    update(allTime: number, dt: number) {
        
    }

}