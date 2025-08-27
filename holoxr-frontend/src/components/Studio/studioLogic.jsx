// studioLogic.jsx
// Pure logic: API fetch/save, model loading, and scene state updates (no JSX returned)
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { unzipSync } from "fflate";
import toast from "react-hot-toast";

// ---------- Helpers ----------
function buildCleanScene(sceneModels) {
    return sceneModels.map((model) => {
        const {
            id,
            name,
            type,
            url,
            transform,
            autoplay,
            isPaused,
            selectedAnimationIndex,
            content,
            fontSize,
            color,
            visible,
            uiKind,
            appearance,
            interactions,
            targetId,
            lineMode,
            anchorPoint,
            quiz, // 👈 include it
        } = model;

        return {
            id,
            name,
            type,
            url,
            transform,
            autoplay,
            isPaused,
            selectedAnimationIndex,
            content,
            fontSize,
            color,
            visible,
            uiKind,
            appearance,
            interactions,
            targetId,
            lineMode,
            anchorPoint,
            ...(quiz ? { quiz } : {}), // 👈 persist quiz only if present
        };
    });
}

async function buildCleanSceneWithBehaviors(projectId, sceneModels) {
    // 1) Build the base scene (stripped to core props)
    const base = buildCleanScene(sceneModels); // keeps id, type, url, transform, interactions, label props, quiz, etc.
    // 2) Fetch animations for this project and map by objectId
    const byObjectId = await fetchProjectAnimations(projectId); // { [objectId]: { behaviors: [...] } }
    // 3) Attach behaviors to matching objects
    return base.map(obj => {
        const anim = byObjectId?.[obj.id];
        const behaviors = Array.isArray(anim?.behaviors) ? anim.behaviors : undefined;
        // Only include the key if behaviors exist, to keep payload lean
        return behaviors ? { ...obj, behaviors } : obj;
    });
}


export async function loadProjectData(projectId, token, setSceneModels, setProjectName) {
    if (!projectId || !token) return;
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.scene) {
            setSceneModels(data.scene);
            setProjectName(data.name || "Untitled Project");
        } else {
            toast.error(data?.error || "Failed to load project");
        }
    } catch (err) {
        console.error("Failed to load project scene:", err);
        toast.error("Network error while loading project");
    }
}

/**
 * Ensures that each model of type 'model' has its scene/animations loaded.
 * Call this inside a useEffect when sceneModels changes.
 */
export function initializeModelLoading(sceneModels, setSceneModels) {
    sceneModels.forEach((model) => {
        if (model.type !== "model") return;
        if (model.scene || !model.url) return;

        const setLoaded = (gltf) => {
            setSceneModels((prev) =>
                prev.map((m) =>
                    m.id === model.id
                        ? {
                            ...m,
                            scene: gltf.scene,
                            animations: gltf.animations || [],
                            playAnimationKey: Date.now(),
                        }
                        : m
                )
            );
        };

        const loadFromBlob = (blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const loader = new GLTFLoader();
            loader.load(blobUrl, (gltf) => setLoaded(gltf));
        };

        if (model.url.endsWith(".zip")) {
            fetch(model.url)
                .then((res) => res.arrayBuffer())
                .then((buffer) => {
                    const zip = unzipSync(new Uint8Array(buffer));
                    const glbName = Object.keys(zip).find((n) => n.endsWith(".glb"));
                    if (!glbName) return;
                    const blob = new Blob([zip[glbName]], { type: "model/gltf-binary" });
                    loadFromBlob(blob);
                })
                .catch((e) => console.error("Zip load error:", e));
        } else {
            const loader = new GLTFLoader();
            loader.load(model.url, (gltf) => setLoaded(gltf));
        }
    });
}

/**
 * Create and insert a new item from the Library selection.
 * Sets selection to the new item’s id.
 */
export function handleLibraryItemSelect(item, setSceneModels, setSelectedModelId) {
    const id = Date.now().toString();
    const baseModel = {
        id,
        name: item.name,
        type: item.type,
        url: item.url,
        scene: null,
        animations: [],
        selectedAnimationIndex: 0,
        playAnimationKey: Date.now(),
        isPaused: false,
        autoplay: false,
        transform: item.transform || {
            x: 0, y: 0, z: 0,
            rx: 0, ry: 0, rz: 0,
            sx: 1, sy: 1, sz: 1,
        },
    };

    // defaults for text
    if (item.type === "text") {
        baseModel.content = item.content ?? "Hello World";
        baseModel.fontSize = item.fontSize ?? 1;
        baseModel.color = item.color ?? "#ffffff";
    }

    // defaults for label
    if (item.type === "label") {
        baseModel.content = item.content ?? "New Label";
        baseModel.fontSize = item.fontSize ?? 0.35;
        baseModel.color = item.color ?? "#ffffff";
        baseModel.appearance = item.appearance ?? {
            bg: "#111827",
            padding: [0.3, 0.15],
            borderRadius: 0.08,
            lineWidth: 2,
        };
        baseModel.targetId = item.targetId ?? null;
        baseModel.lineMode = item.lineMode ?? "none";     // 'none' | 'toObject' | 'toPoint'
        baseModel.anchorPoint = item.anchorPoint ?? null;  // {x,y,z} when 'toPoint'
    }

    const finalizeAdd = (model) => {
        setSceneModels((prev) => [...prev, model]);
        setSelectedModelId(id);
    };

    if (item.type === "model") {
        const setLoaded = (gltf) => {
            baseModel.scene = gltf.scene;
            baseModel.animations = gltf.animations || [];
            finalizeAdd(baseModel);
        };

        if (item.url?.endsWith(".zip")) {
            fetch(item.url)
                .then((res) => res.arrayBuffer())
                .then((buffer) => {
                    const zip = unzipSync(new Uint8Array(buffer));
                    const glbName = Object.keys(zip).find((n) => n.endsWith(".glb"));
                    if (!glbName) return;
                    const blob = new Blob([zip[glbName]], { type: "model/gltf-binary" });
                    const blobUrl = URL.createObjectURL(blob);
                    const loader = new GLTFLoader();
                    loader.load(blobUrl, (gltf) => setLoaded(gltf));
                })
                .catch((e) => console.error("Zip load error:", e));
        } else {
            const loader = new GLTFLoader();
            loader.load(item.url, (gltf) => setLoaded(gltf));
        }
    } else {
        // non-model types (image/text/button/label) finalize immediately
        finalizeAdd(baseModel);
    }
}


// ---------- State Updaters ----------
export function updateModelTransform(setSceneModels, id, updates) {
    setSceneModels((prev) =>
        prev.map((model) =>
            model.id === id
                ? {
                    ...model,
                    transform: { ...model.transform, ...updates },
                    ...(typeof updates.selectedAnimationIndex !== "undefined" && {
                        selectedAnimationIndex: updates.selectedAnimationIndex,
                    }),
                    ...(typeof updates.playAnimationKey !== "undefined" && {
                        playAnimationKey: updates.playAnimationKey,
                    }),
                    ...(typeof updates.isPaused !== "undefined" && {
                        isPaused: updates.isPaused,
                    }),
                    ...(typeof updates.autoplay !== "undefined" && {
                        autoplay: updates.autoplay,
                    }),
                }
                : model
        )
    );
}

export function updateModelProps(setSceneModels, id, updatesOrFn) {
    setSceneModels((prev) =>
        prev.map((m) => {
            if (m.id !== id) return m;
            const updates = typeof updatesOrFn === "function" ? updatesOrFn(m) : updatesOrFn;
            const merged = { ...m, ...updates };
            if (updates.appearance) {
                merged.appearance = { ...(m.appearance || {}), ...updates.appearance };
            }
            if (updates.interactions !== undefined) {
                merged.interactions = updates.interactions;
            }
            return merged;
        })
    );
}

export function updateTextProperty(setSceneModels, id, updates) {
    setSceneModels((prev) =>
        prev.map((model) => (model.id === id && model.type === "text" ? { ...model, ...updates } : model))
    );
}

// ---------- Interactions ----------
export function runButtonActions(buttonItem, setSceneModels) {
    const actions = buttonItem.interactions || [];
    actions.forEach((act) => {
        if (act.type === "toggleVisibility" && act.targetId) {
            setSceneModels((prev) =>
                prev.map((obj) => (obj.id === act.targetId ? { ...obj, visible: obj.visible === false ? true : false } : obj))
            );
        }
        if (act.type === "playPauseAnimation" && act.targetId) {
            setSceneModels((prev) =>
                prev.map((obj) => {
                    if (obj.id !== act.targetId) return obj;
                    const nextPaused = act.mode === "pause" ? true : act.mode === "play" ? false : !obj.isPaused;
                    return { ...obj, isPaused: nextPaused };
                })
            );
        }
        if (act.type === "changeProject" && act.projectId) {
            // Studio preview: don't navigate
            toast(`(Preview) Would load project: ${act.projectId}`);
        }
    });
}

// ---------- Save / Publish ----------
export async function handleSaveProject(projectId, sceneModels) {
    if (!projectId || !sceneModels.length) return false;
    const token = localStorage.getItem("token");
    try {
        const mergedScene = await buildCleanSceneWithBehaviors(projectId, sceneModels);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ scene: mergedScene }),
        });

        const data = await res.json();
        if (!res.ok) {
            toast.error(data.error || "Failed to save project");
            return false;
        }
        toast.success("Scene saved successfully!");
        return true;
    } catch (err) {
        console.error(err);
        toast.error("Network error while saving");
        return false;
    }
}

export async function handlePublishProject(projectId, sceneModels) {
    if (!projectId || !sceneModels.length) return false;
    const token = localStorage.getItem("token");
    try {
        // ⬇️ Use the merged scene with behaviors
        const mergedScene = await buildCleanSceneWithBehaviors(projectId, sceneModels);

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/publish`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ scene: mergedScene }),
        });

        const data = await res.json();
        if (!res.ok) {
            toast.error(data.error || "Failed to publish project");
            return false;
        }
        return true;
    } catch (err) {
        console.error(err);
        toast.error("Network error while publishing");
        return false;
    }
}


// ---------- Animations API (project scope & per-object) ----------
export async function fetchProjectAnimations(projectId) {
    const token = localStorage.getItem("token");
    if (!projectId || !token) return {};
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/animations?projectId=${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return {};
        const list = await res.json(); // [{ _id, projectId, objectId, enabled, behaviors, ... }]
        const byId = {};
        list.forEach((a) => { byId[a.objectId] = a; });
        return byId;
    } catch (e) {
        console.warn("fetchProjectAnimations error:", e);
        return {};
    }
}

export async function upsertObjectAnimation(projectId, objectId, payload) {
    const token = localStorage.getItem("token");
    if (!projectId || !objectId || !token) return null;
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/animations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ projectId, objectId, ...payload }),
        });
        if (!res.ok) {
            console.warn("upsertObjectAnimation failed:", await res.text());
            return null;
        }
        return await res.json();
    } catch (e) {
        console.warn("upsertObjectAnimation error:", e);
        return null;
    }
}

