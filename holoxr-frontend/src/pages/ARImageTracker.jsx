/* global THREE, THREEx */
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

const THREE_SOURCES = [
    // UMD build AR.js expects (keep this version)
    "https://unpkg.com/three@0.118.3/build/three.min.js",
];

const GLTF_SOURCES = [
    // Must match the THREE version and attach to window.THREE
    "https://unpkg.com/three@0.118.3/examples/js/loaders/GLTFLoader.js",
];

const ARJS_SOURCES = [
    // GitHub via jsDelivr, pinned tag
    "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.2/three.js/build/ar-threex.min.js",
    // npm mirrors
    "https://cdn.jsdelivr.net/npm/ar.js@3.4.2/three.js/build/ar-threex.min.js",
    "https://unpkg.com/ar.js@3.4.2/three.js/build/ar-threex.min.js",
    // GitHub file CDN variant (stable tags use rawcdn.githack.com, not raw.githack.com)
    "https://rawcdn.githack.com/AR-js-org/AR.js/3.4.2/three.js/build/ar-threex.min.js",
];


function loadScript(src) {
    return new Promise((resolve, reject) => {
        // already loaded?
        if ([...document.scripts].some(s => s.src === src)) return resolve();
        const s = document.createElement("script");
        s.src = src;
        s.async = false; // maintain order
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
    });
}

function waitFor(testFn, { timeout = 5000, interval = 50 } = {}) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function tick() {
            try {
                if (testFn()) return resolve();
            } catch { }
            if (Date.now() - start > timeout) return reject(new Error("Timed out waiting for dependency"));
            setTimeout(tick, interval);
        })();
    });
}

async function ensureOne(urls, testFn, what) {
    let lastErr;
    for (const url of urls) {
        try {
            await loadScript(url);
            await waitFor(testFn);
            return;
        } catch (e) {
            lastErr = e;
            // try next mirror
        }
    }
    throw new Error(`Could not load ${what}. Last error: ${lastErr?.message || lastErr}`);
}

export default function ARImageTracker() {
    const elRef = useRef(null);
    const { id } = useParams();
    const markerId = id || "trex"; // e.g. /ar-image/trex

    useEffect(() => {
        let canceled = false;
        let renderer, scene, camera, arToolkitSource, arToolkitContext, markerRoot, raf;
        let onResize;

        (async () => {
            // 1) Load dependencies in order with fallbacks
            await ensureOne(THREE_SOURCES, () => !!window.THREE?.REVISION, "THREE");
            await ensureOne(GLTF_SOURCES, () => typeof window.THREE?.GLTFLoader === "function", "GLTFLoader");
            await ensureOne(ARJS_SOURCES, () => !!window.THREEx?.ArToolkitSource, "AR.js (THREEx)");

            if (canceled || !elRef.current) return;

            const THREE = window.THREE;
            const { ArToolkitSource, ArToolkitContext, ArMarkerControls } = window.THREEx;

            // 2) Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.outputColorSpace = THREE.SRGBColorSpace; // ok for r118
            Object.assign(renderer.domElement.style, { position: "fixed", top: "0", left: "0" });
            elRef.current.appendChild(renderer.domElement);

            // 3) Scene + Camera + Light
            scene = new THREE.Scene();
            camera = new THREE.Camera();
            scene.add(camera);
            scene.add(new THREE.AmbientLight(0xffffff, 1));
            const dir = new THREE.DirectionalLight(0xffffff, 0.75);
            dir.position.set(1, 1, 1);
            scene.add(dir);

            // 4) AR Source (webcam)
            arToolkitSource = new ArToolkitSource({ sourceType: "webcam" });

            onResize = () => {
                arToolkitSource.onResizeElement();
                arToolkitSource.copyElementSizeTo(renderer.domElement);
                if (arToolkitContext?.arController) {
                    arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
                }
            };

            arToolkitSource.init(() => {
                const video = arToolkitSource.domElement;
                if (video?.setAttribute) {
                    video.setAttribute("playsinline", "");
                    video.setAttribute("webkit-playsinline", "");
                    video.setAttribute("muted", "");
                }
                onResize();
            });

            window.addEventListener("resize", onResize);

            // 5) AR Context
            arToolkitContext = new ArToolkitContext({
                cameraParametersUrl:
                    "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/three.js/data/data/camera_para.dat",
                detectionMode: "mono",
            });

            arToolkitContext.init(() => {
                camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
            });

            // 6) Marker + controls (NFT)
            markerRoot = new THREE.Group();
            scene.add(markerRoot);

            // Put your descriptors here (same-origin or CORS enabled):
            const nftBaseUrl = `/markers/${markerId}/${markerId}`;

            // eslint-disable-next-line no-new
            new ArMarkerControls(arToolkitContext, markerRoot, {
                type: "nft",
                descriptorsUrl: nftBaseUrl,
            });

            // 7) Load model under marker root
            const loader = new THREE.GLTFLoader();
            loader.load(
                `/models/${markerId}/scene.gltf`,
                (gltf) => {
                    const model = gltf.scene || gltf.scenes?.[0];
                    if (!model) return;
                    model.scale.set(0.5, 0.5, 0.5);
                    model.position.set(0, 0, 0);
                    markerRoot.add(model);
                },
                undefined,
                (err) => console.error("GLTF load error:", err)
            );

            // 8) Loop
            const tick = () => {
                if (canceled) return;
                raf = requestAnimationFrame(tick);
                if (arToolkitSource.ready) arToolkitContext.update(arToolkitSource.domElement);
                renderer.render(scene, camera);
            };
            tick();
        })().catch((e) => {
            console.error(e);
            alert(e.message);
        });

        return () => {
            canceled = true;
            if (raf) cancelAnimationFrame(raf);
            if (onResize) window.removeEventListener("resize", onResize);
            if (renderer?.domElement?.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        };
    }, [markerId]);

    return (
        <div
            ref={elRef}
            className="fixed inset-0 bg-black"
            style={{ touchAction: "none" }}
        />
    );
}
