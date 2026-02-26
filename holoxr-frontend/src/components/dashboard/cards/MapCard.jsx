import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix default marker icon paths (Leaflet + bundlers strip them)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

export default function MapCard({ project }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const lat = project?.location?.latitude;
    const lng = project?.location?.longitude;
    const address = project?.location?.address;
    const name = project?.name;

    useEffect(() => {
        if (!mapRef.current || !lat || !lng) return;

        // Avoid re-initializing on the same container
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current, {
            scrollWheelZoom: false,
            zoomControl: true,
        }).setView([lat, lng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        const popupContent = [
            name ? `<strong>${name}</strong>` : '',
            address ? `<br/><span style="color:#6B7280;font-size:12px">${address}</span>` : '',
        ].join('');

        L.marker([lat, lng])
            .addTo(map)
            .bindPopup(popupContent || 'Project Location');

        mapInstanceRef.current = map;

        // Ensure tiles render correctly after container is laid out
        setTimeout(() => map.invalidateSize(), 200);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [lat, lng, name, address]);

    return (
        <div className="rounded-lg border border-border bg-surface shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-0">
                <h3 className="text-sm font-semibold text-textpri">Project Location</h3>
            </div>
            <div className="p-4 pt-3">
                <div
                    ref={mapRef}
                    className="h-64 w-full rounded-lg overflow-hidden border border-border"
                />
                {address && (
                    <p className="mt-2 text-xs text-textsec truncate">{address}</p>
                )}
            </div>
        </div>
    );
}
