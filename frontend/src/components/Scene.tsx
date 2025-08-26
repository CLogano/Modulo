import { useEffect, useRef } from "react";
import classes from "./Scene.module.css";
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Node } from "../scene/types";

interface SceneProps {
    root: Node | null;
    selectedId: string | null;
    onSelect: (id: string) => void;
}

const Scene = (props: SceneProps) => {

    //const { root, selectedId, onSelect } = props;

    // Reference to the <div> container in our JSX
    const containerRef = useRef<HTMLDivElement | null>(null);
    // Store the renderer instance so we can clean it up later
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    // Keep scene, control & camera refs so we can render each frame
    const sceneRef = useRef<THREE.Scene | null>(null);            
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameRef = useRef<number | null>(null);  

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
        renderer.shadowMap.enabled = true;

        // Append renderer canvas to container
        container.appendChild(renderer.domElement);

        // Store a reference of renderer for cleaning up later
        rendererRef.current = renderer;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        sceneRef.current = scene;    
        
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

        // Prevent context menu on right-click dragging
        const preventContext = (e: MouseEvent) => e.preventDefault();
        renderer.domElement.addEventListener("contextmenu", preventContext);

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
                needsResize = false; // resize handled for this frame
            }

            controlsRef.current?.update();

            // Draw the scene
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        tick();

        // Cleanup function runs when component unmounts
        return () => {
            ro.disconnect();
            renderer.domElement.removeEventListener("contextmenu", preventContext);
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
            controls.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            rendererRef.current = null;
            sceneRef.current = null;                                      
            cameraRef.current = null;
            controlsRef.current = null;
        };

    }, []); // run once on mount

    return (
        <div className={classes.container} ref={containerRef}>

        </div>
    )
};

export default Scene;