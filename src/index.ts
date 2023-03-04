import { GameBoot } from './GameBoot';
import { FrontEvents } from './events/FrontEvents';
import "./css/main.css";
import "./css/loader.css";

window.addEventListener('load', () => {
    let gameBoot = new GameBoot();
    let event = new CustomEvent('gameBootCreated', {
        detail: {
            gameBoot: gameBoot
        }
    });
    window.dispatchEvent(event);
}, false);

window.addEventListener('resize', () => {
    FrontEvents.onWindowResizeSignal.dispatch();
}, false);