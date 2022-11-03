import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as datGui from "dat.gui";
import { FrontEvents } from "./events/FrontEvents";
import { InputMng } from "./utils/input/InputMng";
import { DeviceInfo } from "./utils/DeviceInfo";
import { Settings } from "./data/Settings";
import { LogMng } from "./utils/LogMng";
import { MyMath } from "./utils/MyMath";
import { Params } from "./data/Params";

type Passes = {
    composer?: EffectComposer;
    renderPass: RenderPass;
    fxaaPass?: ShaderPass;
    smaaPass?: SMAAPass;
};

export class GameRender {

    private _renderer: THREE.WebGLRenderer;
    private _passes: Passes;
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private orbitControl: OrbitControls;
    private _stats: Stats;
    private _clock: THREE.Clock;
    private _renderPixelRatio = 1;

    constructor(aDomCanvasParent: HTMLElement) {

        this.initDebugGui();

        this.initRenderer(aDomCanvasParent);
        this.initScene();
        this.initPasses();

        this.initInput(aDomCanvasParent);
        this.initOrbitControl({
            domElement: aDomCanvasParent,
            camera: this._camera,
            enabled: true,
            minDist: 1,
            maxDist: 40,
            stopAngleTop: 10,
            stopAngleBot: 170
        });

        this.initStats();
        this.initEvents();

        this._clock = new THREE.Clock();
        this.animate();

    }

    private initDebugGui() {
        Params.datGui = new datGui.GUI();

        if (Params.isDebugMode) {
            // any debug gui fields

        }
    }

    private initRenderer(aDomCanvasParent: HTMLElement) {
        let domContainer = aDomCanvasParent;
        let w = domContainer.clientWidth;
        let h = domContainer.clientHeight;

        const clearColor = new THREE.Color(Settings.BG_COLOR);

        this._renderer = new THREE.WebGLRenderer({
            antialias: false
        });
        this._renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        this._renderer.setSize(w, h);
        this._renderer.setClearColor(clearColor);
        this._renderPixelRatio = this._renderer.getPixelRatio();
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        this._renderer.outputEncoding = THREE.sRGBEncoding;
        this._renderer.toneMapping = THREE.LinearToneMapping;
        this._renderer.toneMappingExposure = 0.8;

        domContainer.appendChild(this._renderer.domElement);
    }

    private initScene() {
        const w = innerWidth;
        const h = innerHeight;

        this._scene = new THREE.Scene();

        let light = new THREE.DirectionalLight(0xffffff, 0.5);
        light.position.set(1, 1, 1).setScalar(100);
        this._scene.add(light, new THREE.AmbientLight(0xffffff, 0.5));

        this._camera = new THREE.PerspectiveCamera(45, w / h, 1, 1000);
        this._camera.position.set(10, 5, 10);
        this._camera.lookAt(new THREE.Vector3(0, 0, 0));
        this._scene.add(this._camera);

        // objects
        let glowMagenta = new THREE.MeshBasicMaterial({
            color: new THREE.Color(1, 0, 1).multiplyScalar(8),
            toneMapped: false
        });

        let glowAqua = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0, 1, 1).multiplyScalar(8),
            toneMapped: false,
            wireframe: true
        });

        let glowingSphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 20, 20),
            glowMagenta.clone()
        );
        this._scene.add(glowingSphere);

        let glowingSphere2 = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.5, 2),
            glowAqua
        );
        this._scene.add(glowingSphere2);

        let sphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.5),
            new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 0.5, 0.1) })
        );
        this._scene.add(sphere);

        [sphere, glowingSphere, glowingSphere2].forEach((s, i) => {
            let a = (i * Math.PI * 2) / 3;
            s.position
                .set(Math.cos(a), 0, Math.sin(-a))
                .setLength(3);
        });

        // debug gui
        let gui = Params.datGui;

        const guiData = {
            colorFactor: 8
        };

        if (gui) {
            gui.add(guiData, 'colorFactor', 1, 20, 1).onChange((v) => {
                glowingSphere.material.color.setRGB(1, 0, 1).multiplyScalar(v);
                glowingSphere2.material.color.setRGB(0, 1, 1).multiplyScalar(v);
            });
        }

    }

    private initPasses() {

        const w = innerWidth;
        const h = innerHeight;

        this._passes = {
            renderPass: new RenderPass(this._scene, this._camera)
        };

        // anti-aliasing pass
        let aaPass: ShaderPass | SMAAPass;
        switch (Settings.AA_TYPE) {
            case 1:
                // FXAA
                aaPass = this._passes.fxaaPass = new ShaderPass(FXAAShader);
                this._passes.fxaaPass.material.uniforms['resolution'].value.x = 1 / (w * this._renderPixelRatio);
                this._passes.fxaaPass.material.uniforms['resolution'].value.y = 1 / (h * this._renderPixelRatio);
                break;

            case 2:
                // SMAA
                aaPass = this._passes.smaaPass = new SMAAPass(w, h);
                break;

            default:
                LogMng.warn(`GameEngine -> Unknown anti-aliasing type: ${Settings.AA_TYPE}`);
                break;
        }

        // bloom pass
        const bloomParams = {
            bloomStrength: 1,
            bloomRadius: .5,
            bloomThreshold: 1
        };

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            bloomParams.bloomStrength,
            bloomParams.bloomRadius,
            bloomParams.bloomThreshold
        );

        let rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
            type: THREE.FloatType,
            encoding: THREE.sRGBEncoding,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            samples: 4
        });

        this._passes.composer = new EffectComposer(this._renderer, rt);

        this._passes.composer.setPixelRatio(1);

        this._passes.composer.addPass(this._passes.renderPass);
        this._passes.composer.addPass(bloomPass);
        if (aaPass) this._passes.composer.addPass(aaPass);

        // debug gui bloom
        let gui = Params.datGui;
        if (gui) {
            gui.add(bloomParams, 'bloomStrength', 0, 10, 0.1).onChange((v) => {
                bloomPass.strength = v;
            });
            gui.add(bloomParams, 'bloomRadius', 0, 20, 0.1).onChange((v) => {
                bloomPass.radius = v;
            });
            gui.add(bloomParams, 'bloomThreshold', 0, 5, 0.1).onChange((v) => {
                bloomPass.threshold = v;
            });
        }

    }

    private initInput(aDomCanvasParent: HTMLElement) {
        InputMng.getInstance({
            inputDomElement: aDomCanvasParent,
            desktop: DeviceInfo.getInstance().desktop,
            isRightClickProcessing: false
        });
    }

    private initOrbitControl(aParams?: any) {

        if (this.orbitControl) return;
        if (!aParams) aParams = {};
        let domElement = aParams.domElement;
        this.orbitControl = new OrbitControls(aParams.camera, domElement);
        this.orbitControl.enabled = aParams.enabled;
        this.orbitControl.rotateSpeed = .5;
        this.orbitControl.enableDamping = true;
        this.orbitControl.dampingFactor = .9;
        this.orbitControl.zoomSpeed = aParams.zoomSpeed || 1;
        this.orbitControl.enablePan = aParams.enablePan == true;
        this.orbitControl.minDistance = aParams.minDist || 1;
        this.orbitControl.maxDistance = aParams.maxDist || 100;
        this.orbitControl.minPolarAngle = MyMath.toRadian(aParams.stopAngleTop || 0);
        this.orbitControl.maxPolarAngle = MyMath.toRadian(aParams.stopAngleBot || 0);
        this.orbitControl.autoRotateSpeed = 0.05;
        this.orbitControl.autoRotate = true;

        this.orbitControl.target = new THREE.Vector3();
        this.orbitControl.update();
        // this.orbitControl.addEventListener('change', () => {
        // });
        // this.orbitControl.addEventListener('end', () => {
        // });

    }

    private initStats() {
        if (Params.isDebugMode) {
            this._stats = new Stats();
            this._stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
            document.body.appendChild(this._stats.dom);
        }
    }

    private initEvents() {
        FrontEvents.onWindowResizeSignal.add(this.onWindowResize, this);
    }

    private onWindowResize() {

        let w = innerWidth;
        let h = innerHeight;

        this._camera.aspect = w / h;
        this._camera.updateProjectionMatrix();

        this._renderer.setSize(w, h);
        this._passes.composer.setSize(w, h);
        
        switch (Settings.AA_TYPE) {
            case 1:
                this._passes.fxaaPass.material.uniforms['resolution'].value.x = 1 / (w * this._renderPixelRatio);
                this._passes.fxaaPass.material.uniforms['resolution'].value.y = 1 / (h * this._renderPixelRatio);
                break;
        }

    }

    private render() {
        this._passes.composer.render();
    }

    private update(dt: number) {
        this.render();
    }

    private animate() {
        let dt = this._clock.getDelta();
        
        if (Params.isDebugMode) this._stats.begin();
        this.update(dt);
        if (Params.isDebugMode) this._stats.end();

        requestAnimationFrame(() => this.animate());
    }

}
