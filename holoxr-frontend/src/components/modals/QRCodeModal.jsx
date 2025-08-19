import QRCode from 'react-qr-code';
import { useRef } from 'react';

export default function QRCodeModal({ isOpen, onClose, url, projectTitle }) {
    if (!isOpen) return null;

    // Ref to access the QR code SVG for downloading
    const qrRef = useRef();

    // Function to copy URL to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    };

    // Function to download QR code as PNG
    const downloadQRCode = () => {
        const svg = qrRef.current.querySelector('svg');
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `${projectTitle}-qrcode.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-[500px] rounded-lg shadow-xl p-6">
                {/* Header with Title and Close Button */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Preview this Augmented Reality experience</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-lg font-bold">
                        ×
                    </button>
                </div>

                {/* Main Content: QR Code and Details */}
                <div className="flex gap-4 mb-6">
                    {/* QR Code */}
                    <div ref={qrRef} className="flex-shrink-0">
                        <QRCode value={url} size={100} />
                        <button
                            onClick={downloadQRCode}
                            className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                            Download
                        </button>
                    </div>

                    {/* Project Title, Description, and Download Button */}
                    <div className="flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-1">{projectTitle || 'Untitled Project'}</h3>
                            <p className="text-sm text-gray-600">
                                Download the QR code to open the project. Anyone with the QR code can access it.
                            </p>
                        </div>

                    </div>
                </div>

                {/* Link Section */}
                <div>
                    <p className="text-sm font-medium mb-2">Anyone with the QR code can access it.</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={url}
                            readOnly
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none"
                        />
                        <button
                            onClick={copyToClipboard}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                        >
                            Copy link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}