'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (signUpError) {
    setError(signUpError.message);
    return;
  }
  if (data.user) {
    await fetch('/api/auth/create-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: data.user.id, name, email }),
    });
    // ✅ Redirect to homepage after successful signup
    router.push('/');
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleSignup} className="bg-gray-800 p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-white">Sign Up</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 mb-4 rounded bg-gray-700 text-white" required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 mb-4 rounded bg-gray-700 text-white" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 mb-6 rounded bg-gray-700 text-white" required />
        <button type="submit" className="w-full bg-blue-600 p-2 rounded hover:bg-blue-700">Sign Up</button>
        <p className="text-center text-gray-400 mt-4">
          Already have an account? <a href="/auth/login" className="text-blue-400">Login</a>
        </p>
      </form>
    </div>
  );
}