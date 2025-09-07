import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';


export default function ARModeSelect() {
    const { id } = useParams();
    const [xrSupported, setXrSupported] = useState(null);
    const [isIOS, setIsIOS] = useState(false);


    useEffect(() => {
        // Basic WebXR support check
        if (navigator.xr && navigator.xr.isSessionSupported) {
            navigator.xr.isSessionSupported('immersive-ar')
                .then((supported) => setXrSupported(supported))
                .catch(() => setXrSupported(false));
        } else {
            setXrSupported(false);
        }


        // Rudimentary iOS detection (helps with messaging for Safari/WebXR polyfills)
        const ua = window.navigator.userAgent || '';
        setIsIOS(/iPad|iPhone|iPod/.test(ua) && !window.MSStream);
    }, []);


    return (
        <div className="min-h-dvh w-full bg-[#0f1115] text-white flex items-center justify-center p-6">
            <div className="w-full max-w-xl rounded-2xl shadow-2xl bg-[#151821] border border-white/5">
                <div className="p-6 border-b border-white/5">
                    <h1 className="text-2xl font-semibold">Choose AR viewing mode</h1>
                    <p className="text-sm text-white/70 mt-1">Project ID: <span className="font-mono text-white/80">{id}</span></p>
                </div>


                <div className="p-6 grid gap-4">
                    {xrSupported === false && (
                        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
                            <div className="font-medium">Heads up: WebXR AR not detected</div>
                            <div className="opacity-80 mt-1">
                                Your device or browser may not support WebXR AR sessions. You can still try Tap‑to‑place mode; if it fails, please switch to a compatible device/browser.
                                {isIOS && (
                                    <span> On iOS, use Safari with iOS 16.4+ or a compatible WebXR viewer.</span>
                                )}
                            </div>
                        </div>
                    )}


                    <ModeCard
                        title="Auto‑load (instant)"
                        description="Loads the scene immediately in AR. Best for guided demos or fixed setups."
                        to={`/ar/${id}`}
                        cta="Open Auto‑load"
                        icon="⚡"
                    />


                    <ModeCard
                        title="Tap‑to‑place (manual)"
                        description="Scan your space and tap on a surface to place the scene. Best for flexible positioning."
                        to={`/ar-plane/${id}`}
                        cta="Open Tap‑to‑place"
                        icon="📍"
                    />
                </div>


                <div className="px-6 pb-6 text-xs text-white/60">
                    Tip: If nothing appears, ensure camera permissions are granted and adequate lighting is available for surface detection.
                </div>
            </div>
        </div>
    );
}


function ModeCard({ title, description, to, cta, icon }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
                <div className="text-2xl leading-none">{icon}</div>
                <div className="flex-1">
                    <div className="text-lg font-semibold">{title}</div>
                    <div className="text-sm text-white/70 mt-1">{description}</div>
                </div>
            </div>
            <div className="mt-4">
                <Link
                    to={to}
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 transition font-medium"
                >
                    {cta}
                </Link>
            </div>
        </div>
    );
}