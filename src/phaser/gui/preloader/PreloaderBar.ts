
export class PreloaderBar extends Phaser.GameObjects.Container {
    private useSimple = false;
    private lineMask: Phaser.GameObjects.Graphics;
    private barWidth = 0;
    private barHeight = 0;
        
    constructor(scene, x, y, aUseSimpleGraphics: boolean) {
        super(scene, x, y);

        this.useSimple = aUseSimpleGraphics;

        if (this.useSimple) {

            const w = 300;
            const h = 60;
            const border = 4;

            let bg = new Phaser.GameObjects.Graphics(this.scene, {
                x: 0,
                y: 0,
                lineStyle: {
                    color: 0x00bc77,
                    width: border
                },
                fillStyle: {
                    alpha: 0,
                    color: 0x00bc77
                }
            });
            bg.strokeRect(-w / 2 - border, -h / 2 - border, w + border * 2, h + border * 2);
            this.add(bg);

            let line = new Phaser.GameObjects.Graphics(this.scene, {
                x: 0,
                y: 0,
                lineStyle: {
                    color: 0x00ffa2,
                    width: 2
                },
                fillStyle: {
                    alpha: 1,
                    color: 0x00ffa2
                }
            });
            line.fillRect(-w / 2, -h / 2, w, h);
            this.add(line);

            this.barWidth = w;
            this.barHeight = h;

            this.lineMask = new Phaser.GameObjects.Graphics(this.scene);
            this.lineMask.clear();
            this.lineMask.fillStyle(0xFFFFFF, 1);
            this.lineMask.fillRect(0, 0, this.barWidth, this.barHeight);

            line.mask = this.lineMask.createGeometryMask();

        }
        else {

            let bg = new Phaser.GameObjects.Sprite(this.scene, 0, 0, 'preloader', 'bar_bg');
            this.add(bg);

            let line = new Phaser.GameObjects.Sprite(this.scene, 0, 0, 'preloader', 'bar_line');
            this.add(line);

            this.barWidth = line.width;
            this.barHeight = line.height;

            this.lineMask = new Phaser.GameObjects.Graphics(this.scene);
            this.lineMask.clear();
            this.lineMask.fillStyle(0xFFFFFF, 1);
            this.lineMask.fillRect(0, 0, this.barWidth, this.barHeight);

            line.mask = this.lineMask.createGeometryMask();
            
            let front = new Phaser.GameObjects.Sprite(this.scene, 0, 0, 'preloader', 'bar_front');
            this.add(front);

        }
        
        this.progress = 0;
    }

    public set progress(v: number) {
        // if (this.useSimple) {
        //     this.lineMask.clear();
        //     this.lineMask.fillRect(-this.barWidth / 2, -this.barHeight / 2, this.barWidth * v, this.barHeight);
        // }
        // else {
            this.lineMask.x = this.x - this.barWidth / 2 - this.barWidth + this.barWidth * v;
            this.lineMask.y = this.y - this.barHeight / 2;
        // }
    }

    

}