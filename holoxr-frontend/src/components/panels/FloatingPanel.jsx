import React from 'react';
import { Move, RotateCcw, Scaling, EyeOff, RefreshCw } from 'lucide-react';

export default function FloatingPanel({ transformMode, setTransformMode, onResetView }) {
    const modes = [
        { key: 'translate', icon: Move },
        { key: 'rotate', icon: RotateCcw },
        { key: 'scale', icon: Scaling },
        { key: 'none', icon: EyeOff },
    ];

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl rounded-3xl px-4 py-2 flex gap-2">
            {modes.map(({ key, icon: Icon }) => (
                <button
                    key={key}
                    onClick={() => setTransformMode(key)}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition 
            hover:bg-gray-300 ${transformMode === key ? 'bg-gray-300' : 'bg-transparent'
                        }`}
                >
                    <Icon size={16} className={transformMode === key ? 'text-black' : 'text-white'} />
                </button>
            ))}
            <button
                onClick={onResetView}
                className="w-9 h-9 flex items-center justify-center rounded-full transition hover:bg-gray-300 bg-transparent"
            >
                <RefreshCw size={16} className="text-white" />
            </button>
        </div>
    );
}
