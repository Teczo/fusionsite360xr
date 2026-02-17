import { MapPin } from 'lucide-react';

export default function LocationSetupCard() {
    return (
        <div className="rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] col-span-1 lg:col-span-2">
            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                <div className="h-12 w-12 rounded-2xl bg-[#E8F8F5] flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-[#3BB2A5]" />
                </div>
                <h3 className="text-base font-semibold text-[#111827]">
                    Enable Location Intelligence
                </h3>
                <p className="text-sm text-[#6B7280] mt-1.5 max-w-sm">
                    Add a location to this project to unlock the interactive site map
                    and live weather monitoring for your project site.
                </p>
                <button
                    onClick={() => {
                        // Navigate to project settings / edit modal
                        // This is informational — the edit flow is handled by existing project edit UI
                        window.dispatchEvent(new CustomEvent('open-edit-project-location'));
                    }}
                    className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white btn-gradient-primary transition-colors"
                >
                    Add Location
                </button>
            </div>
        </div>
    );
}
