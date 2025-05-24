import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function ARMarkerViewer() {
    const { id } = useParams();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/aframe/build/aframe-ar.min.js';
        script.async = true;
        script.onload = () => setLoaded(true); // ✅ only render scene when loaded
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    if (!loaded) return <p className="text-center mt-10">Loading AR...</p>;

    return (
        <div>
            <a-scene
                vr-mode-ui="enabled: false"
                embedded
                arjs="sourceType: webcam; debugUIEnabled: false;"
                renderer="logarithmicDepthBuffer: true"
                style={{ height: '100vh', width: '100vw' }}
            >
                <a-marker preset="hiro">
                    <a-entity
                        gltf-model={`https://holoxr-backend.onrender.com/api/published-model/${id}`}
                        scale="0.5 0.5 0.5"
                        position="0 0 0"
                        rotation="0 0 0"
                    ></a-entity>
                </a-marker>

                <a-entity camera></a-entity>
            </a-scene>
        </div>
    );
}
