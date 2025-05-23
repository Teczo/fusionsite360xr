import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
            const res = await fetch('https://holoxr-backend.onrender.com/api/signin', {
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
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
            <div className="bg-white shadow-md p-6 rounded w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4">Sign In</h2>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" className="border w-full px-3 py-2 rounded" required />
                    <input name="password" value={form.password} onChange={handleChange} placeholder="Password" type="password" className="border w-full px-3 py-2 rounded" required />
                    <button className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" type="submit">Sign In</button>
                </form>
                <p className="text-sm mt-4 text-center">
                    Don't have an account? <button className="text-blue-600 underline" onClick={() => navigate('/signup')}>Sign Up</button>
                </p>
            </div>
        </div>
    );
}
