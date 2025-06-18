// DashboardHeader.jsx

export default function DashboardHeader() {
    return (
        <div className="text-center mb-6">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-white to-slate-400 mb-4">
                What AR world will you create today?
            </h1>
            <div className="flex justify-center">
                <input
                    type="text"
                    placeholder="Search your projects or prompt MeshAI..."
                    className="w-full max-w-2xl bg-black/30 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
            </div>
        </div>
    );
} 
