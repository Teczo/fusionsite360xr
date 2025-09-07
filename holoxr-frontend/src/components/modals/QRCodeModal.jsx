import QRCode from 'react-qr-code';
import { useMemo, useRef, useState } from 'react';

/**
 * QRCodeModal — polished, print‑ready modal with better layout & exports
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - url: string (recommended: /ar-select/:id)
 *  - projectTitle?: string
 *  - brand?: { name?: string, logoUrl?: string }
 *  - theme?: 'light' | 'dark'
 */
export default function QRCodeModal({ isOpen, onClose, url, projectTitle, brand, theme = 'light' }) {
    if (!isOpen) return null;

    const qrWrapRef = useRef(null);
    const [downloading, setDownloading] = useState(false);

    const fileBase = useMemo(() => {
        const base = (projectTitle || 'HoloXR_Project').replace(/[^a-z0-9]+/gi, '_');
        return base.replace(/^_+|_+$/g, '');
    }, [projectTitle]);

    const isDark = theme === 'dark';
    const bg = isDark ? '#0f1115' : '#ffffff';
    const fg = isDark ? '#ffffff' : '#111827';

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast('Link copied to clipboard');
        } catch {
            alert('Link copied to clipboard!');
        }
    };

    const openInNewTab = () => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const downloadSVG = () => {
        const svg = qrWrapRef.current?.querySelector('svg');
        if (!svg) return;
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svg);
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = `${fileBase}-qrcode.svg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlObj);
    };

    const downloadPNG = async (scale = 4) => {
        // scale=4 -> sharp print (4x)
        setDownloading(true);
        try {
            const svg = qrWrapRef.current?.querySelector('svg');
            if (!svg) return;
            const serializer = new XMLSerializer();
            const svgData = serializer.serializeToString(svg);

            const img = new Image();
            const svg64 = btoa(unescape(encodeURIComponent(svgData)));
            img.src = 'data:image/svg+xml;base64,' + svg64;
            await img.decode();

            const canvas = document.createElement('canvas');
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            // Fill background for print
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const dataURL = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `${fileBase}-qrcode.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } finally {
            setDownloading(false);
        }
    };

    const printQR = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        const title = projectTitle || 'AR Experience';
        const svg = qrWrapRef.current?.querySelector('svg');
        const serializer = new XMLSerializer();
        const svgData = serializer.serializeToString(svg);
        w.document.write(`<!doctype html><html><head><meta charset="utf-8" />
      <title>${title} — QR</title>
      <style>
        body{margin:0;padding:40px;background:${bg};color:${fg};font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
        .wrap{max-width:720px;margin:0 auto;text-align:center}
        .qr{padding:24px;border-radius:16px;background:${isDark ? '#151821' : '#f8fafc'};display:inline-block}
        h1{margin:16px 0 8px;font-size:20px}
        p{margin:0 0 16px;opacity:.8}
      </style>
    </head><body><div class="wrap">
      <div class="qr">${svgData}</div>
      <h1>${title}</h1>
      <p>${url}</p>
    </div></body></html>`);
        w.document.close();
        w.focus();
        w.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border ${isDark ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-white border-black/10 text-gray-900'}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    <div className="flex items-center gap-3">
                        {brand?.logoUrl && (
                            <img src={brand.logoUrl} alt={brand?.name || 'Brand'} className="h-7 w-7 rounded" />
                        )}
                        <div>
                            <h2 className="text-lg font-semibold leading-tight">Preview this Augmented Reality experience</h2>
                            <p className="text-xs opacity-70">Scan on your phone to open</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`h-8 w-8 inline-flex items-center justify-center rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} aria-label="Close">✕</button>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Left: QR area */}
                    <div className={`p-6 flex flex-col items-center justify-center ${isDark ? 'bg-[#0b0d12]' : 'bg-gray-50'} rounded-bl-2xl md:rounded-bl-2xl md:rounded-br-none rounded-br-2xl md:rounded-br-none`}>
                        <div ref={qrWrapRef} className={`p-5 rounded-2xl ${isDark ? 'bg-[#151821] border border-white/10' : 'bg-white border border-black/10'}`}>
                            {/* Increase size for scanability; react-qr-code includes quiet zone by default */}
                            <QRCode value={url} size={220} bgColor={isDark ? '#151821' : '#ffffff'} fgColor={fg} level="M" />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button onClick={openInNewTab} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-900 text-white hover:bg-black'}`}>Test on this device</button>
                            <button onClick={copyToClipboard} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-200 hover:bg-gray-300'}`}>Copy link</button>
                            <button onClick={() => downloadPNG(4)} disabled={downloading} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-200 hover:bg-gray-300'}`}>{downloading ? 'Preparing…' : 'Download PNG'}</button>
                            <button onClick={downloadSVG} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-200 hover:bg-gray-300'}`}>Download SVG</button>
                            <button onClick={printQR} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-200 hover:bg-gray-300'}`}>Print</button>
                        </div>
                    </div>

                    {/* Right: details */}
                    <div className="p-6 flex flex-col gap-4">
                        <div>
                            <div className="text-xs uppercase tracking-wide opacity-60">Project</div>
                            <h3 className="text-xl font-semibold mt-1">{projectTitle || 'Untitled Project'}</h3>
                            {brand?.name && (
                                <div className="text-sm opacity-70 mt-1">by {brand.name}</div>
                            )}
                        </div>

                        <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-black/10'}`}>
                            <div className="text-sm opacity-90">This QR opens a mode selector where you can pick:</div>
                            <ul className="mt-2 text-sm list-disc ml-5 opacity-90">
                                <li><span className="font-medium">Auto‑load</span> — scene starts instantly.</li>
                                <li><span className="font-medium">Tap‑to‑place</span> — scan and place on a surface.</li>
                            </ul>
                        </div>

                        <div>
                            <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Shareable link</div>
                            <div className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-mono break-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                                <span className="flex-1 select-all">{url}</span>
                                <button onClick={copyToClipboard} className={`px-2 py-1 rounded ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-200 hover:bg-gray-300'}`}>Copy</button>
                            </div>
                            <div className="text-xs opacity-60 mt-2">Anyone with this QR or link can access the AR experience.</div>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="text-xs opacity-60">Best scanned from a mobile device.</div>
                            <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-900 text-white hover:bg-black'}`}>Done</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Tiny toast util (optional). If you already use react-hot-toast, replace with toast.success.
function toast(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#111827;color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;z-index:9999;opacity:0;transition:opacity .2s';
    document.body.appendChild(el);
    requestAnimationFrame(() => (el.style.opacity = '1'));
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 200);
    }, 1600);
}