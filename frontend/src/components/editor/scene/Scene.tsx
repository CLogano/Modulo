import { useState, useEffect, useRef } from "react";
import classes from "./Scene.module.css";
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three-stdlib";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import type { Node } from "../../../model/types";
import { buildObject, disposeObject } from "../../../render/build";
import ToolBar from "./ToolBar";
import ActionBar from "./ActionBar";
import { addSceneBasics, setupCamera, setupComposer, setupOrbitControls, setupRenderer, setupResizeHandling, setupScenes, setupTransformControls, startRenderLoop } from "../../../utils/threeSetup";

interface SceneProps {
    root: Node | null;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onUpdate: (id: string, updates: Partial<Node>) => void;
    onUndo: () => void;
    onRedo: () => void;
    onSave: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const Scene = (props: SceneProps) => {

    const { root, selectedId, onSelect, onUpdate, canUndo, canRedo, onUndo, onRedo, onSave } = props;

    // State for controlling toolbar / gizmo mode
    const [selectedGizmoMode, setSelectedGizmoMode] = useState<"view"|"move"|"rotate"|"scale">("move");

    // Core three.js refs
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const gizmoSceneRef = useRef<THREE.Scene | null>(null); // separate overlay scene            
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    
    // Holds the content of the built node hierarchy
    const contentRef = useRef<THREE.Object3D | null>(null);

    // Post processing
    const composerRef = useRef<EffectComposer | null>(null);
    const renderPassRef = useRef<RenderPass | null>(null);
    const primaryOutlinePassRef = useRef<OutlinePass | null>(null);   // selected node
    const childOutlinePassRef = useRef<OutlinePass | null>(null);     // descendants

    // Object selection
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const pointerNdc = useRef(new THREE.Vector2());

    // TransformControls (gizmo)
    const transformControlsRef = useRef<TransformControls | null>(null);
    const isgizmoPointerDownRef = useRef<() => boolean>(() => false);
    const attachedGizmoObjRef = useRef<THREE.Object3D | null>(null);
    const gizmoModeRef = useRef<"translate" | "rotate" | "scale">("translate");

    // One-time three-js setup
    useEffect(() => {

        const container = containerRef.current;
        if (!container) {
            return;
        }

        // Renderer
        const { renderer, cleanup: rendererCleanup, size } = setupRenderer(container);
        rendererRef.current = renderer; // For cleaning up later

        // Scenes
        const { scene, gizmoScene } = setupScenes();
        sceneRef.current = scene;
        gizmoSceneRef.current = gizmoScene;

        // Grid/Lights/Axes
        const basics = addSceneBasics(scene);

        // Camera
        const { camera } = setupCamera(container);
        cameraRef.current = camera;

        // Orbit Controls
        const { controls, cleanup: controlsCleanup } = setupOrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;

        // Transform controls (gizmo)
        const {
            transformControls,
            pointerIsDown,
            cleanup: tcCleanup,
        } = setupTransformControls(camera, renderer.domElement, gizmoScene, controls);
        transformControlsRef.current = transformControls;
        isgizmoPointerDownRef.current = () => pointerIsDown;

        // Post-processing
        // Helps us with selection outlines
        const {
            composer,
            renderPass,
            primaryOutline,
            childOutline,
            cleanup: composerCleanup,
        } = setupComposer(renderer, scene, camera, size);
        composerRef.current = composer;
        renderPassRef.current = renderPass;
        primaryOutlinePassRef.current = primaryOutline;
        childOutlinePassRef.current = childOutline;

        // Resize handling
        const resize = setupResizeHandling(container, renderer, camera, composer);
        
        // Click to select objects on the canvas
        const handleMouseDown = (e: MouseEvent) => {

            if (e.button !== 0) {
                return;
            }      // left click only

            // If we are interacting with the gizmo, do not change selection.
            // Otherwise we can't use the gizmo
            const tc = transformControlsRef.current as any;
            if (isgizmoPointerDownRef.current() || tc?.dragging || tc?.axis) {
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
            if (!id || !contentRef.current) {
                return;
            }
            let target: THREE.Object3D | null = null;
            contentRef.current.traverse((o) => {
                if (!target && (o as any).userData?.nodeId === id) {
                    target = o;
                }
            });
            if (target) {
                frameObject(target);
            }
        };

        window.addEventListener("scene:zoom-to-node", handleZoomToNode);

        // World-preserving reparent: Scene does `attach()`, then reports new local TRS
        const handleRequestReparent = (e: Event) => {
            const detail = (e as CustomEvent<{ childId: string; newParentId: string }>).detail;
            if (!detail || !contentRef.current) {
                return;
            }

            const { childId, newParentId } = detail;

            // Find both objects in the currently rendered content
            let childObj: THREE.Object3D | null = null;
            let parentObj: THREE.Object3D | null = null;

            contentRef.current.traverse((o) => {
                const id = (o as any).userData?.nodeId;
                if (id === childId) childObj = o;
                if (id === newParentId) parentObj = o;
            });

            if (!childObj || !parentObj) {
                return;
            }

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

        // Render loop (like Update in Unity)
        const { stop } = startRenderLoop({
            composer: composer,
            renderer,
            camera,
            gizmoScene,
            controls,
            beforeRender: resize.applyIfNeeded,
        });

        // Cleanup function runs when component unmounts
        return () => {
            stop();
            window.removeEventListener("scene:request-reparent", handleRequestReparent);
            window.removeEventListener("scene:zoom-to-node", handleZoomToNode);
            window.removeEventListener("keydown", handleKeyDown);
            renderer.domElement.removeEventListener("mousedown", handleMouseDown);

            // Destroy hierarchy content
            if (contentRef.current) {
                contentRef.current.removeFromParent();
                disposeObject(contentRef.current);
                contentRef.current = null;
            }

            // Dispose helpers
            basics.cleanup();
            controlsCleanup();
            tcCleanup();
            rendererCleanup();
            composerCleanup();

            // Null out refs
            rendererRef.current = null;
            sceneRef.current = null;
            gizmoSceneRef.current = null;
            cameraRef.current = null;
            controlsRef.current = null;
            composerRef.current = null;
            primaryOutlinePassRef.current = null;
            childOutlinePassRef.current = null;
            transformControlsRef.current = null;
            attachedGizmoObjRef.current = null;
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

    // Update gizmo based on selected mode
    useEffect(() => {
        const tc = transformControlsRef.current;
        const controls = controlsRef.current;
        if (!tc || !controls) {
            return;
        }

        // Hand/orbit mode
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
            <ToolBar
                selectedMode={selectedGizmoMode}
                onSelectMode={setSelectedGizmoMode}
            />
            <ActionBar
                onUndo={onUndo}
                onRedo={onRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                onSave={onSave}
            />
        </div>
    );
};

export default Scene;