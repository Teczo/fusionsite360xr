import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF, FaMicrosoft, FaEye, FaEyeSlash, FaCheck } from 'react-icons/fa';

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
            navigate('/dashboard');
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
        <div className="flex min-h-screen bg-white">
            {/* ─── Left Panel: Login Form ─── */}
            <div
                className="flex items-center justify-center w-full lg:w-1/2 p-6 sm:p-8 md:p-12"
            >
                <div className="w-full max-w-[450px] login-fade-in">
                    {/* Logo & Brand */}
                    <div className="flex items-center gap-3 mb-10">
                        <img src="/holo-icon.png" alt="FusionSite 360" className="h-12 w-auto" />
                        <span className="text-xl font-bold text-[#1A202C]">FusionSite 360</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl font-bold text-[#1A202C] mb-2">Welcome back!</h1>
                    <p className="text-[#718096] mb-8">Sign in to continue to your dashboard</p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="login-label">
                                Email address
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0]">
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                    </svg>
                                </span>
                                <input
                                    id="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email address"
                                    type="email"
                                    required
                                    className="login-input pl-11"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="login-label">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0]">
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                    </svg>
                                </span>
                                <input
                                    id="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="login-input pl-11 pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0AEC0] hover:text-[#718096] transition-colors focus:outline-none"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
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
                                    className="sr-only"
                                />
                                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                                    rememberMe
                                        ? 'bg-gradient-to-r from-[#2EA6D7] to-[#6CCF6A] border-transparent'
                                        : 'border-[#CBD5E0] bg-white'
                                }`}>
                                    {rememberMe && <FaCheck size={10} className="text-white" />}
                                </span>
                                <span className="text-sm text-[#718096]">Remember me</span>
                            </label>
                            <button
                                type="button"
                                className="text-sm font-semibold text-[#2EA6D7] hover:text-[#2390BE] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2EA6D7]/30 rounded"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-login-gradient btn-shimmer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center my-6">
                        <div className="flex-1 h-px bg-[#E2E8F0]" />
                        <span className="mx-4 text-sm text-[#A0AEC0]">or continue with</span>
                        <div className="flex-1 h-px bg-[#E2E8F0]" />
                    </div>

                    {/* Social Logins */}
                    <div className="flex justify-center gap-4 mb-6">
                        <button
                            aria-label="Log in with Google"
                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F7FAFC] hover:border-[#CBD5E0] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2EA6D7]/30"
                        >
                            <FcGoogle size={22} />
                        </button>
                        <button
                            aria-label="Log in with Microsoft"
                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F7FAFC] hover:border-[#CBD5E0] transition-all duration-200 text-[#00A4EF] focus:outline-none focus:ring-2 focus:ring-[#2EA6D7]/30"
                        >
                            <FaMicrosoft size={18} />
                        </button>
                        <button
                            aria-label="Log in with Facebook"
                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F7FAFC] hover:border-[#CBD5E0] transition-all duration-200 text-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#2EA6D7]/30"
                        >
                            <FaFacebookF size={18} />
                        </button>
                    </div>

                    {/* Sign Up Link */}
                    <p className="text-center text-sm text-[#718096]">
                        Don&apos;t have an account?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="font-semibold text-[#2EA6D7] hover:text-[#2390BE] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2EA6D7]/30 rounded"
                        >
                            Sign up
                        </button>
                    </p>
                </div>
            </div>

            {/* ─── Right Panel: Marketing ─── */}
            <div
                className="hidden lg:flex flex-col items-center justify-center w-1/2 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #2EA6D7 0%, #4BB87E 50%, #6CCF6A 100%)',
                }}
            >
                {/* Pattern overlay */}
                <div className="absolute inset-0 login-pattern-bg" />

                {/* Content */}
                <div className="relative z-10 max-w-md px-8 login-fade-in-delay">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                            <img src="/holo-icon.png" alt="FusionSite 360" className="h-9 w-auto" />
                        </div>
                        <div>
                            <h3 className="text-white text-lg font-bold leading-tight">FusionSite 360</h3>
                            <p className="text-white/70 text-xs">XR Platform</p>
                        </div>
                    </div>

                    {/* Headline */}
                    <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                        Immersive 3D &amp; AR Experiences
                    </h2>
                    <p className="text-white/80 text-base leading-relaxed mb-8">
                        Build, publish, and share interactive augmented reality content for education, training, and beyond.
                    </p>

                    {/* Feature list */}
                    <ul className="space-y-4 mb-10">
                        {features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <span className="mt-0.5 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <FaCheck size={10} className="text-white" />
                                </span>
                                <span className="text-white/90 text-sm leading-relaxed">{feature}</span>
                            </li>
                        ))}
                    </ul>

                    {/* KPI Stats */}
                    <div className="flex gap-6 login-fade-in-delay-2">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="text-center">
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                                <div className="text-white/60 text-xs mt-1">{stat.label}</div>
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
