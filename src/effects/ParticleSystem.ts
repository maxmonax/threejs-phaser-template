import * as THREE from "three";
import { Signal } from "../utils/events/Signal";
import { MyLinearSpline, MyMath } from "../utils/MyMath";

const _VS = `
    uniform float pointMultiplier;

    attribute float size;
    attribute vec4 clr;

    varying vec4 vColor;

    void main() {
        vColor = clr;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        gl_Position = projectionMatrix * mvPosition;
        //gl_PointSize = pointMultiplier / gl_Position.w;
        gl_PointSize = size * pointMultiplier / gl_Position.w;
    }
`;

const _FS = `
    uniform sampler2D diffuseTexture;

    varying vec4 vColor;

    void main() {
        gl_FragColor = texture2D(diffuseTexture, gl_PointCoord) * vColor;
    }
`;

type ParticleSystemParams = {
    parent: THREE.Object3D;
    camera: THREE.Camera;
    texture: THREE.Texture;
    onWindowResizeSignal: Signal;
    frequency?: number; // how many particles in second
    lifeTime?: number;
    gravity?: THREE.Vector3;
    position?: THREE.Vector3; // basic start position
    deltaPosition?: {
        x?: { min: number, max: number },
        y?: { min: number, max: number },
        z?: { min: number, max: number }
    },
    velocity?: THREE.Vector3; // start velocity
    deltaVelocity?: {
        x?: { min: number, max: number },
        y?: { min: number, max: number },
        z?: { min: number, max: number }
    },
    size?: { min: number, max: number },
    sizeFactor?: number,
    color?: number | 'random',
    alphaChange?: { t: number, val: number }[],
    scaleFactorChange?: { t: number, val: number }[],
    sorting?: boolean
};

type ParticleData = {
    position: THREE.Vector3;
    startSize: number;
    size: number;
    color: THREE.Color;
    alpha: number;
    lifeTime: number;
    lifeProgress: number;
    rotation: number;
    velocity: THREE.Vector3;
};

export class ParticleSystem {
    private _params: ParticleSystemParams;
    private _uniforms: any;
    private _material: THREE.ShaderMaterial;
    private _geometry: THREE.BufferGeometry;
    private _points: THREE.Points;
    private _particles: ParticleData[];
    // spline math
    private _alphaSpline: MyLinearSpline;
    private _scaleFactorSpline: MyLinearSpline;
    // inner params
    private _addParticleTime = 0;
    private _startAlpha = 1;
    private _startScale = 1;
    private _prevPosition: THREE.Vector3;

    private _destroyed = false;
    activated = false;

    constructor(aParams: ParticleSystemParams) {

        this._params = aParams;

        if (!this._params.position) this._params.position = new THREE.Vector3();
        if (!this._params.gravity) this._params.gravity = new THREE.Vector3();
        if (!this._params.velocity) this._params.velocity = new THREE.Vector3();
        if (!this._params.frequency) this._params.frequency = 50;
        if (!this._params.lifeTime) this._params.lifeTime = 5;
        if (!this._params.size) this._params.size = { min: 1, max: 1 };
        if (!this._params.sizeFactor) this._params.sizeFactor = 1;
        if (!this._params.color) this._params.color = 0xffffff;
        if (!this._params.deltaPosition) this._params.deltaPosition = {};
        if (!this._params.deltaVelocity) this._params.deltaVelocity = {};

        this._prevPosition = this._params.position.clone();

        this._uniforms = {
            diffuseTexture: {
                value: this._params.texture
            },
            pointMultiplier: {
                value: window.innerHeight / (2.0 * Math.tan(.02 * 60.0 * Math.PI / 180))
            }
        };

        this._material = new THREE.ShaderMaterial({
            uniforms: this._uniforms,
            vertexShader: _VS,
            fragmentShader: _FS,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this._particles = [];

        this._geometry = new THREE.BufferGeometry();
        this._geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        this._geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
        this._geometry.setAttribute('clr', new THREE.Float32BufferAttribute([], 4));

        this._points = new THREE.Points(this._geometry, this._material);

        this._params.parent.add(this._points);

        if (this._params.alphaChange) {
            this._alphaSpline = new MyLinearSpline(this.simpleLinerSpline);
            for (let i = 0; i < this._params.alphaChange.length; i++) {
                const a = this._params.alphaChange[i];
                this._alphaSpline.addPoint(a.val, a.t);
            }
            this._startAlpha = this._params.alphaChange[0].val;
        }

        if (this._params.scaleFactorChange) {
            this._scaleFactorSpline = new MyLinearSpline(this.simpleLinerSpline);
            for (let i = 0; i < this._params.scaleFactorChange.length; i++) {
                const sf = this._params.scaleFactorChange[i];
                this._scaleFactorSpline.addPoint(sf.val, sf.t);
            }
            this._startScale = this._params.scaleFactorChange[0].val;
        }

        this.activated = true;

        this._params.onWindowResizeSignal.add(this.onWindowResize, this);
    }

    public get params(): ParticleSystemParams {
        return this._params;
    }
    
    public get position(): THREE.Vector3 {
        return this._params.position;
    }

    private onWindowResize() {
        this._uniforms.pointMultiplier.value = window.innerHeight / (2.0 * Math.tan(.02 * 60.0 * Math.PI / 180));
    }

    private simpleLinerSpline(t, a, b) {
        return a + t * (b - a);
    }

    private addParticles(count: number, dt: number) {
        let dtPosition = this._params.position.clone().sub(this._prevPosition).negate();
        //  console.log('dtPosition: ', dtPosition);
        this._prevPosition.copy(this._params.position);

        for (let i = 0; i < count; i++) {
            let velocity = this._params.velocity.clone();
            let dv = this._params.deltaVelocity;
            if (dv.x) velocity.x += MyMath.randomInRange(dv.x.min, dv.x.max);
            if (dv.y) velocity.y += MyMath.randomInRange(dv.y.min, dv.y.max);
            if (dv.z) velocity.z += MyMath.randomInRange(dv.z.min, dv.z.max);

            let posVelFactor = Math.random() * dt;
            let posVelAdd = velocity.clone().multiplyScalar(posVelFactor).add(dtPosition);
            let posIncrement = dtPosition.clone().multiplyScalar(Math.random()).add(posVelAdd);

            let pos = this._params.position.clone().add(posIncrement);
            let dp = this._params.deltaPosition;
            if (dp.x) pos.x += MyMath.randomInRange(dp.x.min, dp.x.max);
            if (dp.y) pos.y += MyMath.randomInRange(dp.y.min, dp.y.max);
            if (dp.z) pos.z += MyMath.randomInRange(dp.z.min, dp.z.max);

            let clr: THREE.Color;
            if (this._params.color == 'random') {
                clr = new THREE.Color(Math.random(), Math.random(), Math.random());
            }
            else {
                clr = new THREE.Color(this._params.color);
            }

            let size = MyMath.randomInRange(this._params.size.min, this._params.size.max);

            let pData: ParticleData = {
                position: pos,
                startSize: size,
                size: size * this._startScale,
                color: clr,
                alpha: this._startAlpha,
                lifeTime: this._params.lifeTime,
                lifeProgress: 0,
                rotation: 0,
                velocity: velocity
            };
            this._particles.push(pData);
        }
    }

    private updateGeometry() {
        const positions = [];
        const sizes = [];
        const colors = [];

        for (let p of this._particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
            sizes.push(p.size);
            colors.push(p.color.r, p.color.g, p.color.b, p.alpha);
        }

        this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this._geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        this._geometry.setAttribute('clr', new THREE.Float32BufferAttribute(colors, 4));

        this._geometry.attributes.position.needsUpdate = true;
        this._geometry.attributes.size.needsUpdate = true;
        this._geometry.attributes.clr.needsUpdate = true;

    }

    private updateParticles(dt: number) {

        for (const p of this._particles) {
            p.lifeProgress += dt;
            if (p.lifeProgress >= p.lifeTime) continue;
            let lifeProgress = p.lifeProgress / p.lifeTime;

            // alpha
            if (this._alphaSpline) {
                p.alpha = this._alphaSpline.get(lifeProgress);
            }

            // size
            if (this._scaleFactorSpline) {
                p.size = p.startSize * this._scaleFactorSpline.get(lifeProgress) * this.params.sizeFactor;
            }

            // pos
            p.position.add(p.velocity.clone().multiplyScalar(dt));

            p.velocity.add(this._params.gravity.clone().multiplyScalar(dt));
        }

        this._particles = this._particles.filter(p => {
            return p.lifeProgress < p.lifeTime;
        });
    
        // sort
        if (this._params.sorting == true) {
            this._particles.sort((a, b) => {
                const d1 = this._params.camera.position.distanceTo(a.position);
                const d2 = this._params.camera.position.distanceTo(b.position);
                if (d1 > d2) return -1;
                if (d1 < d2) return 1;
                return 0;
            });
        }
    }
    
    public get particlesCount(): number {
        return this._particles.length;
    }
    
    free() {
        this._destroyed = true;
        this.activated = false;
        this._params.onWindowResizeSignal.remove(this.onWindowResize, this);
        this._particles = [];
        this.updateGeometry();
        this._params = null;
        this._uniforms = null;
        this._material = null;
        this._geometry = null;
        this._points = null;
        this._alphaSpline = null;
        this._scaleFactorSpline = null;
        this._particles = null;
    }

    update(dt: number) {

        if (this._destroyed) return;

        if (this.activated) {
            let tr = 1 / this._params.frequency;
            this._addParticleTime += dt;
            if (this._addParticleTime >= tr) {
                let cnt = Math.floor(this._addParticleTime / tr);
                this.addParticles(cnt, this._addParticleTime);
                this._addParticleTime %= tr;
            }
        }

        this.updateParticles(dt);
        this.updateGeometry();
        
    }


}