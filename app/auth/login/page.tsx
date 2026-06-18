'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true); // optional loading state
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
  } catch (err) {
    setError('An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-white">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 mb-4 rounded bg-gray-700 text-white" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 mb-6 rounded bg-gray-700 text-white" required />
        <button type="submit" className="w-full bg-blue-600 p-2 rounded hover:bg-blue-700">Login</button>
        <p className="text-center text-gray-400 mt-4">
          No account? <a href="/auth/signup" className="text-blue-400">Sign up</a>
        </p>
      </form>
    </div>
  );
}