import { MapPin } from 'lucide-react';

export default function LocationSetupCard() {
    return (
        <div className="rounded-lg border border-border bg-surface shadow-card col-span-1 lg:col-span-2">
            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                <div className="h-12 w-12 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-textpri">
                    Enable Location Intelligence
                </h3>
                <p className="text-sm text-textsec mt-1.5 max-w-sm">
                    Add a location to this project to unlock the interactive site map
                    and live weather monitoring for your project site.
                </p>
                <button
                    onClick={() => {
                        // Navigate to project settings / edit modal
                        // This is informational — the edit flow is handled by existing project edit UI
                        window.dispatchEvent(new CustomEvent('open-edit-project-location'));
                    }}
                    className="mt-5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white btn-gradient-primary transition-colors"
                >
                    Add Location
                </button>
            </div>
        </div>
    );
}
