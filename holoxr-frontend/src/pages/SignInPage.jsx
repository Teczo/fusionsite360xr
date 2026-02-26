import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';

const SYNE = { fontFamily: "'Syne', 'Inter', sans-serif" };

export default function SignInPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Sign in failed');
                return;
            }

            localStorage.setItem('token', data.token);
            navigate('/workspace');
        } catch (err) {
            console.error(err);
            setError('Network error during sign in');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        'Create immersive AR & 3D learning experiences',
        'Publish and share with AR view links',
        'Real-time collaboration with educators & creators',
        'Track engagement analytics and insights',
    ];

    const stats = [
        { value: '10K+', label: 'Users' },
        { value: '50K+', label: 'Documents' },
        { value: '99.9%', label: 'Uptime' },
    ];

    return (
        <div className="min-h-screen flex">

            {/* ─── Left Panel: Login Form ─── */}
            <div className="flex-1 flex items-center justify-center px-8 py-12 bg-surface">
                <div className="w-full max-w-md login-fade-in">

                    {/* Logo & Brand */}
                    <div className="flex items-center gap-3 mb-8">
                        <img src="/holo-icon.png" alt="FusionSite 360" className="h-12 w-12" />
                        <div>
                            <h1 className="text-2xl font-bold text-textpri" style={SYNE}>
                                FusionSite 360
                            </h1>
                            <p className="text-sm text-textsec">XR Platform</p>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-textpri mb-2" style={SYNE}>
                            Welcome back
                        </h2>
                        <p className="text-textsec">Sign in to continue to your dashboard</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
                            <p className="text-sm text-error font-medium">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-textpri mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 border border-border rounded-lg bg-appbg text-textpri placeholder:text-texttert focus:outline-none focus:ring-2 focus:ring-[#2EA6D7]/40 focus:border-[#2EA6D7] transition-all text-sm"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-textpri mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 pr-12 border border-border rounded-lg bg-appbg text-textpri placeholder:text-texttert focus:outline-none focus:ring-2 focus:ring-[#2EA6D7]/40 focus:border-[#2EA6D7] transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textsec hover:text-textpri transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember me + Forgot password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-[#2EA6D7] focus:ring-2 focus:ring-[#2EA6D7]/40"
                                />
                                <span className="text-sm text-textsec">Remember me</span>
                            </label>
                            <button
                                type="button"
                                className="text-sm font-semibold text-[#2EA6D7] hover:text-[#2390BE] transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#2EA6D7] to-[#6CCF6A] text-white font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-[#2EA6D7]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                        >
                            {loading ? (
                                <>
                                    <Loader size={20} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-textsec">
                            Don&apos;t have an account?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/signup')}
                                className="font-semibold text-[#2EA6D7] hover:text-[#2390BE] transition-colors"
                            >
                                Sign up
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* ─── Right Panel: Branding ─── */}
            <div
                className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #2EA6D7 0%, #4BB87E 50%, #6CCF6A 100%)' }}
            >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                <div className="relative z-10 text-white max-w-lg login-fade-in-delay">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                            <img src="/holo-icon.png" alt="FusionSite 360" className="h-9 w-auto" />
                        </div>
                        <div>
                            <h3 className="text-white text-lg font-bold leading-tight" style={SYNE}>FusionSite 360</h3>
                            <p className="text-white/70 text-xs">XR Platform</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold mb-4 leading-tight" style={SYNE}>
                        Immersive 3D &amp; AR Experiences
                    </h2>
                    <p className="text-lg text-white/90 leading-relaxed mb-8">
                        Build, publish, and share interactive augmented reality content for education, training, and beyond.
                    </p>

                    <div className="space-y-4 mb-12">
                        {features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                                <p className="text-white/90 text-sm leading-relaxed">{feature}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-6 login-fade-in-delay-2">
                        {stats.map((stat, idx) => (
                            <div key={idx}>
                                <div className="text-3xl font-bold mb-1" style={SYNE}>{stat.value}</div>
                                <div className="text-sm text-white/80">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Decorative circles */}
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
                <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />
            </div>
        </div>
    );
}
