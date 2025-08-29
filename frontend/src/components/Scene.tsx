import { useState, useEffect, useRef } from "react";
import classes from "./Scene.module.css";
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three-stdlib";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Node } from "../scene/types";
import { buildObject, disposeObject } from "../scene/scene";
import ViewportToolbar from "./ViewportToolbar";

interface SceneProps {
    root: Node | null;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onUpdate: (id: string, updates: Partial<Node>) => void;
}

const Scene = (props: SceneProps) => {

    const { root, selectedId, onSelect, onUpdate } = props;

    // toolbar/gizmo mode
    const [selectedGizmoMode, setSelectedGizmoMode] = useState<"view"|"move"|"rotate"|"scale">("move");

    // Reference to the <div> container in our JSX
    const containerRef = useRef<HTMLDivElement | null>(null);
    // Store the renderer instance so we can clean it up later
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    // Keep scene, control & camera refs so we can render each frame
    const sceneRef = useRef<THREE.Scene | null>(null);            
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameRef = useRef<number | null>(null);
    // Holds the content of the built node hierarchy
    const contentRef = useRef<THREE.Object3D | null>(null);
    // Post processing refs: help with outline drawing, etc.
    const composerRef = useRef<EffectComposer | null>(null);
    const renderPassRef = useRef<RenderPass | null>(null);
    const primaryOutlinePassRef = useRef<OutlinePass | null>(null);   // selected node
    const childOutlinePassRef = useRef<OutlinePass | null>(null);     // descendants
    // Raycasting for selecting objects, etc.
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const pointerNdc = useRef(new THREE.Vector2()); // scratch vec2
    // Transform controls (Gizmo) refs
    const transformControlsRef = useRef<TransformControls | null>(null);
    const gizmoSceneRef = useRef<THREE.Scene | null>(null);
    const gizmoPointerDownRef = useRef(false);
    const attachedGizmoObjRef = useRef<THREE.Object3D | null>(null);
    // Internal gizmo mode (THREE naming)
    const gizmoModeRef = useRef<"translate" | "rotate" | "scale">("translate");

    useEffect(() => {

        const container = containerRef.current;
        if (!container) {
            return;
        }

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

        // Store a reference of renderer for cleaning up later
        rendererRef.current = renderer;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        sceneRef.current = scene;
        // Create scene for gizmo as well
        const gizmoScene = new THREE.Scene();
        gizmoSceneRef.current = gizmoScene;

        // Grid (floor) so you can see space/origin
        const grid = new THREE.GridHelper(50, 50, 0x888888, 0x444444);
        scene.add(grid);

        // Add XYZ axes at origin (X=red, Y=green, Z=blue)
        const axes = new THREE.AxesHelper(2);
        scene.add(axes);

        // Lights so future meshes won’t be black
        const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.6);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(5, 10, 7);
        dir.castShadow = true;
        scene.add(dir);

        // Camera setup
        const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
        camera.position.set(5, 4, 8);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
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
        controlsRef.current = controls;

        // Transform controls
        const transformControls = new TransformControls(camera, renderer.domElement);
        transformControls.setMode('translate');           // 'translate' | 'rotate' | 'scale', translate by default
        transformControls.setSize(0.5);                      // gizmo size
        transformControls.layers.set(31);                   // Give it a high layer to ignore raycasts
        transformControls.visible = false;                // start hidden
        gizmoScene.add(transformControls);              // Add to gizmo scene
        transformControlsRef.current = transformControls;
        (transformControls as any).addEventListener('mouseDown', () => {
            gizmoPointerDownRef.current = true;
        });
        (transformControls as any).addEventListener('mouseUp', () => {
            gizmoPointerDownRef.current = false;
        });

        // Disable OrbitControls / Context menu while dragging the gizmo
        (transformControls as any).addEventListener('dragging-changed', (e: any) => {
            controls.enabled = !e.value;
        });

        // Post-processing pipeline
        const composer = new EffectComposer(renderer);
        composer.setSize(w, h)
        composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // Render pass
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        // Child pass (secondary color)
        const childPass = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
        childPass.visibleEdgeColor.set(0x3AA0FF);   // secondary: cool blue
        childPass.hiddenEdgeColor.set(0x3AA0FF);
        childPass.edgeStrength = 2.0;
        childPass.edgeThickness = 0.9;
        childPass.pulsePeriod = 0;
        composer.addPass(childPass);
        // Primary pass (selected node color)
        const primaryPass = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
        primaryPass.visibleEdgeColor.set(0xFF8A00); // primary: bright orange
        primaryPass.hiddenEdgeColor.set(0xFF8A00);
        primaryPass.edgeStrength = 3.8;
        primaryPass.edgeThickness = 1.5;
        primaryPass.pulsePeriod = 0;
        composer.addPass(primaryPass);
        // Output pass
        const outputPass = new OutputPass(); 
        composer.addPass(outputPass);
        composerRef.current = composer;
        renderPassRef.current = renderPass;
        primaryOutlinePassRef.current = primaryPass;
        childOutlinePassRef.current = childPass;

        // Prevent context menu on right-click dragging
        const preventContext = (e: MouseEvent) => e.preventDefault();
        renderer.domElement.addEventListener("contextmenu", preventContext);

        // Click to select objects on the canvas
        const handleMouseDown = (e: MouseEvent) => {

            //e.stopPropagation();              // don't let the Tree's global "clear selection" run

            if (e.button !== 0) {
                return;
            }      // left click only

            // If we are interacting with the gizmo, do not change selection.
            // Otherwise we can't use the gizmo
            const tc = transformControlsRef.current as any;
            if (gizmoPointerDownRef.current || tc?.dragging || tc?.axis) {
                return;
            }

            const cam = cameraRef.current;
            const content = contentRef.current;
            if (!cam || !content) {
                onSelect(null);
                return;
            }

            // Convert to Normalized Device Coordinates
            const rect = renderer.domElement.getBoundingClientRect();
            pointerNdc.current.set(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            // Raycast only against our content hierarchy (ignore grid/axes/lights)
            raycasterRef.current.layers.set(0);
            const ray = raycasterRef.current;
            ray.setFromCamera(pointerNdc.current, cam);
            const hits = ray.intersectObject(content, true);

            if (hits.length === 0) {
                onSelect(null); // clicked empty space
                return;
            }

            // Walk up until we find an ancestor with a nodeId
            let obj: THREE.Object3D | null = hits[0].object;
            while (obj && !(obj as any).userData?.nodeId) obj = obj.parent;
            const nodeId = (obj as any)?.userData?.nodeId as string | undefined;

            onSelect(nodeId ?? null);
        };
        renderer.domElement.addEventListener("mousedown", handleMouseDown);

        // Keyboard shortcuts: q/w/e/r -> view/translate/rotate/scale
        const handleKeyDown = (e: KeyboardEvent) => {

            // Skip gizmo hotkeys while typing in any input/textarea/contentEditable
            const el = document.activeElement as (HTMLElement | null);
            if (el) {
                const t = el.tagName.toLowerCase();
                if (t === "input" || t === "textarea" || (el as any).isContentEditable) {
                    return; // bail — user is typing
                }
            }

            switch (e.key.toLowerCase()) {
                case "q":
                    setSelectedGizmoMode("view");
                    break;
                case "w":
                    setSelectedGizmoMode("move");
                    break;
                case "e":
                    setSelectedGizmoMode("rotate");
                    break;
                case "r":
                    setSelectedGizmoMode("scale");
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        // Handle zooming on a selected object
        // Here we frame the object based on camera and target bounds, pos, etc.
        const frameObject = (obj: THREE.Object3D) => {
            const cam = cameraRef.current!;
            const controls = controlsRef.current!;
            const box = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);

            const maxSize = Math.max(size.x, size.y, size.z);
            const fitHeightDistance = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
            const fitWidthDistance = fitHeightDistance / cam.aspect;
            const distance = Math.max(fitHeightDistance, fitWidthDistance) * 3.0; // margin

            const dir = new THREE.Vector3()
                .subVectors(cam.position, controls.target)
                .normalize();

            cam.position.copy(center).addScaledVector(dir, distance);
            controls.target.copy(center);
            cam.updateProjectionMatrix();
            controls.update();
        };
        const handleZoomToNode = (e: Event) => {
            const id = (e as CustomEvent<{ id: string }>).detail?.id;
            if (!id || !contentRef.current) return;
            let target: THREE.Object3D | null = null;
            contentRef.current.traverse((o) => {
                if (!target && (o as any).userData?.nodeId === id) target = o;
            });
            if (target) frameObject(target);
        };

        window.addEventListener("scene:zoom-to-node", handleZoomToNode);

        // World-preserving reparent: Scene does `attach()`, then reports new local TRS
        const handleRequestReparent = (e: Event) => {
            const detail = (e as CustomEvent<{ childId: string; newParentId: string }>).detail;
            if (!detail || !contentRef.current) return;

            const { childId, newParentId } = detail;

            // Find both objects in the currently rendered content
            let childObj: THREE.Object3D | null = null;
            let parentObj: THREE.Object3D | null = null;

            contentRef.current.traverse((o) => {
                const id = (o as any).userData?.nodeId;
                if (id === childId) childObj = o;
                if (id === newParentId) parentObj = o;
            });

            if (!childObj || !parentObj) return;

            // Preserve world transform while changing parent
            (parentObj as THREE.Object3D).attach(childObj);

            // Refresh matrices and read child's NEW local TRS
            (childObj as THREE.Object3D).updateMatrix();
            (childObj as THREE.Object3D).updateMatrixWorld(true);

            const p = (childObj as THREE.Object3D).position;
            const r = (childObj as THREE.Object3D).rotation;
            const s = (childObj as THREE.Object3D).scale;

            // Push the new LOCAL TRS back into the model
            onUpdate(childId, {
                transform: {
                    position: [p.x, p.y, p.z],
                    rotation: [r.x, r.y, r.z],
                    scale: [s.x, s.y, s.z],
                },
            });
        };

        window.addEventListener("scene:request-reparent", handleRequestReparent);

        // Resizing: instead of resizing the WebGL canvas immediately on every tiny size change
        // (which happens constantly while dragging a gutter), we:
        // 1) record the latest container width/height,
        // 2) set a "needsResize" flag, and
        // 3) actually apply the resize once, in the next animation frame (inside tick()).
        let desiredW = w;
        let desiredH = h;
        let needsResize = false;

        // Fires whenever the container's content box size changes
        const ro = new ResizeObserver(() => {
            if (!containerRef.current) {
                return;
            }
            // Read the newest container size
            desiredW = containerRef.current.clientWidth;
            desiredH = containerRef.current.clientHeight;
            needsResize = true; // apply next frame
        });
        ro.observe(container);

        // Render loop (like Update in Unity)
        const tick = () => {
            // Queue the next frame
            frameRef.current = requestAnimationFrame(tick);

            // Apply any pending resize exactly once per frame
            if (needsResize && rendererRef.current && cameraRef.current) {
                rendererRef.current.setSize(desiredW, desiredH, false);
                cameraRef.current.aspect = desiredW / desiredH;
                cameraRef.current.updateProjectionMatrix();
                composerRef.current?.setSize(desiredW, desiredH);
                needsResize = false; // resize handled for this frame
            }

            controlsRef.current?.update();

            const r = rendererRef.current;
            const cam = cameraRef.current;
            const gScene = gizmoSceneRef.current;

            // Clear renderer once at the start of the frame
            r?.setRenderTarget(null);
            r?.clear(true, true, true);

            // Draw the scenes
            // Render main scene (with OutlinePass) via composer
            composerRef.current?.render();
            // Render gizmo overlay on top
            if (r && cam && gScene) {
                r.clearDepth();       // keep color, reset depth
                r.render(gScene, cam);
            }
        };
        tick();

        // Cleanup function runs when component unmounts
        return () => {
            ro.disconnect();
            renderer.domElement.removeEventListener("contextmenu", preventContext);
            renderer.domElement.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("scene:zoom-to-node", handleZoomToNode);
            window.removeEventListener("scene:request-reparent", handleRequestReparent);
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }

            // Destroy content
            if (contentRef.current) {
                contentRef.current.removeFromParent();
                disposeObject(contentRef.current);
                contentRef.current = null;
            }

            // Destroy post-processing
            primaryOutlinePassRef.current = null;
            childOutlinePassRef.current = null;
            renderPassRef.current = null;
            composerRef.current?.dispose();
            composerRef.current = null;

            controls.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            rendererRef.current = null;
            sceneRef.current = null;
            cameraRef.current = null;
            controlsRef.current = null;

            transformControlsRef.current?.dispose?.();
            gizmoSceneRef.current?.remove(transformControls);
            transformControlsRef.current = null;
        };

    }, []); // run once on mount

    // Rebuild scene content whenever the tree changes
    useEffect(() => {

        if (!sceneRef.current) {
            return;
        }

        // Remove previous content group
        if (contentRef.current) {
            contentRef.current.removeFromParent();
            disposeObject(contentRef.current);
            contentRef.current = null;
        }

        if (!root) {
            return;
        }

        // Build a fresh hierarchy from the Node tree
        const built = buildObject(root);
        sceneRef.current.add(built);
        contentRef.current = built;

    }, [root]);

    // Draw outline for selected node
    // Also show gizmo on selected node
    useEffect(() => {

        const primaryPass = primaryOutlinePassRef.current;
        const childPass = childOutlinePassRef.current;
        if (!primaryPass || !childPass) {
            return;
        }

        primaryPass.selectedObjects = [];
        childPass.selectedObjects = [];

        const transformControls = transformControlsRef.current;
        if (!transformControls) return;

        // Always reset targets
        transformControls.detach();
        transformControls.visible = false;
        attachedGizmoObjRef.current = null;

        if (!selectedId || selectedId === "root" || !contentRef.current) {
            return;
        }

        // Find the Object3D corresponding to the selected node (the Group)
        let groupForNode: THREE.Object3D | null = null;
        contentRef.current.traverse((o) => {
            if (!groupForNode && (o as any).userData?.nodeId === selectedId) {
                groupForNode = o;
            }
        });
        if (!groupForNode) {
            return;
        }

        // Attach and show the gizmo
        // Only attach in non-view modes
        if (selectedGizmoMode !== "view") {
            transformControls.attach(groupForNode);
            transformControls.setMode(gizmoModeRef.current);
            attachedGizmoObjRef.current = groupForNode;
            transformControls.visible = true;
        } else {
            transformControls.detach();
            (transformControls as any).axis = null;   // clear any lingering axis
            transformControls.visible = false;
            attachedGizmoObjRef.current = null;
        }

        // Update node data when interacting with gizmo!!
        const commitTransform = () => {

            if (selectedId === "root") return;
            
            const obj = attachedGizmoObjRef.current;
            if (!obj) return;

            // ensure local/world matrix matches current TRS
            obj.updateMatrix();
            obj.updateMatrixWorld(true);

            const p = obj.position;
            const r = obj.rotation;
            const s = obj.scale;

            onUpdate(selectedId, {
                transform: {
                    position: [p.x, p.y, p.z],
                    rotation: [r.x, r.y, r.z],
                    scale: [s.x, s.y, s.z],
                },
            });
        };

        // Save when the user releases the gizmo
        (transformControls as any).addEventListener('mouseUp', commitTransform);

        // Collect meshes that belong to the selected node itself (primary),
        // and meshes that belong to descendant nodes (secondary).
        const primaryMeshes: THREE.Object3D[] = [];
        const childMeshes: THREE.Object3D[] = [];

        (groupForNode as THREE.Object3D).traverse((o: THREE.Object3D) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) {
                return;
            }
            const ownerId = (mesh as any).userData?.nodeId as string | undefined;
            if (ownerId === selectedId) {
                primaryMeshes.push(mesh);
            } else {
                childMeshes.push(mesh); // descendants (other nodeIds)
            }
        });

        // Apply to passes
        primaryPass.selectedObjects = primaryMeshes;
        childPass.selectedObjects = childMeshes;

        return () => {
            (transformControls as any).removeEventListener('mouseUp', commitTransform);
        };
    }, [selectedId, root, selectedGizmoMode]);

    useEffect(() => {
        const tc = transformControlsRef.current;
        const controls = controlsRef.current;
        if (!tc || !controls) {
            return;
        }

        // hand/orbit mode
        if (selectedGizmoMode === "view") {
            tc.visible = false;
            controls.mouseButtons = {
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.PAN,
                RIGHT: THREE.MOUSE.ROTATE,
            } as any;
        } else {
            gizmoModeRef.current = selectedGizmoMode === "move" ? "translate" : selectedGizmoMode;
            tc.setMode(gizmoModeRef.current);
            // only show if an object is selected
            if (attachedGizmoObjRef.current && selectedId && selectedId !== "root") {
                tc.visible = true;
            }
            controls.mouseButtons = {
                LEFT: null as any,
                MIDDLE: THREE.MOUSE.PAN,
                RIGHT: THREE.MOUSE.ROTATE,
            } as any;
        }
    }, [selectedGizmoMode, selectedId]);

    return (
        <div className={classes.container} ref={containerRef}>
            <ViewportToolbar
                selectedMode={selectedGizmoMode}
                onSelectMode={setSelectedGizmoMode}
            />
        </div>
    );
};

export default Scene;