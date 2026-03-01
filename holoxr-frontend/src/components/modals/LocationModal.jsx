import React, { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';

export default function LocationModal({ projectId, projectLocation, onClose, onSave }) {
    const [form, setForm] = useState({
        locationAddress: '',
        locationLat: '',
        locationLng: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // Pre-fill if editing an existing location
    useEffect(() => {
        if (projectLocation) {
            setForm({
                locationAddress: projectLocation.address || '',
                locationLat: projectLocation.latitude || '',
                locationLng: projectLocation.longitude || ''
            });
        }
    }, [projectLocation]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Build location object
        const loc = {};
        if (form.locationAddress) loc.address = form.locationAddress;
        if (form.locationLat) loc.latitude = parseFloat(form.locationLat);
        if (form.locationLng) loc.longitude = parseFloat(form.locationLng);

        if (Object.keys(loc).length === 0) {
            setError("Please provide at least one location field.");
            return;
        }

        try {
            setIsSaving(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/location`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ location: loc })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update location');
            }

            // Successfully saved
            onSave(loc);
            onClose();

        } catch (err) {
            console.error("Location save error:", err);
            setError(err.message || 'Network error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-xl mx-4 flex flex-col">
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#E8F8F5] flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-[#3BB2A5]" />
                        </div>
                        <h2 className="text-xl font-bold text-[#111827]">
                            {projectLocation ? 'Edit Location' : 'Add Location'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1.5">
                            Address
                        </label>
                        <input
                            name="locationAddress"
                            value={form.locationAddress}
                            onChange={handleChange}
                            placeholder="e.g. 123 Main St, City"
                            className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-[#111827] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1.5">
                                Latitude
                            </label>
                            <input
                                type="number"
                                step="any"
                                name="locationLat"
                                value={form.locationLat}
                                onChange={handleChange}
                                placeholder="e.g. -26.2041"
                                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-[#111827] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1.5">
                                Longitude
                            </label>
                            <input
                                type="number"
                                step="any"
                                name="locationLng"
                                value={form.locationLng}
                                onChange={handleChange}
                                placeholder="e.g. 28.0473"
                                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-[#111827] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-2 text-xs text-[#6B7280]">
                        Adding latitude and longitude allows the interactive site map and live weather modules to function correctly.
                    </div>

                    <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#111827] rounded-xl text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white btn-gradient-primary disabled:opacity-70 flex items-center justify-center min-w-[100px]"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
