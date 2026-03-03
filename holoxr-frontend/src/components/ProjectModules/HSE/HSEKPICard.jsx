import { TrendingUp, TrendingDown } from 'lucide-react';

export default function HSEKPICard({ label, value, icon: Icon, iconBg, delta, deltaUp, sub }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-textsec uppercase tracking-wide">{label}</div>
                <div className="text-2xl font-bold text-textpri mt-0.5">{value}</div>
                {sub && <div className="text-xs text-textsec mt-0.5">{sub}</div>}
                {delta !== undefined && (
                    <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${deltaUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {deltaUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {delta}
                    </div>
                )}
            </div>
        </div>
    );
}
