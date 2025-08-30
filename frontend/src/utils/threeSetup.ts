import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three-stdlib";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// Create and mount a WebGLRenderer for the given container. Returns renderer and a cleanup
export function setupRenderer(container: HTMLElement) {

    // Create the WebGL renderer (manages canvas)
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    // Match browser pixel density, but cap at 2 for performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Set initial size for the renderer's canvas
    // If the container has no size yet, fallback to 800x600
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.autoClear = false;

    // Append renderer canvas to container
    container.appendChild(renderer.domElement);
    
    // Prevent context menu on right-click dragging
    const preventContext = (e: MouseEvent) => e.preventDefault();
    renderer.domElement.addEventListener("contextmenu", preventContext);

    const cleanup = () => {
        renderer.domElement.removeEventListener("contextmenu", preventContext);
        renderer.dispose();
        renderer.domElement.remove();
    };

    return { renderer, cleanup, size: { w, h } };
}

// Make a main scene and a separate overlay scene for gizmos
export function setupScenes() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  const gizmoScene = new THREE.Scene();
  return { scene, gizmoScene };
}

// Add grid, axes, and lights to the scene. Returns a simple cleanup if you want to remove them later
export function addSceneBasics(scene: THREE.Scene) {
  const grid = new THREE.GridHelper(50, 50, 0x888888, 0x444444);
  const axes = new THREE.AxesHelper(2);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.6);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  dir.castShadow = true;

  scene.add(grid, axes, hemi, dir);

  const cleanup = () => {
    scene.remove(grid, axes, hemi, dir);
    grid.dispose?.();
    axes.dispose?.();
    // three lights don't need manual dispose
  };
  return { grid, axes, hemi, dir, cleanup };
}

// Create a perspective camera positioned with a nice starter view
export function setupCamera(container: HTMLElement) {
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 600;

  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
  camera.position.set(5, 4, 8);
  camera.lookAt(0, 0, 0);

  return { camera };
}

// Create OrbitControls
// Left mouse --> nothing, middle mouse --> pan, right mouse --> rotate
export function setupOrbitControls(camera: THREE.Camera, domElement: HTMLElement) {
  const controls = new OrbitControls(camera as THREE.PerspectiveCamera, domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.mouseButtons = {
    LEFT: null as any,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  controls.minDistance = 1;
  controls.maxDistance = 200;
  controls.enablePan = true;

  const cleanup = () => controls.dispose();
  return { controls, cleanup };
}

// TransformControls (gizmo) attached to the gizmoScene. Returns the control and helpers
export function setupTransformControls(
    camera: THREE.Camera,
    domElement: HTMLElement,
    gizmoScene: THREE.Scene,
    orbitControls?: OrbitControls
) {
    const tc = new TransformControls(camera as THREE.PerspectiveCamera, domElement);
    tc.setMode("translate");                        // 'translate' | 'rotate' | 'scale', translate by default
    tc.setSize(0.5);                                // gizmo size
    tc.layers.set(31);                              // keep it out of raycasts / selection
    tc.visible = false;                             // start hidden

    gizmoScene.add(tc);                             // Add to gizmo scene

    let pointerDown = false;
    const onMouseDown = () => (pointerDown = true);
    const onMouseUp = () => (pointerDown = false);
    (tc as any).addEventListener("mouseDown", onMouseDown);
    (tc as any).addEventListener("mouseUp", onMouseUp);

    // Disable orbit while dragging the gizmo
    const onDrag = (e: any) => {
        if (orbitControls) orbitControls.enabled = !e.value;
    };
    (tc as any).addEventListener("dragging-changed", onDrag);

    const cleanup = () => {
        (tc as any).removeEventListener("mouseDown", onMouseDown);
        (tc as any).removeEventListener("mouseUp", onMouseUp);
        (tc as any).removeEventListener("dragging-changed", onDrag);
        tc.dispose?.();
        gizmoScene.remove(tc);
    };

    const api = {
        transformControls: tc,
        get pointerIsDown() {
            return pointerDown;
        },
    };

    return { ...api, cleanup };
}

// Post-processing chain: render pass + two outline passes + output pass
export function setupComposer(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    size: { w: number; h: number }
) {
    // Composer setup
    const composer = new EffectComposer(renderer);
    composer.setSize(size.w, size.h);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Child pass (secondary color)
    const childOutline = new OutlinePass(new THREE.Vector2(size.w, size.h), scene, camera);
    childOutline.visibleEdgeColor.set(0x3aa0ff); // secondary: cool blue
    childOutline.hiddenEdgeColor.set(0x3aa0ff);
    childOutline.edgeStrength = 2.0;
    childOutline.edgeThickness = 0.9;
    childOutline.pulsePeriod = 0;
    composer.addPass(childOutline);

    // Primary pass (selected node color)
    const primaryOutline = new OutlinePass(new THREE.Vector2(size.w, size.h), scene, camera);
    primaryOutline.visibleEdgeColor.set(0xff8a00); // primary: bright orange
    primaryOutline.hiddenEdgeColor.set(0xff8a00);
    primaryOutline.edgeStrength = 3.8;
    primaryOutline.edgeThickness = 1.5;
    primaryOutline.pulsePeriod = 0;
    composer.addPass(primaryOutline);

    // Output pass
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    const cleanup = () => {
        composer.dispose();
    };

    return { composer, renderPass, primaryOutline, childOutline, outputPass, cleanup };
}

// ResizeObserver that marks "needsResize" and stores desired width/height.
// Call `applyIfNeeded()` once per frame to actually update renderer/camera/composer
export function setupResizeHandling(
    container: HTMLElement,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    composer: EffectComposer
) {
    let w = container.clientWidth || 800;
    let h = container.clientHeight || 600;
    let needsResize = false;

    const ro = new ResizeObserver(() => {
        w = container.clientWidth || 1;
        h = container.clientHeight || 1;
        needsResize = true;
    });
    ro.observe(container);

    const applyIfNeeded = () => {
        if (!needsResize) {
            return;
        }
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        composer.setSize(w, h);
        needsResize = false;
    };

    const cleanup = () => ro.disconnect();

    return { applyIfNeeded, cleanup };
}

// Basic render loop that runs composer + overlays the gizmo scene. Returns a stop() function
export function startRenderLoop(opts: {
  composer: EffectComposer;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  gizmoScene: THREE.Scene;
  controls?: OrbitControls;
  beforeRender?: () => void; // e.g., resize handler
  afterRender?: () => void;
}) {
  let raf = 0;

  const loop = () => {
    raf = requestAnimationFrame(loop);

    opts.controls?.update();
    opts.beforeRender?.();

    // main scene via composer
    opts.composer.render();

    // overlay gizmo scene
    if (opts.renderer && opts.camera && opts.gizmoScene) {
      opts.renderer.clearDepth();
      opts.renderer.render(opts.gizmoScene, opts.camera as THREE.PerspectiveCamera);
    }

    opts.afterRender?.();
  };

  raf = requestAnimationFrame(loop);
  const stop = () => cancelAnimationFrame(raf);
  return { stop };
}