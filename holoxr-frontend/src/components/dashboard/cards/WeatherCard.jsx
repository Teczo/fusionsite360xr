import { useEffect, useState } from 'react';
import { Droplets, Wind } from 'lucide-react';

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const BASE = 'https://api.openweathermap.org/data/2.5';

export default function WeatherCard({ project }) {
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const lat = project?.location?.latitude;
    const lng = project?.location?.longitude;

    useEffect(() => {
        if (!lat || !lng || !API_KEY) {
            setLoading(false);
            if (!API_KEY) setError('Weather API key not configured');
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        const fetchWeather = async () => {
            try {
                const [currentRes, forecastRes] = await Promise.all([
                    fetch(`${BASE}/weather?lat=${lat}&lon=${lng}&units=metric&appid=${API_KEY}`),
                    fetch(`${BASE}/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${API_KEY}`),
                ]);

                if (!currentRes.ok || !forecastRes.ok) {
                    const status = !currentRes.ok ? currentRes.status : forecastRes.status;
                    throw new Error(status === 401 ? 'Invalid API key' : `Weather API error (${status})`);
                }

                const currentData = await currentRes.json();
                const forecastData = await forecastRes.json();

                if (cancelled) return;

                setWeather(currentData);

                // Extract one entry per day (noon forecast) for 5 days
                const daily = [];
                const seen = new Set();
                for (const item of forecastData.list || []) {
                    const date = item.dt_txt?.split(' ')[0];
                    const hour = item.dt_txt?.split(' ')[1];
                    if (date && !seen.has(date) && hour === '12:00:00') {
                        seen.add(date);
                        daily.push(item);
                        if (daily.length >= 5) break;
                    }
                }
                setForecast(daily);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to fetch weather');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchWeather();
        return () => { cancelled = true; };
    }, [lat, lng]);

    const iconUrl = (code) =>
        `https://openweathermap.org/img/wn/${code}@2x.png`;

    const dayLabel = (dtTxt) => {
        const date = new Date(dtTxt);
        return date.toLocaleDateString(undefined, { weekday: 'short' });
    };

    return (
        <div className="rounded-lg border border-border bg-surface shadow-card">
            <div className="flex items-center justify-between p-4 pb-0">
                <h3 className="text-sm font-semibold text-textpri">Site Weather</h3>
            </div>

            <div className="p-4 pt-3">
                {/* Loading state */}
                {loading && (
                    <div className="flex items-center justify-center h-40">
                        <div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Error state */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                        <div className="text-2xl mb-2">--</div>
                        <p className="text-sm text-textsec">{error}</p>
                        <p className="text-xs text-texttert mt-1">Weather data unavailable</p>
                    </div>
                )}

                {/* Weather data */}
                {!loading && !error && weather && (
                    <>
                        {/* Current weather */}
                        <div className="flex items-center gap-4">
                            {weather.weather?.[0]?.icon && (
                                <img
                                    src={iconUrl(weather.weather[0].icon)}
                                    alt={weather.weather[0].description || 'weather'}
                                    className="h-16 w-16 -ml-2"
                                />
                            )}
                            <div>
                                <div className="text-3xl font-semibold text-textpri">
                                    {Math.round(weather.main?.temp ?? 0)}°C
                                </div>
                                <div className="text-sm text-textsec capitalize">
                                    {weather.weather?.[0]?.description || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Wind + Humidity */}
                        <div className="flex items-center gap-5 mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-textsec">
                                <Wind className="h-3.5 w-3.5" />
                                <span>{weather.wind?.speed ?? '—'} m/s</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-textsec">
                                <Droplets className="h-3.5 w-3.5" />
                                <span>{weather.main?.humidity ?? '—'}%</span>
                            </div>
                        </div>

                        {/* 5-day forecast strip */}
                        {forecast.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-border">
                                <div className="grid grid-cols-5 gap-1 text-center">
                                    {forecast.map((day) => (
                                        <div key={day.dt} className="flex flex-col items-center gap-0.5">
                                            <span className="text-[11px] font-medium text-textsec">
                                                {dayLabel(day.dt_txt)}
                                            </span>
                                            {day.weather?.[0]?.icon && (
                                                <img
                                                    src={iconUrl(day.weather[0].icon)}
                                                    alt={day.weather[0].description || ''}
                                                    className="h-8 w-8"
                                                />
                                            )}
                                            <span className="text-xs font-semibold text-textpri">
                                                {Math.round(day.main?.temp ?? 0)}°
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
