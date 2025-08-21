import React, { useEffect, useRef, useCallback } from "react";
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function ARPlacementController({ enableAR, onAnchorPoseMatrix, onTapPlace }) {
    const { gl, scene } = useThree();

    const reticleRef = useRef();
    const hitTestSourceRef = useRef(null);
    const xrRefSpaceRef = useRef(null);
    const viewerSpaceRef = useRef(null);

    // Set up a simple ring reticle
    useEffect(() => {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.1, 32),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.matrixAutoUpdate = false;
        ring.visible = false;
        scene.add(ring);
        reticleRef.current = ring;
        return () => {
            scene.remove(ring);
            ring.geometry.dispose();
            ring.material.dispose();
        };
    }, [scene]);

    const handleTap = useCallback(() => {
        const frame = gl.xr.getFrame?.();
        const session = gl.xr.getSession?.();
        const source = hitTestSourceRef.current;
        const xrRefSpace = xrRefSpaceRef.current;
        if (!frame || !session || !source || !xrRefSpace) return;

        const results = frame.getHitTestResults(source);
        if (!results || results.length === 0) return;

        const hit = results[0];

        // Camera pose
        const viewerPose = frame.getViewerPose(xrRefSpace);
        if (!viewerPose) return;
        const vp = viewerPose.transform.position;
        const vq = viewerPose.transform.orientation;
        const camPos = new THREE.Vector3(vp.x, vp.y, vp.z);
        const camQuat = new THREE.Quaternion(vq.x, vq.y, vq.z, vq.w);
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat);

        // Compute final placement (≥ 1m in front if too close)
        const MIN_PLACE_DIST = 1.0;
        const hitPose = hit.getPose?.(xrRefSpace);
        let finalPos, finalQuat = camQuat.clone();

        if (hitPose) {
            const m = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
            const hitPos = new THREE.Vector3().setFromMatrixPosition(m);
            const dist = hitPos.distanceTo(camPos);

            if (dist < MIN_PLACE_DIST) {
                finalPos = camPos.clone().add(camForward.multiplyScalar(MIN_PLACE_DIST));
            } else {
                finalPos = hitPos;
                const r = new THREE.Quaternion().setFromRotationMatrix(m);
                finalQuat.copy(r);
            }
        } else {
            finalPos = camPos.clone().add(camForward.multiplyScalar(MIN_PLACE_DIST));
        }

        // Create anchor at adjusted transform; fallback to matrix if anchors unsupported
        const xf = new XRRigidTransform(
            { x: finalPos.x, y: finalPos.y, z: finalPos.z },
            { x: finalQuat.x, y: finalQuat.y, z: finalQuat.z, w: finalQuat.w }
        );

        if (frame.createAnchor) {
            frame.createAnchor(xf, xrRefSpace)
                .then(anchor => onTapPlace?.({ anchor, xrRefSpace }))
                .catch(() => {
                    const mat = new THREE.Matrix4().compose(finalPos, finalQuat, new THREE.Vector3(1, 1, 1));
                    onTapPlace?.({ anchor: null, poseMatrix: mat.toArray(), xrRefSpace });
                });
        } else if (hit.createAnchor) {
            hit.createAnchor()
                .then(anchor => onTapPlace?.({ anchor, xrRefSpace }))
                .catch(() => {
                    const mat = new THREE.Matrix4().compose(finalPos, finalQuat, new THREE.Vector3(1, 1, 1));
                    onTapPlace?.({ anchor: null, poseMatrix: mat.toArray(), xrRefSpace });
                });
        } else {
            const mat = new THREE.Matrix4().compose(finalPos, finalQuat, new THREE.Vector3(1, 1, 1));
            onTapPlace?.({ anchor: null, poseMatrix: mat.toArray(), xrRefSpace });
        }
    }, [gl, onTapPlace]);

    // Handle session lifecycle: request spaces + hitTest + XR 'select' event
    useEffect(() => {
        if (!enableAR) return;

        function onSessionStart() {
            const session = gl.xr.getSession();
            if (!session) return;

            // request reference spaces
            Promise.all([
                session.requestReferenceSpace('local-floor').catch(() => session.requestReferenceSpace('local')),
                session.requestReferenceSpace('viewer')
            ]).then(([xrRefSpace, viewerSpace]) => {
                xrRefSpaceRef.current = xrRefSpace;
                viewerSpaceRef.current = viewerSpace;
                session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                    hitTestSourceRef.current = source;
                }).catch((e) => console.warn('HitTestSource failed:', e));
            });

            // listen for AR tap via WebXR input
            session.addEventListener('select', handleTap);

            // cleanup on end
            const endHandler = () => {
                hitTestSourceRef.current = null;
                xrRefSpaceRef.current = null;
                viewerSpaceRef.current = null;
                if (reticleRef.current) reticleRef.current.visible = false;
                session.removeEventListener('select', handleTap);
            };
            session.addEventListener('end', endHandler);
        }

        gl.xr.addEventListener('sessionstart', onSessionStart);
        return () => {
            gl.xr.removeEventListener('sessionstart', onSessionStart);
        };
    }, [gl, enableAR, handleTap]);

    // Per-frame reticle + anchor pose updates
    useFrame((_, __, frame) => {
        if (!frame) return;

        const source = hitTestSourceRef.current;
        const xrRefSpace = xrRefSpaceRef.current;
        const reticle = reticleRef.current;

        // Update reticle by hit-test
        if (source && xrRefSpace && reticle) {
            const results = frame.getHitTestResults(source);
            if (results.length > 0) {
                const hit = results[0];
                const pose = hit.getPose(xrRefSpace);
                if (pose) {
                    reticle.visible = true;
                    reticle.matrix.fromArray(pose.transform.matrix);
                }
            } else {
                reticle.visible = false;
            }
        }

        // If parent provided a callback to update anchor-driven matrix, call it every frame
        if (onAnchorPoseMatrix) onAnchorPoseMatrix(frame, xrRefSpace || gl.xr.getReferenceSpace());
    });

    // Optional: also support desktop click (useful for debug outside AR)
    useEffect(() => {
        const canvas = gl.domElement;
        if (!enableAR) return;
        const onClick = () => handleTap();
        canvas.addEventListener('click', onClick);
        return () => canvas.removeEventListener('click', onClick);
    }, [gl, enableAR, handleTap]);

    return null; // controller renders nothing (reticle is added directly to scene)
}
