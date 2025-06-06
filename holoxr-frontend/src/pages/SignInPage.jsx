import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF, FaMicrosoft } from 'react-icons/fa';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';

export default function SignInPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        }
    };

    const [sliderRef, instanceRef] = useKeenSlider({
        loop: true,
        slides: { perView: 1 },
        slideChanged(slider) {
            setCurrentSlide(slider.track.details.rel);
        },
    });

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

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Carousel Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#18191e] flex-col items-center justify-center p-6">
                <div ref={sliderRef} className="keen-slider w-full max-w-2xl">
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
                            <p className="text-sm sm:text-base max-w-md text-gray-400">{item.description}</p>
                        </div>
                    ))}
                </div>

                {/* Arrows */}
                <div className="flex justify-between items-center w-full max-w-md mt-4 px-4">
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
                <div className="flex justify-center mt-4 gap-2">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => instanceRef.current?.moveToIdx(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`w-3 h-3 rounded-full ${currentSlide === idx ? 'bg-white' : 'bg-gray-500'
                                } focus:outline-none focus:ring-2 focus:ring-white`}
                        />
                    ))}
                </div>
            </div>

            {/* Right Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8">
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-6">
                        <img src="/holo-icon.png" alt="Holo Icon" className="h-16 sm:h-20 w-auto" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Log in</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <div>
                            <label htmlFor="email" className="text-sm font-medium">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Enter your email address"
                                type="email"
                                required
                                className="w-full border px-4 py-2 rounded mt-1 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                type="password"
                                required
                                className="w-full border px-4 py-2 rounded mt-1 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="text-right text-sm text-gray-500">
                            <button
                                type="button"
                                className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Forgot your password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-black text-white py-2 rounded-full font-semibold hover:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                        >
                            Log in
                        </button>
                    </form>

                    <div className="flex items-center my-6">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="mx-4 text-sm text-gray-500">Or Log in with</span>
                        <div className="flex-1 h-px bg-gray-300" />
                    </div>

                    <div className="flex justify-center gap-4 mb-4">
                        <button
                            aria-label="Log in with Google"
                            className="p-2 rounded-full border hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                        >
                            <FcGoogle size={20} />
                        </button>
                        <button
                            aria-label="Log in with Microsoft"
                            className="p-2 rounded-full border hover:bg-gray-50 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        >
                            <FaMicrosoft size={18} />
                        </button>
                        <button
                            aria-label="Log in with Facebook"
                            className="p-2 rounded-full border hover:bg-gray-50 text-blue-700 focus:ring-2 focus:ring-blue-500"
                        >
                            <FaFacebookF size={18} />
                        </button>
                    </div>

                    <p className="text-sm text-center text-gray-600">
                        Don't have an account yet?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Sign up
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}