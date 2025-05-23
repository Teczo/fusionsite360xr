import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignUpPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) {
            setError("Passwords do not match");
            return;
        }

        try {
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
                return;
            }

            navigate('/signin');
        } catch (err) {
            console.error(err);
            setError('Network error during signup');
        }
    };


    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
            <div className="bg-white shadow-md p-6 rounded w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4">Sign Up</h2>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border w-full px-3 py-2 rounded" required />
                    <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" className="border w-full px-3 py-2 rounded" required />
                    <input name="password" value={form.password} onChange={handleChange} placeholder="Password" type="password" className="border w-full px-3 py-2 rounded" required />
                    <input name="confirm" value={form.confirm} onChange={handleChange} placeholder="Confirm Password" type="password" className="border w-full px-3 py-2 rounded" required />
                    <button className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" type="submit">Sign Up</button>
                </form>
                <p className="text-sm mt-4 text-center">
                    Already have an account? <button className="text-blue-600 underline" onClick={() => navigate('/signin')}>Sign In</button>
                </p>
            </div>
        </div>
    );
}
