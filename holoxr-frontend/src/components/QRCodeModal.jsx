import QRCode from 'react-qr-code';

export default function QRCodeModal({ isOpen, onClose, url }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-[400px] rounded-lg shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Share This Scene</h2>
                    <button onClick={onClose} className="text-red-600 text-lg font-bold">×</button>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <QRCode value={url} size={200} />
                    <p className="text-sm break-all text-center">{url}</p>
                </div>
            </div>
        </div>
    );
}
