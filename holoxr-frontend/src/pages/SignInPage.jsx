import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF, FaMicrosoft } from 'react-icons/fa';


export default function SignInPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex w-full max-w-5xl rounded-3xl overflow-hidden shadow-lg">
                {/* Left Illustration Panel */}
                <div className=" bg-[#efe9f9] hidden lg:flex items-center justify-center relative">
                    <img src="/login-illustration.png" alt="background" className="max-w-md" />
                </div>

                {/* Right Login Form */}
                <div className="w-full lg:w-1/2 bg-white p-10 flex flex-col justify-center">
                    <h2 className="text-3xl font-bold mb-6">Log in</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <div>
                            <label className="text-sm font-medium">Email address</label>
                            <input
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Enter your email address"
                                type="email"
                                required
                                className="w-full border px-4 py-2 rounded mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Password</label>
                            <input
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                type="password"
                                required
                                className="w-full border px-4 py-2 rounded mt-1"
                            />
                        </div>

                        <div className="text-right text-sm text-gray-500">
                            <button type="button" className="hover:underline">Forgot your password?</button>
                        </div>

                        <button type="submit" className="w-full bg-black text-white py-2 rounded-full font-semibold">
                            Log in
                        </button>
                    </form>

                    {/* Social login */}
                    <div className="flex items-center my-6">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="mx-4 text-sm text-gray-500">Or Log in with</span>
                        <div className="flex-1 h-px bg-gray-300" />
                    </div>

                    <div className="flex justify-center gap-4 mb-4">
                        <button className="p-2 rounded-full border hover:bg-gray-50"><FcGoogle size={20} /></button>
                        <button className="p-2 rounded-full border hover:bg-gray-50 text-blue-600"><FaMicrosoft size={18} /></button>
                        <button className="p-2 rounded-full border hover:bg-gray-50 text-blue-700"><FaFacebookF size={18} /></button>
                    </div>

                    <p className="text-sm text-center text-gray-600">
                        Don't have an account yet?{' '}
                        <button onClick={() => navigate('/signup')} className="text-blue-600 hover:underline">Sign up</button>
                    </p>
                </div>
            </div>
        </div>
    );
}
