// src/pages/ARViewer.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import useAnalytics from "../components/hooks/useAnalytics";
import SceneCanvas from "../components/viewer/SceneCanvas";

function runActions(actions, setSceneData, navigateToProject, track) {
    (actions || []).forEach((act) => {
        if (act.type === "toggleVisibility" && act.targetId) {
            setSceneData(prev => prev.map(o => o.id === act.targetId ? { ...o, visible: o.visible === false ? true : false } : o));
            track("action_run", { kind: "toggleVisibility", targetId: act.targetId });
        }
        if (act.type === "playPauseAnimation" && act.targetId) {
            setSceneData(prev => prev.map(o => {
                if (o.id !== act.targetId) return o;
                const nextPaused = act.mode === "pause" ? true : act.mode === "play" ? false : !o.isPaused;
                return { ...o, isPaused: nextPaused };
            }));
            track("action_run", { kind: "playPauseAnimation", targetId: act.targetId, mode: act.mode || "toggle" });
        }
        if (act.type === "changeProject" && act.projectId) {
            track("action_run", { kind: "changeProject", projectId: act.projectId });
            navigateToProject(act.projectId);
        }
        if (act.type === "openClosePanel" && act.targetId) {
            const mode = act.mode || "toggle";
            setSceneData(prev => prev.map(o => {
                if (o.id !== act.targetId) return o;
                if (mode === "show") return { ...o, visible: true };
                if (mode === "hide") return { ...o, visible: false };
                return { ...o, visible: o.visible === false ? true : false };
            }));
            track("action_run", { kind: "openClosePanel", targetId: act.targetId, mode });
        }
    });
}

export default function ARViewer() {
    const { id: projectId } = useParams();
    const [sceneData, setSceneData] = useState([]);
    const [isAR, setIsAR] = useState(false);
    const { track } = useAnalytics({ projectId });

    const navigateToProject = (pid) => {
        window.location.href = `/ar/${pid}`;
    };

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/published/${projectId}`);
                const data = await res.json();
                console.log("📦 AR Scene Data:", data);
                if (res.ok && data.publishedScene) {
                    setSceneData(data.publishedScene);
                    track("viewer_loaded", { objects: data.publishedScene.length });
                }
            } catch (err) {
                console.error("Failed to load published scene", err);
            }
        })();
    }, [projectId, track]);

    // Create AR button and track XR session lifecycle
    useEffect(() => {
        const tid = setTimeout(() => {
            const canvas = document.querySelector("canvas");
            if (!canvas) return;
            const gl = canvas.__webglrenderer || canvas.getContext("webgl2") || canvas.getContext("webgl");
            if (!gl || !canvas?.xr) return;

            const button = ARButton.createButton(canvas.__r3f?.root.getState().gl, {
                requiredFeatures: ["hit-test"],
                optionalFeatures: ["dom-overlay"],
                domOverlay: { root: document.body }
            });
            document.body.appendChild(button);

            const xr = canvas.__r3f?.root.getState().gl.xr;
            xr.addEventListener("sessionstart", () => { setIsAR(true); track("xr_session_start"); });
            xr.addEventListener("sessionend", () => { setIsAR(false); track("xr_session_end"); });
        }, 200);

        return () => clearTimeout(tid);
    }, [track]);

    return (
        <div className="w-screen h-screen">
            <SceneCanvas
                sceneData={sceneData}
                isAR={isAR}
                onModelLoaded={({ id, animations }) => track("model_loaded", { objectId: id, animations })}
                onObjectTap={(obj) => {
                    track("tap_object", { objectId: obj.id, type: obj.type || "unknown", name: obj.name || null });
                }}
                onCTA={(btn) => {
                    track("button_click", { objectId: btn.id, label: btn?.appearance?.label || "Button" });
                    runActions(btn.interactions, setSceneData, navigateToProject, track);
                }}
                onQuizAttempt={({ item, questionId, correct }) => {
                    track("quiz_attempt", { quizId: item.id, questionId, correct });
                    if (typeof correct === "boolean") {
                        track("quiz_result", { quizId: item.id, questionId, correct });
                    }
                }}
                onActionRun={(meta) => track("action_run", meta)}
            />
        </div>
    );
}
