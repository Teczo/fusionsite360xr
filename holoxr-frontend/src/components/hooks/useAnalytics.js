// src/hooks/useAnalytics.js
import { useEffect, useMemo, useRef } from "react";

const API = import.meta.env.VITE_API_URL;

function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function useAnalytics({ projectId }) {
    const sessionIdRef = useRef(uid());

    const common = useMemo(
        () => ({
            projectId,
            sessionId: sessionIdRef.current,
            ua: navigator.userAgent,
            platform: navigator.platform,
            lang: navigator.language,
            ref: document.referrer || null,
        }),
        [projectId]
    );

    function post(event, props = {}) {
        if (!API) return;

        const payload = { ts: Date.now(), event, ...common, ...props };
        const url = `${API}/api/analytics/track`;
        const body = JSON.stringify(payload);

        // Prefer sendBeacon (reliable on page hide/unload)
        if (navigator.sendBeacon) {
            const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
            if (navigator.sendBeacon(url, blob)) return;
        }

        // Fallback: no credentials, safelisted content-type (no preflight)
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body,
            credentials: "omit",
            keepalive: true,
            cache: "no-store",
        }).catch(() => { });
    }

    // Lifecycle events
    useEffect(() => {
        post("viewer_open");
        const beforeUnload = () => post("session_end");
        window.addEventListener("beforeunload", beforeUnload);
        const hb = setInterval(() => post("heartbeat", { everySec: 30 }), 30000);
        return () => {
            clearInterval(hb);
            window.removeEventListener("beforeunload", beforeUnload);
            post("session_end");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        track: post,
        sessionId: sessionIdRef.current,
    };
}
