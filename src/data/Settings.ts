
/**
 * Global parameters
 */
export class Settings {

    static readonly assetsPath = './assets/';

    static domThreejsParent: HTMLElement;
    static domPhaserParent: HTMLElement;

    // render
    static readonly BG_COLOR = 0x0;
    static AA_TYPE = 1; // 0 - none, 1 - FXAA, 2 - SMAA

    // game
    static readonly METER_SIZE = 20;

    static readonly Phaser = {

        GW: 2400,
        GH: 1080,

        GW_HALF: 2400 / 2,
        GH_HALF: 1080 / 2,

        GW_SAFE: 1440,
        GH_SAFE: 1080,

        TAP_TO_START: true,
        DRAW_DEBUG_BORDER: true

    };

};
