import React, { useEffect, useRef } from "react";
import { useThree } from '@react-three/fiber'

export function ARGestureControls({ enabled, targetRef, minScale = 0.1, maxScale = 5, rotateSpeed = 0.005 }) {
    const { gl } = useThree();
    const stateRef = useRef({
        touches: [],
        startDist: 0,
        startAngle: 0,
        startScale: 1,
        startYaw: 0,
        lastX: 0,
        rotating: false,
        pinching: false,
    });

    useEffect(() => {
        const canvas = gl.domElement;
        if (!enabled || !targetRef?.current) return;

        const dist = (t0, t1) => Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const ang = (t0, t1) => Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX);

        const onStart = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const s = stateRef.current;
            s.touches = Array.from(e.touches);
            const target = targetRef.current;
            if (!target) return;

            if (s.touches.length === 1) {
                s.rotating = true;
                s.pinching = false;
                s.lastX = s.touches[0].clientX;
                s.startYaw = target.rotation.y;
            } else if (s.touches.length >= 2) {
                s.rotating = false;
                s.pinching = true;
                const [t0, t1] = s.touches;
                s.startDist = dist(t0, t1);
                s.startAngle = ang(t0, t1);
                s.startScale = target.scale.x; // assume uniform
                s.startYaw = target.rotation.y;
            }
        };

        const onMove = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const s = stateRef.current;
            const target = targetRef.current;
            if (!target) return;

            s.touches = Array.from(e.touches);

            if (s.pinching && s.touches.length >= 2) {
                const [t0, t1] = s.touches;

                // pinch to scale
                const d = dist(t0, t1);
                if (s.startDist > 0) {
                    let next = (d / s.startDist) * s.startScale;
                    next = Math.min(maxScale, Math.max(minScale, next));
                    target.scale.set(next, next, next);
                }

                // optional two‑finger twist to rotate
                const a = ang(t0, t1);
                const deltaA = a - s.startAngle;
                target.rotation.y = s.startYaw + deltaA;
            } else if (s.rotating && s.touches.length === 1) {
                const x = s.touches[0].clientX;
                const dx = x - s.lastX;
                s.lastX = x;
                target.rotation.y += dx * rotateSpeed;
            }
        };

        const onEnd = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const s = stateRef.current;
            s.touches = Array.from(e.touches);
            if (s.touches.length === 0) {
                s.rotating = false;
                s.pinching = false;
            } else if (s.touches.length === 1) {
                s.rotating = true;
                s.pinching = false;
                s.lastX = s.touches[0].clientX;
                s.startYaw = targetRef.current?.rotation.y ?? 0;
            }
        };

        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onEnd, { passive: false });
        canvas.addEventListener('touchcancel', onEnd, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', onStart);
            canvas.removeEventListener('touchmove', onMove);
            canvas.removeEventListener('touchend', onEnd);
            canvas.removeEventListener('touchcancel', onEnd);
        };
    }, [gl, enabled, targetRef, minScale, maxScale, rotateSpeed]);

    return null;
}
