import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF, FaMicrosoft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';

export default function SignUpPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', agree: false });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            title: 'Create AR Classroom',
            description: 'Design immersive learning experiences for your students using 3D and AR content.',
            image: '/images/slide1.png',
        },
        {
            title: 'Publish and Share',
            description: 'Easily share your creations with others using AR view links.',
            image: '/images/slide2.png',
        },
        {
            title: 'Collaborate with Creators',
            description: 'Work together with other educators, designers, and students in real-time.',
            image: '/images/slide3.png',
        },
        {
            title: 'Analyze Engagement',
            description: 'Track usage and insights on how learners interact with your AR content.',
            image: '/images/slide4.png',
        },
    ];

    const [sliderRef, instanceRef] = useKeenSlider({
        loop: true,
        slides: { perView: 1 },
        slideChanged(slider) {
            setCurrentSlide(slider.track.details.rel);
        },
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    };

    const passwordStrength = (pwd) => {
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/\d/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return score; // 0-5
    };

    const strengthLabel = (s) => ['Too short', 'Weak', 'Okay', 'Good', 'Strong', 'Very strong'][s];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirm) {
            setError('Passwords do not match');
            return;
        }
        if (!form.agree) {
            setError('Please accept the Terms and Privacy Policy');
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Signup failed');
                setSubmitting(false);
                return;
            }

            // After successful signup, route user to sign-in
            navigate('/signin');
        } catch (err) {
            console.error(err);
            setError('Network error during signup');
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            {/* Right Sign Up Form – visually matched to SignInPage */}
            <div
                className="flex items-center justify-center p-4 sm:p-6 md:p-8"
                style={{ width: `var(--right-panel-width, 50%)` }}
            >
                <div className="w-full max-w-md">
                    <div className="flex justify-start mb-6">
                        <img src="/holo-icon.png" alt="Holo Icon" className="h-16 sm:h-20 w-auto" />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-left">Create your account</h2>

                    <p className="text-sm text-left text-gray-600 mb-12">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/signin')}
                            className="text-[#2c95d2] hover:text-[#5eaedc] font-bold focus:outline-none focus:ring-2 focus:ring-[#4FC3F7]"
                        >
                            Sign in
                        </button>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <div>
                            <label htmlFor="name" className="text-sm font-bold">Full name</label>
                            <input
                                id="name"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                type="text"
                                required
                                className="w-full border border-gray-300 px-4 py-2 rounded mt-1 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="text-sm font-bold">Email address</label>
                            <input
                                id="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Enter your email address"
                                type="email"
                                required
                                className="w-full border border-gray-300 px-4 py-2 rounded mt-1 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="text-sm font-bold">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Create a strong password"
                                    type={showPwd ? 'text' : 'password'}
                                    required
                                    className="w-full border border-gray-300 px-4 py-2 rounded mt-1 pr-10 focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd((s) => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                                >
                                    {showPwd ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            {/* Strength meter */}
                            <div className="mt-2">
                                <div className="h-1 w-full bg-gray-200 rounded">
                                    <div
                                        className={`h-1 rounded transition-all`}
                                        style={{ width: `${(passwordStrength(form.password) / 5) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {strengthLabel(passwordStrength(form.password))}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm" className="text-sm font-bold">Confirm password</label>
                            <div className="relative">
                                <input
                                    id="confirm"
                                    name="confirm"
                                    value={form.confirm}
                                    onChange={handleChange}
                                    placeholder="Re-enter your password"
                                    type={showConfirm ? 'text' : 'password'}
                                    required
                                    className="w-full border border-gray-300 px-4 py-2 rounded mt-1 pr-10 focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((s) => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                                >
                                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 pt-2">
                            <input
                                id="agree"
                                name="agree"
                                type="checkbox"
                                checked={form.agree}
                                onChange={handleChange}
                                className="mt-1"
                                required
                            />
                            <label htmlFor="agree" className="text-sm text-gray-700">
                                I agree to the <a className="text-[#2c95d2] font-semibold hover:underline" href="/terms" target="_blank" rel="noreferrer">Terms</a> and
                                {' '}<a className="text-[#2c95d2] font-semibold hover:underline" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-[#2c95d2] text-white py-2 rounded-full font-semibold hover:bg-[#4FC3F7] focus:ring-2 focus:ring-blue-500 mb-6 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Creating your account…' : 'Create account'}
                        </button>
                    </form>

                    <div className="flex items-center my-6">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="mx-4 text-sm font-bold">Or Sign up with</span>
                        <div className="flex-1 h-px bg-gray-300" />
                    </div>

                    <div className="flex justify-center gap-4 mb-4">
                        <button
                            aria-label="Sign up with Google"
                            className="p-2 rounded-full border hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                        >
                            <FcGoogle size={20} />
                        </button>
                        <button
                            aria-label="Sign up with Microsoft"
                            className="p-2 rounded-full border hover:bg-gray-50 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        >
                            <FaMicrosoft size={18} />
                        </button>
                        <button
                            aria-label="Sign up with Facebook"
                            className="p-2 rounded-full border hover:bg-gray-50 text-blue-700 focus:ring-2 focus:ring-blue-500"
                        >
                            <FaFacebookF size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Left Carousel Panel – identical layout to SignInPage */}
            <div
                className="hidden lg:flex flex-col items-center justify-center p-6 relative"
                style={{
                    width: `var(--left-panel-width, 62%)`,
                    backgroundImage: `url(${slides[currentSlide].image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            >
                <div
                    className="absolute inset-0 backdrop-blur-md"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                />

                <div ref={sliderRef} className="keen-slider w-full max-w-2xl relative z-10">
                    {slides.map((item, idx) => (
                        <div
                            key={idx}
                            className="keen-slider__slide flex flex-col items-center justify-center text-center text-white px-6"
                        >
                            <img
                                src={item.image}
                                alt={item.title}
                                className="w-full max-w-md h-120 object-cover rounded-xl shadow-[0_15px_20px_8px_rgba(0,0,0,0.7)] mb-6"
                            />
                            <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                            <p className="text-sm sm:text-base max-w-md text-gray-300">{item.description}</p>
                        </div>
                    ))}
                </div>

                {/* Arrows */}
                <div className="flex justify-between items-center w-full max-w-md mt-4 px-4 relative z-10">
                    <button
                        onClick={() => instanceRef.current?.prev()}
                        aria-label="Previous slide"
                        className="text-white text-2xl hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => instanceRef.current?.next()}
                        aria-label="Next slide"
                        className="text-white text-2xl hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                    >
                        →
                    </button>
                </div>

                {/* Pagination Dots */}
                <div className="flex justify-center mt-4 gap-2 relative z-10">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => instanceRef.current?.moveToIdx(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`w-3 h-3 rounded-full ${currentSlide === idx ? 'bg-white' : 'bg-gray-500'} focus:outline-none focus:ring-2 focus:ring-white`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
